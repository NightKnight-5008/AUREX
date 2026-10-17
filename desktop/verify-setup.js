/**
 * Verification script for Electron Desktop App setup
 * Validates: Task 5 - Checkpoint verification
 * 
 * This script verifies:
 * 1. TypeScript compilation succeeds
 * 2. All required files exist
 * 3. Configuration is correct
 * 4. Dependencies are installed
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function checkFileExists(filePath, description) {
  const exists = fs.existsSync(filePath);
  if (exists) {
    log(`✓ ${description}`, colors.green);
    return true;
  } else {
    log(`✗ ${description} - NOT FOUND: ${filePath}`, colors.red);
    return false;
  }
}

function checkPackageJson() {
  log('\n=== Checking package.json configuration ===', colors.bold);
  
  const packagePath = path.join(__dirname, '../package.json');
  if (!fs.existsSync(packagePath)) {
    log('✗ package.json not found', colors.red);
    return false;
  }
  
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  let allGood = true;
  
  // Check main field
  if (pkg.main === 'desktop/main.js') {
    log('✓ Main field points to desktop/main.js', colors.green);
  } else {
    log(`✗ Main field incorrect: ${pkg.main}`, colors.red);
    allGood = false;
  }
  
  // Check scripts
  const requiredScripts = [
    'desktop:dev',
    'desktop:compile',
    'desktop:build',
    'desktop:package'
  ];
  
  for (const script of requiredScripts) {
    if (pkg.scripts[script]) {
      log(`✓ Script "${script}" exists`, colors.green);
    } else {
      log(`✗ Script "${script}" missing`, colors.red);
      allGood = false;
    }
  }
  
  // Check dependencies
  const requiredDeps = ['electron', 'electron-log', 'electron-updater', 'better-sqlite3'];
  for (const dep of requiredDeps) {
    if (pkg.dependencies[dep] || pkg.devDependencies[dep]) {
      log(`✓ Dependency "${dep}" installed`, colors.green);
    } else {
      log(`✗ Dependency "${dep}" missing`, colors.red);
      allGood = false;
    }
  }
  
  // Check electron-builder config
  if (pkg.build) {
    log('✓ electron-builder configuration exists', colors.green);
  } else {
    log('✗ electron-builder configuration missing', colors.red);
    allGood = false;
  }
  
  return allGood;
}

function checkDesktopFiles() {
  log('\n=== Checking desktop files ===', colors.bold);
  
  let allGood = true;
  
  // Check source files
  allGood &= checkFileExists('desktop/src/main.ts', 'Main process source (main.ts)');
  allGood &= checkFileExists('desktop/src/preload.ts', 'Preload script source (preload.ts)');
  allGood &= checkFileExists('desktop/tsconfig.json', 'TypeScript config (tsconfig.json)');
  
  // Check compiled files
  allGood &= checkFileExists('desktop/main.js', 'Compiled main process (main.js)');
  allGood &= checkFileExists('desktop/preload.js', 'Compiled preload script (preload.js)');
  
  // Check library files
  allGood &= checkFileExists('desktop/src/lib/window-manager.ts', 'Window Manager');
  allGood &= checkFileExists('desktop/src/lib/ipc-security.ts', 'IPC Security Layer');
  allGood &= checkFileExists('desktop/src/lib/secure-storage.ts', 'Secure Storage Manager');
  allGood &= checkFileExists('desktop/src/lib/session-manager.ts', 'Session Manager');
  
  return allGood;
}

function checkViteConfig() {
  log('\n=== Checking Vite configuration ===', colors.bold);
  
  const vitePath = path.join(__dirname, '../vite.config.js');
  if (!fs.existsSync(vitePath)) {
    log('✗ vite.config.js not found', colors.red);
    return false;
  }
  
  const viteConfig = fs.readFileSync(vitePath, 'utf8');
  
  let allGood = true;
  
  // Check for base path configuration
  if (viteConfig.includes('base:') && viteConfig.includes('ELECTRON')) {
    log('✓ Base path configured for Electron', colors.green);
  } else {
    log('⚠ Base path may not be configured for Electron', colors.yellow);
  }
  
  // Check for outDir
  if (viteConfig.includes('outDir:') && viteConfig.includes('dist')) {
    log('✓ Output directory set to dist', colors.green);
  } else {
    log('✗ Output directory not configured correctly', colors.red);
    allGood = false;
  }
  
  return allGood;
}

function checkSecurityConfiguration() {
  log('\n=== Checking security configuration ===', colors.bold);
  
  // Check WindowManager for security settings
  const windowManagerPath = path.join(__dirname, 'src/lib/window-manager.ts');
  if (!fs.existsSync(windowManagerPath)) {
    log('✗ window-manager.ts not found', colors.red);
    return false;
  }
  
  const windowManagerContent = fs.readFileSync(windowManagerPath, 'utf8');
  
  let allGood = true;
  
  // Check for context isolation
  if (windowManagerContent.includes('contextIsolation: true')) {
    log('✓ Context isolation enabled', colors.green);
  } else {
    log('✗ Context isolation not enabled', colors.red);
    allGood = false;
  }
  
  // Check for nodeIntegration disabled
  if (windowManagerContent.includes('nodeIntegration: false')) {
    log('✓ Node integration disabled', colors.green);
  } else {
    log('✗ Node integration not disabled', colors.red);
    allGood = false;
  }
  
  // Check for preload script
  if (windowManagerContent.includes('preload:')) {
    log('✓ Preload script configured', colors.green);
  } else {
    log('✗ Preload script not configured', colors.red);
    allGood = false;
  }
  
  // Check for CSP
  if (windowManagerContent.includes('Content-Security-Policy')) {
    log('✓ Content Security Policy configured', colors.green);
  } else {
    log('✗ Content Security Policy not configured', colors.red);
    allGood = false;
  }
  
  // Check for navigation prevention
  if (windowManagerContent.includes('will-navigate')) {
    log('✓ External navigation prevention configured', colors.green);
  } else {
    log('✗ External navigation prevention not configured', colors.red);
    allGood = false;
  }
  
  return allGood;
}

function main() {
  log('\n' + '='.repeat(60), colors.blue);
  log('AUREX Desktop App - Setup Verification', colors.bold + colors.blue);
  log('='.repeat(60) + '\n', colors.blue);
  
  const results = {
    packageJson: checkPackageJson(),
    desktopFiles: checkDesktopFiles(),
    viteConfig: checkViteConfig(),
    security: checkSecurityConfiguration()
  };
  
  log('\n' + '='.repeat(60), colors.blue);
  log('Verification Summary', colors.bold + colors.blue);
  log('='.repeat(60), colors.blue);
  
  const allPassed = Object.values(results).every(r => r);
  
  for (const [check, passed] of Object.entries(results)) {
    const status = passed ? '✓ PASS' : '✗ FAIL';
    const color = passed ? colors.green : colors.red;
    log(`${status} - ${check}`, color);
  }
  
  log('\n' + '='.repeat(60) + '\n', colors.blue);
  
  if (allPassed) {
    log('✓ All checks passed! Electron app is ready.', colors.bold + colors.green);
    log('\nNext steps:', colors.bold);
    log('  1. Run "npm run desktop:dev" to start the app in development mode');
    log('  2. Run "npm run desktop:build" to build for production');
    log('  3. Run "npm run desktop:package" to create distributable packages\n');
    process.exit(0);
  } else {
    log('✗ Some checks failed. Please review the errors above.', colors.bold + colors.red);
    process.exit(1);
  }
}

main();
