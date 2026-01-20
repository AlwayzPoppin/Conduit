# 🔮 Gemini Workflow: The Assistant

## 🔍 Cleanup Validation
Your role is to validate that the workspace remains lean and professional:
1. **Audit Archive**: Verify that Antigravity has run `--archive` for completed plans. If not, prompt the Conductor to do so.
2. **Artifact Detection**: If you notice temporary files or logs left behind after a task, flag them for a "Simple Sweep".
3. **Context Hygiene**: Monitor `context.json` size. If it approaches 10KB, suggest a history summary reset.

## 🧼 Maintenance Oversight
- **Gitignore Integrity**: Remind the Conductor to use `node agent_bridge.js --unignore` when the autonomous phase of a project is complete.
- **Sweep Validation**: If the workspace feels cluttered, suggest the Conductor run `node agent_bridge.js --sweep` to reset the environment.
- **Rule Enforcement**: Ensure all "Learnings" in `memory.json` are still relevant; suggest removals for outdated patterns.
- **HUD Monitoring**: Clear the Live HUD if failed command retries are no longer necessary.
- **Log Maintenance**: Trigger `node summarize_history.js` if the `history.log` becomes unwieldy.

## 🤝 Collaborative Review
- Use `--review` to provide critiques on plans before they move to `in-progress`.
- Validate that the `currentTask` in `context.json` accurately reflects the Conductor's active intent.