import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

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

    constructor(private workspaceRoot: string) {
        this.contextPath = this.getContextPath();
        this.context = this.getInitialContext();
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

                // Nomenclature migration if needed (tisks/tasks -> contributions/handoffs)
                if ((loaded as any).tisks) {
                    this.context.contributions = (loaded as any).tisks.map((t: any) => ({ ...t, type: 'contribution' }));
                }
                if ((loaded as any).tasks) {
                    this.context.handoffs = (loaded as any).tasks.map((t: any) => ({ ...t, type: 'handoff' }));
                }
            } else {
                await this.save();
            }
            // Fire initial git status capture in background
            this.captureGitStatus();
        } catch (error) {
            console.error('Conduit: ContextManager initialization failed', error);
        }
    }

    public getContext(): ConduitContext {
        // Dynamic update of active files
        const activeEditor = vscode.window.activeTextEditor;
        const activeFiles = activeEditor ? [vscode.workspace.asRelativePath(activeEditor.document.uri)] : [];
        return { ...this.context, activeFiles };
    }

    public async save(): Promise<void> {
        if (!this.contextPath) return;

        try {
            this.context.lastSync = new Date().toISOString();
            // Rotate logs
            if (this.context.contributions.length > 50) this.context.contributions = this.context.contributions.slice(-50);
            if (this.context.handoffs.length > 50) this.context.handoffs = this.context.handoffs.slice(-50);

            await fs.promises.writeFile(this.contextPath, JSON.stringify(this.context, null, 2));
            this._onDidUpdate.fire(this.context);
        } catch (error) {
            console.error('Conduit: Context save failed', error);
        }
    }

    public async sync(): Promise<void> {
        await this.initialize();
        this._onDidUpdate.fire(this.context);
    }

    async logContribution(action: string, files: string[]): Promise<void> {
        const entry: ContributionEntry = {
            type: 'contribution',
            agent: 'antigravity',
            action,
            files: files.slice(0, 5),
            timestamp: new Date().toISOString()
        };
        this.context.contributions.push(entry);
        await this.save();
    }

    async logHandoff(suggestion: string, agent: 'gemini' | 'jules' = 'gemini', sessionId?: string): Promise<void> {
        const entry: HandoffEntry = {
            type: 'handoff',
            agent,
            suggestion,
            timestamp: new Date().toISOString(),
            sessionId
        };
        this.context.handoffs.push(entry);
        await this.save();
    }

    async addPlan(task: string, assignee: 'antigravity' | 'gemini' | 'jules'): Promise<void> {
        const plan: Plan = {
            id: `plan-${Math.random().toString(36).substring(7)}`,
            task,
            assignee,
            status: 'pending',
            timestamp: new Date().toISOString()
        };
        this.context.plans.push(plan);
        await this.save();
    }

    async updatePlan(id: string, status: 'pending' | 'in-progress' | 'done'): Promise<void> {
        const plan = this.context.plans.find(p => p.id === id);
        if (plan) {
            plan.status = status;
            await this.save();
        }
    }

    async archivePlans(): Promise<void> {
        this.context.plans = this.context.plans.filter(p => p.status !== 'done');
        await this.save();
    }

    async clearSession(): Promise<void> {
        this.context = this.getInitialContext();
        await this.save();
    }

    public async captureGitStatus(): Promise<{ branch: string; changes: number }> {
        try {
            const gitExtension = vscode.extensions.getExtension('vscode.git');
            if (!gitExtension) {
                console.log('Conduit: Git extension not found');
                return { branch: 'unknown', changes: 0 };
            }

            const api = gitExtension.exports.getAPI(1);

            // Wait for repositories to be loaded if none are found yet
            if (!api.repositories || api.repositories.length === 0) {
                console.log('Conduit: Waiting for Git repositories to initialize...');
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                return { branch: 'no-workspace', changes: 0 };
            }

            // Find the repository that contains our workspace root
            const rootPath = workspaceFolders[0].uri.fsPath;
            const repo = api.repositories.find((r: any) => {
                const repoPath = r.rootUri.fsPath.toLowerCase();
                return rootPath.toLowerCase().startsWith(repoPath) || repoPath.startsWith(rootPath.toLowerCase());
            }) || api.repositories[0];

            if (repo) {
                const state = repo.state;
                const stagedCount = state.indexChanges.length;
                const modifiedCount = state.workingTreeChanges.length;
                const untrackedCount = state.untrackedChanges?.length || 0;

                this.context.gitStatus = {
                    branch: state.HEAD?.name || 'detached',
                    staged: state.indexChanges.map((c: any) => vscode.workspace.asRelativePath(c.uri)),
                    modified: state.workingTreeChanges.map((c: any) => vscode.workspace.asRelativePath(c.uri)),
                    untracked: [],
                    hasChanges: stagedCount > 0 || modifiedCount > 0 || untrackedCount > 0
                };

                this.context.lastSync = new Date().toISOString();
                await this.save();

                console.log(`Conduit: Synced Git status for branch ${this.context.gitStatus.branch} (${stagedCount + modifiedCount} changes)`);

                return {
                    branch: this.context.gitStatus.branch,
                    changes: stagedCount + modifiedCount + untrackedCount
                };
            } else {
                console.log('Conduit: No matching Git repository found among', api.repositories.length, 'repos');
            }
        } catch (e) {
            console.error('Conduit: Git status capture failed', e);
        }
        return { branch: 'unknown', changes: 0 };
    }

    async scanTodos(): Promise<TodoItem[]> {
        const todos: TodoItem[] = [];
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return todos;

        try {
            // Search for TODO, FIXME, HACK, NOTE comments in source files
            const pattern = new vscode.RelativePattern(workspaceFolders[0], '**/*.{ts,tsx,js,jsx,md,py,java,cs,go,rs}');
            const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**', 100);

            for (const file of files) {
                try {
                    const content = await fs.promises.readFile(file.fsPath, 'utf8');
                    const lines = content.split('\n');
                    const relativePath = vscode.workspace.asRelativePath(file);

                    lines.forEach((line, index) => {
                        const todoMatch = line.match(/\/\/\s*(TODO|FIXME|HACK|NOTE):?\s*(.+)/i) ||
                            line.match(/#\s*(TODO|FIXME|HACK|NOTE):?\s*(.+)/i);
                        if (todoMatch) {
                            todos.push({
                                file: relativePath,
                                line: index + 1,
                                text: todoMatch[2].trim(),
                                type: todoMatch[1].toUpperCase() as 'TODO' | 'FIXME' | 'HACK' | 'NOTE'
                            });
                        }
                    });
                } catch (e) {
                    // Skip files that can't be read
                }
            }

            // Store in context and save
            this.context.todos = todos.slice(0, 20); // Keep top 20
            await this.save();
            console.log(`Conduit: Found ${todos.length} TODO items`);
        } catch (e) {
            console.error('Conduit: TODO scan failed', e);
        }

        return todos;
    }

    async updateAgentIntent(agent: string, status: string, intent: string): Promise<void> {
        this.context.agentIntents[agent] = {
            status,
            intent,
            lastUpdate: new Date().toISOString()
        };
        await this.save();
        this._onDidUpdate.fire(this.context);
    }

    async reserveFile(filePath: string, agent: string): Promise<boolean> {
        this.context.reservedFiles = this.context.reservedFiles || {};

        // Check if already reserved by someone else
        const existing = this.context.reservedFiles[filePath];
        if (existing && existing.agent !== agent) {
            const expires = new Date(existing.expires).getTime();
            if (Date.now() < expires) {
                return false; // Still validly locked by peer
            }
        }

        const now = new Date();
        const expires = new Date(now.getTime() + 5 * 60000); // 5 minute TTL

        this.context.reservedFiles[filePath] = {
            agent,
            timestamp: now.toISOString(),
            expires: expires.toISOString()
        };

        await this.save();
        return true;
    }

    async releaseFile(filePath: string, agent: string): Promise<void> {
        if (this.context.reservedFiles && this.context.reservedFiles[filePath]) {
            if (this.context.reservedFiles[filePath].agent === agent) {
                delete this.context.reservedFiles[filePath];
                await this.save();
            }
        }
    }
}
