/**
 * Unit tests for ShortcutManager
 * Validates: Requirements 14.5, 19.5
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { globalShortcut } from 'electron';
import { ShortcutManager } from '../shortcut-manager';
// Mock electron modules
vi.mock('electron', () => ({
    BrowserWindow: vi.fn(),
    globalShortcut: {
        register: vi.fn(),
        unregisterAll: vi.fn(),
        isRegistered: vi.fn()
    }
}));
vi.mock('electron-log', () => ({
    default: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn()
    }
}));
describe('ShortcutManager', () => {
    let shortcutManager;
    let mockWindow;
    beforeEach(() => {
        shortcutManager = new ShortcutManager();
        // Create mock window
        mockWindow = {
            isVisible: vi.fn().mockReturnValue(true),
            hide: vi.fn(),
            show: vi.fn(),
            focus: vi.fn(),
            close: vi.fn(),
            isDestroyed: vi.fn().mockReturnValue(false),
            webContents: {
                send: vi.fn()
            }
        };
        // Reset mocks
        vi.clearAllMocks();
        // Mock globalShortcut.register to return true by default
        globalShortcut.register.mockReturnValue(true);
    });
    afterEach(() => {
        shortcutManager.destroy();
    });
    describe('register', () => {
        it('should register all keyboard shortcuts', () => {
            // Validates: Requirement 14.5 - Support keyboard shortcuts for common actions
            shortcutManager.register(mockWindow);
            // Verify all shortcuts were registered
            expect(globalShortcut.register).toHaveBeenCalledTimes(4);
            // Verify specific shortcuts
            expect(globalShortcut.register).toHaveBeenCalledWith('CommandOrControl+Shift+A', expect.any(Function));
            expect(globalShortcut.register).toHaveBeenCalledWith('CommandOrControl+N', expect.any(Function));
            expect(globalShortcut.register).toHaveBeenCalledWith('CommandOrControl+W', expect.any(Function));
            expect(globalShortcut.register).toHaveBeenCalledWith('CommandOrControl+Shift+C', expect.any(Function));
        });
        it('should register platform-specific shortcuts using CommandOrControl', () => {
            // Validates: Requirement 19.5 - Platform-specific keyboard shortcuts (Cmd on macOS, Ctrl on Windows/Linux)
            shortcutManager.register(mockWindow);
            const calls = globalShortcut.register.mock.calls;
            // All shortcuts should use CommandOrControl for cross-platform compatibility
            calls.forEach((call) => {
                expect(call[0]).toContain('CommandOrControl');
            });
        });
        it('should track registered shortcuts', () => {
            shortcutManager.register(mockWindow);
            const registered = shortcutManager.getRegisteredShortcuts();
            expect(registered).toHaveLength(4);
            expect(registered).toContain('CommandOrControl+Shift+A');
            expect(registered).toContain('CommandOrControl+N');
            expect(registered).toContain('CommandOrControl+W');
            expect(registered).toContain('CommandOrControl+Shift+C');
        });
        it('should handle registration failures gracefully', () => {
            // Mock one shortcut failing to register
            globalShortcut.register
                .mockReturnValueOnce(true)
                .mockReturnValueOnce(false)
                .mockReturnValueOnce(true)
                .mockReturnValueOnce(true);
            shortcutManager.register(mockWindow);
            // Should still register other shortcuts
            const registered = shortcutManager.getRegisteredShortcuts();
            expect(registered).toHaveLength(3);
        });
    });
    describe('show/hide window shortcut (Cmd/Ctrl+Shift+A)', () => {
        it('should hide window when visible', () => {
            shortcutManager.register(mockWindow);
            // Get the callback for the show/hide shortcut
            const calls = globalShortcut.register.mock.calls;
            const showHideCall = calls.find((call) => call[0] === 'CommandOrControl+Shift+A');
            const callback = showHideCall[1];
            mockWindow.isVisible.mockReturnValue(true);
            callback();
            expect(mockWindow.hide).toHaveBeenCalled();
            expect(mockWindow.show).not.toHaveBeenCalled();
        });
        it('should show and focus window when hidden', () => {
            shortcutManager.register(mockWindow);
            const calls = globalShortcut.register.mock.calls;
            const showHideCall = calls.find((call) => call[0] === 'CommandOrControl+Shift+A');
            const callback = showHideCall[1];
            mockWindow.isVisible.mockReturnValue(false);
            callback();
            expect(mockWindow.show).toHaveBeenCalled();
            expect(mockWindow.focus).toHaveBeenCalled();
            expect(mockWindow.hide).not.toHaveBeenCalled();
        });
    });
    describe('new window shortcut (Cmd/Ctrl+N)', () => {
        it('should send new-window event to renderer', () => {
            // Validates: Requirement 14.5 - Common actions (new window)
            shortcutManager.register(mockWindow);
            const calls = globalShortcut.register.mock.calls;
            const newWindowCall = calls.find((call) => call[0] === 'CommandOrControl+N');
            const callback = newWindowCall[1];
            callback();
            expect(mockWindow.webContents.send).toHaveBeenCalledWith('new-window');
        });
        it('should not send event if window is destroyed', () => {
            shortcutManager.register(mockWindow);
            const calls = globalShortcut.register.mock.calls;
            const newWindowCall = calls.find((call) => call[0] === 'CommandOrControl+N');
            const callback = newWindowCall[1];
            mockWindow.isDestroyed.mockReturnValue(true);
            callback();
            expect(mockWindow.webContents.send).not.toHaveBeenCalled();
        });
    });
    describe('close window shortcut (Cmd/Ctrl+W)', () => {
        it('should close the window', () => {
            // Validates: Requirement 14.5 - Common actions (close window)
            shortcutManager.register(mockWindow);
            const calls = globalShortcut.register.mock.calls;
            const closeWindowCall = calls.find((call) => call[0] === 'CommandOrControl+W');
            const callback = closeWindowCall[1];
            callback();
            expect(mockWindow.close).toHaveBeenCalled();
        });
    });
    describe('quick capture shortcut (Cmd/Ctrl+Shift+C)', () => {
        it('should send quick-capture event to renderer', () => {
            shortcutManager.register(mockWindow);
            const calls = globalShortcut.register.mock.calls;
            const quickCaptureCall = calls.find((call) => call[0] === 'CommandOrControl+Shift+C');
            const callback = quickCaptureCall[1];
            callback();
            expect(mockWindow.webContents.send).toHaveBeenCalledWith('quick-capture');
        });
        it('should not send event if window is destroyed', () => {
            shortcutManager.register(mockWindow);
            const calls = globalShortcut.register.mock.calls;
            const quickCaptureCall = calls.find((call) => call[0] === 'CommandOrControl+Shift+C');
            const callback = quickCaptureCall[1];
            mockWindow.isDestroyed.mockReturnValue(true);
            callback();
            expect(mockWindow.webContents.send).not.toHaveBeenCalled();
        });
    });
    describe('isRegistered', () => {
        it('should check if a shortcut is registered', () => {
            globalShortcut.isRegistered.mockReturnValue(true);
            const result = shortcutManager.isRegistered('CommandOrControl+N');
            expect(globalShortcut.isRegistered).toHaveBeenCalledWith('CommandOrControl+N');
            expect(result).toBe(true);
        });
    });
    describe('unregisterAll', () => {
        it('should unregister all shortcuts', () => {
            shortcutManager.register(mockWindow);
            expect(shortcutManager.getRegisteredShortcuts()).toHaveLength(4);
            shortcutManager.unregisterAll();
            expect(globalShortcut.unregisterAll).toHaveBeenCalled();
            expect(shortcutManager.getRegisteredShortcuts()).toHaveLength(0);
        });
        it('should handle errors during unregistration', () => {
            globalShortcut.unregisterAll.mockImplementation(() => {
                throw new Error('Unregister failed');
            });
            shortcutManager.register(mockWindow);
            // Should not throw
            expect(() => shortcutManager.unregisterAll()).not.toThrow();
        });
    });
    describe('destroy', () => {
        it('should unregister all shortcuts and cleanup', () => {
            shortcutManager.register(mockWindow);
            shortcutManager.destroy();
            expect(globalShortcut.unregisterAll).toHaveBeenCalled();
            expect(shortcutManager.getRegisteredShortcuts()).toHaveLength(0);
        });
    });
    describe('getRegisteredShortcuts', () => {
        it('should return a copy of registered shortcuts array', () => {
            shortcutManager.register(mockWindow);
            const shortcuts1 = shortcutManager.getRegisteredShortcuts();
            const shortcuts2 = shortcutManager.getRegisteredShortcuts();
            // Should be equal but not the same reference
            expect(shortcuts1).toEqual(shortcuts2);
            expect(shortcuts1).not.toBe(shortcuts2);
        });
        it('should return empty array when no shortcuts registered', () => {
            const shortcuts = shortcutManager.getRegisteredShortcuts();
            expect(shortcuts).toEqual([]);
        });
    });
});
