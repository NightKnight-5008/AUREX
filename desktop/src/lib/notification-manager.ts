/**
 * AUREX Desktop - Notification Manager
 *
 * Manages native OS notifications for desktop application
 * Validates: Requirement 14.1
 */

import { Notification, BrowserWindow } from 'electron';
import log from 'electron-log';

/**
 * Options for displaying a notification
 */
export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  silent?: boolean;
  onClick?: () => void;
}

/**
 * NotificationManager class
 * Manages native OS notifications with click event handling
 */
export class NotificationManager {
  private window: BrowserWindow | null = null;

  /**
   * Set the main window reference for notification click handling
   * 
   * @param window - The main application window
   */
  setWindow(window: BrowserWindow): void {
    this.window = window;
    log.info('NotificationManager: Window reference set');
  }

  /**
   * Show a native OS notification
   * Validates: Requirement 14.1
   * 
   * @param options - Notification options including title, body, icon, and click handler
   */
  show(options: NotificationOptions): void {
    try {
      const notification = new Notification({
        title: options.title,
        body: options.body,
        icon: options.icon,
        silent: options.silent ?? false
      });

      // Handle notification click events
      notification.on('click', () => {
        log.info('NotificationManager: Notification clicked', { title: options.title });
        
        // Bring window to front when notification is clicked
        if (this.window) {
          if (this.window.isMinimized()) {
            this.window.restore();
          }
          this.window.show();
          this.window.focus();
        }

        // Execute custom click handler if provided
        if (options.onClick) {
          options.onClick();
        }
      });

      notification.show();
      log.info('NotificationManager: Notification shown', { 
        title: options.title,
        body: options.body 
      });
    } catch (error) {
      log.error('NotificationManager: Failed to show notification', {
        error: error instanceof Error ? error.message : String(error),
        title: options.title
      });
    }
  }

  /**
   * Show notification when an update is available
   * Validates: Requirement 14.1
   * 
   * @param version - The version number of the available update
   */
  showUpdateAvailable(version: string): void {
    this.show({
      title: 'Update Available',
      body: `Version ${version} is ready to download`,
      onClick: () => {
        log.info('NotificationManager: Update available notification clicked', { version });
        // Send event to renderer to show update dialog
        if (this.window && !this.window.isDestroyed()) {
          this.window.webContents.send('show-update-dialog', { version });
        }
      }
    });
  }

  /**
   * Show notification when an update has been downloaded
   * Validates: Requirement 14.1
   * 
   * @param version - The version number of the downloaded update
   */
  showUpdateDownloaded(version: string): void {
    this.show({
      title: 'Update Downloaded',
      body: `Version ${version} will be installed on restart`,
      onClick: () => {
        log.info('NotificationManager: Update downloaded notification clicked', { version });
        // Send event to renderer to prompt for restart
        if (this.window && !this.window.isDestroyed()) {
          this.window.webContents.send('prompt-restart', { version });
        }
      }
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.window = null;
    log.info('NotificationManager: Destroyed');
  }
}
