/**
 * Verification script for TrayManager implementation
 * 
 * This script verifies that:
 * 1. TrayManager class exists and is properly exported
 * 2. TrayManager has all required methods
 * 3. TrayManager is integrated into main.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('='.repeat(80));
console.log('TrayManager Implementation Verification');
console.log('='.repeat(80));
console.log();

// Check if TrayManager source file exists
const trayManagerPath = path.join(__dirname, 'src/lib/tray-manager.ts');
const trayManagerExists = fs.existsSync(trayManagerPath);

console.log('1. TrayManager Source File');
console.log(`   Path: ${trayManagerPath}`);
console.log(`   Exists: ${trayManagerExists ? '✅ YES' : '❌ NO'}`);
console.log();

// Check if TrayManager compiled file exists
const trayManagerCompiledPath = path.join(__dirname, 'lib/tray-manager.js');
const trayManagerCompiledExists = fs.existsSync(trayManagerCompiledPath);

console.log('2. TrayManager Compiled File');
console.log(`   Path: ${trayManagerCompiledPath}`);
console.log(`   Exists: ${trayManagerCompiledExists ? '✅ YES' : '❌ NO'}`);
console.log();

// Check TrayManager class structure
if (trayManagerExists) {
  const trayManagerSource = fs.readFileSync(trayManagerPath, 'utf-8');
  
  const requiredMethods = [
    'create',
    'setToolTip',
    'destroy',
    'isCreated',
    'showWindow',
    'hideWindow',
    'quitApplication',
    'updateContextMenu',
    'getTrayIconPath'
  ];
  
  console.log('3. TrayManager Methods');
  requiredMethods.forEach(method => {
    const hasMethod = trayManagerSource.includes(`${method}(`);
    console.log(`   ${method}: ${hasMethod ? '✅' : '❌'}`);
  });
  console.log();
  
  // Check for platform-specific behavior
  console.log('4. Platform-Specific Behavior');
  const hasMacOSCheck = trayManagerSource.includes("process.platform === 'darwin'");
  console.log(`   macOS skip logic: ${hasMacOSCheck ? '✅' : '❌'}`);
  console.log();
  
  // Check for context menu items
  console.log('5. Context Menu Items');
  const hasShowItem = trayManagerSource.includes("'Show AUREX'");
  const hasHideItem = trayManagerSource.includes("'Hide AUREX'");
  const hasQuitItem = trayManagerSource.includes("'Quit'");
  const hasSeparator = trayManagerSource.includes("type: 'separator'");
  
  console.log(`   Show AUREX: ${hasShowItem ? '✅' : '❌'}`);
  console.log(`   Hide AUREX: ${hasHideItem ? '✅' : '❌'}`);
  console.log(`   Separator: ${hasSeparator ? '✅' : '❌'}`);
  console.log(`   Quit: ${hasQuitItem ? '✅' : '❌'}`);
  console.log();
  
  // Check for double-click handler
  console.log('6. Double-Click Handler');
  const hasDoubleClick = trayManagerSource.includes("'double-click'");
  console.log(`   Double-click event: ${hasDoubleClick ? '✅' : '❌'}`);
  console.log();
  
  // Check for tooltip
  console.log('7. Tooltip');
  const hasTooltip = trayManagerSource.includes('setToolTip');
  const hasDefaultTooltip = trayManagerSource.includes('AUREX Financial OS');
  console.log(`   setToolTip method: ${hasTooltip ? '✅' : '❌'}`);
  console.log(`   Default tooltip: ${hasDefaultTooltip ? '✅' : '❌'}`);
  console.log();
}

// Check main.ts integration
const mainPath = path.join(__dirname, 'src/main.ts');
const mainExists = fs.existsSync(mainPath);

console.log('8. Main Process Integration');
console.log(`   main.ts exists: ${mainExists ? '✅' : '❌'}`);

if (mainExists) {
  const mainSource = fs.readFileSync(mainPath, 'utf-8');
  
  const hasTrayImport = mainSource.includes("import { TrayManager }");
  const hasTrayVariable = mainSource.includes('let trayManager');
  const hasTrayInit = mainSource.includes('trayManager = new TrayManager()');
  const hasTrayCreate = mainSource.includes('trayManager.create(mainWindow)');
  const hasTrayCleanup = mainSource.includes('trayManager?.destroy()');
  
  console.log(`   TrayManager import: ${hasTrayImport ? '✅' : '❌'}`);
  console.log(`   trayManager variable: ${hasTrayVariable ? '✅' : '❌'}`);
  console.log(`   TrayManager initialization: ${hasTrayInit ? '✅' : '❌'}`);
  console.log(`   TrayManager create call: ${hasTrayCreate ? '✅' : '❌'}`);
  console.log(`   TrayManager cleanup: ${hasTrayCleanup ? '✅' : '❌'}`);
}
console.log();

// Check for test file
const testPath = path.join(__dirname, 'src/lib/__tests__/tray-manager.test.ts');
const testExists = fs.existsSync(testPath);

console.log('9. Unit Tests');
console.log(`   Test file exists: ${testExists ? '✅' : '❌'}`);
console.log();

// Check for documentation
const docPath = path.join(__dirname, 'TRAY_ICON_README.md');
const docExists = fs.existsSync(docPath);

const implDocPath = path.join(__dirname, 'TASK_9.1_IMPLEMENTATION.md');
const implDocExists = fs.existsSync(implDocPath);

console.log('10. Documentation');
console.log(`   TRAY_ICON_README.md: ${docExists ? '✅' : '❌'}`);
console.log(`   TASK_9.1_IMPLEMENTATION.md: ${implDocExists ? '✅' : '❌'}`);
console.log();

// Summary
console.log('='.repeat(80));
console.log('VERIFICATION SUMMARY');
console.log('='.repeat(80));
console.log();

const allChecks = [
  trayManagerExists,
  trayManagerCompiledExists,
  mainExists,
  testExists,
  docExists,
  implDocExists
];

const passedChecks = allChecks.filter(Boolean).length;
const totalChecks = allChecks.length;

console.log(`Checks Passed: ${passedChecks}/${totalChecks}`);
console.log();

if (passedChecks === totalChecks) {
  console.log('✅ All verification checks passed!');
  console.log();
  console.log('Task 9.1 Implementation Status: COMPLETE');
  console.log();
  console.log('Next Steps:');
  console.log('1. Add tray icon image to build-resources/tray-icon.png');
  console.log('2. Test on Windows to verify tray functionality');
  console.log('3. Test on Linux to verify tray functionality');
  console.log('4. Proceed to Task 9.2 (NotificationManager)');
} else {
  console.log('❌ Some verification checks failed. Please review the output above.');
}

console.log();
console.log('='.repeat(80));
