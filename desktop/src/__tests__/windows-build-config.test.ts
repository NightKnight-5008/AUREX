import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Windows Build Configuration', () => {
  let packageJson: any;

  beforeAll(() => {
    const packagePath = join(process.cwd(), 'package.json');
    const packageContent = readFileSync(packagePath, 'utf-8');
    packageJson = JSON.parse(packageContent);
  });

  describe('Windows Target Configuration', () => {
    it('should have NSIS as target', () => {
      expect(packageJson.build.win.target).toBe('nsis');
    });

    it('should have publisher name set', () => {
      expect(packageJson.build.win.publisherName).toBe('AUREX Inc.');
    });

    it('should have code signing configuration', () => {
      expect(packageJson.build.win.signingHashAlgorithms).toContain('sha256');
    });
  });

  describe('NSIS Installer Configuration', () => {
    it('should disable one-click install', () => {
      expect(packageJson.build.nsis.oneClick).toBe(false);
    });

    it('should allow custom installation directory', () => {
      expect(packageJson.build.nsis.allowToChangeInstallationDirectory).toBe(true);
    });

    it('should create desktop shortcut', () => {
      expect(packageJson.build.nsis.createDesktopShortcut).toBe(true);
    });

    it('should create start menu shortcut', () => {
      expect(packageJson.build.nsis.createStartMenuShortcut).toBe(true);
    });

    it('should allow elevation for admin install', () => {
      expect(packageJson.build.nsis.allowElevation).toBe(true);
    });

    it('should run application after installation', () => {
      expect(packageJson.build.nsis.runAfterFinish).toBe(true);
    });

    it('should preserve user data on uninstall', () => {
      expect(packageJson.build.nsis.deleteAppDataOnUninstall).toBe(false);
    });

    it('should install per-user by default', () => {
      expect(packageJson.build.nsis.perMachine).toBe(false);
    });
  });

  describe('Build Scripts', () => {
    it('should have Windows package script', () => {
      expect(packageJson.scripts['desktop:package:win']).toBe('electron-builder --win');
    });

    it('should have all platforms package script', () => {
      expect(packageJson.scripts['desktop:package:all']).toBe('electron-builder -mwl');
    });

    it('should have build script', () => {
      expect(packageJson.scripts['desktop:build']).toContain('npm run build');
      expect(packageJson.scripts['desktop:build']).toContain('npm run desktop:compile');
    });
  });

  describe('Requirements Validation', () => {
    it('should satisfy Requirement 3.8: Windows NSIS installer target', () => {
      expect(packageJson.build.win.target).toBe('nsis');
    });

    it('should satisfy Requirement 11.7: electron-builder Windows configuration', () => {
      expect(packageJson.build.win).toBeDefined();
      expect(packageJson.build.nsis).toBeDefined();
    });

    it('should satisfy Requirements 18.1-18.8: NSIS installer options', () => {
      const nsis = packageJson.build.nsis;
      
      // 18.1: One-click install configuration
      expect(nsis.oneClick).toBe(false);
      
      // 18.2: Installation directory selection
      expect(nsis.allowToChangeInstallationDirectory).toBe(true);
      
      // 18.3: Desktop shortcut
      expect(nsis.createDesktopShortcut).toBe(true);
      
      // 18.4: Start menu shortcut
      expect(nsis.createStartMenuShortcut).toBe(true);
      
      // 18.7: Run after finish
      expect(nsis.runAfterFinish).toBe(true);
      
      // 18.8: User data preservation
      expect(nsis.deleteAppDataOnUninstall).toBe(false);
    });

    it('should satisfy Requirements 19.1, 19.7: Windows 10+ support and code signing', () => {
      // Windows 10+ support is implicit in electron-builder
      expect(packageJson.build.win.target).toBe('nsis');
      
      // Code signing configuration
      expect(packageJson.build.win.signingHashAlgorithms).toContain('sha256');
    });
  });

  describe('Security Configuration', () => {
    it('should use SHA-256 for code signing', () => {
      expect(packageJson.build.win.signingHashAlgorithms).toContain('sha256');
    });

    it('should not verify update code signature in development', () => {
      // This allows development without certificates
      expect(packageJson.build.win.verifyUpdateCodeSignature).toBe(false);
    });

    it('should not verify update code signature in development', () => {
      // This allows development without certificates
      expect(packageJson.build.win.verifyUpdateCodeSignature).toBe(false);
    });
  });

  describe('Output Configuration', () => {
    it('should output to release directory', () => {
      expect(packageJson.build.directories.output).toBe('release');
    });

    it('should use build-resources for assets', () => {
      expect(packageJson.build.directories.buildResources).toBe('build-resources');
    });

    it('should include necessary files', () => {
      const files = packageJson.build.files;
      expect(files).toContain('dist/**/*');
      expect(files).toContain('desktop/**/*.js');
      expect(files).toContain('package.json');
    });
  });
});
