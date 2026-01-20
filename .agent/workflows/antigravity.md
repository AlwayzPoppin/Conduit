---
description: Antigravity agent workflow for Conduit collaboration
---

# ANTIGRAVITY WORKFLOW (v0.6.3)

## 🎯 PRIMARY DIRECTIVE: PERSISTENCE & LOGGING
1. **Session Handshake**: At the start of EVERY interaction, you MUST re-read this workflow and `.conduit/context.json` to recover state.
2. **Log Everything**: You MUST log all work to `.conduit/context.json` using `agent_bridge.js`.
3. **Memory Utilization**: Proactively read `.conduit/memory.json` (Project Rules) and `.conduit/learnings.json` (Insights) before starting a task.

### Required Commands
- **Status**: `node agent_bridge.js --agent antigravity --status working --intent "Task description"`
- **Log**: `node agent_bridge.js --agent antigravity --log "Detailed action taken"`
- **Plan**: `node agent_bridge.js --agent antigravity --add-plan "Next step" --priority high`
- **Insight**: `node agent_bridge.js --agent antigravity --insight "Captured project learning/rule"`
- **Reserve**: `node agent_bridge.js --agent antigravity --reserve "path/to/file"`
- **Release**: `node agent_bridge.js --agent antigravity --release "path/to/file"`

## 🛡️ PROACTIVE MANDATES
1. **Deep Codebase Audit**: Whenever visiting a file, you MUST perform a proactive scan.
    - **Missing Imports**: Check for referenced variables/types that aren't imported (crucial after refactors).
    - **Debug Cleanup**: Locate and remove/flag `console.log`, `print`, or debug comments.
    - **Safety & Hygiene**: Identify race conditions, unhandled errors, or dead code (unused variables).
    - **Zero-Debt Policy**: You MUST aim to keep error and warning codes to a bare minimum. Proactively refactor logic that triggers linter or compiler warnings.
    - **Memory Sync**: If you learn something structural about the project, save it via `--insight`.
    - **Silent Cleanup**: Fix minor issues (typos, spacing, logs) without asking. Log these via `--log`.
2. **Mission Alignment**: Gauge the overall project mission (ref: `AetherHUD.md` or `ABOUT.md`) before proposing features. Only suggest improvements that align with the user's core intent.
3. **Venture Builder Analysis (MVP AI)**: Constantly scan for "Fatal Missing Components" that prevent launch (e.g., missing Auth flows, Analytics, Error Boundaries, or Landing Page). Report these immediately as HIGH priority.
4. **Fix-in-Lab**: When encountering complex bottlenecks, propose a "Lab" session to isolate and generate a Unified Diff patch.

## 🎛️ MODE-SPECIFIC DIRECTIVES
The user may set a **Mission Mode** in Conduit to steer your behavior. Check `.conduit/context.json` for the `mode` field.

- **🧐 Audit**: **MVP AI Mode**. Focus purely on Health Scoring (0-100) and Success Gap Analysis. Do not write code unless requested. Produce a "Revenue Architecture" and "Technical Debt" report.
- **🔬 Research & Planning**: Prioritize reading docs, auditing code, and proposing plans BEFORE making edits. Run `grep`, `view_file`, and research tools extensively. Minimize code changes until a solid plan is approved.
- **🎨 Creative**: Focus on UI/UX experimentation, animations, premium design patterns, and feature innovation. Use gradients, micro-animations, and modern aesthetics. Prototype freely.
- **⚡ Prototype**: Optimize for speed and MVP logic. Use minimal dependencies, skip polish, and focus on proving the concept works. Favor simplicity over perfection.
- **🎯 Standard** (default): Balanced autonomous operation. Follow all directives equally.

## 🤝 COLLABORATION
1. **Sync Frequency**: Check `node agent_bridge.js --summary` every 1-2 tasks.
2. **Conflict Prevention**: Before editing a file, check if a peer agent has a pending plan or active intent for it.
3. **Log Visibility**: IMMEDIATELY log actions so peers are aware of your changes.
4. **File Ownership**: MANDATORY: Reserve a file before editing (`--reserve`) and release (`--release`) immediately after completion.
