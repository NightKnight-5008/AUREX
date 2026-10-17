/**
 * MenuManager - Native Application Menu Management
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 19.4, 19.5
 *
 * Creates and manages native application menus with platform-specific layouts.
 * Provides File, Edit, View, Window, and Help menus with standard actions.
 */
import { Menu, app, shell } from 'electron';
import log from 'electron-log';
export class MenuManager {
    menu = null;
    window;
    constructor(window) {
        this.window = window;
    }
    /**
     * Create and set the application menu
     * Validates: Requirement 6.1
     */
    createMenu() {
        const isMac = process.platform === 'darwin';
        const isDev = process.env.NODE_ENV === 'development';
        const template = [
            // App menu (macOS only)
            ...(isMac ? [{
                    label: app.name,
                    submenu: [
                        { role: 'about' },
                        { type: 'separator' },
                        { role: 'services' },
                        { type: 'separator' },
                        { role: 'hide' },
                        { role: 'hideOthers' },
                        { role: 'unhide' },
                        { type: 'separator' },
                        { role: 'quit' }
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
                        { type: 'separator' },
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
                    { role: 'undo' },
                    { role: 'redo' },
                    { type: 'separator' },
                    { role: 'cut' },
                    { role: 'copy' },
                    { role: 'paste' },
                    { role: 'selectAll' }
                ]
            },
            // View menu
            // Validates: Requirement 6.4
            {
                label: 'View',
                submenu: [
                    { role: 'reload' },
                    { role: 'forceReload' },
                    ...(isDev ? [
                        { type: 'separator' },
                        { role: 'toggleDevTools' }
                    ] : []),
                    { type: 'separator' },
                    { role: 'togglefullscreen' }
                ]
            },
            // Window menu
            // Validates: Requirement 6.5
            {
                label: 'Window',
                submenu: [
                    { role: 'minimize' },
                    { role: 'zoom' },
                    ...(isMac ? [
                        { type: 'separator' },
                        { role: 'front' }
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
    updateMenu(template) {
        this.menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(this.menu);
        log.info('Application menu updated');
    }
    /**
     * Get the current menu
     */
    getMenu() {
        return this.menu;
    }
    // Menu action handlers
    // Validates: Requirement 6.7
    handleNewWindow() {
        log.info('Menu action: New Window');
        // TODO: Implement new window creation
        // This would require WindowManager to support multiple windows
        log.warn('New Window action not yet implemented');
    }
    handleCloseWindow() {
        log.info('Menu action: Close Window');
        if (this.window && !this.window.isDestroyed()) {
            this.window.close();
        }
    }
    handleQuit() {
        log.info('Menu action: Quit');
        app.quit();
    }
    handleDocumentation() {
        log.info('Menu action: Documentation');
        shell.openExternal('https://docs.aurex.com').catch(err => {
            log.error('Failed to open documentation:', err);
        });
    }
    handleReportIssue() {
        log.info('Menu action: Report Issue');
        shell.openExternal('https://github.com/aurex/aurex-desktop/issues/new').catch(err => {
            log.error('Failed to open issue tracker:', err);
        });
    }
    handleAbout() {
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
