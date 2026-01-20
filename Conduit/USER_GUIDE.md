# Conduit User Guide

Welcome to the Conduit orchestration platform.

## Architecture

Conduit works by sharing a JSON state file (`.conduit/context.json`) between multiple AI agents.

### The .conduit Directory

Everything related to agent state is stored in `.conduit/`. 
- **context.json**: The single source of truth for current tasks.
- **history.json**: A low-level audit log.
- **commands.json**: Where agents request terminal execution.

## Agent Commands

Agents use `agent_bridge.js` to modify state. 

### Common Switches

- `--agent`: Identify the agent (e.g., `antigravity`, `gemini`)
- `--status`: Set state (`idle`, `working`, `blocked`, `needs-review`)
- `--intent`: Describe the current focus.
- `--bootstrap`: Run on startup to verify environment and visibility.
- `--unignore`: Surgically remove `.conduit` from `.gitignore`.

## Dashboard

Access the Conduit dashboard via the VS Code sidebar.
1. **Plans**: Create and track tasks.
2. **Timeline**: See real-time activity stream.
3. **HUD**: Monitor terminal command results.

## Troubleshooting

If agents lose visibility of their state files, run:
`node agent_bridge.js --unignore`

This will ensure `.conduit/` is readable by the Gemini real-time assistant.
