/**
 * Unit tests for ThemeManager
 * Validates: Requirement 14.6
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThemeManager } from '../theme-manager.js';
import { nativeTheme } from 'electron';
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
    let themeManager;
    let mockWindow;
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
        nativeTheme.shouldUseDarkColors = false;
        themeManager = new ThemeManager();
    });
    afterEach(() => {
        themeManager.destroy();
    });
    describe('Initialization', () => {
        it('should detect light theme on initialization', () => {
            nativeTheme.shouldUseDarkColors = false;
            themeManager.initialize(mockWindow);
            expect(themeManager.getCurrentTheme()).toBe('light');
        });
        it('should detect dark theme on initialization', () => {
            nativeTheme.shouldUseDarkColors = true;
            themeManager.initialize(mockWindow);
            expect(themeManager.getCurrentTheme()).toBe('dark');
        });
        it('should register theme change listener', () => {
            themeManager.initialize(mockWindow);
            expect(nativeTheme.on).toHaveBeenCalledWith('updated', expect.any(Function));
        });
    });
    describe('Theme change detection', () => {
        it('should update theme when OS theme changes to dark', () => {
            nativeTheme.shouldUseDarkColors = false;
            themeManager.initialize(mockWindow);
            // Simulate OS theme change to dark
            nativeTheme.shouldUseDarkColors = true;
            const updateHandler = nativeTheme.on.mock.calls.find((call) => call[0] === 'updated')[1];
            updateHandler();
            expect(themeManager.getCurrentTheme()).toBe('dark');
        });
        it('should update theme when OS theme changes to light', () => {
            nativeTheme.shouldUseDarkColors = true;
            themeManager.initialize(mockWindow);
            // Simulate OS theme change to light
            nativeTheme.shouldUseDarkColors = false;
            const updateHandler = nativeTheme.on.mock.calls.find((call) => call[0] === 'updated')[1];
            updateHandler();
            expect(themeManager.getCurrentTheme()).toBe('light');
        });
        it('should send theme-changed event to renderer when theme changes', () => {
            nativeTheme.shouldUseDarkColors = false;
            themeManager.initialize(mockWindow);
            // Simulate OS theme change
            nativeTheme.shouldUseDarkColors = true;
            const updateHandler = nativeTheme.on.mock.calls.find((call) => call[0] === 'updated')[1];
            updateHandler();
            expect(mockWindow.webContents.send).toHaveBeenCalledWith('theme-changed', 'dark');
        });
        it('should not send event if theme has not changed', () => {
            nativeTheme.shouldUseDarkColors = false;
            themeManager.initialize(mockWindow);
            // Clear previous calls
            vi.clearAllMocks();
            // Simulate OS theme update but with same theme
            nativeTheme.shouldUseDarkColors = false;
            const updateHandler = nativeTheme.on.mock.calls.find((call) => call[0] === 'updated')[1];
            updateHandler();
            expect(mockWindow.webContents.send).not.toHaveBeenCalled();
        });
        it('should not send event if window is destroyed', () => {
            nativeTheme.shouldUseDarkColors = false;
            themeManager.initialize(mockWindow);
            // Mark window as destroyed
            mockWindow.isDestroyed.mockReturnValue(true);
            // Simulate OS theme change
            nativeTheme.shouldUseDarkColors = true;
            const updateHandler = nativeTheme.on.mock.calls.find((call) => call[0] === 'updated')[1];
            updateHandler();
            expect(mockWindow.webContents.send).not.toHaveBeenCalled();
        });
    });
    describe('getCurrentTheme', () => {
        it('should return current theme', () => {
            nativeTheme.shouldUseDarkColors = true;
            themeManager.initialize(mockWindow);
            expect(themeManager.getCurrentTheme()).toBe('dark');
        });
        it('should return default light theme before initialization', () => {
            expect(themeManager.getCurrentTheme()).toBe('light');
        });
    });
    describe('Cleanup', () => {
        it('should clear window reference on destroy', () => {
            themeManager.initialize(mockWindow);
            themeManager.destroy();
            // Simulate theme change after destroy
            nativeTheme.shouldUseDarkColors = true;
            const updateHandler = nativeTheme.on.mock.calls.find((call) => call[0] === 'updated')[1];
            updateHandler();
            // Should not crash or send events
            expect(mockWindow.webContents.send).not.toHaveBeenCalled();
        });
    });
});
