/**
 * AutoUpdateManager - Automatic Application Updates
 *
 * Manages automatic application updates using electron-updater.
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import log from 'electron-log';
export class AutoUpdateManager {
    window = null;
    notificationManager = null;
    updateCheckInterval = null;
    isProduction;
    constructor(isProduction = process.env.NODE_ENV !== 'development') {
        this.isProduction = isProduction;
        this.configureUpdater();
        this.setupEventHandlers();
    }
    /**
     * Configure electron-updater with GitHub or generic provider
     * Validates: Requirement 7.1
     */
    configureUpdater() {
        // Set logger for auto-updater
        autoUpdater.logger = log;
        // Auto-download updates when available
        autoUpdater.autoDownload = true;
        // Auto-install on app quit
        autoUpdater.autoInstallOnAppQuit = true;
        log.info('AutoUpdateManager: Configured electron-updater');
    }
    /**
     * Setup event handlers for all update events
     * Validates: Requirements 7.4, 7.5, 7.6
     */
    setupEventHandlers() {
        // Checking for update
        autoUpdater.on('checking-for-update', () => {
            log.info('AutoUpdateManager: Checking for updates...');
            this.notifyRenderer('checking-for-update', null);
        });
        // Update available
        autoUpdater.on('update-available', (info) => {
            log.info('AutoUpdateManager: Update available', {
                version: info.version,
                releaseDate: info.releaseDate,
                files: info.files?.length || 0
            });
            this.notifyRenderer('update-available', info);
            // Show native notification
            if (this.notificationManager) {
                this.notificationManager.showUpdateAvailable(info.version);
            }
        });
        // Update not available
        autoUpdater.on('update-not-available', (info) => {
            log.info('AutoUpdateManager: Update not available', {
                version: info.version
            });
            this.notifyRenderer('update-not-available', info);
        });
        // Download progress
        autoUpdater.on('download-progress', (progress) => {
            log.info('AutoUpdateManager: Download progress', {
                percent: progress.percent.toFixed(2),
                transferred: progress.transferred,
                total: progress.total,
                bytesPerSecond: progress.bytesPerSecond
            });
            this.notifyRenderer('download-progress', progress);
        });
        // Update downloaded
        autoUpdater.on('update-downloaded', (info) => {
            log.info('AutoUpdateManager: Update downloaded', {
                version: info.version,
                releaseDate: info.releaseDate
            });
            this.notifyRenderer('update-downloaded', info);
            // Show native notification
            if (this.notificationManager) {
                this.notificationManager.showUpdateDownloaded(info.version);
            }
        });
        // Error
        autoUpdater.on('error', (error) => {
            log.error('AutoUpdateManager: Update error', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            this.notifyRenderer('error', {
                message: error.message,
                name: error.name
            });
        });
        log.info('AutoUpdateManager: Event handlers configured');
    }
    /**
     * Set the main window for sending IPC notifications
     * Validates: Requirement 7.6
     */
    setWindow(window) {
        this.window = window;
        log.info('AutoUpdateManager: Window reference set');
    }
    /**
     * Set the notification manager for showing native notifications
     *
     * @param notificationManager - The NotificationManager instance
     */
    setNotificationManager(notificationManager) {
        this.notificationManager = notificationManager;
        log.info('AutoUpdateManager: NotificationManager reference set');
    }
    /**
     * Send update notifications to renderer via IPC
     * Validates: Requirement 7.6
     */
    notifyRenderer(event, data) {
        if (this.window && !this.window.isDestroyed()) {
            // Map event names to match preload script expectations
            const eventMap = {
                'checking-for-update': 'update-checking',
                'update-available': 'update-available',
                'update-not-available': 'update-not-available',
                'download-progress': 'update-progress',
                'update-downloaded': 'update-downloaded',
                'error': 'update-error'
            };
            const mappedEvent = eventMap[event] || event;
            this.window.webContents.send(mappedEvent, data);
        }
    }
    /**
     * Check for updates on startup (production only, 3 second delay)
     * Validates: Requirements 7.1, 7.2
     */
    checkForUpdatesOnStartup() {
        if (!this.isProduction) {
            log.info('AutoUpdateManager: Skipping update check in development mode');
            return;
        }
        log.info('AutoUpdateManager: Scheduling startup update check (3 second delay)');
        setTimeout(() => {
            this.checkForUpdates();
        }, 3000);
    }
    /**
     * Start periodic update checks (every 4 hours)
     * Validates: Requirement 7.3
     */
    startPeriodicUpdateChecks() {
        if (!this.isProduction) {
            log.info('AutoUpdateManager: Skipping periodic update checks in development mode');
            return;
        }
        // Clear any existing interval
        if (this.updateCheckInterval) {
            clearInterval(this.updateCheckInterval);
        }
        // Check every 4 hours (4 * 60 * 60 * 1000 milliseconds)
        const FOUR_HOURS = 4 * 60 * 60 * 1000;
        this.updateCheckInterval = setInterval(() => {
            log.info('AutoUpdateManager: Periodic update check triggered');
            this.checkForUpdates();
        }, FOUR_HOURS);
        log.info('AutoUpdateManager: Periodic update checks started (every 4 hours)');
    }
    /**
     * Stop periodic update checks
     */
    stopPeriodicUpdateChecks() {
        if (this.updateCheckInterval) {
            clearInterval(this.updateCheckInterval);
            this.updateCheckInterval = null;
            log.info('AutoUpdateManager: Periodic update checks stopped');
        }
    }
    /**
     * Manually check for updates
     * Validates: Requirement 7.2
     */
    async checkForUpdates() {
        if (!this.isProduction) {
            log.info('AutoUpdateManager: Skipping update check in development mode');
            return null;
        }
        try {
            log.info('AutoUpdateManager: Checking for updates...');
            const result = await autoUpdater.checkForUpdates();
            if (result) {
                return {
                    updateInfo: result.updateInfo
                };
            }
            return null;
        }
        catch (error) {
            log.error('AutoUpdateManager: Failed to check for updates', {
                error: error instanceof Error ? error.message : String(error)
            });
            return null;
        }
    }
    /**
     * Download update manually (if auto-download is disabled)
     */
    async downloadUpdate() {
        try {
            log.info('AutoUpdateManager: Starting manual update download');
            await autoUpdater.downloadUpdate();
        }
        catch (error) {
            log.error('AutoUpdateManager: Failed to download update', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    /**
     * Quit and install the downloaded update
     */
    quitAndInstall() {
        log.info('AutoUpdateManager: Quitting and installing update');
        autoUpdater.quitAndInstall(false, true);
    }
    /**
     * Cleanup resources
     */
    destroy() {
        this.stopPeriodicUpdateChecks();
        this.window = null;
        this.notificationManager = null;
        log.info('AutoUpdateManager: Destroyed');
    }
}
