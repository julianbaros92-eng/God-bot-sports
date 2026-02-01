
import { spawn } from 'child_process';
import path from 'path';

// Configuration
const SCAN_INTERVAL_MS = 60 * 60 * 1000;      // 1 Hour
const SETTLE_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 Hours

function runScript(scriptName: string) {
    const scriptPath = path.resolve(__dirname, scriptName);
    console.log(`\n[${new Date().toLocaleTimeString()}] 🚀 Launching ${scriptName}...`);

    // Spawn process: npx tsx src/scripts/scriptName.ts
    const child = spawn('npx', ['tsx', scriptPath], {
        stdio: 'inherit', // Pipe output to parent
        cwd: process.cwd(),
        env: { ...process.env, FORCE_COLOR: 'true' }
    });

    child.on('close', (code) => {
        console.log(`[${new Date().toLocaleTimeString()}] ✅ ${scriptName} finished (Exit Code: ${code})`);
    });

    child.on('error', (err) => {
        console.error(`[${new Date().toLocaleTimeString()}] ❌ Failed to start ${scriptName}:`, err);
    });
}

function startScheduler() {
    console.log("⏰ GodBot Automation Scheduler Started");
    console.log(`   - Scanner: Every 1 hour`);
    console.log(`   - Settler: Every 6 hours`);

    // Initial Run
    runScript('src/scripts/run-scanner.ts');
    // Run settler 2 minutes later to let scanner finish first if needed, or just parallel.
    // Parallel is fine, precise order doesn't matter much, but let's stagger slightly nicely.
    setTimeout(() => runScript('src/scripts/settle-picks.ts'), 30 * 1000);

    // Intervals
    setInterval(() => {
        runScript('src/scripts/run-scanner.ts');
    }, SCAN_INTERVAL_MS);

    setInterval(() => {
        runScript('src/scripts/settle-picks.ts');
    }, SETTLE_INTERVAL_MS);
}

startScheduler();
