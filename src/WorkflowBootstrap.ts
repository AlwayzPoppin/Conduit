import * as fs from 'fs';
import * as path from 'path';

export class WorkflowBootstrap {
    public static readonly VERSION = "0.44.0";

    /**
     * Entry point for initializing workspace protocols and ensuring visibility.
     */
    static async initializeWorkflows(workspaceRoot: string): Promise<void> {
        const agentDir = path.join(workspaceRoot, '.agent');
        const workflowsDir = path.join(agentDir, 'workflows');

        // Create directories
        if (!fs.existsSync(agentDir)) fs.mkdirSync(agentDir, { recursive: true });
        if (!fs.existsSync(workflowsDir)) fs.mkdirSync(workflowsDir, { recursive: true });

        // Generate workflows
        this.generateAntigravityProtocol(workflowsDir);
        this.generateGeminiProtocol(workflowsDir);
        this.generateOllamaProtocol(workflowsDir); // Added Ollama
        this.generateWorkflowReadme(workflowsDir);

        // Ensure visibility in .gitignore
        this.ensureVisibility(workspaceRoot);

        console.log('✅ Conduit: Workflow protocols initialized and visibility ensured.');
    }

    private static generateAntigravityProtocol(dir: string): void {
        const filePath = path.join(dir, 'antigravity.md');
        const content = `---
description: Antigravity agent workflow for Conduit collaboration
---

# ANTIGRAVITY WORKFLOW (v${this.VERSION})

## 🎯 PRIMARY DIRECTIVE: PERSISTENCE & LOGGING
1. **Session Handshake**: At the start of EVERY interaction, you MUST re-read this workflow and \`.conduit/context.json\` to recover state.
2. **Log Everything**: You MUST log all work to \`.conduit/context.json\` using \`agent_bridge.js\`.
3. **Memory Utilization**: Proactively read \`.conduit/memory.json\` (Project Rules) and \`.conduit/learnings.json\` (Insights) before starting a task.

### Required Commands
- **Status**: \`node agent_bridge.js --agent antigravity --status working --intent "Task description"\`
- **Log**: \`node agent_bridge.js --agent antigravity --log "Detailed action taken"\`
- **Plan**: \`node agent_bridge.js --agent antigravity --add-plan "Next step" --priority high\`
- **Insight**: \`node agent_bridge.js --agent antigravity --insight "Captured project learning/rule"\`
- **Reserve**: \`node agent_bridge.js --agent antigravity --reserve "path/to/file"\`
- **Release**: \`node agent_bridge.js --agent antigravity --release "path/to/file"\`

## 🛡️ PROACTIVE MANDATES
1. **Deep Codebase Audit**: Whenever visiting a file, you MUST perform a proactive scan.
    - **Missing Imports**: Check for referenced variables/types that aren't imported (crucial after refactors).
    - **Debug Cleanup**: Locate and remove/flag \`console.log\`, \`print\`, or debug comments.
    - **Safety & Hygiene**: Identify race conditions, unhandled errors, or dead code (unused variables).
    - **Zero-Debt Policy**: You MUST aim to keep error and warning codes to a bare minimum. Proactively refactor logic that triggers linter or compiler warnings.
    - **Memory Sync**: If you learn something structural about the project, save it via \`--insight\`.
    - **Silent Cleanup**: Fix minor issues (typos, spacing, logs) without asking. Log these via \`--log\`.
2. **Mission Alignment**: Gauge the overall project mission (ref: \`AetherHUD.md\` or \`ABOUT.md\`) before proposing features. Only suggest improvements that align with the user's core intent.
3. **Venture Builder Analysis (MVP AI)**: Constantly scan for "Fatal Missing Components" that prevent launch (e.g., missing Auth flows, Analytics, Error Boundaries, or Landing Page). Report these immediately as HIGH priority.
4. **Fix-in-Lab**: When encountering complex bottlenecks, propose a "Lab" session to isolate and generate a Unified Diff patch.

## 🎛️ MODE-SPECIFIC DIRECTIVES
The user may set a **Mission Mode** in Conduit to steer your behavior. Check \`.conduit/context.json\` for the \`mode\` field.

- **🧐 Audit**: **MVP AI Mode**. Focus purely on Health Scoring (0-100) and Success Gap Analysis. Do not write code unless requested. Produce a "Revenue Architecture" and "Technical Debt" report.
- **🔬 Research & Planning**: Prioritize reading docs, auditing code, and proposing plans BEFORE making edits. Run \`grep\`, \`view_file\`, and research tools extensively. Minimize code changes until a solid plan is approved.
- **🎨 Creative**: Focus on UI/UX experimentation, animations, premium design patterns, and feature innovation. Use gradients, micro-animations, and modern aesthetics. Prototype freely.
- **⚡ Prototype**: Optimize for speed and MVP logic. Use minimal dependencies, skip polish, and focus on proving the concept works. Favor simplicity over perfection.
- **🎯 Standard** (default): Balanced autonomous operation. Follow all directives equally.

## 🤝 COLLABORATION
1. **Sync Frequency**: Check \`node agent_bridge.js --summary\` every 1-2 tasks.
2. **Conflict Prevention**: Before editing a file, check if a peer agent has a pending plan or active intent for it.
3. **Log Visibility**: IMMEDIATELY log actions so peers are aware of your changes.
4. **File Ownership**: MANDATORY: Reserve a file before editing (\`--reserve\`) and release (\`--release\`) immediately after completion.
`;
        fs.writeFileSync(filePath, content, 'utf8');
    }

    private static generateGeminiProtocol(dir: string): void {
        const filePath = path.join(dir, 'gemini.md');
        const content = `---
description: Gemini agent workflow for Conduit collaboration
---

# GEMINI WORKFLOW (v${this.VERSION})

## 🎯 PRIMARY DIRECTIVE: ARCHITECTURE, REVIEW & MEMORY
1. **Session Handshake**: Re-read this workflow and \`.conduit/context.json\` at the start of every session.
2. **Knowledge Guard**: Monitor \`memory.json\` and \`learnings.json\` to ensure implementations align with across-session rules.
3. **Review**: Guide Antigravity and review implementations via \`agent_bridge.js\`.

### Required Commands
- **Review**: \`node agent_bridge.js --log "Reviewed [task]: approved/needs-fix"\`
- **Plan**: \`node agent_bridge.js --add-plan "New architectural goal"\`
- **Reserve**: \`node agent_bridge.js --agent gemini --reserve "path/to/file"\`
- **Release**: \`node agent_bridge.js --agent gemini --release "path/to/file"\`

## 🛡️ PROACTIVE MANDATES
1. **Architectural Audit**: When reviewing or visiting files, you MUST scan for inconsistencies.
    - **Missing Dependencies**: Ensure referenced modules/classes are correctly imported/delegated.
    - **Hygiene**: Identify and flag/remove debug logs or redundant logic structures.
    - **Zero-Debt Policy**: Enforce a minimal-error architecture. Flag/fix patterns that generate excessive warnings or silenced errors.
    - **Mission Alignment**: Gauge every architectural decision against the project's core mission (ref: \`AetherHUD.md\` or \`ABOUT.md\`). Prevent "feature creep" that deviates from user intent.
2. **MVP Radar Chart**: In **Audit** mode, evaluate and score the project (0-100) on:
    - **Maintainability** (Code cleanliness, structure)
    - **Performance** (Bundle size, render loops)
    - **Security** (Auth, inputs, secrets)
    - **UI/UX** (Aesthetics, responsiveness)
3. **Market Intelligence**: Provide "Revenue Architecture" advice (SaaS vs Freemium) and simulate competitor differentiation based on current trends.
4. **Strategic Roadmap**: Rank all feature suggestions by severity: Minimal, Moderate, Severe, Incapacitating.

## 🤝 COLLABORATION
1. **Sync Frequency**: Monitor Antigravity's status in \`node agent_bridge.js --summary\` every 1-2 tasks.
2. **Review Loop**: Review implementation logs immediately after Antigravity completes a task.
3. **Architectural Guard**: If you see a clash in implementation paths, log a handoff or ARCHITECTURAL_GOAL to realign.
`;
        fs.writeFileSync(filePath, content, 'utf8');
    }

    private static generateOllamaProtocol(dir: string): void {
        const filePath = path.join(dir, 'ollama.md');
        const content = `---
description: Ollama Pilot workflow for Conduit collaboration
---

# OLLAMA PILOT WORKFLOW (v0.1)

## 🎯 PRIMARY DIRECTIVE: LOCAL EXECUTION
You are the **Ollama Pilot**, a local AI agent running on the user's machine.
Your goal is to assist with code navigation, refactoring, and task execution using local LLMs (e.g., \`qwen2.5\`).

## 📡 CONDUIT INTEGRATION
- **Logging**: All your "Actions" (tool executions) are automatically logged to the Conduit timeline via \`agent_bridge.js\`.
- **Identity**: You operate as \`--agent ollama\`.
- **Memory**: You MUST check \`.conduit/memory.json\` and \`.conduit/learnings.json\` before navigating the codebase.

## 🛡️ PROACTIVE MANDATES & SAFETY
1. **Maintenance Audit**: Whenever opening a file, you MUST perform a proactive scan.
    - **Dead Code**: Flag/remove unused variables, imports, or legacy naming remnants.
    - **Debug Cleanup**: Locate and remove/flag \`console.log\`, \`print\`, or debug comments.
    - **Deep Scan**: Check for missing imports and potential race conditions/logic gaps.
    - **Zero-Debt**: Actively work to eliminate linter warnings and console errors.
    - **Report**: Log any silent cleanups to the user via the final report.
2. **Intent Alignment**: Gauge the overall project mission (ref: \`AetherHUD.md\` or \`ABOUT.md\`) before proposing features.
3. **Safety**: Terminal commands (\`run_command\`) require explicit user approval via a modal dialog.

## 🧠 BEST PRACTICES
1. **Explore First**: If asked a vague question, use \`read_file\` or \`run_command\` (ls) to gather context before answering.
2. **Be Concise**: Provide code and direct answers. Avoid fluff.
`;
        fs.writeFileSync(filePath, content, 'utf8');
    }

    private static generateWorkflowReadme(dir: string): void {
        const filePath = path.join(dir, 'README.md');
        const content = `# Conduit Agent Workflows
This directory contains collaboration protocols for AI agents.

- **antigravity.md**: Implementation focus.
- **gemini.md**: Architectural focus.

Use these files to set agent instructions and manage handoffs.
`;
        fs.writeFileSync(filePath, content, 'utf8');
    }

    private static ensureVisibility(workspaceRoot: string): void {
        const gitignorePath = path.join(workspaceRoot, '.gitignore');
        if (!fs.existsSync(gitignorePath)) return;

        try {
            let content = fs.readFileSync(gitignorePath, 'utf8');
            const lines = content.split(/\r?\n/);

            // Surgically remove .conduit and .agent from ignore list
            const filtered = lines.filter(line => {
                const trimmed = line.trim();
                return trimmed !== '.conduit/' && trimmed !== '.agent/' &&
                    trimmed !== '.conduit' && trimmed !== '.agent';
            });

            if (filtered.length !== lines.length) {
                fs.writeFileSync(gitignorePath, filtered.join('\n').trim() + '\n', 'utf8');
                console.log('🔓 Conduit: Removed .conduit and .agent from .gitignore to ensure agent visibility.');
            }
        } catch (err) {
            console.error('⚠️ Conduit: Failed to update .gitignore', err);
        }
    }
}
