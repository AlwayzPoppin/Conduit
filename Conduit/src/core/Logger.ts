import * as vscode from 'vscode';

/**
 * Unified Logger for Conduit extension
 * Uses vscode.OutputChannel for UI-visible logging
 */
export class Logger {
    private static instance: Logger;
    private outputChannel: vscode.OutputChannel;

    private agentOutputChannel: vscode.OutputChannel;

    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Conduit');
        this.agentOutputChannel = vscode.window.createOutputChannel('Conduit Agent');
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    public info(message: string, ...args: any[]): void {
        const formatted = this.format('INFO', message, args);
        this.outputChannel.appendLine(formatted);
        console.log(formatted);
    }

    /**
     * Specialized logging for Conduit Agent Bridge interactions
     */
    public agentLog(message: string, ...args: any[]): void {
        const formatted = this.format('AGENT', message, args);
        this.agentOutputChannel.appendLine(formatted);
        // Also echo to main Conduit log for visibility
        this.outputChannel.appendLine(`[AGENT BRIDGE] ${message}`);
    }

    public warn(message: string, ...args: any[]): void {
        const formatted = this.format('WARN', message, args);
        this.outputChannel.appendLine(formatted);
        console.warn(formatted);
    }

    public error(message: string, ...args: any[]): void {
        const formatted = this.format('ERROR', message, args);
        this.outputChannel.appendLine(formatted);
        console.error(formatted);
    }

    public debug(message: string, ...args: any[]): void {
        const formatted = this.format('DEBUG', message, args);
        this.outputChannel.appendLine(formatted);
    }

    public telemetry(event: object): void {
        const formatted = `[${new Date().toISOString()}] [TELEMETRY] ${JSON.stringify(event)}`;
        this.outputChannel.appendLine(formatted);
    }

    public show(): void {
        this.outputChannel.show(true);
    }

    public dispose(): void {
        this.outputChannel.dispose();
    }

    private format(level: string, message: string, args: any[]): string {
        const timestamp = new Date().toISOString();
        const extra = args.length > 0 ? ' ' + args.map(a => JSON.stringify(a)).join(' ') : '';
        return `[${timestamp}] [${level}] ${message}${extra}`;
    }
}

// Singleton export
export const logger = Logger.getInstance();
