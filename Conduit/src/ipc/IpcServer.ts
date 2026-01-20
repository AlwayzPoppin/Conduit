import * as http from 'http';
import { logger } from '../core/Logger';
import { ContextManager } from '../ContextManager';

export interface JsonRpcRequest {
    jsonrpc: '2.0';
    method: string;
    params?: any;
    id: number | string;
}

export interface JsonRpcResponse {
    jsonrpc: '2.0';
    result?: any;
    error?: { code: number; message: string };
    id: number | string | null;
}

/**
 * Localhost JSON-RPC 2.0 server for agent IPC
 * Replaces file-based polling with real-time communication
 */
export class IpcServer {
    private server: http.Server | null = null;
    private readonly port: number = 47808;

    constructor(private contextManager: ContextManager) { }

    public async start(): Promise<void> {
        let currentPort = this.port;
        const maxPort = this.port + 10;

        while (currentPort <= maxPort) {
            try {
                await this.tryListen(currentPort);
                logger.info(`IPC Server listening on http://127.0.0.1:${currentPort}`);
                logger.agentLog(`Network interface active on port ${currentPort}`);
                await this.writePortFile(currentPort);
                return;
            } catch (err: any) {
                if (err.code === 'EADDRINUSE') {
                    logger.warn(`IPC port ${currentPort} in use, trying next...`);
                    currentPort++;
                } else {
                    throw err;
                }
            }
        }
        logger.error(`Failed to find available IPC port after ${maxPort - this.port} attempts`);
    }

    private tryListen(port: number): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server = http.createServer((req, res) => {
                this.handleRequest(req, res);
            });

            this.server.on('error', (err) => {
                reject(err);
            });

            this.server.listen(port, '127.0.0.1', () => {
                resolve();
            });
        });
    }

    private async writePortFile(port: number): Promise<void> {
        const workspaceFolders = (await import('vscode')).workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) return;

        const portFilePath = (await import('path')).join(workspaceFolders[0].uri.fsPath, '.conduit', 'ipc_port');
        const fs = await import('fs');

        try {
            await fs.promises.writeFile(portFilePath, port.toString(), 'utf8');
            logger.debug(`IPC port ${port} written to ${portFilePath}`);
        } catch (e: any) {
            logger.error(`Failed to write IPC port file: ${e.message}`);
        }
    }

    public stop(): void {
        if (this.server) {
            this.server.close();
            this.server = null;
            logger.info('IPC Server stopped');
        }
    }

    private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
        // CORS headers for local development
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');

        if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.writeHead(204);
            res.end();
            return;
        }

        if (req.method !== 'POST') {
            res.writeHead(405);
            res.end(JSON.stringify({ error: 'Method not allowed' }));
            return;
        }

        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const request: JsonRpcRequest = JSON.parse(body);
                const response = await this.handleRpc(request);
                res.writeHead(200);
                res.end(JSON.stringify(response));
            } catch (e: any) {
                const errorResponse: JsonRpcResponse = {
                    jsonrpc: '2.0',
                    error: { code: -32700, message: 'Parse error' },
                    id: null
                };
                res.writeHead(400);
                res.end(JSON.stringify(errorResponse));
            }
        });
    }

    private async handleRpc(request: JsonRpcRequest): Promise<JsonRpcResponse> {
        const { method, params, id } = request;
        logger.agentLog(`REQ: [${method}]`, params);

        try {
            let result: any;

            switch (method) {
                case 'getContext':
                    result = this.contextManager.getContext();
                    break;

                case 'updateIntent':
                    await this.contextManager.updateAgentIntent(
                        params.agent,
                        params.status,
                        params.intent
                    );
                    result = { success: true };
                    break;

                case 'logContribution':
                    await this.contextManager.logContribution(
                        params.action,
                        params.files || []
                    );
                    result = { success: true };
                    break;

                case 'logHandoff':
                    await this.contextManager.logHandoff(
                        params.suggestion,
                        params.from || params.agent || 'antigravity',
                        params.to || 'gemini'
                    );
                    result = { success: true };
                    break;

                case 'addPlan':
                    await this.contextManager.addPlan(
                        params.task,
                        params.assignee
                    );
                    result = { success: true };
                    break;

                case 'summarizeHistory':
                    await this.contextManager.summarizeHistory(params?.text);
                    result = { success: true };
                    break;

                case 'reserveFile':
                    result = await this.contextManager.reserveFile(
                        params.filePath,
                        params.agent
                    );
                    break;

                case 'releaseFile':
                    await this.contextManager.releaseFile(
                        params.filePath,
                        params.agent
                    );
                    result = { success: true };
                    break;

                case 'sync':
                    await this.contextManager.sync();
                    result = { success: true };
                    break;

                default:
                    return {
                        jsonrpc: '2.0',
                        error: { code: -32601, message: `Method not found: ${method}` },
                        id
                    };
            }

            return { jsonrpc: '2.0', result, id };
        } catch (e: any) {
            logger.error(`IPC error in ${method}: ${e.message}`);
            return {
                jsonrpc: '2.0',
                error: { code: -32000, message: e.message },
                id
            };
        }
    }
}
