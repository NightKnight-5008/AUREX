/**
 * Unit tests for PowerManager
 * Validates: Requirement 14.7
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PowerManager } from '../power-manager.js';
import { powerMonitor } from 'electron';
// Mock electron modules
vi.mock('electron', () => {
    const mockPowerMonitor = {
        on: vi.fn(),
        removeAllListeners: vi.fn()
    };
    return {
        BrowserWindow: vi.fn(),
        powerMonitor: mockPowerMonitor
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
describe('PowerManager', () => {
    let powerManager;
    let mockWindow;
    let mockSessionManager;
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
        // Create mock session manager
        mockSessionManager = {
            lockApp: vi.fn(),
            unlock: vi.fn(),
            isLocked: vi.fn(() => false),
            recordActivity: vi.fn()
        };
        powerManager = new PowerManager();
    });
    afterEach(() => {
        powerManager.destroy();
    });
    describe('Initialization', () => {
        it('should register all power event listeners', () => {
            powerManager.initialize(mockWindow, mockSessionManager);
            // Verify all event listeners are registered
            const calls = powerMonitor.on.mock.calls;
            const eventTypes = calls.map((call) => call[0]);
            expect(eventTypes).toContain('suspend');
            expect(eventTypes).toContain('lock-screen');
            expect(eventTypes).toContain('resume');
            expect(eventTypes).toContain('unlock-screen');
        });
        it('should register exactly 4 event listeners', () => {
            powerManager.initialize(mockWindow, mockSessionManager);
            expect(powerMonitor.on).toHaveBeenCalledTimes(4);
        });
    });
    describe('System suspend event', () => {
        it('should lock application on system suspend', () => {
            powerManager.initialize(mockWindow, mockSessionManager);
            // Find and trigger the suspend event handler
            const suspendHandler = powerMonitor.on.mock.calls.find((call) => call[0] === 'suspend')[1];
            suspendHandler();
            expect(mockSessionManager.lockApp).toHaveBeenCalledTimes(1);
        });
        it('should not crash if sessionManager is null', () => {
            powerManager.initialize(mockWindow, mockSessionManager);
            // Manually set sessionManager to null to simulate edge case
            powerManager.sessionManager = null;
            // Find and trigger the suspend event handler
            const suspendHandler = powerMonitor.on.mock.calls.find((call) => call[0] === 'suspend')[1];
            // Should not throw
            expect(() => suspendHandler()).not.toThrow();
        });
    });
    describe('Screen lock event', () => {
        it('should lock application on screen lock', () => {
            powerManager.initialize(mockWindow, mockSessionManager);
            // Find and trigger the lock-screen event handler
            const lockScreenHandler = powerMonitor.on.mock.calls.find((call) => call[0] === 'lock-screen')[1];
            lockScreenHandler();
            expect(mockSessionManager.lockApp).toHaveBeenCalledTimes(1);
        });
        it('should not crash if sessionManager is null', () => {
            powerManager.initialize(mockWindow, mockSessionManager);
            // Manually set sessionManager to null to simulate edge case
            powerManager.sessionManager = null;
            // Find and trigger the lock-screen event handler
            const lockScreenHandler = powerMonitor.on.mock.calls.find((call) => call[0] === 'lock-screen')[1];
            // Should not throw
            expect(() => lockScreenHandler()).not.toThrow();
        });
    });
    describe('System resume event', () => {
        it('should send system-resumed event to renderer on system resume', () => {
            powerManager.initialize(mockWindow, mockSessionManager);
            // Find and trigger the resume event handler
            const resumeHandler = powerMonitor.on.mock.calls.find((call) => call[0] === 'resume')[1];
            resumeHandler();
            expect(mockWindow.webContents.send).toHaveBeenCalledWith('system-resumed');
        });
        it('should not send event if window is destroyed', () => {
            powerManager.initialize(mockWindow, mockSessionManager);
            // Mark window as destroyed
            mockWindow.isDestroyed.mockReturnValue(true);
            // Find and trigger the resume event handler
            const resumeHandler = powerMonitor.on.mock.calls.find((call) => call[0] === 'resume')[1];
            resumeHandler();
            expect(mockWindow.webContents.send).not.toHaveBeenCalled();
        });
        it('should not crash if window is null', () => {
            powerManager.initialize(mockWindow, mockSessionManager);
            // Manually set window to null to simulate edge case
            powerManager.window = null;
            // Find and trigger the resume event handler
            const resumeHandler = powerMonitor.on.mock.calls.find((call) => call[0] === 'resume')[1];
            // Should not throw
            expect(() => resumeHandler()).not.toThrow();
        });
    });
    describe('Screen unlock event', () => {
        it('should send screen-unlocked event to renderer on screen unlock', () => {
            powerManager.initialize(mockWindow, mockSessionManager);
            // Find and trigger the unlock-screen event handler
            const unlockScreenHandler = powerMonitor.on.mock.calls.find((call) => call[0] === 'unlock-screen')[1];
            unlockScreenHandler();
            expect(mockWindow.webContents.send).toHaveBeenCalledWith('screen-unlocked');
        });
        it('should not send event if window is destroyed', () => {
            powerManager.initialize(mockWindow, mockSessionManager);
            // Mark window as destroyed
            mockWindow.isDestroyed.mockReturnValue(true);
            // Find and trigger the unlock-screen event handler
            const unlockScreenHandler = powerMonitor.on.mock.calls.find((call) => call[0] === 'unlock-screen')[1];
            unlockScreenHandler();
            expect(mockWindow.webContents.send).not.toHaveBeenCalled();
        });
        it('should not crash if window is null', () => {
            powerManager.initialize(mockWindow, mockSessionManager);
            // Manually set window to null to simulate edge case
            powerManager.window = null;
            // Find and trigger the unlock-screen event handler
            const unlockScreenHandler = powerMonitor.on.mock.calls.find((call) => call[0] === 'unlock-screen')[1];
            // Should not throw
            expect(() => unlockScreenHandler()).not.toThrow();
        });
    });
    describe('Multiple power events', () => {
        it('should handle suspend followed by resume', () => {
            powerManager.initialize(mockWindow, mockSessionManager);
            // Trigger suspend
            const suspendHandler = powerMonitor.on.mock.calls.find((call) => call[0] === 'suspend')[1];
            suspendHandler();
            expect(mockSessionManager.lockApp).toHaveBeenCalledTimes(1);
            // Trigger resume
            const resumeHandler = powerMonitor.on.mock.calls.find((call) => call[0] === 'resume')[1];
            resumeHandler();
            expect(mockWindow.webContents.send).toHaveBeenCalledWith('system-resumed');
        });
        it('should handle screen lock followed by screen unlock', () => {
            powerManager.initialize(mockWindow, mockSessionManager);
            // Trigger screen lock
            const lockScreenHandler = powerMonitor.on.mock.calls.find((call) => call[0] === 'lock-screen')[1];
            lockScreenHandler();
            expect(mockSessionManager.lockApp).toHaveBeenCalledTimes(1);
            // Trigger screen unlock
            const unlockScreenHandler = powerMonitor.on.mock.calls.find((call) => call[0] === 'unlock-screen')[1];
            unlockScreenHandler();
            expect(mockWindow.webContents.send).toHaveBeenCalledWith('screen-unlocked');
        });
        it('should handle multiple suspend events', () => {
            powerManager.initialize(mockWindow, mockSessionManager);
            // Trigger suspend multiple times
            const suspendHandler = powerMonitor.on.mock.calls.find((call) => call[0] === 'suspend')[1];
            suspendHandler();
            suspendHandler();
            suspendHandler();
            expect(mockSessionManager.lockApp).toHaveBeenCalledTimes(3);
        });
    });
    describe('Cleanup', () => {
        it('should clear window reference on destroy', () => {
            powerManager.initialize(mockWindow, mockSessionManager);
            powerManager.destroy();
            // Trigger resume event after destroy
            const resumeHandler = powerMonitor.on.mock.calls.find((call) => call[0] === 'resume')[1];
            resumeHandler();
            // Should not crash or send events
            expect(mockWindow.webContents.send).not.toHaveBeenCalled();
        });
        it('should clear sessionManager reference on destroy', () => {
            powerManager.initialize(mockWindow, mockSessionManager);
            powerManager.destroy();
            // Trigger suspend event after destroy
            const suspendHandler = powerMonitor.on.mock.calls.find((call) => call[0] === 'suspend')[1];
            suspendHandler();
            // Should not crash or call lockApp
            expect(mockSessionManager.lockApp).not.toHaveBeenCalled();
        });
    });
});
