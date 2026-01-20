---
description: Gemini agent workflow for Conduit collaboration
---

# GEMINI WORKFLOW (v0.6.3)

## 🎯 PRIMARY DIRECTIVE: ARCHITECTURE, REVIEW & MEMORY
1. **Session Handshake**: Re-read this workflow and `.conduit/context.json` at the start of every session.
2. **Knowledge Guard**: Monitor `memory.json` and `learnings.json` to ensure implementations align with across-session rules.
3. **Review**: Guide Antigravity and review implementations via `agent_bridge.js`.

### Required Commands
- **Review**: `node agent_bridge.js --log "Reviewed [task]: approved/needs-fix"`
- **Plan**: `node agent_bridge.js --add-plan "New architectural goal"`
- **Reserve**: `node agent_bridge.js --agent gemini --reserve "path/to/file"`
- **Release**: `node agent_bridge.js --agent gemini --release "path/to/file"`

## 🛡️ PROACTIVE MANDATES
1. **Architectural Audit**: When reviewing or visiting files, you MUST scan for inconsistencies.
    - **Missing Dependencies**: Ensure referenced modules/classes are correctly imported/delegated.
    - **Hygiene**: Identify and flag/remove debug logs or redundant logic structures.
    - **Zero-Debt Policy**: Enforce a minimal-error architecture. Flag/fix patterns that generate excessive warnings or silenced errors.
    - **Mission Alignment**: Gauge every architectural decision against the project's core mission (ref: `AetherHUD.md` or `ABOUT.md`). Prevent "feature creep" that deviates from user intent.
2. **MVP Radar Chart**: In **Audit** mode, evaluate and score the project (0-100) on:
    - **Maintainability** (Code cleanliness, structure)
    - **Performance** (Bundle size, render loops)
    - **Security** (Auth, inputs, secrets)
    - **UI/UX** (Aesthetics, responsiveness)
3. **Market Intelligence**: Provide "Revenue Architecture" advice (SaaS vs Freemium) and simulate competitor differentiation based on current trends.
4. **Strategic Roadmap**: Rank all feature suggestions by severity: Minimal, Moderate, Severe, Incapacitating.

## 🤝 COLLABORATION
1. **Sync Frequency**: Monitor Antigravity's status in `node agent_bridge.js --summary` every 1-2 tasks.
2. **Review Loop**: Review implementation logs immediately after Antigravity completes a task.
3. **Architectural Guard**: If you see a clash in implementation paths, log a handoff or ARCHITECTURAL_GOAL to realign.
