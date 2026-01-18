const fs = require('fs');
const path = require('path');

/**
 * Conduit Janitor: Summarizes history.json into context.json
 * Usage: node summarize_history.js "Summary text provided by Jules"
 */

const CONDUIT_DIR = path.join(__dirname, '..', '.conduit');
const CONTEXT_PATH = path.join(CONDUIT_DIR, 'context.json');
const HISTORY_PATH = path.join(CONDUIT_DIR, 'history.json');
const LOCK_PATH = path.join(CONDUIT_DIR, 'lock');

async function acquireLock() {
    while (fs.existsSync(LOCK_PATH)) {
        const lockAge = Date.now() - fs.statSync(LOCK_PATH).mtimeMs;
        if (lockAge > 5000) {
            fs.unlinkSync(LOCK_PATH);
            break;
        }
        console.error("❌ Resource locked. Retrying in 1s...");
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    fs.writeFileSync(LOCK_PATH, process.pid.toString());
}

async function run() {
    const summaryText = process.argv[2] || "Automated log maintenance: History truncated to preserve context window.";

    await acquireLock();

    try {
        // 2. Read existing context
        let context = { activeFiles: [], currentTask: '', agentIntents: {} };
        if (fs.existsSync(CONTEXT_PATH)) {
            context = JSON.parse(fs.readFileSync(CONTEXT_PATH, 'utf8'));
        }

        // 3. Update the summary
        context.historySummary = summaryText;
        context.lastSummaryUpdate = new Date().toISOString();

        // 4. Prune Contributions (Keep only the last 20 to keep context.json small)
        if (context.contributions && context.contributions.length > 20) {
            context.contributions = context.contributions.slice(-20);
        }

        // 4. Atomic Write to context.json
        fs.writeFileSync(CONTEXT_PATH, JSON.stringify(context, null, 2));

        // 5. Truncate history.json (Keep only the last 50 events to save tokens)
        if (fs.existsSync(HISTORY_PATH)) {
            try {
                let history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));
                if (history.length > 100) {
                    history = history.slice(-50);
                    fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
                }
            } catch (e) { console.error("Failed to truncate history.json:", e); }
        }

        console.log("Successfully synchronized history to context.json");
    } catch (error) {
        console.error("Janitor failed:", error);
    } finally {
        // 6. Release Lock
        if (fs.existsSync(LOCK_PATH)) {
            fs.unlinkSync(LOCK_PATH);
        }
    }
}

run();