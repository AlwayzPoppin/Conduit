import { NexGenMetadata } from './meta';
import { ExtensionLens } from './lens';
import { performance } from 'perf_hooks';

export interface IConduitExtension {
    id: string;
    execute(payload: any): Promise<any>;
}

export class Conduit {
    private extensions: Map<string, IConduitExtension> = new Map();
    private failureCounts: Map<string, number> = new Map();
    private readonly FAILURE_THRESHOLD = 3;

    constructor(private lens: ExtensionLens) { }

    public registerExtension(ext: IConduitExtension) {
        this.extensions.set(ext.id, ext);
        this.lens.trace('System', `Registered extension: ${ext.id}`);
    }

    async process(meta: NexGenMetadata, payload: any): Promise<any> {
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
    }
}
