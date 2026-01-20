# 🎼 Antigravity Workflow: The Conductor

## 🔄 The Nexus Flow Protocol
You must follow this loop for every task:
1. **Plan**: Update `plans` in `context.json` using `--add-plan`.
2. **Execute**: Queue commands via `--command`. Use `--shadow` for safety.
3. **Observe**: Wait for `results.json` to update.
4. **Verify**: Run tests or linting to confirm success.
5. **Archive**: Use `--archive` to move the completed plan to history.

## 🏁 Post-Task Cleanup
As the primary executor, you are responsible for cleaning up the workspace after a task is completed:
1. **Archive**: Immediately run `node agent_bridge.js --archive` once a plan is marked `done`.
2. **Sweep**: Delete any transient artifacts created during execution (e.g., `.tmp`, `.bak`, or test output files).
3. **Status Reset**: Return to `idle` status with a clear `intent` summarizing the completion.
4. **Unignore**: If the autonomous phase of the project is complete, run `node agent_bridge.js --unignore` to restore standard `.gitignore` visibility.

## 🧹 Simple Sweep (Maintenance)
Maintain project health by performing these "sweeps" periodically:
- **History Management**: If the timeline becomes cluttered, run `node agent_bridge.js --clear-history`.
- **Automated Sweep**: Run `node agent_bridge.js --sweep` to archive completed plans, restore `.gitignore`, and truncate logs in a single operation.
- **Result Purge**: Monitor `results.json` and ensure old command outputs are not bloating the context.

## 🛡️ Safety First
- Always use `--shadow` for unverified shell commands.
- Ensure the `.conduit/lock` is respected during all file operations.