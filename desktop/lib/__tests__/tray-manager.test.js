/**
 * Unit tests for TrayManager
 * Validates: Requirements 14.2, 14.3
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TrayManager } from '../tray-manager.js';
import { Tray, Menu } from 'electron';
// Mock electron modules
vi.mock('electron', () => ({
    Tray: vi.fn(),
    Menu: {
        buildFromTemplate: vi.fn()
    },
    BrowserWindow: vi.fn(),
    app: {
        quit: vi.fn()
    },
    nativeImage: {
        createFromPath: vi.fn(() => ({
            isEmpty: () => false
        })),
        createEmpty: vi.fn(() => ({}))
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
describe('TrayManager', () => {
    let trayManager;
    let mockWindow;
    let mockTray;
    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();
        // Create mock window
        mockWindow = {
            show: vi.fn(),
            hide: vi.fn(),
            focus: vi.fn(),
            isMinimized: vi.fn(() => false),
            restore: vi.fn()
        };
        // Create mock tray
        mockTray = {
            setToolTip: vi.fn(),
            setContextMenu: vi.fn(),
            on: vi.fn(),
            destroy: vi.fn()
        };
        // Mock Tray constructor
        Tray.mockImplementation(() => mockTray);
        // Mock Menu.buildFromTemplate
        Menu.buildFromTemplate.mockReturnValue({});
        trayManager = new TrayManager();
    });
    afterEach(() => {
        if (trayManager.isCreated()) {
            trayManager.destroy();
        }
    });
    describe('Platform-specific behavior', () => {
        it('should skip tray creation on macOS', () => {
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', {
                value: 'darwin',
                writable: true
            });
            trayManager.create(mockWindow);
            expect(trayManager.isCreated()).toBe(false);
            expect(Tray).not.toHaveBeenCalled();
            // Restore platform
            Object.defineProperty(process, 'platform', {
                value: originalPlatform,
                writable: true
            });
        });
        it('should create tray on Windows', () => {
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', {
                value: 'win32',
                writable: true
            });
            trayManager.create(mockWindow);
            expect(trayManager.isCreated()).toBe(true);
            expect(Tray).toHaveBeenCalled();
            // Restore platform
            Object.defineProperty(process, 'platform', {
                value: originalPlatform,
                writable: true
            });
        });
        it('should create tray on Linux', () => {
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', {
                value: 'linux',
                writable: true
            });
            trayManager.create(mockWindow);
            expect(trayManager.isCreated()).toBe(true);
            expect(Tray).toHaveBeenCalled();
            // Restore platform
            Object.defineProperty(process, 'platform', {
                value: originalPlatform,
                writable: true
            });
        });
    });
    describe('Tray creation', () => {
        beforeEach(() => {
            // Set platform to Windows for these tests
            Object.defineProperty(process, 'platform', {
                value: 'win32',
                writable: true
            });
        });
        it('should set tooltip on creation', () => {
            trayManager.create(mockWindow);
            expect(mockTray.setToolTip).toHaveBeenCalledWith('AUREX Financial OS');
        });
        it('should create context menu with Show, Hide, and Quit items', () => {
            trayManager.create(mockWindow);
            expect(Menu.buildFromTemplate).toHaveBeenCalled();
            const menuTemplate = Menu.buildFromTemplate.mock.calls[0][0];
            expect(menuTemplate).toHaveLength(4); // Show, Hide, separator, Quit
            expect(menuTemplate[0].label).toBe('Show AUREX');
            expect(menuTemplate[1].label).toBe('Hide AUREX');
            expect(menuTemplate[2].type).toBe('separator');
            expect(menuTemplate[3].label).toBe('Quit');
        });
        it('should register double-click handler', () => {
            trayManager.create(mockWindow);
            expect(mockTray.on).toHaveBeenCalledWith('double-click', expect.any(Function));
        });
    });
    describe('Window management', () => {
        beforeEach(() => {
            Object.defineProperty(process, 'platform', {
                value: 'win32',
                writable: true
            });
            trayManager.create(mockWindow);
        });
        it('should show window when Show menu item is clicked', () => {
            const menuTemplate = Menu.buildFromTemplate.mock.calls[0][0];
            const showMenuItem = menuTemplate[0];
            showMenuItem.click();
            expect(mockWindow.show).toHaveBeenCalled();
            expect(mockWindow.focus).toHaveBeenCalled();
        });
        it('should restore minimized window when showing', () => {
            mockWindow.isMinimized.mockReturnValue(true);
            const menuTemplate = Menu.buildFromTemplate.mock.calls[0][0];
            const showMenuItem = menuTemplate[0];
            showMenuItem.click();
            expect(mockWindow.restore).toHaveBeenCalled();
            expect(mockWindow.show).toHaveBeenCalled();
            expect(mockWindow.focus).toHaveBeenCalled();
        });
        it('should hide window when Hide menu item is clicked', () => {
            const menuTemplate = Menu.buildFromTemplate.mock.calls[0][0];
            const hideMenuItem = menuTemplate[1];
            hideMenuItem.click();
            expect(mockWindow.hide).toHaveBeenCalled();
        });
        it('should show window on double-click', () => {
            const doubleClickHandler = mockTray.on.mock.calls.find((call) => call[0] === 'double-click')[1];
            doubleClickHandler();
            expect(mockWindow.show).toHaveBeenCalled();
            expect(mockWindow.focus).toHaveBeenCalled();
        });
    });
    describe('Tooltip management', () => {
        beforeEach(() => {
            Object.defineProperty(process, 'platform', {
                value: 'win32',
                writable: true
            });
            trayManager.create(mockWindow);
        });
        it('should update tooltip', () => {
            trayManager.setToolTip('New tooltip');
            expect(mockTray.setToolTip).toHaveBeenCalledWith('New tooltip');
        });
    });
    describe('Cleanup', () => {
        beforeEach(() => {
            Object.defineProperty(process, 'platform', {
                value: 'win32',
                writable: true
            });
            trayManager.create(mockWindow);
        });
        it('should destroy tray on cleanup', () => {
            trayManager.destroy();
            expect(mockTray.destroy).toHaveBeenCalled();
            expect(trayManager.isCreated()).toBe(false);
        });
        it('should handle destroy when tray is not created', () => {
            trayManager.destroy();
            trayManager.destroy(); // Call again
            // Should not throw
            expect(trayManager.isCreated()).toBe(false);
        });
    });
});
