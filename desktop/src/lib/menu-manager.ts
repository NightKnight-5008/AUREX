/**
 * MenuManager - Native Application Menu Management
 * 
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 19.4, 19.5
 * 
 * Creates and manages native application menus with platform-specific layouts.
 * Provides File, Edit, View, Window, and Help menus with standard actions.
 */

import { Menu, BrowserWindow, app, shell, type MenuItemConstructorOptions } from 'electron';
import log from 'electron-log';

export class MenuManager {
  private menu: Menu | null = null;
  private window: BrowserWindow;

  constructor(window: BrowserWindow) {
    this.window = window;
  }

  /**
   * Create and set the application menu
   * Validates: Requirement 6.1
   */
  public createMenu(): Menu {
    const isMac = process.platform === 'darwin';
    const isDev = process.env.NODE_ENV === 'development';

    const template: MenuItemConstructorOptions[] = [
      // App menu (macOS only)
      ...(isMac ? [{
        label: app.name,
        submenu: [
          { role: 'about' as const },
          { type: 'separator' as const },
          { role: 'services' as const },
          { type: 'separator' as const },
          { role: 'hide' as const },
          { role: 'hideOthers' as const },
          { role: 'unhide' as const },
          { type: 'separator' as const },
          { role: 'quit' as const }
        ]
      }] : []),

      // File menu
      // Validates: Requirement 6.2
      {
        label: 'File',
        submenu: [
          {
            label: 'New Window',
            accelerator: isMac ? 'Cmd+N' : 'Ctrl+N',
            click: () => this.handleNewWindow()
          },
          { type: 'separator' },
          {
            label: 'Close Window',
            accelerator: isMac ? 'Cmd+W' : 'Ctrl+W',
            click: () => this.handleCloseWindow()
          },
          ...(!isMac ? [
            { type: 'separator' as const },
            {
              label: 'Quit',
              accelerator: 'Ctrl+Q',
              click: () => this.handleQuit()
            }
          ] : [])
        ]
      },

      // Edit menu
      // Validates: Requirement 6.3
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' as const },
          { role: 'redo' as const },
          { type: 'separator' as const },
          { role: 'cut' as const },
          { role: 'copy' as const },
          { role: 'paste' as const },
          { role: 'selectAll' as const }
        ]
      },

      // View menu
      // Validates: Requirement 6.4
      {
        label: 'View',
        submenu: [
          { role: 'reload' as const },
          { role: 'forceReload' as const },
          ...(isDev ? [
            { type: 'separator' as const },
            { role: 'toggleDevTools' as const }
          ] : []),
          { type: 'separator' as const },
          { role: 'togglefullscreen' as const }
        ]
      },

      // Window menu
      // Validates: Requirement 6.5
      {
        label: 'Window',
        submenu: [
          { role: 'minimize' as const },
          { role: 'zoom' as const },
          ...(isMac ? [
            { type: 'separator' as const },
            { role: 'front' as const }
          ] : [])
        ]
      },

      // Help menu
      // Validates: Requirement 6.6
      {
        label: 'Help',
        submenu: [
          {
            label: 'Documentation',
            click: () => this.handleDocumentation()
          },
          {
            label: 'Report Issue',
            click: () => this.handleReportIssue()
          },
          { type: 'separator' },
          {
            label: 'About',
            click: () => this.handleAbout()
          }
        ]
      }
    ];

    this.menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(this.menu);

    log.info('Application menu created', { 
      platform: process.platform,
      isDev,
      menuItemCount: template.length 
    });

    return this.menu;
  }

  /**
   * Update the application menu with a new template
   */
  public updateMenu(template: MenuItemConstructorOptions[]): void {
    this.menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(this.menu);
    log.info('Application menu updated');
  }

  /**
   * Get the current menu
   */
  public getMenu(): Menu | null {
    return this.menu;
  }

  // Menu action handlers
  // Validates: Requirement 6.7

  private handleNewWindow(): void {
    log.info('Menu action: New Window');
    // TODO: Implement new window creation
    // This would require WindowManager to support multiple windows
    log.warn('New Window action not yet implemented');
  }

  private handleCloseWindow(): void {
    log.info('Menu action: Close Window');
    if (this.window && !this.window.isDestroyed()) {
      this.window.close();
    }
  }

  private handleQuit(): void {
    log.info('Menu action: Quit');
    app.quit();
  }

  private handleDocumentation(): void {
    log.info('Menu action: Documentation');
    shell.openExternal('https://docs.aurex.com').catch(err => {
      log.error('Failed to open documentation:', err);
    });
  }

  private handleReportIssue(): void {
    log.info('Menu action: Report Issue');
    shell.openExternal('https://github.com/aurex/aurex-desktop/issues/new').catch(err => {
      log.error('Failed to open issue tracker:', err);
    });
  }

  private handleAbout(): void {
    log.info('Menu action: About');
    const { dialog } = require('electron');
    dialog.showMessageBox(this.window, {
      type: 'info',
      title: 'About AUREX Financial OS',
      message: 'AUREX Financial OS',
      detail: `Version: ${app.getVersion()}\nElectron: ${process.versions.electron}\nChrome: ${process.versions.chrome}\nNode: ${process.versions.node}\n\nCopyright © 2024 AUREX Inc.`,
      buttons: ['OK']
    });
  }
}
