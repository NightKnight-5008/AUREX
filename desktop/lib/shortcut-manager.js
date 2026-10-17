/**
 * AUREX Desktop - Shortcut Manager
 *
 * Manages global keyboard shortcuts for desktop application
 * Validates: Requirements 14.5, 19.5
 */
import { globalShortcut } from 'electron';
import log from 'electron-log';
/**
 * ShortcutManager class
 * Registers and manages global keyboard shortcuts with platform-specific handling
 */
export class ShortcutManager {
    window = null;
    registeredShortcuts = [];
    /**
     * Register global keyboard shortcuts
     * Validates: Requirements 14.5, 19.5
     *
     * @param window - The main application window
     */
    register(window) {
        this.window = window;
        try {
            // Show/hide window (Cmd/Ctrl+Shift+A)
            // Validates: Requirement 19.5 - Platform-specific shortcuts
            this.registerShortcut('CommandOrControl+Shift+A', () => {
                if (!this.window)
                    return;
                if (this.window.isVisible()) {
                    this.window.hide();
                    log.info('ShortcutManager: Window hidden via shortcut');
                }
                else {
                    this.window.show();
                    this.window.focus();
                    log.info('ShortcutManager: Window shown via shortcut');
                }
            });
            // New window (Cmd/Ctrl+N)
            // Validates: Requirement 14.5 - Common actions (new window)
            this.registerShortcut('CommandOrControl+N', () => {
                log.info('ShortcutManager: New window shortcut triggered');
                if (this.window && !this.window.isDestroyed()) {
                    this.window.webContents.send('new-window');
                }
            });
            // Close window (Cmd/Ctrl+W)
            // Validates: Requirement 14.5 - Common actions (close window)
            this.registerShortcut('CommandOrControl+W', () => {
                if (!this.window)
                    return;
                log.info('ShortcutManager: Close window shortcut triggered');
                this.window.close();
            });
            // Quick capture (Cmd/Ctrl+Shift+C)
            this.registerShortcut('CommandOrControl+Shift+C', () => {
                log.info('ShortcutManager: Quick capture shortcut triggered');
                if (this.window && !this.window.isDestroyed()) {
                    this.window.webContents.send('quick-capture');
                }
            });
            log.info('ShortcutManager: All shortcuts registered successfully', {
                count: this.registeredShortcuts.length,
                shortcuts: this.registeredShortcuts
            });
        }
        catch (error) {
            log.error('ShortcutManager: Failed to register shortcuts', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Register a single keyboard shortcut
     *
     * @param accelerator - The keyboard shortcut (e.g., 'CommandOrControl+N')
     * @param callback - The function to execute when the shortcut is triggered
     * @returns True if registration was successful, false otherwise
     */
    registerShortcut(accelerator, callback) {
        try {
            const success = globalShortcut.register(accelerator, callback);
            if (success) {
                this.registeredShortcuts.push(accelerator);
                log.debug('ShortcutManager: Registered shortcut', { accelerator });
                return true;
            }
            else {
                log.warn('ShortcutManager: Failed to register shortcut (may be in use)', {
                    accelerator
                });
                return false;
            }
        }
        catch (error) {
            log.error('ShortcutManager: Error registering shortcut', {
                accelerator,
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    }
    /**
     * Check if a specific shortcut is registered
     *
     * @param accelerator - The keyboard shortcut to check
     * @returns True if the shortcut is registered, false otherwise
     */
    isRegistered(accelerator) {
        return globalShortcut.isRegistered(accelerator);
    }
    /**
     * Unregister all keyboard shortcuts
     * Validates: Requirements 14.5, 19.5
     */
    unregisterAll() {
        try {
            globalShortcut.unregisterAll();
            log.info('ShortcutManager: All shortcuts unregistered', {
                count: this.registeredShortcuts.length,
                shortcuts: this.registeredShortcuts
            });
            this.registeredShortcuts = [];
            this.window = null;
        }
        catch (error) {
            log.error('ShortcutManager: Failed to unregister shortcuts', {
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
    /**
     * Get list of registered shortcuts
     *
     * @returns Array of registered shortcut accelerators
     */
    getRegisteredShortcuts() {
        return [...this.registeredShortcuts];
    }
    /**
     * Cleanup resources
     */
    destroy() {
        this.unregisterAll();
        log.info('ShortcutManager: Destroyed');
    }
}
