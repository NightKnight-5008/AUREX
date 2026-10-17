/**
 * Simple test script to verify Electron app launches
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('Starting Electron app test...');
console.log('Root directory:', rootDir);

// Set environment to development
const env = {
  ...process.env,
  NODE_ENV: 'development'
};

// Launch Electron
const electron = spawn('npx', ['electron', '.', '--no-sandbox'], {
  cwd: rootDir,
  env: env,
  stdio: 'inherit'
});

// Handle process events
electron.on('error', (error) => {
  console.error('Failed to start Electron:', error);
  process.exit(1);
});

electron.on('close', (code) => {
  console.log(`Electron process exited with code ${code}`);
  process.exit(code);
});

// Give it 10 seconds to start
setTimeout(() => {
  console.log('Electron should be running now. Check if window opened.');
  console.log('Press Ctrl+C to stop.');
}, 10000);
