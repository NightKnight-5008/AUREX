/**
 * AUREX Desktop - Main Process
 *
 * SECURITY ARCHITECTURE:
 * - Process separation (main vs renderer)
 * - Encrypted IPC communication
 * - No nodeIntegration in renderer
 * - Context isolation enabled
 * - Encrypted local database (SQLite)
 * - Memory-only encryption keys
 */

import { app, BrowserWindow, session, screen, powerMonitor } from 'electron';
import log from 'electron-log';
import path from 'path';
import fs from 'fs';
import { SecureStorageManager } from './lib/secure-storage.js';
import { SessionManager } from './lib/session-manager.js';
import { IPCSecurityLayer } from './lib/ipc-security.js';
import { DPAPIManager } from './lib/dpapi-manager.js';
import { IntegrityManager } from './lib/integrity-manager.js';
import { WindowManager } from './lib/window-manager.js';
import { MenuManager } from './lib/menu-manager.js';
import { AutoUpdateManager } from './lib/auto-update-manager.js';
import { TrayManager } from './lib/tray-manager.js';
import { NotificationManager } from './lib/notification-manager.js';
import { ShortcutManager } from './lib/shortcut-manager.js';
import { ThemeManager } from './lib/theme-manager.js';
import { PowerManager } from './lib/power-manager.js';

// Development mode detection
const isDev = process.env.NODE_ENV === 'development';
const isProduction = !isDev;

/**
 * Configure comprehensive logging with electron-log
 * Validates: Requirements 15.1, 15.2, 15.3, 15.7
 */
function configureLogging(): void {
  // Set log level based on environment
  log.transports.file.level = 'info';
  log.transports.console.level = isDev ? 'debug' : false;
  
  // Configure file transport
  log.transports.file.maxSize = 10 * 1024 * 1024; // 10MB
  log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
  log.transports.file.resolvePathFn = () => {
    return path.join(app.getPath('userData'), 'logs', 'main.log');
  };
  
  // File rotation - keep only last 5 log files
  log.transports.file.archiveLog = (oldLogFile) => {
    const oldLogPath = typeof oldLogFile === 'string' ? oldLogFile : oldLogFile.toString();
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const archivePath = oldLogPath.replace('.log', `-${timestamp}.log`);
    
    // Keep only last 5 log files
    const logDir = path.dirname(oldLogPath);
    
    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logFiles = fs.readdirSync(logDir)
      .filter((f: string) => f.startsWith('main-') && f.endsWith('.log'))
      .sort()
      .reverse();
    
    if (logFiles.length >= 5) {
      logFiles.slice(4).forEach((f: string) => {
        try {
          fs.unlinkSync(path.join(logDir, f));
        } catch (error) {
          console.error('Failed to delete old log file:', f, error);
        }
      });
    }
    
    return archivePath;
  };
  
  // Log startup information
  log.info('='.repeat(80));
  log.info('Application starting');
  log.info(`Version: ${app.getVersion()}`);
  log.info(`Electron: ${process.versions.electron}`);
  log.info(`Chrome: ${process.versions.chrome}`);
  log.info(`Node: ${process.versions.node}`);
  log.info(`Platform: ${process.platform}`);
  log.info(`Architecture: ${process.arch}`);
  log.info(`Environment: ${isDev ? 'development' : 'production'}`);
  log.info('='.repeat(80));
}

// Configure logging immediately
configureLogging();

// Global references
let mainWindow: BrowserWindow | null = null;
let windowManager: WindowManager | null = null;
let menuManager: MenuManager | null = null;
let autoUpdateManager: AutoUpdateManager | null = null;
let trayManager: TrayManager | null = null;
let notificationManager: NotificationManager | null = null;
let shortcutManager: ShortcutManager | null = null;
let themeManager: ThemeManager | null = null;
let powerManager: PowerManager | null = null;
let storageManager: SecureStorageManager | null = null;
let sessionManager: SessionManager | null = null;
let ipcSecurity: IPCSecurityLayer | null = null;
let dpapiManager: DPAPIManager | null = null;
let integrityManager: IntegrityManager | null = null;

/**
 * Create main application window with security hardening
 * Now uses WindowManager class for encapsulated window management
 */
async function createWindow(): Promise<void> {
  // Initialize WindowManager with storage and session manager
  windowManager = new WindowManager(storageManager || undefined, sessionManager || undefined);
  
  // Create window using WindowManager
  mainWindow = await windowManager.createWindow();

  // Setup additional event handlers for cleanup
  mainWindow.on('closed', () => {
    mainWindow = null;
    windowManager = null;
    menuManager = null;
    autoUpdateManager?.destroy();
    autoUpdateManager = null;
    trayManager?.destroy();
    trayManager = null;
    notificationManager?.destroy();
    notificationManager = null;
    shortcutManager?.destroy();
    shortcutManager = null;
    themeManager?.destroy();
    themeManager = null;
    powerManager?.destroy();
    powerManager = null;

    // SECURITY: Wipe encryption keys from memory
    storageManager?.wipeKeys();
    sessionManager?.destroy();
  });

  // Create and set application menu
  menuManager = new MenuManager(mainWindow);
  menuManager.createMenu();
  log.info('Application menu initialized');

  // Initialize TrayManager (Windows and Linux only)
  trayManager = new TrayManager();
  trayManager.create(mainWindow);
  if (trayManager.isCreated()) {
    log.info('System tray initialized');
  }

  // Initialize NotificationManager
  notificationManager = new NotificationManager();
  notificationManager.setWindow(mainWindow);
  log.info('NotificationManager initialized');

  // Initialize ShortcutManager
  shortcutManager = new ShortcutManager();
  shortcutManager.register(mainWindow);
  log.info('ShortcutManager initialized');

  // Initialize ThemeManager
  themeManager = new ThemeManager();
  themeManager.initialize(mainWindow);
  log.info('ThemeManager initialized');

  // Initialize PowerManager
  if (sessionManager) {
    powerManager = new PowerManager();
    powerManager.initialize(mainWindow, sessionManager);
    log.info('PowerManager initialized');
  }

  // Initialize AutoUpdateManager
  autoUpdateManager = new AutoUpdateManager(isProduction);
  autoUpdateManager.setWindow(mainWindow);
  autoUpdateManager.setNotificationManager(notificationManager);
  
  // Check for updates on startup (production only, 3 second delay)
  autoUpdateManager.checkForUpdatesOnStartup();
  
  // Start periodic update checks (every 4 hours)
  autoUpdateManager.startPeriodicUpdateChecks();
  
  log.info('AutoUpdateManager initialized');
}

/**
 * Initialize secure services
 */
async function initializeServices(): Promise<void> {
  try {
    // Initialize DPAPI for OS-bound key management
    dpapiManager = new DPAPIManager();
    await dpapiManager.initialize();
    log.info('DPAPI manager initialized');

    // Initialize encrypted storage
    storageManager = new SecureStorageManager(app.getPath('userData'));
    await storageManager.initialize();
    log.info('Secure storage initialized');

    // Initialize integrity verification
    integrityManager = new IntegrityManager();
    await integrityManager.initialize();
    const integrityResult = await integrityManager.verify();

    if (!integrityResult.isValid) {
      log.error('SECURITY: Integrity check failed!', integrityResult);
      log.error('Tampered items:', integrityResult.tamperedItems);
      if (integrityResult.mode === 'SAFE_MODE') {
        log.warn('Running in SAFE MODE (read-only)');
      }
    }

    // Initialize session manager
    sessionManager = new SessionManager(storageManager);
    await sessionManager.initialize();
    log.info('Session manager initialized');

    // Initialize IPC security layer
    ipcSecurity = new IPCSecurityLayer(storageManager, sessionManager);
    ipcSecurity.registerHandlers();
    log.info('IPC security layer initialized');

    log.info('All services initialized successfully');
  } catch (error) {
    log.error('Failed to initialize services:', error);
    throw error;
  }
}

/**
 * Application lifecycle handlers
 * Validates: Requirements 1.7, 1.8
 */
app.whenReady().then(async () => {
  try {
    await initializeServices();
    await createWindow();

    log.info('AUREX Desktop started successfully');
  } catch (error) {
    log.error('Failed to start application:', error);
    app.quit();
  }
});

/**
 * Quit when all windows are closed (platform-specific behavior)
 * Validates: Requirement 1.7
 */
app.on('window-all-closed', () => {
  // On macOS, applications stay active until explicitly quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Recreate window on macOS when dock icon is clicked
 * Validates: Requirement 1.7
 */
app.on('activate', async () => {
  if (mainWindow === null) {
    await createWindow();
  }
});

/**
 * Cleanup resources before quit
 * Validates: Requirement 1.8
 */
app.on('before-quit', () => {
  log.info('Application quitting - cleaning up resources');
  autoUpdateManager?.destroy();
  trayManager?.destroy();
  notificationManager?.destroy();
  shortcutManager?.destroy();
  powerManager?.destroy();
  storageManager?.wipeKeys();
  sessionManager?.destroy();
});

/**
 * Global error handlers for uncaught exceptions and unhandled rejections
 * Validates: Requirements 15.4, 15.5
 */
process.on('uncaughtException', (error: Error) => {
  log.error('Uncaught exception in main process:', {
    message: error.message,
    stack: error.stack,
    name: error.name
  });
  
  // Don't exit - allow app to continue running
  // Critical errors will be handled by specific error handlers
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  log.error('Unhandled promise rejection in main process:', {
    reason: reason instanceof Error ? {
      message: reason.message,
      stack: reason.stack,
      name: reason.name
    } : reason,
    promise: promise.toString()
  });
  
  // Log but don't exit - promise rejections are often recoverable
});
