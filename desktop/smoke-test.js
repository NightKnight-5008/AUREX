/**
 * Smoke test for Electron Desktop App
 * Quick validation that the app can initialize without errors
 */

import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting Electron smoke test...');

// Prevent actual window from showing
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (error) {
    console.error(`✗ ${name}: ${error.message}`);
    testsFailed++;
  }
}

app.whenReady().then(() => {
  console.log('\n=== Running Smoke Tests ===\n');
  
  // Test 1: App can initialize
  test('App initializes', () => {
    if (!app.isReady()) {
      throw new Error('App not ready');
    }
  });
  
  // Test 2: Can create BrowserWindow with security settings
  test('BrowserWindow creation with security settings', () => {
    const window = new BrowserWindow({
      width: 1024,
      height: 768,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });
    
    if (!window) {
      throw new Error('Failed to create window');
    }
    
    // Verify security settings
    const prefs = window.webContents.getWebPreferences();
    if (prefs.nodeIntegration !== false) {
      throw new Error('nodeIntegration should be false');
    }
    if (prefs.contextIsolation !== true) {
      throw new Error('contextIsolation should be true');
    }
    
    window.close();
  });
  
  // Test 3: Preload script exists
  test('Preload script exists', () => {
    const fs = require('fs');
    const preloadPath = path.join(__dirname, 'preload.js');
    if (!fs.existsSync(preloadPath)) {
      throw new Error('Preload script not found');
    }
  });
  
  // Test 4: Main process file exists
  test('Main process file exists', () => {
    const fs = require('fs');
    const mainPath = path.join(__dirname, 'main.js');
    if (!fs.existsSync(mainPath)) {
      throw new Error('Main process file not found');
    }
  });
  
  // Test 5: App paths are accessible
  test('App paths accessible', () => {
    const userData = app.getPath('userData');
    const logs = app.getPath('logs');
    
    if (!userData || !logs) {
      throw new Error('App paths not accessible');
    }
  });
  
  console.log('\n=== Test Results ===');
  console.log(`Passed: ${testsPassed}`);
  console.log(`Failed: ${testsFailed}`);
  console.log(`Total: ${testsPassed + testsFailed}\n`);
  
  if (testsFailed === 0) {
    console.log('✓ All smoke tests passed!');
    app.quit();
    process.exit(0);
  } else {
    console.error('✗ Some smoke tests failed!');
    app.quit();
    process.exit(1);
  }
}).catch((error) => {
  console.error('Failed to initialize app:', error);
  process.exit(1);
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  app.quit();
  process.exit(1);
});
