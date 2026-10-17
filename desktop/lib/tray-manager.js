/**
 * AUREX Desktop - Tray Manager
 *
 * Manages system tray icon and context menu (Windows and Linux)
 * Validates: Requirements 14.2, 14.3
 */
import { Tray, Menu, app, nativeImage } from 'electron';
import log from 'electron-log';
import path from 'path';
import { fileURLToPath } from 'url';
// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/**
 * TrayManager class
 * Manages system tray icon with context menu for Windows and Linux
 */
export class TrayManager {
    tray = null;
    window = null;
    /**
     * Create system tray icon with context menu
     * Validates: Requirements 14.2, 14.3
     *
     * @param window - The main application window
     */
    create(window) {
        // Only create tray on Windows and Linux (not macOS)
        if (process.platform === 'darwin') {
            log.info('Skipping tray creation on macOS');
            return;
        }
        this.window = window;
        try {
            // Load tray icon
            const iconPath = this.getTrayIconPath();
            const icon = nativeImage.createFromPath(iconPath);
            if (icon.isEmpty()) {
                log.warn('Tray icon not found, using default icon');
                this.tray = new Tray(nativeImage.createEmpty());
            }
            else {
                this.tray = new Tray(icon);
                log.info('Tray icon created successfully');
            }
            // Set tooltip (Requirement 14.3)
            this.tray.setToolTip('AUREX Financial OS');
            // Build and set context menu (Requirement 14.2, 14.3)
            this.updateContextMenu();
            // Handle double-click to show window (Requirement 14.3)
            this.tray.on('double-click', () => {
                this.showWindow();
            });
            log.info('System tray initialized successfully');
        }
        catch (error) {
            log.error('Failed to create system tray:', error);
        }
    }
    /**
     * Get the path to the tray icon
     * Tries multiple locations to find the icon
     */
    getTrayIconPath() {
        // Try build-resources directory first
        const buildResourcesPath = path.join(__dirname, '../../build-resources/tray-icon.png');
        // Fallback to a simple icon path
        const fallbackPath = path.join(__dirname, '../../tray-icon.png');
        // In production, try app resources
        if (process.env.NODE_ENV === 'production') {
            const prodPath = path.join(process.resourcesPath, 'tray-icon.png');
            return prodPath;
        }
        // In development, use build-resources
        return buildResourcesPath;
    }
    /**
     * Update the context menu
     * Validates: Requirements 14.2, 14.3
     */
    updateContextMenu() {
        if (!this.tray)
            return;
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Show AUREX',
                click: () => {
                    this.showWindow();
                }
            },
            {
                label: 'Hide AUREX',
                click: () => {
                    this.hideWindow();
                }
            },
            { type: 'separator' },
            {
                label: 'Quit',
                click: () => {
                    this.quitApplication();
                }
            }
        ]);
        this.tray.setContextMenu(contextMenu);
        log.debug('Tray context menu updated');
    }
    /**
     * Show the main window
     * Validates: Requirement 14.3
     */
    showWindow() {
        if (this.window) {
            if (this.window.isMinimized()) {
                this.window.restore();
            }
            this.window.show();
            this.window.focus();
            log.debug('Window shown from tray');
        }
    }
    /**
     * Hide the main window
     * Validates: Requirement 14.3
     */
    hideWindow() {
        if (this.window) {
            this.window.hide();
            log.debug('Window hidden from tray');
        }
    }
    /**
     * Quit the application
     * Validates: Requirement 14.3
     */
    quitApplication() {
        log.info('Quit requested from tray');
        app.quit();
    }
    /**
     * Update the tray tooltip
     *
     * @param tooltip - The new tooltip text
     */
    setToolTip(tooltip) {
        if (this.tray) {
            this.tray.setToolTip(tooltip);
            log.debug('Tray tooltip updated:', tooltip);
        }
    }
    /**
     * Destroy the tray icon and cleanup
     */
    destroy() {
        if (this.tray) {
            this.tray.destroy();
            this.tray = null;
            this.window = null;
            log.info('System tray destroyed');
        }
    }
    /**
     * Check if tray is created
     */
    isCreated() {
        return this.tray !== null;
    }
}
