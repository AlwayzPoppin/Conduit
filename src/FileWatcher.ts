import * as vscode from 'vscode';
import { ContextManager } from './ContextManager';

export class FileWatcher {
    private watcher: vscode.FileSystemWatcher | undefined;
    private contextManager: ContextManager;
    private debounceTimer: NodeJS.Timeout | undefined;

    constructor(contextManager: ContextManager) {
        this.contextManager = contextManager;
    }

    start(): void {
        // Watch all files in workspace
        this.watcher = vscode.workspace.createFileSystemWatcher('**/*', false, false, false);

        // On file change
        this.watcher.onDidChange((uri) => {
            this.handleFileChange(uri, 'modified');
        });

        // On file create
        this.watcher.onDidCreate((uri) => {
            this.handleFileChange(uri, 'created');
        });

        // On file delete
        this.watcher.onDidDelete((uri) => {
            this.handleFileChange(uri, 'deleted');
        });

        // Track active editor changes
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            this.updateActiveFiles();
        });

        console.log('Conduit FileWatcher started');
    }

    private handleFileChange(uri: vscode.Uri, action: string): void {
        // Ignore .conduit folder changes to prevent loops
        if (uri.fsPath.includes('.conduit')) {
            return;
        }

        // Ignore common non-source files
        const ignoredPatterns = [
            'node_modules',
            '.git',
            'out',
            'dist',
            '.vscode',
            '*.log'
        ];

        const relativePath = vscode.workspace.asRelativePath(uri);
        if (ignoredPatterns.some(p => relativePath.includes(p.replace('*', '')))) {
            return;
        }

        // Debounce rapid changes
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            this.logAutoContribution(relativePath, action);
        }, 1000);
    }

    private async logAutoContribution(file: string, action: string): Promise<void> {
        // Auto-log file changes as contributions
        const contributionAction = `File ${action}: ${file}`;
        await this.contextManager.logContribution(contributionAction, [file]);
    }

    private async updateActiveFiles(): Promise<void> {
        const activeFiles = vscode.window.visibleTextEditors
            .map(e => vscode.workspace.asRelativePath(e.document.uri));

        // Also log a 'viewed' contribution if it's a code file
        if (activeFiles.length > 0) {
            const lastFile = activeFiles[activeFiles.length - 1];
            if (!lastFile.includes('.conduit')) {
                await this.contextManager.logContribution(`Viewed: ${lastFile}`, [lastFile]);
            }
        }
    }

    stop(): void {
        if (this.watcher) {
            this.watcher.dispose();
        }
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        console.log('Conduit FileWatcher stopped');
    }
}
