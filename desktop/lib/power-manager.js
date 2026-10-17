/**
 * AUREX Desktop - Power Manager
 *
 * Handles system power events (suspend/resume, screen lock/unlock)
 * Validates: Requirement 14.7
 */
import { powerMonitor } from 'electron';
import log from 'electron-log';
/**
 * PowerManager class
 * Handles system power events and locks application on suspend/lock
 */
export class PowerManager {
    window = null;
    sessionManager = null;
    /**
     * Initialize power manager and start listening for power events
     * Validates: Requirement 14.7
     *
     * @param window - The main application window
     * @param sessionManager - The session manager for locking the application
     */
    initialize(window, sessionManager) {
        this.window = window;
        this.sessionManager = sessionManager;
        // Listen for system suspend event
        powerMonitor.on('suspend', () => {
            log.info('PowerManager: System suspending');
            this.handleSuspend();
        });
        // Listen for system resume event
        powerMonitor.on('resume', () => {
            log.info('PowerManager: System resumed');
            this.handleResume();
        });
        // Listen for screen lock event
        powerMonitor.on('lock-screen', () => {
            log.info('PowerManager: Screen locked');
            this.handleLockScreen();
        });
        // Listen for screen unlock event
        powerMonitor.on('unlock-screen', () => {
            log.info('PowerManager: Screen unlocked');
            this.handleUnlockScreen();
        });
        log.info('PowerManager: Initialized and listening for power events');
    }
    /**
     * Handle system suspend event
     * Validates: Requirement 14.7 - Lock application on system suspend
     */
    handleSuspend() {
        // Lock the application
        if (this.sessionManager) {
            this.sessionManager.lockApp();
            log.info('PowerManager: Application locked due to system suspend');
        }
        // Send event to renderer
        this.sendEventToRenderer('suspend');
    }
    /**
     * Handle system resume event
     * Validates: Requirement 14.7 - Send power events to renderer
     */
    handleResume() {
        // Send event to renderer
        this.sendEventToRenderer('resume');
    }
    /**
     * Handle screen lock event
     * Validates: Requirement 14.7 - Lock application on screen lock
     */
    handleLockScreen() {
        // Lock the application
        if (this.sessionManager) {
            this.sessionManager.lockApp();
            log.info('PowerManager: Application locked due to screen lock');
        }
        // Send event to renderer
        this.sendEventToRenderer('lock-screen');
    }
    /**
     * Handle screen unlock event
     * Validates: Requirement 14.7 - Send power events to renderer
     */
    handleUnlockScreen() {
        // Send event to renderer
        this.sendEventToRenderer('unlock-screen');
    }
    /**
     * Send power event to renderer process
     * Validates: Requirement 14.7
     *
     * @param event - The power event type
     */
    sendEventToRenderer(event) {
        if (this.window && !this.window.isDestroyed()) {
            this.window.webContents.send('power-event', event);
            log.debug('PowerManager: Sent power event to renderer', { event });
        }
    }
    /**
     * Cleanup resources
     */
    destroy() {
        // Note: powerMonitor listeners cannot be removed individually in Electron
        // They will be cleaned up when the app quits
        this.window = null;
        this.sessionManager = null;
        log.info('PowerManager: Destroyed');
    }
}
