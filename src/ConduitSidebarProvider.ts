import * as vscode from 'vscode';
import { ContextManager } from './ContextManager';
import * as path from 'path';
import * as fs from 'fs';
import { MemoryManager } from './MemoryManager';
import { execSync } from 'child_process';

export class ConduitSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'conduit.contextPanel';
    private _view?: vscode.WebviewView;
    private _disposables: vscode.Disposable[] = [];
    private _lastSync: string = '';

    constructor(
        private readonly _context: vscode.ExtensionContext,
        private readonly _contextManager: ContextManager,
        private readonly _memoryManager: MemoryManager
    ) {
        this._setupListeners();
    }

    private _setupListeners(): void {
        this._contextManager.onDidUpdate((ctx) => {
            const newLastSync = ctx.lastSync || '';
            if (newLastSync !== this._lastSync) {
                this._lastSync = newLastSync;
                this.refresh();
            }
        }, null, this._disposables);

        vscode.window.onDidChangeActiveTextEditor(() => this.refresh(), null, this._disposables);
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._context.extensionUri]
        };
        webviewView.webview.html = this._getHtmlContent(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data: any) => {
            try {
                const type = data.type || data.command;
                switch (type) {
                    case 'refresh': this.refresh(); break;
                    case 'syncAether':
                        await this._triggerAetherSync();
                        this.refresh();
                        break;
                    case 'checkWarnings':
                        const warnings = await this._scanForWarnings();
                        webviewView.webview.postMessage({ type: 'warnings', data: warnings });
                        break;
                    case 'runBridge':
                        vscode.commands.executeCommand('conduit.runBridge', data.args);
                        break;
                    case 'setMode':
                        if (data.mode) {
                            vscode.commands.executeCommand('conduit.runBridge', ['--mode', data.mode]);
                            vscode.window.showInformationMessage(`🎛️ Agent Mode switched to: ${data.mode}`);
                        }
                        break;

                    // VFS RPC Bridge (AAA Security Requirement)
                    case 'readFile': {
                        try {
                            const uri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, data.path);
                            const content = await vscode.workspace.fs.readFile(uri);
                            webviewView.webview.postMessage({ command: 'rpcResult', id: data.id, result: Buffer.from(content).toString('utf8') });
                        } catch (e: any) {
                            webviewView.webview.postMessage({ command: 'rpcResult', id: data.id, error: e.message });
                        }
                        break;
                    }
                    case 'writeFile': {
                        try {
                            const uri = vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, data.path);
                            const content = Buffer.from(data.content, 'utf8');
                            await vscode.workspace.fs.writeFile(uri, content);
                            webviewView.webview.postMessage({ command: 'rpcResult', id: data.id, result: 'success' });
                        } catch (e: any) {
                            webviewView.webview.postMessage({ command: 'rpcResult', id: data.id, error: e.message });
                        }
                        break;
                    }
                    case 'listFiles': {
                        try {
                            const root = vscode.workspace.workspaceFolders![0].uri;
                            const files = await this._recursiveList(root, '');
                            webviewView.webview.postMessage({ command: 'rpcResult', id: data.id, result: files });
                        } catch (e: any) {
                            webviewView.webview.postMessage({ command: 'rpcResult', id: data.id, error: e.message });
                        }
                        break;
                    }
                    case 'getSecret': {
                        try {
                            const secret = await this._context.secrets.get(data.key);
                            webviewView.webview.postMessage({ command: 'rpcResult', id: data.id, result: secret });
                        } catch (e: any) {
                            webviewView.webview.postMessage({ command: 'rpcResult', id: data.id, error: e.message });
                        }
                        break;
                    }
                    case 'setSecret': {
                        try {
                            await this._context.secrets.store(data.key, data.value);
                            webviewView.webview.postMessage({ command: 'rpcResult', id: data.id, result: 'success' });
                        } catch (e: any) {
                            webviewView.webview.postMessage({ command: 'rpcResult', id: data.id, error: e.message });
                        }
                        break;
                    }
                }
            } catch (err: any) {
                console.error(`ConduitSidebar: Error handling message: ${err.message}`);
                vscode.window.showErrorMessage(`Conduit UI Error: ${err.message}`);
            }
        });

        // Initial sync of map
        this._sendArchData();
    }

    private async _recursiveList(uri: vscode.Uri, relative: string): Promise<string[]> {
        const entries = await vscode.workspace.fs.readDirectory(uri);
        let results: string[] = [];
        for (const [name, type] of entries) {
            const relPath = relative ? path.join(relative, name) : name;
            if (type === vscode.FileType.Directory) {
                if (name === 'node_modules' || name === '.git' || name === '.conduit' || name === '.agent') continue;
                const subResults = await this._recursiveList(vscode.Uri.joinPath(uri, name), relPath);
                results = results.concat(subResults);
            } else {
                results.push(relPath);
            }
        }
        return results;
    }

    private async _triggerAetherSync() {
        const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (rootPath) {
            try {
                const syncPath = path.join(rootPath, '.agent', 'aether', 'sync.js');
                if (fs.existsSync(syncPath)) {
                    execSync(`node "${syncPath}"`, { cwd: rootPath });
                    vscode.window.showInformationMessage('🌌 Aether-Link: Cognitive Sync Complete');
                }
            } catch (e) {
                console.error("Aether sync failed", e);
            }
        }
    }

    private async _scanForWarnings() {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) return [];

        const filePath = activeEditor.document.uri.fsPath;
        const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (rootPath) {
            try {
                const memoryPath = path.join(rootPath, '.agent', 'aether', 'AetherMemory.js');
                if (fs.existsSync(memoryPath)) {
                    const AetherMemory = require(memoryPath);
                    const memory = new AetherMemory();
                    return memory.scanFile(filePath);
                }
            } catch (e) {
                console.error("Warning scan failed", e);
            }
        }
        return [];
    }

    private _sendArchData() {
        if (!this._view) return;
        const rootPath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (rootPath) {
            const hudPath = path.join(rootPath, '.agent', 'aether', 'AetherHUD.md');
            if (fs.existsSync(hudPath)) {
                const content = fs.readFileSync(hudPath, 'utf8');
                const mermaidMatch = content.match(/```mermaid([\s\S]*?)```/);
                if (mermaidMatch) {
                    this._view.webview.postMessage({
                        type: 'archData',
                        mermaid: mermaidMatch[1].trim()
                    });
                }
            }
        }
    }

    public refresh() {
        if (this._view) {
            // Update the basic HTML if needed, but mostly we update via messages now
            const ctx = this._contextManager.getContext();
            const mem = this._memoryManager.getMemory() as any;

            // Inject memory for Rules tab
            // Combine rules and learnings for full visibility
            const rules: any[] = [...(mem.projectRules || []), ...(mem.learnings || [])];

            this._view.webview.postMessage({
                context: { ...ctx, memory: rules }
            });
            this._sendArchData();
        }
    }

    private _getHtmlContent(webview: vscode.Webview): string {
        try {
            const indexPath = path.join(this._context.extensionPath, 'nexus_panel.html');
            if (fs.existsSync(indexPath)) {
                let html = fs.readFileSync(indexPath, 'utf8');

                // Localize Assets (AAA Security Fix: Remove CDN dependencies)
                const toolkitUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'assets', 'toolkit.min.js'));
                const mermaidUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, 'assets', 'mermaid.min.js'));

                html = html.replace(
                    'https://unpkg.com/@vscode/webview-ui-toolkit@latest/dist/toolkit.min.js',
                    toolkitUri.toString()
                );
                html = html.replace(
                    'https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js',
                    mermaidUri.toString()
                );

                return html;
            }
            return `<html><body><h1>Error: nexus_panel.html not found</h1><p>Expected at: ${indexPath}</p></body></html>`;
        } catch (err: any) {
            return `<html><body><h1>Error loading UI</h1><p>${err.message}</p></body></html>`;
        }
    }

    public dispose() {
        this._disposables.forEach(d => d.dispose());
    }
}
