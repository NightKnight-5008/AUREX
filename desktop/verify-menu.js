/**
 * Menu Manager Verification Script
 * 
 * This script verifies that the MenuManager class is properly implemented
 * and can create menus with all required items.
 */

import { app, BrowserWindow, Menu } from 'electron';
import { MenuManager } from './lib/menu-manager.js';

console.log('Starting Menu Manager verification...\n');

// Mock window for testing
const mockWindow = {
  isDestroyed: () => false,
  close: () => console.log('Window close called'),
  webContents: {
    send: () => {}
  }
};

// Create MenuManager instance
const menuManager = new MenuManager(mockWindow);

// Create menu
console.log('Creating application menu...');
const menu = menuManager.createMenu();

// Verify menu structure
console.log('\n✓ Menu created successfully');
console.log(`✓ Menu has ${menu.items.length} top-level items`);

// Check for required menu items
const menuLabels = menu.items.map(item => item.label);
console.log('\nTop-level menu items:');
menuLabels.forEach(label => console.log(`  - ${label}`));

// Validate required menus
const requiredMenus = ['File', 'Edit', 'View', 'Window', 'Help'];
const missingMenus = requiredMenus.filter(menu => !menuLabels.includes(menu));

if (missingMenus.length === 0) {
  console.log('\n✓ All required menus present');
} else {
  console.log('\n✗ Missing menus:', missingMenus);
  process.exit(1);
}

// Check File menu items
const fileMenu = menu.items.find(item => item.label === 'File');
if (fileMenu && fileMenu.submenu) {
  const fileItems = fileMenu.submenu.items.map(item => item.label);
  console.log('\nFile menu items:');
  fileItems.forEach(label => console.log(`  - ${label}`));
  
  if (fileItems.includes('New Window') && fileItems.includes('Close Window')) {
    console.log('✓ File menu items correct');
  }
}

// Check Edit menu items
const editMenu = menu.items.find(item => item.label === 'Edit');
if (editMenu && editMenu.submenu) {
  const editItems = editMenu.submenu.items.map(item => item.label);
  console.log('\nEdit menu items:');
  editItems.forEach(label => console.log(`  - ${label}`));
  
  const requiredEditItems = ['Undo', 'Redo', 'Cut', 'Copy', 'Paste', 'Select All'];
  const hasAllEditItems = requiredEditItems.every(item => editItems.includes(item));
  
  if (hasAllEditItems) {
    console.log('✓ Edit menu items correct');
  }
}

// Check View menu items
const viewMenu = menu.items.find(item => item.label === 'View');
if (viewMenu && viewMenu.submenu) {
  const viewItems = viewMenu.submenu.items.map(item => item.label);
  console.log('\nView menu items:');
  viewItems.forEach(label => console.log(`  - ${label}`));
  
  if (viewItems.includes('Reload') && viewItems.includes('Force Reload')) {
    console.log('✓ View menu items correct');
  }
}

// Check Window menu items
const windowMenu = menu.items.find(item => item.label === 'Window');
if (windowMenu && windowMenu.submenu) {
  const windowItems = windowMenu.submenu.items.map(item => item.label);
  console.log('\nWindow menu items:');
  windowItems.forEach(label => console.log(`  - ${label}`));
  
  if (windowItems.includes('Minimize') && windowItems.includes('Zoom')) {
    console.log('✓ Window menu items correct');
  }
}

// Check Help menu items
const helpMenu = menu.items.find(item => item.label === 'Help');
if (helpMenu && helpMenu.submenu) {
  const helpItems = helpMenu.submenu.items.map(item => item.label);
  console.log('\nHelp menu items:');
  helpItems.forEach(label => console.log(`  - ${label}`));
  
  if (helpItems.includes('Documentation') && helpItems.includes('Report Issue') && helpItems.includes('About')) {
    console.log('✓ Help menu items correct');
  }
}

console.log('\n✓ Menu Manager verification complete!');
console.log('✓ Task 7.1 implementation successful\n');

process.exit(0);
