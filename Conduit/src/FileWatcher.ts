import * as vscode from 'vscode';
import { ContextManager } from './ContextManager';

export class FileWatcher {
    private watchers: vscode.FileSystemWatcher[] = [];
    private contextManager: ContextManager;
    private debounceTimer: NodeJS.Timeout | undefined;
    private pendingChanges: Set<string> = new Set();

    constructor(contextManager: ContextManager) {
        this.contextManager = contextManager;
    }

    start(): void {
        // Read patterns from user configuration instead of hardcoded values
        const config = vscode.workspace.getConfiguration('conduit.fileWatcher');
        const patterns: string[] = config.get('patterns') || [
            '**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx',
            '**/*.json', '**/*.md', '**/*.css', '**/*.html'
        ];

        for (const pattern of patterns) {
            const watcher = vscode.workspace.createFileSystemWatcher(pattern, false, false, false);

            watcher.onDidChange((uri: vscode.Uri) => {
                this.handleFileChange(uri, 'modified');
            });

            watcher.onDidCreate((uri: vscode.Uri) => {
                this.handleFileChange(uri, 'created');
            });

            watcher.onDidDelete((uri: vscode.Uri) => {
                this.handleFileChange(uri, 'deleted');
            });

            this.watchers.push(watcher);
        }

        // Track active editor changes (only register once)
        vscode.window.onDidChangeActiveTextEditor(() => {
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
            '.vscode'
        ];

        const relativePath = vscode.workspace.asRelativePath(uri);
        if (ignoredPatterns.some(p => relativePath.includes(p))) {
            return;
        }

        // Accumulate changes in Set to prevent event loss during batch operations
        this.pendingChanges.add(relativePath);

        // Debounce rapid changes - but now we batch all accumulated files
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
            this.logBatchContribution([...this.pendingChanges]);
            this.pendingChanges.clear();
        }, 1000);
    }

    private async logBatchContribution(files: string[]): Promise<void> {
        if (files.length === 0) return;

        // Log batch of file changes
        const action = files.length === 1
            ? `File modified: ${files[0]}`
            : `Files modified: ${files.slice(0, 5).join(', ')}${files.length > 5 ? ` (+${files.length - 5} more)` : ''}`;

        await this.contextManager.logContribution(action, files.slice(0, 10));
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
        for (const watcher of this.watchers) {
            watcher.dispose();
        }
        this.watchers = [];
        this.pendingChanges.clear();
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        console.log('Conduit FileWatcher stopped');
    }
}
