/**
 * AUREX Desktop - Theme Manager
 *
 * Detects OS dark mode preference and listens for theme changes
 * Validates: Requirement 14.6
 */

import { BrowserWindow, nativeTheme } from 'electron';
import log from 'electron-log';

/**
 * Theme type - light or dark
 */
export type Theme = 'light' | 'dark';

/**
 * ThemeManager class
 * Detects OS dark mode preference and sends theme updates to renderer
 */
export class ThemeManager {
  private currentTheme: Theme = 'light';
  private window: BrowserWindow | null = null;

  /**
   * Initialize theme manager and start listening for theme changes
   * Validates: Requirement 14.6
   * 
   * @param window - The main application window to send theme updates to
   */
  initialize(window: BrowserWindow): void {
    this.window = window;
    
    // Detect initial theme from OS
    this.currentTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    log.info('ThemeManager: Initialized with theme', { theme: this.currentTheme });

    // Listen for OS theme changes
    nativeTheme.on('updated', () => {
      const newTheme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
      
      if (newTheme !== this.currentTheme) {
        this.currentTheme = newTheme;
        log.info('ThemeManager: Theme changed', { theme: this.currentTheme });
        
        // Send theme update to renderer process
        if (this.window && !this.window.isDestroyed()) {
          this.window.webContents.send('theme-changed', this.currentTheme);
        }
      }
    });
  }

  /**
   * Get the current theme
   * 
   * @returns The current theme ('light' or 'dark')
   */
  getCurrentTheme(): Theme {
    return this.currentTheme;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.window = null;
    log.info('ThemeManager: Destroyed');
  }
}
