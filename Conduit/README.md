# ⚡ Conduit

![Version](https://img.shields.io/visual-studio-marketplace/v/NexGenSynapse.conduit) ![Installs](https://img.shields.io/visual-studio-marketplace/i/NexGenSynapse.conduit) ![Rating](https://img.shields.io/visual-studio-marketplace/r/NexGenSynapse.conduit)


**Autonomous "Walk Flow" platform for Antigravity and Gemini AI agents. (v0.42.4)**

Conduit bridges Antigravity (autonomous agent) and Gemini (real-time assistant), enabling them to share context and coordinate tasks seamlessly.

---

## 🎭 The Duo

| Agent | Role |
|-------|------|
| **Antigravity** | 🎼 **The Conductor**. Your autonomous agent that orchestrates work. |
| **Gemini Extension** | 🔮 Pair-programmer. Syncs via shared context. |

### 🎭 The Conductor Protocol

**You talk to Antigravity. Antigravity orchestrates everything else.**

```
        ┌──────────────────┐
        │       YOU        │
        └────────┬─────────┘
                 │ (talk here)
                 ▼
        ┌──────────────────┐
        │   ANTIGRAVITY    │◄─── The Conductor
        └────────┬─────────┘
                 │
                 ▼
             GEMINI
```

---

## ✨ Features

### 📁 Context Sharing
- Automatically tracks active files and symbols
- Shares context between AI agents via a unified `.conduit/context.json`

### 📋 Plans & Timeline
- Track pending, active, and completed work items
- Visual queue in the dashboard
- **Suite Sync Timeline**: Visual history of orchestration.

### 🤖 Agent Status
- See which agents are active

### 🌉 Command Bridge (Autonomous)
- AI agents can trigger commands by writing to `.conduit/commands.json`
- Enables true autonomous workflows
- **Shadow Mode**: Execute commands in a containerized environment (optional).

---

## 📦 Packaging & Installation

1. Install the VS Code Extension Manager: `npm install -g @vscode/vsce`
2. Run the package command: `npx vsce package --no-dependencies`
3. Install the resulting `.vsix` file via VS Code.

---

## 📁 File Structure

| File | Purpose |
|------|---------|
| `.conduit/context.json` | Shared state & active intent |
| `.conduit/commands.json` | Command Bridge queue |
| `.conduit/results.json` | Execution output |
| `.conduit/snapshot.json` | Vision Interface state |
| `.conduit/history.json` | Audit trail |

---

## 🤖 Agent Integration

Agents use `agent_bridge.js` to communicate state changes:
1. **Bootstrap**: `node agent_bridge.js --bootstrap`
2. **Status Update**: `node agent_bridge.js --agent gemini --status working --intent "Implementing Auth"`
3. **Queue Command**: `node agent_bridge.js --agent antigravity --command "npm test"`
4. **Maintenance**: `node agent_bridge.js --sweep`
5. **Summarize**: `node summarize_history.js "Summary"`

---

## 🛡️ Best Practices

- **Locking**: Check for `.conduit/lock` before writing.
- **Atomic Writes**: Read, modify, and write JSON swiftly.
- **Intent First**: Update `intent` before major workspace changes.
- **Visibility**: `.conduit/` and `.agent/` are visible to agents on startup by default.

---

**Made with ⚡ by Michael Watkins | Powered by Google Gemini**
