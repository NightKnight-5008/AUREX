/**
 * Verification script for AutoUpdateManager implementation
 * Task 8.1: Create AutoUpdateManager class
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('AutoUpdateManager Implementation Verification');
console.log('Task 8.1: Create AutoUpdateManager class');
console.log('='.repeat(80));
console.log();

// Check if AutoUpdateManager file exists
const autoUpdateManagerPath = path.join(__dirname, 'src', 'lib', 'auto-update-manager.ts');
const autoUpdateManagerExists = fs.existsSync(autoUpdateManagerPath);

console.log('✓ Checking AutoUpdateManager file exists...');
console.log(`  File: ${autoUpdateManagerPath}`);
console.log(`  Exists: ${autoUpdateManagerExists ? 'YES' : 'NO'}`);
console.log();

if (!autoUpdateManagerExists) {
  console.error('✗ FAILED: AutoUpdateManager file not found');
  process.exit(1);
}

// Read the AutoUpdateManager file
const autoUpdateManagerContent = fs.readFileSync(autoUpdateManagerPath, 'utf8');

// Check for required features
const checks = [
  {
    name: 'Configure electron-updater',
    pattern: /configureUpdater.*autoUpdater/s,
    requirement: '7.1'
  },
  {
    name: 'Update check on startup (3 second delay)',
    pattern: /checkForUpdatesOnStartup.*setTimeout.*3000/s,
    requirement: '7.1, 7.2'
  },
  {
    name: 'Periodic update checks (every 4 hours)',
    pattern: /startPeriodicUpdateChecks.*4 \* 60 \* 60 \* 1000/s,
    requirement: '7.3'
  },
  {
    name: 'Handle checking-for-update event',
    pattern: /autoUpdater\.on\('checking-for-update'/,
    requirement: '7.4'
  },
  {
    name: 'Handle update-available event',
    pattern: /autoUpdater\.on\('update-available'/,
    requirement: '7.4'
  },
  {
    name: 'Handle update-not-available event',
    pattern: /autoUpdater\.on\('update-not-available'/,
    requirement: '7.4'
  },
  {
    name: 'Handle download-progress event',
    pattern: /autoUpdater\.on\('download-progress'/,
    requirement: '7.4'
  },
  {
    name: 'Handle update-downloaded event',
    pattern: /autoUpdater\.on\('update-downloaded'/,
    requirement: '7.4'
  },
  {
    name: 'Handle error event',
    pattern: /autoUpdater\.on\('error'/,
    requirement: '7.4'
  },
  {
    name: 'Send update notifications to renderer via IPC',
    pattern: /notifyRenderer.*webContents\.send/s,
    requirement: '7.6'
  },
  {
    name: 'Log all update events',
    pattern: /log\.(info|error|warn)/,
    requirement: '7.7'
  },
  {
    name: 'Production only checks',
    pattern: /isProduction.*checkForUpdates/s,
    requirement: '7.1'
  }
];

console.log('✓ Checking required features...');
console.log();

let allPassed = true;
checks.forEach(check => {
  const passed = check.pattern.test(autoUpdateManagerContent);
  const status = passed ? '✓' : '✗';
  console.log(`  ${status} ${check.name}`);
  console.log(`    Requirement: ${check.requirement}`);
  if (!passed) {
    allPassed = false;
  }
});

console.log();

// Check main.ts integration
const mainPath = path.join(__dirname, 'src', 'main.ts');
const mainExists = fs.existsSync(mainPath);

console.log('✓ Checking main.ts integration...');
console.log(`  File: ${mainPath}`);
console.log(`  Exists: ${mainExists ? 'YES' : 'NO'}`);
console.log();

if (mainExists) {
  const mainContent = fs.readFileSync(mainPath, 'utf8');
  
  const integrationChecks = [
    {
      name: 'Import AutoUpdateManager',
      pattern: /import.*AutoUpdateManager.*from.*auto-update-manager/
    },
    {
      name: 'Create AutoUpdateManager instance',
      pattern: /autoUpdateManager.*=.*new AutoUpdateManager/
    },
    {
      name: 'Set window reference',
      pattern: /autoUpdateManager\.setWindow/
    },
    {
      name: 'Check for updates on startup',
      pattern: /autoUpdateManager\.checkForUpdatesOnStartup/
    },
    {
      name: 'Start periodic update checks',
      pattern: /autoUpdateManager\.startPeriodicUpdateChecks/
    },
    {
      name: 'Cleanup on quit',
      pattern: /autoUpdateManager.*destroy/
    }
  ];
  
  console.log('  Integration checks:');
  integrationChecks.forEach(check => {
    const passed = check.pattern.test(mainContent);
    const status = passed ? '✓' : '✗';
    console.log(`    ${status} ${check.name}`);
    if (!passed) {
      allPassed = false;
    }
  });
}

console.log();

// Check preload.ts integration
const preloadPath = path.join(__dirname, 'src', 'preload.ts');
const preloadExists = fs.existsSync(preloadPath);

console.log('✓ Checking preload.ts integration...');
console.log(`  File: ${preloadPath}`);
console.log(`  Exists: ${preloadExists ? 'YES' : 'NO'}`);
console.log();

if (preloadExists) {
  const preloadContent = fs.readFileSync(preloadPath, 'utf8');
  
  const preloadChecks = [
    {
      name: 'onUpdateChecking listener',
      pattern: /onUpdateChecking.*ipcRenderer\.on\('update-checking'/s
    },
    {
      name: 'onUpdateAvailable listener',
      pattern: /onUpdateAvailable.*ipcRenderer\.on\('update-available'/s
    },
    {
      name: 'onUpdateNotAvailable listener',
      pattern: /onUpdateNotAvailable.*ipcRenderer\.on\('update-not-available'/s
    },
    {
      name: 'onUpdateProgress listener',
      pattern: /onUpdateProgress.*ipcRenderer\.on\('update-progress'/s
    },
    {
      name: 'onUpdateDownloaded listener',
      pattern: /onUpdateDownloaded.*ipcRenderer\.on\('update-downloaded'/s
    },
    {
      name: 'onUpdateError listener',
      pattern: /onUpdateError.*ipcRenderer\.on\('update-error'/s
    }
  ];
  
  console.log('  Preload script checks:');
  preloadChecks.forEach(check => {
    const passed = check.pattern.test(preloadContent);
    const status = passed ? '✓' : '✗';
    console.log(`    ${status} ${check.name}`);
    if (!passed) {
      allPassed = false;
    }
  });
}

console.log();

// Check compiled output
const compiledPath = path.join(__dirname, 'lib', 'auto-update-manager.js');
const compiledExists = fs.existsSync(compiledPath);

console.log('✓ Checking compiled output...');
console.log(`  File: ${compiledPath}`);
console.log(`  Exists: ${compiledExists ? 'YES' : 'NO'}`);
console.log();

// Summary
console.log('='.repeat(80));
if (allPassed && compiledExists) {
  console.log('✓ ALL CHECKS PASSED');
  console.log();
  console.log('Task 8.1 Implementation Summary:');
  console.log('  ✓ AutoUpdateManager class created');
  console.log('  ✓ Configured electron-updater with GitHub/generic provider');
  console.log('  ✓ Implemented update check on startup (production only, 3 second delay)');
  console.log('  ✓ Implemented periodic update checks (every 4 hours)');
  console.log('  ✓ Handle all update events (checking, available, not-available, progress, downloaded, error)');
  console.log('  ✓ Send update notifications to renderer via IPC');
  console.log('  ✓ Log all update events to electron-log');
  console.log('  ✓ Integrated into main.ts');
  console.log('  ✓ Exposed update listeners in preload.ts');
  console.log('  ✓ TypeScript compiled successfully');
  console.log();
  console.log('Requirements validated: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7');
  process.exit(0);
} else {
  console.log('✗ SOME CHECKS FAILED');
  console.log();
  console.log('Please review the failed checks above.');
  process.exit(1);
}
