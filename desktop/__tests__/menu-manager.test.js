/**
 * MenuManager Unit Tests
 *
 * Tests the native application menu creation and management.
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Menu } from 'electron';
import { MenuManager } from '../lib/menu-manager.js';
describe('MenuManager', () => {
    let menuManager;
    let mockWindow;
    beforeEach(() => {
        // Create a mock window
        mockWindow = {
            isDestroyed: vi.fn().mockReturnValue(false),
            close: vi.fn()
        };
        menuManager = new MenuManager(mockWindow);
    });
    afterEach(() => {
        vi.clearAllMocks();
    });
    describe('createMenu', () => {
        it('should create a menu with all required top-level items', () => {
            const menu = menuManager.createMenu();
            expect(menu).toBeDefined();
            expect(menu).toBeInstanceOf(Menu);
            const menuItems = menu.items;
            const labels = menuItems.map(item => item.label);
            // Validate: Requirement 6.1 - Menu should have File, Edit, View, Window, Help
            expect(labels).toContain('File');
            expect(labels).toContain('Edit');
            expect(labels).toContain('View');
            expect(labels).toContain('Window');
            expect(labels).toContain('Help');
        });
        it('should include File menu items', () => {
            const menu = menuManager.createMenu();
            const fileMenu = menu.items.find(item => item.label === 'File');
            expect(fileMenu).toBeDefined();
            expect(fileMenu?.submenu).toBeDefined();
            // Validate: Requirement 6.2 - File menu items
            const submenuItems = fileMenu?.submenu?.items || [];
            const labels = submenuItems.map(item => item.label);
            expect(labels).toContain('New Window');
            expect(labels).toContain('Close Window');
        });
        it('should include Edit menu items', () => {
            const menu = menuManager.createMenu();
            const editMenu = menu.items.find(item => item.label === 'Edit');
            expect(editMenu).toBeDefined();
            expect(editMenu?.submenu).toBeDefined();
            // Validate: Requirement 6.3 - Edit menu items
            const submenuItems = editMenu?.submenu?.items || [];
            const labels = submenuItems.map(item => item.label);
            expect(labels).toContain('Undo');
            expect(labels).toContain('Redo');
            expect(labels).toContain('Cut');
            expect(labels).toContain('Copy');
            expect(labels).toContain('Paste');
            expect(labels).toContain('Select All');
        });
        it('should include View menu items', () => {
            const menu = menuManager.createMenu();
            const viewMenu = menu.items.find(item => item.label === 'View');
            expect(viewMenu).toBeDefined();
            expect(viewMenu?.submenu).toBeDefined();
            // Validate: Requirement 6.4 - View menu items
            const submenuItems = viewMenu?.submenu?.items || [];
            const labels = submenuItems.map(item => item.label);
            expect(labels).toContain('Reload');
            expect(labels).toContain('Force Reload');
            expect(labels).toContain('Toggle Full Screen');
        });
        it('should include Window menu items', () => {
            const menu = menuManager.createMenu();
            const windowMenu = menu.items.find(item => item.label === 'Window');
            expect(windowMenu).toBeDefined();
            expect(windowMenu?.submenu).toBeDefined();
            // Validate: Requirement 6.5 - Window menu items
            const submenuItems = windowMenu?.submenu?.items || [];
            const labels = submenuItems.map(item => item.label);
            expect(labels).toContain('Minimize');
            expect(labels).toContain('Zoom');
        });
        it('should include Help menu items', () => {
            const menu = menuManager.createMenu();
            const helpMenu = menu.items.find(item => item.label === 'Help');
            expect(helpMenu).toBeDefined();
            expect(helpMenu?.submenu).toBeDefined();
            // Validate: Requirement 6.6 - Help menu items
            const submenuItems = helpMenu?.submenu?.items || [];
            const labels = submenuItems.map(item => item.label);
            expect(labels).toContain('Documentation');
            expect(labels).toContain('Report Issue');
            expect(labels).toContain('About');
        });
        it('should use platform-specific keyboard shortcuts', () => {
            const menu = menuManager.createMenu();
            const fileMenu = menu.items.find(item => item.label === 'File');
            const submenuItems = fileMenu?.submenu?.items || [];
            const newWindowItem = submenuItems.find(item => item.label === 'New Window');
            // Validate: Requirement 19.5 - Platform-specific shortcuts
            expect(newWindowItem?.accelerator).toBeDefined();
            const isMac = process.platform === 'darwin';
            if (isMac) {
                expect(newWindowItem?.accelerator).toContain('Cmd');
            }
            else {
                expect(newWindowItem?.accelerator).toContain('Ctrl');
            }
        });
    });
    describe('updateMenu', () => {
        it('should update the menu with a new template', () => {
            // Create initial menu
            menuManager.createMenu();
            // Update with new template
            const newTemplate = [
                {
                    label: 'Custom',
                    submenu: [
                        { label: 'Custom Item', click: () => { } }
                    ]
                }
            ];
            menuManager.updateMenu(newTemplate);
            const updatedMenu = menuManager.getMenu();
            expect(updatedMenu).toBeDefined();
            const labels = updatedMenu?.items.map(item => item.label) || [];
            expect(labels).toContain('Custom');
        });
    });
    describe('getMenu', () => {
        it('should return null before menu is created', () => {
            const menu = menuManager.getMenu();
            expect(menu).toBeNull();
        });
        it('should return the menu after creation', () => {
            menuManager.createMenu();
            const menu = menuManager.getMenu();
            expect(menu).toBeDefined();
            expect(menu).toBeInstanceOf(Menu);
        });
    });
});
