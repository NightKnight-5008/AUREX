#!/usr/bin/env node

/**
 * Validation script for Windows build configuration
 * Verifies that all required settings are present and correct
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateConfig() {
  log('\n=== Windows Build Configuration Validation ===\n', 'blue');

  try {
    // Read package.json
    const packagePath = join(__dirname, '../../package.json');
    const packageContent = readFileSync(packagePath, 'utf-8');
    const packageJson = JSON.parse(packageContent);

    let errors = 0;
    let warnings = 0;

    // Validate Windows configuration
    log('Checking Windows configuration...', 'blue');
    
    if (!packageJson.build?.win) {
      log('✗ Missing build.win configuration', 'red');
      errors++;
    } else {
      const win = packageJson.build.win;

      // Check target
      if (win.target === 'nsis') {
        log('✓ Target set to NSIS', 'green');
      } else {
        log(`✗ Target should be "nsis", got "${win.target}"`, 'red');
        errors++;
      }

      // Check icon
      if (win.icon === 'build-resources/icon.ico') {
        log('✓ Windows icon configured', 'green');
      } else {
        log('⚠ Windows icon not configured or incorrect path', 'yellow');
        warnings++;
      }

      // Check publisher name
      if (win.publisherName) {
        log(`✓ Publisher name: ${win.publisherName}`, 'green');
      } else {
        log('⚠ Publisher name not set', 'yellow');
        warnings++;
      }

      // Check code signing
      if (win.certificateFile && win.certificatePassword) {
        log('✓ Code signing configured', 'green');
        
        // Check if using environment variables
        if (win.certificateFile.includes('${') && win.certificatePassword.includes('${')) {
          log('✓ Using environment variables for certificate', 'green');
        } else {
          log('⚠ Certificate credentials should use environment variables', 'yellow');
          warnings++;
        }

        // Check signing algorithm
        if (win.signingHashAlgorithms?.includes('sha256')) {
          log('✓ SHA-256 signing algorithm configured', 'green');
        } else {
          log('⚠ SHA-256 signing algorithm not configured', 'yellow');
          warnings++;
        }
      } else {
        log('⚠ Code signing not configured (optional for development)', 'yellow');
        warnings++;
      }
    }

    // Validate NSIS configuration
    log('\nChecking NSIS installer configuration...', 'blue');
    
    if (!packageJson.build?.nsis) {
      log('✗ Missing build.nsis configuration', 'red');
      errors++;
    } else {
      const nsis = packageJson.build.nsis;

      // Check one-click install
      if (nsis.oneClick === false) {
        log('✓ One-click install disabled (allows customization)', 'green');
      } else {
        log('⚠ One-click install should be disabled for better UX', 'yellow');
        warnings++;
      }

      // Check installation directory
      if (nsis.allowToChangeInstallationDirectory === true) {
        log('✓ Custom installation directory allowed', 'green');
      } else {
        log('✗ Custom installation directory should be allowed', 'red');
        errors++;
      }

      // Check shortcuts
      if (nsis.createDesktopShortcut === true) {
        log('✓ Desktop shortcut enabled', 'green');
      } else {
        log('⚠ Desktop shortcut not enabled', 'yellow');
        warnings++;
      }

      if (nsis.createStartMenuShortcut === true) {
        log('✓ Start Menu shortcut enabled', 'green');
      } else {
        log('⚠ Start Menu shortcut not enabled', 'yellow');
        warnings++;
      }

      // Check icons
      if (nsis.installerIcon) {
        log('✓ Installer icon configured', 'green');
      } else {
        log('⚠ Installer icon not configured', 'yellow');
        warnings++;
      }

      if (nsis.uninstallerIcon) {
        log('✓ Uninstaller icon configured', 'green');
      } else {
        log('⚠ Uninstaller icon not configured', 'yellow');
        warnings++;
      }

      // Check installation behavior
      if (nsis.perMachine === false) {
        log('✓ Per-user installation (no admin required)', 'green');
      } else {
        log('⚠ Per-machine installation requires admin rights', 'yellow');
        warnings++;
      }

      if (nsis.allowElevation === true) {
        log('✓ Elevation allowed (optional admin install)', 'green');
      } else {
        log('⚠ Elevation not allowed', 'yellow');
        warnings++;
      }

      if (nsis.runAfterFinish === true) {
        log('✓ Run after finish enabled', 'green');
      } else {
        log('⚠ Run after finish not enabled', 'yellow');
        warnings++;
      }

      // Check uninstall behavior
      if (nsis.deleteAppDataOnUninstall === false) {
        log('✓ User data preserved on uninstall', 'green');
      } else {
        log('⚠ User data will be deleted on uninstall', 'yellow');
        warnings++;
      }
    }

    // Validate build scripts
    log('\nChecking build scripts...', 'blue');
    
    const scripts = packageJson.scripts || {};
    
    if (scripts['desktop:package:win']) {
      log('✓ Windows package script exists', 'green');
    } else {
      log('✗ Missing desktop:package:win script', 'red');
      errors++;
    }

    if (scripts['desktop:build']) {
      log('✓ Desktop build script exists', 'green');
    } else {
      log('✗ Missing desktop:build script', 'red');
      errors++;
    }

    // Summary
    log('\n=== Validation Summary ===\n', 'blue');
    
    if (errors === 0 && warnings === 0) {
      log('✓ All checks passed! Configuration is valid.', 'green');
      return 0;
    } else {
      if (errors > 0) {
        log(`✗ ${errors} error(s) found`, 'red');
      }
      if (warnings > 0) {
        log(`⚠ ${warnings} warning(s) found`, 'yellow');
      }
      
      if (errors === 0) {
        log('\nConfiguration is valid but has warnings.', 'yellow');
        return 0;
      } else {
        log('\nConfiguration has errors that must be fixed.', 'red');
        return 1;
      }
    }

  } catch (error) {
    log(`\n✗ Validation failed: ${error.message}`, 'red');
    return 1;
  }
}

// Run validation
const exitCode = validateConfig();
process.exit(exitCode);
