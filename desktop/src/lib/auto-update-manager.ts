/**
 * AutoUpdateManager - Automatic Application Updates
 * 
 * Manages automatic application updates using electron-updater.
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import type { UpdateInfo, ProgressInfo } from 'electron-updater';
import { BrowserWindow } from 'electron';
import log from 'electron-log';
import type { NotificationManager } from './notification-manager.js';

export interface UpdateCheckResult {
  updateInfo: UpdateInfo;
}

export type UpdateEvent = 
  | 'checking-for-update'
  | 'update-available'
  | 'update-not-available'
  | 'download-progress'
  | 'update-downloaded'
  | 'error';

export class AutoUpdateManager {
  private window: BrowserWindow | null = null;
  private notificationManager: NotificationManager | null = null;
  private updateCheckInterval: NodeJS.Timeout | null = null;
  private isProduction: boolean;

  constructor(isProduction: boolean = process.env.NODE_ENV !== 'development') {
    this.isProduction = isProduction;
    this.configureUpdater();
    this.setupEventHandlers();
  }

  /**
   * Configure electron-updater with GitHub or generic provider
   * Validates: Requirement 7.1
   */
  private configureUpdater(): void {
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
  private setupEventHandlers(): void {
    // Checking for update
    autoUpdater.on('checking-for-update', () => {
      log.info('AutoUpdateManager: Checking for updates...');
      this.notifyRenderer('checking-for-update', null);
    });

    // Update available
    autoUpdater.on('update-available', (info: UpdateInfo) => {
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
    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      log.info('AutoUpdateManager: Update not available', {
        version: info.version
      });
      this.notifyRenderer('update-not-available', info);
    });

    // Download progress
    autoUpdater.on('download-progress', (progress: ProgressInfo) => {
      log.info('AutoUpdateManager: Download progress', {
        percent: progress.percent.toFixed(2),
        transferred: progress.transferred,
        total: progress.total,
        bytesPerSecond: progress.bytesPerSecond
      });
      this.notifyRenderer('download-progress', progress);
    });

    // Update downloaded
    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
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
    autoUpdater.on('error', (error: Error) => {
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
  public setWindow(window: BrowserWindow): void {
    this.window = window;
    log.info('AutoUpdateManager: Window reference set');
  }

  /**
   * Set the notification manager for showing native notifications
   * 
   * @param notificationManager - The NotificationManager instance
   */
  public setNotificationManager(notificationManager: NotificationManager): void {
    this.notificationManager = notificationManager;
    log.info('AutoUpdateManager: NotificationManager reference set');
  }

  /**
   * Send update notifications to renderer via IPC
   * Validates: Requirement 7.6
   */
  private notifyRenderer(event: string, data: any): void {
    if (this.window && !this.window.isDestroyed()) {
      // Map event names to match preload script expectations
      const eventMap: Record<string, string> = {
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
  public checkForUpdatesOnStartup(): void {
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
  public startPeriodicUpdateChecks(): void {
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
  public stopPeriodicUpdateChecks(): void {
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
  public async checkForUpdates(): Promise<UpdateCheckResult | null> {
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
    } catch (error) {
      log.error('AutoUpdateManager: Failed to check for updates', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Download update manually (if auto-download is disabled)
   */
  public async downloadUpdate(): Promise<void> {
    try {
      log.info('AutoUpdateManager: Starting manual update download');
      await autoUpdater.downloadUpdate();
    } catch (error) {
      log.error('AutoUpdateManager: Failed to download update', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Quit and install the downloaded update
   */
  public quitAndInstall(): void {
    log.info('AutoUpdateManager: Quitting and installing update');
    autoUpdater.quitAndInstall(false, true);
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stopPeriodicUpdateChecks();
    this.window = null;
    this.notificationManager = null;
    log.info('AutoUpdateManager: Destroyed');
  }
}
