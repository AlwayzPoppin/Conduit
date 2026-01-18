import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface MemoryEntry {
    content: string;
    timestamp: string;
    source: string;
}

export interface ConduitMemory {
    learnings: MemoryEntry[];
    preferences: Record<string, any>;
    projectRules: string[];
    lastUpdated: string;
}

export class MemoryManager {
    private memoryPath: string;
    private memory: ConduitMemory;
    private _onDidUpdate = new vscode.EventEmitter<ConduitMemory>();
    public readonly onDidUpdate = this._onDidUpdate.event;

    constructor(workspaceRoot: string) {
        const ConduitDir = path.join(workspaceRoot, '.conduit');
        this.memoryPath = path.join(ConduitDir, 'memory.json');

        if (!fs.existsSync(ConduitDir)) {
            fs.mkdirSync(ConduitDir, { recursive: true });
        }

        this.memory = this.load();
    }

    private load(): ConduitMemory {
        if (fs.existsSync(this.memoryPath)) {
            try {
                const data = fs.readFileSync(this.memoryPath, 'utf-8');
                return JSON.parse(data);
            } catch (e) {
                console.error('MemoryManager: Failed to parse memory.json', e);
            }
        }

        const empty: ConduitMemory = {
            learnings: [],
            preferences: {},
            projectRules: [],
            lastUpdated: new Date().toISOString()
        };
        this.save(empty);
        return empty;
    }

    private save(memory: ConduitMemory): void {
        try {
            fs.writeFileSync(this.memoryPath, JSON.stringify(memory, null, 2), 'utf-8');
            this.memory = memory;
            this._onDidUpdate.fire(this.memory);
        } catch (e) {
            console.error('MemoryManager: Failed to save memory.json', e);
        }
    }

    public getMemory(): ConduitMemory {
        return this.memory;
    }

    /**
     * Adds a new piece of contextually relevant information.
     */
    public async learn(content: string, source: string = 'agent'): Promise<void> {
        const entry: MemoryEntry = {
            content,
            timestamp: new Date().toISOString(),
            source
        };

        this.memory.learnings.push(entry);

        // Keep learnings manageable (last 100)
        if (this.memory.learnings.length > 100) {
            this.memory.learnings = this.memory.learnings.slice(-100);
        }

        this.memory.lastUpdated = new Date().toISOString();
        this.save(this.memory);
    }

    /**
     * Updates specific project rules or settings.
     */
    public async updatePreference(key: string, value: any): Promise<void> {
        this.memory.preferences[key] = value;
        this.memory.lastUpdated = new Date().toISOString();
        this.save(this.memory);
    }

    public async addRule(rule: string): Promise<void> {
        if (!this.memory.projectRules.includes(rule)) {
            this.memory.projectRules.push(rule);
            this.memory.lastUpdated = new Date().toISOString();
            this.save(this.memory);
        }
    }
}
