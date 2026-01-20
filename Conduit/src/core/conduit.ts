import { NexGenMetadata } from './meta';
import { ExtensionLens } from './lens';
import { performance } from 'perf_hooks';
import * as vscode from 'vscode';

export interface IConduitExtension {
    id: string;
    execute(payload: any): Promise<any>;
}

export class Conduit {
    private extensions: Map<string, IConduitExtension> = new Map();
    private failureCounts: Map<string, number> = new Map();
    private readonly FAILURE_THRESHOLD = 3;
    private activeExecutions = 0;
    private readonly MAX_CONCURRENT = 3;

    constructor(private lens: ExtensionLens, private secrets?: vscode.SecretStorage) { }

    /**
     * Secure API key retrieval via VS Code SecretStorage
     */
    async getApiKey(provider: string): Promise<string | undefined> {
        return await this.secrets?.get(`conduit.api_key.${provider}`);
    }

    /**
     * Store API key securely
     */
    async setApiKey(provider: string, key: string): Promise<void> {
        await this.secrets?.store(`conduit.api_key.${provider}`, key);
    }

    /**
     * UI-accessible method for API key configuration
     */
    async promptConfiguration(): Promise<void> {
        const provider = await vscode.window.showQuickPick(['gemini', 'ollama'], {
            placeHolder: 'Select AI Provider to Configure'
        });
        if (!provider) return;

        const key = await vscode.window.showInputBox({
            prompt: `Enter API Key for ${provider}`,
            password: true,
            ignoreFocusOut: true
        });
        if (key) {
            await this.setApiKey(provider, key);
            vscode.window.showInformationMessage(`✅ API key for ${provider} configured successfully`);
        }
    }

    /**
     * Built-in Gemini API client with exponential backoff retry
     */
    async callGemini(prompt: string, model: string = 'gemini-pro', retryCount: number = 0): Promise<any> {
        const startTime = Date.now();
        const key = await this.getApiKey('gemini');
        if (!key) {
            throw new Error('Gemini API key not configured. Run "Conduit: Configure AI API Keys"');
        }

        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }]
                    })
                }
            );

            if (!response.ok) {
                // Retry on 5xx errors or rate limits (429)
                if ((response.status >= 500 || response.status === 429) && retryCount < 3) {
                    const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
                    console.log(`[Conduit] Gemini API ${response.status}, retrying in ${delay}ms...`);
                    await new Promise(r => setTimeout(r, delay));
                    return this.callGemini(prompt, model, retryCount + 1);
                }
                throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            this.lens.report({
                extensionId: 'gemini',
                durationMs: Date.now() - startTime,
                status: 'success'
            });
            return result;
        } catch (error: any) {
            this.lens.report({
                extensionId: 'gemini',
                durationMs: Date.now() - startTime,
                status: 'failure',
                error: error as Error
            });
            // User-facing error notification for failed handoffs
            vscode.window.showErrorMessage(`Conduit Agent Handoff Failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Execute a registered extension directly by ID
     */
    async execute(id: string, payload: any): Promise<any> {
        const ext = this.extensions.get(id);
        if (!ext) {
            vscode.window.showErrorMessage(`Conduit: Agent '${id}' not found for handoff.`);
            return undefined;
        }
        try {
            return await ext.execute(payload);
        } catch (error: any) {
            vscode.window.showErrorMessage(`Conduit: Agent '${id}' execution failed: ${error.message}`);
            throw error;
        }
    }

    public registerExtension(ext: IConduitExtension) {
        this.extensions.set(ext.id, ext);
        this.lens.trace('System', `Registered extension: ${ext.id}`);
    }

    async process(meta: NexGenMetadata, payload: any): Promise<any> {
        // Rate limiting: Wait if too many concurrent executions
        while (this.activeExecutions >= this.MAX_CONCURRENT) {
            await new Promise(r => setTimeout(r, 500));
        }
        this.activeExecutions++;

        try {
            let currentPayload = payload;

            for (const rule of meta.routingRules) {
                const ext = this.extensions.get(rule.extensionId);

                if (!ext) {
                    this.lens.trace(rule.extensionId, 'Extension not found, skipping.');
                    continue;
                }

                // Circuit Breaker Logic
                if ((this.failureCounts.get(ext.id) || 0) >= this.FAILURE_THRESHOLD) {
                    this.lens.trace(ext.id, 'Circuit breaker OPEN - skipping extension.');
                    continue;
                }

                const startTime = performance.now();
                try {
                    // Execute with a timeout race
                    currentPayload = await Promise.race([
                        ext.execute(currentPayload),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Timeout')), rule.timeoutMs)
                        )
                    ]);

                    this.failureCounts.set(ext.id, 0); // Reset on success
                    this.lens.report({
                        extensionId: ext.id,
                        durationMs: performance.now() - startTime,
                        status: 'success'
                    });
                } catch (error) {
                    const count = (this.failureCounts.get(ext.id) || 0) + 1;
                    this.failureCounts.set(ext.id, count);

                    this.lens.report({
                        extensionId: ext.id,
                        durationMs: performance.now() - startTime,
                        status: 'failure',
                        error: error as Error
                    });

                    // Decide whether to halt the entire conduit or continue
                    if (meta.environment === 'production') continue;
                    throw error;
                }
            }

            return currentPayload;
        } finally {
            this.activeExecutions--;
        }
    }
}
