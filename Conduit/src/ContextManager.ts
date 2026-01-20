import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ContextSchema, ContextState, AgentIntentSchema } from './core/schemas';
import { logger } from './core/Logger';

export interface ContributionEntry {
    type: 'contribution';
    agent: 'antigravity';
    action: string;
    files: string[];
    timestamp: string;
}

export interface HandoffEntry {
    type: 'handoff';
    agent: 'gemini' | 'jules';
    suggestion: string;
    timestamp: string;
    sessionId?: string;
}

export interface Plan {
    id: string;
    task: string;
    assignee: 'antigravity' | 'gemini' | 'jules';
    status: 'pending' | 'in-progress' | 'done';
    timestamp: string;
}

export interface ConduitContext {
    session: {
        id: string;
        started: string;
    };
    contributions: ContributionEntry[];
    handoffs: HandoffEntry[];
    plans: Plan[];
    agentIntents: {
        [agent: string]: {
            status: string;
            intent: string;
            lastUpdate: string;
        };
    };
    activeFiles: string[];
    relatedFiles: string[];
    gitStatus: {
        branch: string;
        staged: string[];
        modified: string[];
        untracked: string[];
        hasChanges: boolean;
    };
    lastSync: string;
    pendingCommands?: any[];
    historySummary?: string;
    latestResults?: any[];
    version?: string;
    currentTask?: string;
    preferences?: {
        sync: boolean;
        hideDone: boolean;
        autoRefresh: boolean;
        audioAlerts: boolean;
        hideDonePlans: boolean;
    };
    reservedFiles?: {
        [path: string]: {
            agent: string;
            timestamp: string;
            expires: string;
        };
    };
    todos?: TodoItem[];
}

export interface TodoItem {
    file: string;
    line: number;
    text: string;
    type: 'TODO' | 'FIXME' | 'HACK' | 'NOTE';
}

export class ContextManager {
    private contextPath: string | undefined;
    private context: ConduitContext;
    private _onDidUpdate = new vscode.EventEmitter<ConduitContext>();
    public readonly onDidUpdate = this._onDidUpdate.event;
    private contextWatcher: vscode.FileSystemWatcher | undefined;
    private isWriting = false; // Prevent self-triggered reloads

    constructor(private workspaceRoot: string) {
        this.contextPath = this.getContextPath();
        this.context = this.getInitialContext();
        this.setupContextWatcher();
    }

    /**
     * Watches context.json for external changes (from agent_bridge.js)
     */
    private setupContextWatcher(): void {
        if (!this.contextPath) return;

        this.contextWatcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(path.dirname(this.contextPath), 'context.json')
        );

        this.contextWatcher.onDidChange(async () => {
            // Avoid reloading when we just wrote the file ourselves
            if (this.isWriting) return;

            console.log('Conduit: context.json changed externally, reloading...');
            await this.reloadFromDisk();
        });
    }

    /**
     * Reloads context from disk (called when agents update the file)
     */
    private async reloadFromDisk(): Promise<void> {
        if (!this.contextPath || !fs.existsSync(this.contextPath)) return;

        try {
            const content = await fs.promises.readFile(this.contextPath, 'utf8');
            const loaded = JSON.parse(content);
            // Merge loaded state, preserving UI-driven fields that may have changed
            this.context = { ...this.context, ...loaded };
            this._onDidUpdate.fire(this.context);
        } catch (e) {
            console.error('Conduit: Failed to reload context from disk', e);
        }
    }

    public dispose(): void {
        this.contextWatcher?.dispose();
    }

    private get lockPath(): string | undefined {
        if (!this.contextPath) return undefined;
        return path.join(path.dirname(this.contextPath), 'lock');
    }

    /**
     * Acquires a file lock for safe context writes (matches agent_bridge.js logic)
     */
    private async acquireLock(maxRetries = 25): Promise<void> {
        if (!this.lockPath) return;

        let retries = 0;
        while (retries < maxRetries) {
            try {
                // 'wx' flag fails if file exists, ensuring atomicity
                const fd = fs.openSync(this.lockPath, 'wx');
                fs.writeSync(fd, process.pid.toString());
                fs.closeSync(fd);
                return;
            } catch (e: any) {
                if (e.code !== 'EEXIST') throw e;

                let lockAge = 0;
                try {
                    lockAge = Date.now() - fs.statSync(this.lockPath).mtimeMs;
                } catch {
                    retries++;
                    continue;
                }

                if (lockAge > 5000) {
                    try {
                        fs.unlinkSync(this.lockPath);
                    } catch (unlinkErr: any) {
                        if (unlinkErr.code !== 'ENOENT') {
                            console.error(`Conduit: Lock cleanup warning: ${unlinkErr.message}`);
                        }
                    }
                    continue;
                }

                retries++;
                if (retries < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
        }
        throw new Error(`Conduit: Failed to acquire lock after ${maxRetries} retries`);
    }

    /**
     * Releases the file lock
     */
    private releaseLock(): void {
        if (!this.lockPath) return;
        try {
            if (fs.existsSync(this.lockPath)) {
                fs.unlinkSync(this.lockPath);
            }
        } catch (e: any) {
            if (e.code !== 'ENOENT') {
                console.error(`Conduit: Lock release warning: ${e.message}`);
            }
        }
    }

    private getContextPath(): string | undefined {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) return undefined;
        return path.join(workspaceFolders[0].uri.fsPath, '.conduit', 'context.json');
    }

    private getInitialContext(): ConduitContext {
        return {
            session: { id: Math.random().toString(36).substring(7), started: new Date().toISOString() },
            contributions: [],
            handoffs: [],
            plans: [],
            agentIntents: {
                antigravity: { status: 'idle', intent: 'Waiting for task', lastUpdate: new Date().toISOString() },
                gemini: { status: 'idle', intent: 'Ready', lastUpdate: new Date().toISOString() }
            },
            activeFiles: [],
            relatedFiles: [],
            gitStatus: { branch: 'main', staged: [], modified: [], untracked: [], hasChanges: false },
            lastSync: new Date().toISOString(),
            reservedFiles: {}
        };
    }

    public async initialize(): Promise<void> {
        if (!this.contextPath) return;

        try {
            const conduitDir = path.dirname(this.contextPath);
            if (!fs.existsSync(conduitDir)) {
                await fs.promises.mkdir(conduitDir, { recursive: true });
            }

            if (fs.existsSync(this.contextPath)) {
                const content = await fs.promises.readFile(this.contextPath, 'utf8');
                const loaded = JSON.parse(content);
                this.context = { ...this.getInitialContext(), ...loaded };

                // Migration logic for old fields if necessary
                if ((loaded as any).tisks) {
                    this.context.contributions = (loaded as any).tisks.map((t: any) => ({ ...t, type: 'contribution' }));
                }
            }

            await this.save();
            await this.captureGitStatus();
        } catch (error) {
            console.error('Conduit: ContextManager initialization failed', error);
        }
    }

    public getContext(): ConduitContext {
        const activeEditor = vscode.window.activeTextEditor;
        const activeFiles = activeEditor ? [vscode.workspace.asRelativePath(activeEditor.document.uri)] : [];
        return { ...this.context, activeFiles };
    }

    /**
     * Runs a transactional update on the context state (Read-Compare-Write)
     */
    private async runTransactionalUpdate(updateFn: (ctx: any) => void | Promise<void>): Promise<void> {
        if (!this.contextPath) return;

        await this.acquireLock();
        this.isWriting = true;
        try {
            // 1. Read fresh state from disk
            let currentCtx: any;
            if (fs.existsSync(this.contextPath)) {
                const content = await fs.promises.readFile(this.contextPath, 'utf8');
                currentCtx = JSON.parse(content);
            } else {
                currentCtx = this.getInitialContext();
            }

            // 2. Modify State
            await updateFn(currentCtx);

            // 3. Validate with Zod
            const validated = ContextSchema.parse(currentCtx);

            // 4. Write back atomically
            const tempPath = `${this.contextPath}.tmp`;
            await fs.promises.writeFile(tempPath, JSON.stringify(validated, null, 2));
            await fs.promises.rename(tempPath, this.contextPath);

            this.context = validated as any;
            this._onDidUpdate.fire(this.context);
        } catch (e: any) {
            logger.error(`Transactional update failed: ${e.message}`);
            throw e;
        } finally {
            this.isWriting = false;
            this.releaseLock();
        }
    }

    public async save(): Promise<void> {
        if (!this.contextPath) return;

        await this.acquireLock();
        this.isWriting = true;
        try {
            // Validate before saving
            const validated = ContextSchema.parse(this.context);
            const tempPath = `${this.contextPath}.tmp`;
            await fs.promises.writeFile(tempPath, JSON.stringify(validated, null, 2));
            await fs.promises.rename(tempPath, this.contextPath);

            await this.checkHistoryLimit();
        } catch (e: any) {
            logger.error(`Failed to save context: ${e.message}`);
        } finally {
            this.isWriting = false;
            this.releaseLock();
        }
    }

    public async updateAgentIntent(agent: string, status: string, intent: string): Promise<void> {
        await this.runTransactionalUpdate(async (ctx) => {
            const agentKey = agent.toLowerCase();
            const lastUpdate = new Date().toISOString();

            ctx.agentIntents = ctx.agentIntents || {};
            ctx.agentIntents[agentKey] = { status, intent, lastUpdate };

            AgentIntentSchema.parse(ctx.agentIntents[agentKey]);
        });
    }

    private get historyPath(): string | undefined {
        if (!this.contextPath) return undefined;
        return path.join(path.dirname(this.contextPath), 'history.json');
    }

    private async checkHistoryLimit(): Promise<void> {
        if (!this.historyPath || !fs.existsSync(this.historyPath)) return;
        try {
            const stats = await fs.promises.stat(this.historyPath);
            // Limit based on size or count. Turn-based count is harder without reading.
            // For now, simple count check by reading first 1000 lines? 
            // Previous implementation read the whole file.
            const content = await fs.promises.readFile(this.historyPath, 'utf8');
            const history = JSON.parse(content);
            if (Array.isArray(history) && history.length > 100) {
                await this.summarizeHistory("Automated summarization: History limit (100) exceeded.");
            }
        } catch (e) { }
    }

    public async summarizeHistory(summaryText?: string): Promise<void> {
        if (!this.contextPath || !this.historyPath) return;
        const text = summaryText || "Automated log maintenance: History truncated.";

        await this.runTransactionalUpdate(async (ctx) => {
            ctx.historySummary = text;
            ctx.contributions = ctx.contributions.slice(-20);

            if (fs.existsSync(this.historyPath!)) {
                try {
                    const content = await fs.promises.readFile(this.historyPath!, 'utf8');
                    let history = JSON.parse(content);
                    if (Array.isArray(history) && history.length > 100) {
                        history = history.slice(-50);
                        await fs.promises.writeFile(this.historyPath!, JSON.stringify(history, null, 2));
                    }
                } catch (e) { }
            }
        });
    }

    public async logContribution(action: string, files: string[]): Promise<void> {
        await this.runTransactionalUpdate((ctx) => {
            ctx.contributions.push({
                timestamp: new Date().toISOString(),
                agent: 'antigravity',
                action,
                files: files.slice(0, 5)
            });
            if (ctx.contributions.length > 50) ctx.contributions = ctx.contributions.slice(-50);
        });
    }

    public async logHandoff(suggestion: string, from: string = 'antigravity', to: string = 'gemini'): Promise<void> {
        await this.runTransactionalUpdate((ctx) => {
            ctx.handoffs.push({
                timestamp: new Date().toISOString(),
                from,
                to,
                suggestion
            });
            if (ctx.handoffs.length > 50) ctx.handoffs = ctx.handoffs.slice(-50);
        });
    }

    public async addPlan(task: string, assignee: string): Promise<void> {
        await this.runTransactionalUpdate((ctx) => {
            ctx.plans.push({
                id: vscode.l10n ? vscode.l10n.t('plan-{0}', Math.random().toString(36).substring(7)) : `plan-${Math.random().toString(36).substring(7)}`,
                task,
                assignee,
                status: 'pending',
                timestamp: new Date().toISOString()
            });
        });
    }

    public async updatePlan(id: string, status: 'pending' | 'in-progress' | 'completed' | 'failed'): Promise<void> {
        await this.runTransactionalUpdate((ctx) => {
            const plan = ctx.plans.find((p: any) => p.id === id);
            if (plan) plan.status = status;
        });
    }

    public async captureGitStatus(): Promise<{ branch: string; changes: number }> {
        try {
            const gitExtension = vscode.extensions.getExtension('vscode.git');
            if (!gitExtension) return { branch: 'unknown', changes: 0 };
            const api = gitExtension.exports.getAPI(1);
            if (!api.repositories || api.repositories.length === 0) return { branch: 'unknown', changes: 0 };

            const repo = api.repositories[0];
            const state = repo.state;
            const changes = state.indexChanges.length + state.workingTreeChanges.length + (state.untrackedChanges?.length || 0);

            await this.runTransactionalUpdate((ctx) => {
                ctx.gitStatus = {
                    branch: state.HEAD?.name || 'detached',
                    staged: state.indexChanges.map((c: any) => vscode.workspace.asRelativePath(c.uri)),
                    modified: state.workingTreeChanges.map((c: any) => vscode.workspace.asRelativePath(c.uri)),
                    untracked: [],
                    hasChanges: changes > 0
                };
            });
            return { branch: state.HEAD?.name || 'detached', changes };
        } catch (e) {
            return { branch: 'error', changes: 0 };
        }
    }

    public async scanTodos(): Promise<TodoItem[]> {
        const todos: TodoItem[] = [];
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return todos;

        try {
            const pattern = new vscode.RelativePattern(workspaceFolders[0], '**/*.{ts,tsx,js,jsx,md,py}');
            const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 100);

            for (const file of files) {
                try {
                    const content = await fs.promises.readFile(file.fsPath, 'utf8');
                    const lines = content.split('\n');
                    lines.forEach((line, index) => {
                        const match = line.match(/\/\/\s*(TODO|FIXME|HACK):?\s*(.+)/i);
                        if (match) {
                            todos.push({
                                file: vscode.workspace.asRelativePath(file),
                                line: index + 1,
                                text: match[2].trim(),
                                type: match[1].toUpperCase() as any
                            });
                        }
                    });
                } catch (e) { }
            }

            await this.runTransactionalUpdate((ctx) => {
                ctx.todos = todos.slice(0, 20);
            });
        } catch (e) { }
        return todos;
    }

    public async sync(): Promise<void> {
        await this.initialize();
    }

    public async reserveFile(filePath: string, agent: string): Promise<boolean> {
        let reserved = false;
        await this.runTransactionalUpdate((ctx) => {
            ctx.reservedFiles = ctx.reservedFiles || {};
            const existing = ctx.reservedFiles[filePath];
            if (existing && existing.agent !== agent && new Date(existing.expires).getTime() > Date.now()) {
                reserved = false;
                return;
            }
            ctx.reservedFiles[filePath] = {
                agent,
                timestamp: new Date().toISOString(),
                expires: new Date(Date.now() + 5 * 60000).toISOString()
            };
            reserved = true;
        });
        return reserved;
    }

    public async releaseFile(filePath: string, agent: string): Promise<void> {
        await this.runTransactionalUpdate((ctx) => {
            if (ctx.reservedFiles && ctx.reservedFiles[filePath]?.agent === agent) {
                delete ctx.reservedFiles[filePath];
            }
        });
    }
}
