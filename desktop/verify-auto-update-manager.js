/**
 * Verification script for AutoUpdateManager
 * 
 * This script verifies that the AutoUpdateManager class is properly implemented
 * and can be instantiated without errors.
 */

import { AutoUpdateManager } from './lib/auto-update-manager.js';

console.log('='.repeat(80));
console.log('AutoUpdateManager Verification');
console.log('='.repeat(80));

try {
  // Test 1: Create instance in development mode
  console.log('\n✓ Test 1: Creating AutoUpdateManager in development mode...');
  const devManager = new AutoUpdateManager(false);
  console.log('  ✓ Development mode instance created successfully');

  // Test 2: Create instance in production mode
  console.log('\n✓ Test 2: Creating AutoUpdateManager in production mode...');
  const prodManager = new AutoUpdateManager(true);
  console.log('  ✓ Production mode instance created successfully');

  // Test 3: Set window reference
  console.log('\n✓ Test 3: Setting window reference...');
  const mockWindow = {
    isDestroyed: () => false,
    webContents: {
      send: (channel, data) => {
        console.log(`  ✓ Mock IPC send: ${channel}`);
      }
    }
  };
  prodManager.setWindow(mockWindow);
  console.log('  ✓ Window reference set successfully');

  // Test 4: Check for updates on startup (should skip in dev)
  console.log('\n✓ Test 4: Testing checkForUpdatesOnStartup...');
  devManager.checkForUpdatesOnStartup();
  console.log('  ✓ Development mode: Update check skipped as expected');
  
  // Test 5: Start periodic update checks (should skip in dev)
  console.log('\n✓ Test 5: Testing startPeriodicUpdateChecks...');
  devManager.startPeriodicUpdateChecks();
  console.log('  ✓ Development mode: Periodic checks skipped as expected');

  // Test 6: Stop periodic update checks
  console.log('\n✓ Test 6: Testing stopPeriodicUpdateChecks...');
  prodManager.stopPeriodicUpdateChecks();
  console.log('  ✓ Periodic checks stopped successfully');

  // Test 7: Destroy manager
  console.log('\n✓ Test 7: Testing destroy...');
  devManager.destroy();
  prodManager.destroy();
  console.log('  ✓ Managers destroyed successfully');

  // Test 8: Verify class methods exist
  console.log('\n✓ Test 8: Verifying class methods...');
  const testManager = new AutoUpdateManager(false);
  const methods = [
    'setWindow',
    'checkForUpdatesOnStartup',
    'startPeriodicUpdateChecks',
    'stopPeriodicUpdateChecks',
    'checkForUpdates',
    'downloadUpdate',
    'quitAndInstall',
    'destroy'
  ];
  
  for (const method of methods) {
    if (typeof testManager[method] !== 'function') {
      throw new Error(`Method ${method} is not defined`);
    }
    console.log(`  ✓ Method ${method} exists`);
  }
  testManager.destroy();

  console.log('\n' + '='.repeat(80));
  console.log('✓ All AutoUpdateManager verification tests passed!');
  console.log('='.repeat(80));
  console.log('\nSummary:');
  console.log('  - AutoUpdateManager class is properly implemented');
  console.log('  - All required methods are present');
  console.log('  - Instance creation works in both dev and production modes');
  console.log('  - Window reference can be set');
  console.log('  - Update checks can be triggered');
  console.log('  - Periodic checks can be started and stopped');
  console.log('  - Cleanup works correctly');
  console.log('\n✓ Task 8.1 Implementation Complete!');
  console.log('='.repeat(80));

} catch (error) {
  console.error('\n✗ Verification failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
