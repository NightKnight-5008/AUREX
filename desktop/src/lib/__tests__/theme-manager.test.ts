/**
 * Unit tests for ThemeManager
 * Validates: Requirement 14.6
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThemeManager } from '../theme-manager.js';
import { BrowserWindow, nativeTheme } from 'electron';

// Mock electron modules
vi.mock('electron', () => {
  const mockNativeTheme = {
    shouldUseDarkColors: false,
    on: vi.fn(),
    removeAllListeners: vi.fn()
  };

  return {
    BrowserWindow: vi.fn(),
    nativeTheme: mockNativeTheme
  };
});

vi.mock('electron-log', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

describe('ThemeManager', () => {
  let themeManager: ThemeManager;
  let mockWindow: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Create mock window
    mockWindow = {
      webContents: {
        send: vi.fn()
      },
      isDestroyed: vi.fn(() => false)
    };

    // Reset nativeTheme mock
    (nativeTheme as any).shouldUseDarkColors = false;

    themeManager = new ThemeManager();
  });

  afterEach(() => {
    themeManager.destroy();
  });

  describe('Initialization', () => {
    it('should detect light theme on initialization', () => {
      (nativeTheme as any).shouldUseDarkColors = false;

      themeManager.initialize(mockWindow as BrowserWindow);

      expect(themeManager.getCurrentTheme()).toBe('light');
    });

    it('should detect dark theme on initialization', () => {
      (nativeTheme as any).shouldUseDarkColors = true;

      themeManager.initialize(mockWindow as BrowserWindow);

      expect(themeManager.getCurrentTheme()).toBe('dark');
    });

    it('should register theme change listener', () => {
      themeManager.initialize(mockWindow as BrowserWindow);

      expect(nativeTheme.on).toHaveBeenCalledWith('updated', expect.any(Function));
    });
  });

  describe('Theme change detection', () => {
    it('should update theme when OS theme changes to dark', () => {
      (nativeTheme as any).shouldUseDarkColors = false;
      themeManager.initialize(mockWindow as BrowserWindow);

      // Simulate OS theme change to dark
      (nativeTheme as any).shouldUseDarkColors = true;
      const updateHandler = (nativeTheme.on as any).mock.calls.find(
        (call: any) => call[0] === 'updated'
      )[1];
      updateHandler();

      expect(themeManager.getCurrentTheme()).toBe('dark');
    });

    it('should update theme when OS theme changes to light', () => {
      (nativeTheme as any).shouldUseDarkColors = true;
      themeManager.initialize(mockWindow as BrowserWindow);

      // Simulate OS theme change to light
      (nativeTheme as any).shouldUseDarkColors = false;
      const updateHandler = (nativeTheme.on as any).mock.calls.find(
        (call: any) => call[0] === 'updated'
      )[1];
      updateHandler();

      expect(themeManager.getCurrentTheme()).toBe('light');
    });

    it('should send theme-changed event to renderer when theme changes', () => {
      (nativeTheme as any).shouldUseDarkColors = false;
      themeManager.initialize(mockWindow as BrowserWindow);

      // Simulate OS theme change
      (nativeTheme as any).shouldUseDarkColors = true;
      const updateHandler = (nativeTheme.on as any).mock.calls.find(
        (call: any) => call[0] === 'updated'
      )[1];
      updateHandler();

      expect(mockWindow.webContents.send).toHaveBeenCalledWith('theme-changed', 'dark');
    });

    it('should not send event if theme has not changed', () => {
      (nativeTheme as any).shouldUseDarkColors = false;
      themeManager.initialize(mockWindow as BrowserWindow);

      // Clear previous calls
      vi.clearAllMocks();

      // Simulate OS theme update but with same theme
      (nativeTheme as any).shouldUseDarkColors = false;
      const updateHandler = (nativeTheme.on as any).mock.calls.find(
        (call: any) => call[0] === 'updated'
      )[1];
      updateHandler();

      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('should not send event if window is destroyed', () => {
      (nativeTheme as any).shouldUseDarkColors = false;
      themeManager.initialize(mockWindow as BrowserWindow);

      // Mark window as destroyed
      mockWindow.isDestroyed.mockReturnValue(true);

      // Simulate OS theme change
      (nativeTheme as any).shouldUseDarkColors = true;
      const updateHandler = (nativeTheme.on as any).mock.calls.find(
        (call: any) => call[0] === 'updated'
      )[1];
      updateHandler();

      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentTheme', () => {
    it('should return current theme', () => {
      (nativeTheme as any).shouldUseDarkColors = true;
      themeManager.initialize(mockWindow as BrowserWindow);

      expect(themeManager.getCurrentTheme()).toBe('dark');
    });

    it('should return default light theme before initialization', () => {
      expect(themeManager.getCurrentTheme()).toBe('light');
    });
  });

  describe('Cleanup', () => {
    it('should clear window reference on destroy', () => {
      themeManager.initialize(mockWindow as BrowserWindow);
      themeManager.destroy();

      // Simulate theme change after destroy
      (nativeTheme as any).shouldUseDarkColors = true;
      const updateHandler = (nativeTheme.on as any).mock.calls.find(
        (call: any) => call[0] === 'updated'
      )[1];
      updateHandler();

      // Should not crash or send events
      expect(mockWindow.webContents.send).not.toHaveBeenCalled();
    });
  });
});
