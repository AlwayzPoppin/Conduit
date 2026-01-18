import * as vscode from 'vscode';
import { ConduitSidebarProvider } from './ConduitSidebarProvider';
import { ContextManager } from './ContextManager';
import { FileWatcher } from './FileWatcher';
import { MemoryManager } from './MemoryManager';
import { StatusBarManager } from './StatusBarManager';
import { Conduit } from './core/conduit';
import { ExtensionLens } from './core/lens';
import { MetaSchema } from './core/meta';
import * as path from 'path';
import * as fs from 'fs';
import { WorkflowBootstrap } from './WorkflowBootstrap';

let contextManager: ContextManager;
let fileWatcher: FileWatcher;
let memoryManager: MemoryManager;
let statusBarManager: StatusBarManager;
let conduit: Conduit;
let lens: ExtensionLens;
let sidebarProvider: ConduitSidebarProvider;

export async function activate(context: vscode.ExtensionContext) {
    const debugLogPath = path.join(context.extensionPath, 'conduit_debug.log');
    const log = (msg: string, level: 'info' | 'warn' | 'error' | 'debug' = 'info', metadata: any = {}) => {
        try {
            const entry = {
                timestamp: new Date().toISOString(),
                level,
                message: msg,
                ...metadata
            };
            fs.appendFileSync(debugLogPath, JSON.stringify(entry) + '\n');
        } catch { }
    };

    try {
        log('Starting Conduit activation...');
        console.log('⚡ Conduit is now active!');

        // 1. Determine Workspace Root
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const workspaceRoot = workspaceFolders?.[0]?.uri.fsPath || context.extensionPath;

        // 2. Ensure .conduit directory exists
        const conduitDir = path.join(workspaceRoot, '.conduit');
        if (!fs.existsSync(conduitDir)) {
            try {
                fs.mkdirSync(conduitDir, { recursive: true });
                log('✨ Conduit: Created .conduit directory');
            } catch (err: any) {
                log(`Failed to create .conduit dir: ${err.message}`, 'error');
            }
        }

        // 3. Initialize core components
        contextManager = new ContextManager(workspaceRoot);
        fileWatcher = new FileWatcher(contextManager);
        memoryManager = new MemoryManager(workspaceRoot);
        statusBarManager = new StatusBarManager(contextManager);

        // Initialize V2 Core
        lens = new ExtensionLens();
        conduit = new Conduit(lens);

        // Register a sample extension for V2 architecture verification
        conduit.registerExtension({
            id: 'sample-processor',
            execute: async (payload: any) => {
                return { ...payload, processed: true, timestamp: Date.now() };
            }
        });

        context.subscriptions.push(statusBarManager);

        // 4. Initialize files and directories
        initializeWorkspaceInfrastructure(workspaceRoot, conduitDir, log, context.extensionPath);
        await WorkflowBootstrap.initializeWorkflows(workspaceRoot);

        // 5. Initialize Context and Watcher
        await contextManager.initialize();
        fileWatcher.start();

        // 6. Register Sidebar Provider
        sidebarProvider = new ConduitSidebarProvider(context, contextManager, memoryManager);
        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider(
                ConduitSidebarProvider.viewType,
                sidebarProvider
            )
        );
        log('Sidebar provider registered.');

        // 7. Register Commands
        registerConduitCommands(context, log);

        // 8. Track file saves for context updates
        context.subscriptions.push(
            vscode.workspace.onDidSaveTextDocument(() => {
                contextManager.captureGitStatus();
            })
        );

        log('Conduit activation completed successfully.');
    } catch (error: any) {
        log(`FATAL: Conduit Activation Failed - ${error.message}`, 'error', { stack: error.stack });
        console.error('❌ FATAL: Conduit Activation Failed', error);
        vscode.window.showErrorMessage(`Conduit Activation Failed: ${error.message}`);
    }
}

/**
 * Initializes the necessary folder structure and files for Conduit
 */
function initializeWorkspaceInfrastructure(workspaceRoot: string, conduitDir: string, log: (msg: string, level?: 'info' | 'warn' | 'error' | 'debug', metadata?: any) => void, extensionPath: string) {
    const setupFile = (fileName: string, defaultContent: object) => {
        const filePath = path.join(conduitDir, fileName);
        if (!fs.existsSync(filePath)) {
            try {
                fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
                log(`Created ${fileName}`);
            } catch (err: any) {
                log(`Failed to create ${fileName}: ${err.message}`, 'warn');
            }
        }
    };

    // Core Data Files
    setupFile('memory.json', { learnings: [], projectRules: [], preferences: {}, lastUpdated: new Date().toISOString() });
    setupFile('learnings.json', { sessions: [], cumulativeInsights: [], lastSession: new Date().toISOString() });
    setupFile('history.json', { events: [], maxEntries: 500, created: new Date().toISOString() });

    // Agent Workflows Support
    const workflowDir = path.join(workspaceRoot, '.agent', 'workflows');
    if (!fs.existsSync(workflowDir)) {
        try { fs.mkdirSync(workflowDir, { recursive: true }); } catch { }
    }

    // Agent Reference Files
    const agentAboutPath = path.join(workspaceRoot, '.agent', 'ABOUT.md');
    if (!fs.existsSync(agentAboutPath)) {
        try {
            const aboutContent = `# Conduit Reference\n\n- .conduit/context.json – Shared state\n- .conduit/memory.json – Project rules\n\nnode agent_bridge.js --help`;
            fs.writeFileSync(agentAboutPath, aboutContent);
        } catch { }
    }

    // Deploy Agent Bridge
    const bridgeSource = path.join(extensionPath, 'agent_bridge.js');
    const bridgeDest = path.join(workspaceRoot, 'agent_bridge.js');
    if (fs.existsSync(bridgeSource) && !fs.existsSync(bridgeDest)) {
        try {
            fs.copyFileSync(bridgeSource, bridgeDest);
            log('Deployed agent_bridge.js to workspace root.');
        } catch (err: any) {
            log(`Failed to deploy agent_bridge.js: ${err.message}`);
        }
    }
}

/**
 * Registers all Conduit-related commands
 */
function registerConduitCommands(context: vscode.ExtensionContext, log: (msg: string, level?: 'info' | 'warn' | 'error' | 'debug', metadata?: any) => void) {
    const commandDefinitions = [
        {
            id: 'conduit.learn',
            handler: async (content?: string) => {
                const learning = content || await vscode.window.showInputBox({
                    prompt: 'What should the agent remember about this project?'
                });
                if (learning) {
                    await memoryManager.learn(learning);
                    vscode.window.showInformationMessage(`🧠 Conduit: Learned rule - "${learning}"`);
                    sidebarProvider.refresh();
                }
            }
        },
        {
            id: 'conduit.openPanel',
            handler: () => {
                vscode.commands.executeCommand('conduit.contextPanel.focus');
            }
        },
        {
            id: 'conduit.logContribution',
            handler: async () => {
                const action = await vscode.window.showInputBox({ prompt: 'Describe the contribution' });
                if (action) {
                    const activeFiles = vscode.window.visibleTextEditors.map(e => vscode.workspace.asRelativePath(e.document.uri));
                    await contextManager.logContribution(action, activeFiles);
                    sidebarProvider.refresh();
                }
            }
        },
        {
            id: 'conduit.logHandoff',
            handler: async () => {
                const suggestion = await vscode.window.showInputBox({ prompt: 'Enter handoff note' });
                if (suggestion) {
                    await contextManager.logHandoff(suggestion);
                    sidebarProvider.refresh();
                }
            }
        },
        {
            id: 'conduit.syncContext',
            handler: async () => {
                await contextManager.sync();
                sidebarProvider.refresh();
                vscode.window.showInformationMessage('✅ Conduit: Context synchronized.');
            }
        },
        {
            id: 'conduit.addPlan',
            handler: async () => {
                const task = await vscode.window.showInputBox({ prompt: 'Enter task description' });
                if (!task) return;
                const assignee = await vscode.window.showQuickPick(['antigravity', 'gemini', 'jules'], { placeHolder: 'Select assignee' });
                if (!assignee) return;
                await contextManager.addPlan(task, assignee as any);
                sidebarProvider.refresh();
            }
        },
        {
            id: 'conduit.updatePlan',
            handler: async (id: string, status: 'pending' | 'in-progress' | 'done') => {
                await contextManager.updatePlan(id, status);
                sidebarProvider.refresh();
            }
        },
        {
            id: 'conduit.clearSession',
            handler: async () => {
                const confirm = await vscode.window.showWarningMessage('Clear session data?', 'Clear', 'Cancel');
                if (confirm === 'Clear') {
                    await contextManager.clearSession();
                    sidebarProvider.refresh();
                    vscode.window.showInformationMessage('✅ Conduit session cleared!');
                }
            }
        },
        {
            id: 'conduit.clearWorkspace',
            handler: async () => {
                const confirm = await vscode.window.showWarningMessage('Purge all Conduit state?', { modal: true }, 'Purge', 'Cancel');
                if (confirm === 'Purge') {
                    const workspaceFolders = vscode.workspace.workspaceFolders;
                    const workspaceRoot = workspaceFolders?.[0]?.uri.fsPath || context.extensionPath;
                    const conduitDir = path.join(workspaceRoot, '.conduit');
                    if (fs.existsSync(conduitDir)) {
                        try { fs.rmSync(conduitDir, { recursive: true, force: true }); } catch { }
                    }
                    sidebarProvider.refresh();
                    vscode.window.showInformationMessage('✅ Conduit: Workspace purified.');
                }
            }
        },
        {
            id: 'conduit.captureState',
            handler: async () => {
                // Logic for capturing UI state snapshot
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (!workspaceRoot) return;
                const snapshotPath = path.join(workspaceRoot, '.conduit', 'snapshot.json');
                const snapshot = {
                    timestamp: new Date().toISOString(),
                    visibleEditors: vscode.window.visibleTextEditors.map(e => vscode.workspace.asRelativePath(e.document.uri)),
                    activeFile: vscode.window.activeTextEditor ? vscode.workspace.asRelativePath(vscode.window.activeTextEditor.document.uri) : null
                };
                fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
                vscode.window.showInformationMessage('📸 Conduit: State captured.');
            }
        },
        {
            id: 'conduit.runBridge',
            handler: async (args: string[]) => {
                log(`Running bridge command: ${args.join(' ')}`);
                if (args.includes('--add-plan')) {
                    const index = args.indexOf('--add-plan');
                    const task = args[index + 1];
                    if (task) {
                        await contextManager.addPlan(task, 'antigravity');
                        vscode.window.showInformationMessage(`📋 Conduit: Plan added - "${task}"`);
                    }
                } else if (args.includes('--archive')) {
                    await contextManager.archivePlans();
                    vscode.window.showInformationMessage('📦 Conduit: Completed plans archived.');
                    sidebarProvider.refresh();
                }
            }
        },
        {
            id: 'conduit.exec',
            handler: async (command?: string) => {
                if (!command) {
                    command = await vscode.window.showInputBox({
                        prompt: 'Enter shell command to execute',
                        placeHolder: 'e.g., echo "hello"'
                    });
                }
                if (!command) return;

                const cp = require('child_process');
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || context.extensionPath;
                log(`EXEC: ${command}`);

                cp.exec(command, { cwd: workspaceRoot }, (err: any, stdout: string, stderr: string) => {
                    if (err) {
                        log(`EXEC FAILED: ${err.message}`, 'error');
                        vscode.window.showErrorMessage(`Conduit Exec Failed: ${err.message}`);
                        return;
                    }
                    if (stdout) log(`STDOUT: ${stdout}`);
                    if (stderr) log(`STDERR: ${stderr}`);
                });
            }
        }
    ];

    commandDefinitions.forEach(cmd => {
        try {
            context.subscriptions.push(vscode.commands.registerCommand(cmd.id, cmd.handler));
            log(`Registered ${cmd.id}`);
        } catch (err: any) {
            log(`Failed to register ${cmd.id}: ${err.message}`);
        }
    });
}

export function deactivate() {
    if (fileWatcher) fileWatcher.stop();
}
