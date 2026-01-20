import * as fs from 'fs';
import * as path from 'path';
import { logger } from './core/Logger';

export class WorkflowBootstrap {
    public static readonly VERSION = "0.6.3";

    /**
     * Entry point for initializing workspace protocols and ensuring visibility.
     */
    static async initializeWorkflows(workspaceRoot: string): Promise<void> {
        const agentDir = path.join(workspaceRoot, '.agent');
        const workflowsDir = path.join(agentDir, 'workflows');

        try {
            // Create directories asynchronously
            if (!fs.existsSync(agentDir)) await fs.promises.mkdir(agentDir, { recursive: true });
            if (!fs.existsSync(workflowsDir)) await fs.promises.mkdir(workflowsDir, { recursive: true });

            // Load and generate externalized protocols
            await this.generateProtocols(workflowsDir);

            // Generate standard README
            await this.generateWorkflowReadme(workflowsDir);

            // Ensure visibility in .gitignore
            await this.ensureVisibility(workspaceRoot);

            logger.info('✅ Conduit: Workflow protocols initialized and visibility ensured.');
        } catch (err: any) {
            logger.error(`Failed to initialize workflows: ${err.message}`);
        }
    }

    private static async generateProtocols(dir: string): Promise<void> {
        const definitionsPath = path.join(__dirname, 'core', 'agent_definitions.json');
        if (!fs.existsSync(definitionsPath)) {
            logger.warn('Agent definitions file not found, skipping protocol generation');
            return;
        }

        try {
            const data = await fs.promises.readFile(definitionsPath, 'utf8');
            const agents = JSON.parse(data);

            for (const agent of agents) {
                const filePath = path.join(dir, `${agent.name}.md`);
                if (fs.existsSync(filePath)) {
                    logger.debug(`Preserving existing ${agent.name}.md workflow`);
                    continue;
                }

                // Replace version placeholder
                const content = agent.protocol.replace(/\$\{VERSION\}/g, this.VERSION);
                const fullContent = `---
description: ${agent.description}
---

${content}
`;
                await fs.promises.writeFile(filePath, fullContent, 'utf8');
                logger.debug(`Generated protocol for ${agent.name}`);
            }
        } catch (e: any) {
            logger.error(`Error generating protocols: ${e.message}`);
        }
    }

    private static async generateWorkflowReadme(dir: string): Promise<void> {
        const filePath = path.join(dir, 'README.md');
        if (fs.existsSync(filePath)) return;

        const content = `# Conduit Agent Workflows
This directory contains collaboration protocols for AI agents.

The protocols are generated based on the architectural definitions in Conduit.
Feel free to customize these files; they will not be overwritten if they exist.
`;
        await fs.promises.writeFile(filePath, content, 'utf8');
    }

    private static async ensureVisibility(workspaceRoot: string): Promise<void> {
        const gitignorePath = path.join(workspaceRoot, '.gitignore');
        if (!fs.existsSync(gitignorePath)) return;

        try {
            const content = await fs.promises.readFile(gitignorePath, 'utf8');
            const lines = content.split(/\r?\n/);

            // Surgically remove .conduit and .agent from ignore list
            const filtered = lines.filter(line => {
                const trimmed = line.trim();
                return trimmed !== '.conduit/' && trimmed !== '.agent/' &&
                    trimmed !== '.conduit' && trimmed !== '.agent';
            });

            if (filtered.length !== lines.length) {
                await fs.promises.writeFile(gitignorePath, filtered.join('\n').trim() + '\n', 'utf8');
                logger.info('🔓 Conduit: Updated .gitignore to ensure agent visibility.');
            }
        } catch (err: any) {
            logger.error(`Failed to update .gitignore: ${err.message}`);
        }
    }
}
