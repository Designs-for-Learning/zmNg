import { spawn, type ChildProcess } from 'child_process';
import { platformConfig } from '../platforms.config';

let driverProcess: ChildProcess | null = null;
let appProcess: ChildProcess | null = null;

export async function launchTauriWithDriver(): Promise<void> {
  const { driverPort, binaryPath } = platformConfig.tauri;

  process.stdout.write(`[tauri] Starting tauri-driver on port ${driverPort}...\n`);
  driverProcess = spawn('tauri-driver', ['--port', String(driverPort)], {
    stdio: 'pipe',
    env: { ...process.env },
  });

  for (let i = 0; i < 10; i++) {
    try {
      const response = await fetch(`http://localhost:${driverPort}/status`);
      if (response.ok) break;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  if (binaryPath) {
    process.stdout.write(`[tauri] Launching app: ${binaryPath}\n`);
    appProcess = spawn(binaryPath, [], { stdio: 'ignore' });
    await new Promise((r) => setTimeout(r, 3000));
  }
}

export async function stopTauri(): Promise<void> {
  if (appProcess) { appProcess.kill(); appProcess = null; }
  if (driverProcess) { driverProcess.kill(); driverProcess = null; }
}
