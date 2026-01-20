---
description: How Antigravity integrates with Conduit for autonomous orchestration
---

# Antigravity Agent Workflow

## Overview
Antigravity acts as **The Conductor** in the NexGen Suite. It orchestrates tasks, manages context, and coordinates with other agents (like Gemini) through Conduit.

## Initial Setup

### 1. Bootstrap the Conduit Environment
```bash
// turbo
node agent_bridge.js --bootstrap
```

### 2. Register Agent Status
```bash
node agent_bridge.js --agent antigravity --status active --intent "Starting session"
```

## Core Workflow Commands

### Update Status & Intent
```bash
node agent_bridge.js --agent antigravity --status working --intent "Description of current task"
```

### Queue a Command for Execution
```bash
node agent_bridge.js --agent antigravity --command "npm test"
```

### Add a Plan Item
```bash
node agent_bridge.js --add-plan "Task description"
```

### Sweep Stale Data
```bash
node agent_bridge.js --sweep
```

### Summarize Session History
```bash
node summarize_history.js "Session summary message"
```

## File Locations

| File | Purpose |
|------|---------|
| `.conduit/context.json` | Shared state & active intent |
| `.conduit/commands.json` | Command bridge queue |
| `.conduit/results.json` | Execution output |
| `.conduit/memory.json` | Project rules & learnings |
| `.conduit/history.json` | Audit trail |

## Best Practices

1. **Check for locks** before writing: `.conduit/lock`
2. **Update intent first** before major workspace changes
3. **Use atomic writes** – read, modify, write JSON swiftly
4. **Archive completed plans** when finishing a session:
   ```bash
   node agent_bridge.js --archive
   ```

## Handoff Protocol

When handing off to another agent:
1. Update status to `idle`
2. Set a descriptive intent describing what was accomplished and next steps
3. Queue any pending commands in `commands.json`

```bash
node agent_bridge.js --agent antigravity --status idle --intent "Completed: X. Next: Y"
```
