import * as vscode from 'vscode';
import { ContextManager } from './ContextManager';

export class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem;
    private _disposables: vscode.Disposable[] = [];

    constructor(private contextManager: ContextManager) {
        // Create status bar item (left side, high priority)
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );

        this.statusBarItem.command = 'Conduit.contextPanel.focus';
        this.statusBarItem.tooltip = 'Click to open Conduit sidebar';

        // Listen for context updates
        this.contextManager.onDidUpdate((ctx) => {
            this.updateStatusBar(ctx);
        });

        // Initial update
        this.updateStatusBar(this.contextManager.getContext());
        this.statusBarItem.show();
    }

    private updateStatusBar(context: any): void {
        const agentIntents = context.agentIntents || {};
        const agents = Object.keys(agentIntents);

        if (agents.length === 0) {
            this.statusBarItem.text = '$(zap) Conduit: Idle';
            this.statusBarItem.backgroundColor = undefined;
            return;
        }

        // Check for blocked agents
        const blockedAgents = agents.filter(a => agentIntents[a]?.status === 'blocked');
        const workingAgents = agents.filter(a => agentIntents[a]?.status === 'working');

        if (blockedAgents.length > 0) {
            this.statusBarItem.text = `$(warning) Conduit: ${blockedAgents.length} Blocked`;
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            this.statusBarItem.tooltip = `Blocked: ${blockedAgents.join(', ')}`;
        } else if (workingAgents.length > 0) {
            const agentStatus = workingAgents.map(a => {
                const emoji = a === 'antigravity' ? '🤖' : '💎';
                return `${emoji} ${a}`;
            }).join(' | ');

            this.statusBarItem.text = `$(sync~spin) Conduit: ${agentStatus}`;
            this.statusBarItem.backgroundColor = undefined;
            this.statusBarItem.tooltip = workingAgents.map(a =>
                `${a}: ${agentIntents[a]?.intent || 'Working...'}`
            ).join('\n');
        } else {
            this.statusBarItem.text = '$(check) Conduit: Ready';
            this.statusBarItem.backgroundColor = undefined;
        }
    }

    public dispose(): void {
        this.statusBarItem.dispose();
        this._disposables.forEach(d => d.dispose());
    }
}
