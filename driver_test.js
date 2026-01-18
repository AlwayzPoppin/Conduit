const { execSync } = require('child_process');
const path = require('path');

const BRIDGE = `node agent_bridge.js`;

function run(cmd, desc) {
    console.log(`\n--- ${desc} ---`);
    try {
        const output = execSync(`${BRIDGE} ${cmd}`, { encoding: 'utf8' });
        console.log(output.trim());
    } catch (e) {
        console.error(`❌ Failed: ${e.message}`);
        process.exit(1);
    }
}

console.log("🚀 Starting Active Driver Protocol Test...\n");

// 1. Handshake: Wake up and set status
run('--agent antigravity --status working --intent "Initiating Active Driver Protocol"', "Status Handshake");

// 2. Planning: Add a new plan
run('--agent antigravity --add-plan "Verify Full Autonomous Control"', "Plan Management");

// 3. Logging: Log activity
run('--log "Capabilities check: CLI Bridge functional"', "Activity Logging");

// 4. Learning: Update memory
run('--learn "Antigravity has achieved Active Driver status."', "Memory Update");

// 5. Completion: Set to idle
// run('--agent antigravity --status idle --intent "Awaiting User Command"', "Completion Handshake");

console.log("\n✅ Driver Test Complete! Check Sidebar for updates.");
