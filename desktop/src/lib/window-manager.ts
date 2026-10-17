/**
 * AUREX Desktop - Window Manager
 *
 * Manages window creation, state persistence, and lifecycle
 * Validates: Requirements 1.1, 1.2, 1.3, 1.5, 1.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

import { BrowserWindow, screen, app, session } from 'electron';
import log from 'electron-log';
import path from 'path';
import { fileURLToPath } from 'url';
import { SecureStorageManager } from './secure-storage.js';
import { SessionManager } from './session-manager.js';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Window state interface for persistence
 */
export interface WindowState {
  width: number;
  height: number;
  x?: number;
  y?: number;
  isMaximized: boolean;
}

/**
 * WindowManager class
 * Encapsulates all window creation and management logic
 */
export class WindowManager {
  private window: BrowserWindow | null = null;
  private storage: SecureStorageManager | null = null;
  private sessionManager: SessionManager | null = null;
  private isDev: boolean;

  constructor(storage?: SecureStorageManager, sessionManager?: SessionManager) {
    this.storage = storage || null;
    this.sessionManager = sessionManager || null;
    this.isDev = process.env.NODE_ENV === 'development';
  }

  /**
   * Create main application window with security settings
   * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
   */
  async createWindow(): Promise<BrowserWindow> {
    // Restore previous window state or use defaults
    const windowState = await this.restoreWindowState();

    // Get primary display dimensions
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    // Create window with security settings
    this.window = new BrowserWindow({
      width: windowState.width,
      height: windowState.height,
      x: windowState.x,
      y: windowState.y,
      minWidth: 1024,  // Requirement 1.1
      minHeight: 768,  // Requirement 1.1
      title: 'AUREX Financial OS',
      frame: true,
      backgroundColor: '#FFFFFF',
      show: false, // Show after ready-to-show for smooth loading
      webPreferences: {
        // SECURITY: Disable nodeIntegration (Requirement 1.3)
        nodeIntegration: false,

        // SECURITY: Enable context isolation (Requirement 1.2)
        contextIsolation: true,

        // SECURITY: Use preload script for secure IPC (Requirement 1.4)
        preload: path.join(__dirname, '../preload.js'),

        // SECURITY: Disable web security in dev only
        webSecurity: !this.isDev,

        // SECURITY: Disable navigation to external sites
        allowRunningInsecureContent: false,

        // Enable DevTools in development
        devTools: this.isDev
      }
    });

    // Restore maximized state
    if (windowState.isMaximized) {
      this.window.maximize();
    }

    // Setup Content Security Policy
    this.setupCSP();

    // Show window when ready
    this.window.once('ready-to-show', () => {
      this.window?.show();
      log.info('Window shown and ready');
    });

    // Load application (Requirement 1.5, 1.6)
    await this.loadApplication();

    // Setup window lifecycle event handlers
    this.setupLifecycleHandlers();

    // Setup security handlers
    this.setupSecurityHandlers();

    log.info('Window created successfully', {
      width: windowState.width,
      height: windowState.height,
      isMaximized: windowState.isMaximized
    });

    return this.window;
  }

  /**
   * Setup Content Security Policy
   * Validates: Requirement 8.1-8.7
   */
  private setupCSP(): void {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      // Use stricter CSP in production (no unsafe-inline/eval for scripts)
      const cspPolicy = this.isDev ? this.getDevCSP() : this.getProdCSP();
      
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [cspPolicy]
        }
      });
    });
  }

  /**
   * Get development CSP policy (allows unsafe-inline/eval for React dev mode)
   */
  private getDevCSP(): string {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api-production.creao.ai https://*.render.com https://*.supabase.co wss://*.supabase.co",
      "media-src 'self'",
      "object-src 'none'",
      "frame-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
  }

  /**
   * Get production CSP policy (stricter - no unsafe-inline/eval for scripts)
   */
  private getProdCSP(): string {
    return [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api-production.creao.ai https://*.supabase.co wss://*.supabase.co",
      "media-src 'self'",
      "object-src 'none'",
      "frame-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ');
  }

  /**
   * Load application based on environment
   * Validates: Requirements 1.5, 1.6
   */
  private async loadApplication(): Promise<void> {
    if (!this.window) {
      throw new Error('Window not initialized');
    }

    if (this.isDev) {
      // Development mode: Load Vite dev server (Requirement 1.5)
      await this.window.loadURL('http://localhost:3000');
      this.window.webContents.openDevTools();
      log.info('Loaded Vite dev server at http://localhost:3000');
    } else {
      // Production mode: Load built index.html (Requirement 1.6)
      const indexPath = path.join(__dirname, '../dist/index.html');
      await this.window.loadFile(indexPath);
      log.info('Loaded production build from', indexPath);
    }
  }

  /**
   * Setup window lifecycle event handlers
   * Validates: Requirements 5.3, 5.4, 5.5, 5.6
   */
  private setupLifecycleHandlers(): void {
    if (!this.window) return;

    // Handle minimize event (Requirement 5.3)
    this.window.on('minimize', () => {
      log.debug('Window minimized');
      this.sessionManager?.onWindowMinimize();
    });

    // Handle maximize/unmaximize events (Requirement 5.4)
    this.window.on('maximize', () => {
      log.debug('Window maximized');
    });

    this.window.on('unmaximize', () => {
      log.debug('Window unmaximized');
    });

    // Handle blur event
    this.window.on('blur', () => {
      this.sessionManager?.onWindowBlur();
    });

    // Handle focus event
    this.window.on('focus', () => {
      this.sessionManager?.onWindowFocus();
    });

    // Handle window resize and move for state persistence (Requirement 5.2)
    this.window.on('resize', () => {
      this.saveWindowState();
    });

    this.window.on('move', () => {
      this.saveWindowState();
    });

    // Handle close event (Requirement 5.5, 1.8)
    this.window.on('closed', () => {
      log.info('Window closed');
      this.window = null;
    });
  }

  /**
   * Setup security handlers
   * Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5
   */
  private setupSecurityHandlers(): void {
    if (!this.window) return;

    // SECURITY: Prevent navigation to external sites (Requirement 9.1, 9.2, 9.3)
    this.window.webContents.on('will-navigate', (event, url) => {
      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        'file://'
      ];

      const isAllowed = allowedOrigins.some(origin => url.startsWith(origin));

      if (!isAllowed) {
        event.preventDefault();
        log.warn('Blocked navigation to external URL:', url);
      }
    });

    // SECURITY: Prevent new windows (Requirement 9.4, 9.5)
    this.window.webContents.setWindowOpenHandler(({ url }) => {
      log.warn('Blocked attempt to open new window:', url);
      return { action: 'deny' };
    });
  }

  /**
   * Restore window state from storage
   * Validates: Requirement 5.2
   */
  private async restoreWindowState(): Promise<WindowState> {
    try {
      if (this.storage) {
        const stateJson = await this.storage.get('window-state');
        if (stateJson) {
          const state = JSON.parse(stateJson) as WindowState;
          log.info('Restored window state from storage', state);
          return state;
        }
      }
    } catch (error) {
      log.warn('Failed to restore window state:', error);
    }

    // Return default state
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    return {
      width: Math.min(1400, width),
      height: Math.min(900, height),
      isMaximized: false
    };
  }

  /**
   * Save current window state to storage
   * Validates: Requirement 5.2
   */
  private async saveWindowState(): Promise<void> {
    if (!this.window || !this.storage) return;

    try {
      const bounds = this.window.getBounds();
      const state: WindowState = {
        width: bounds.width,
        height: bounds.height,
        x: bounds.x,
        y: bounds.y,
        isMaximized: this.window.isMaximized()
      };

      await this.storage.set('window-state', JSON.stringify(state), 'PUBLIC');
      log.debug('Saved window state', state);
    } catch (error) {
      log.error('Failed to save window state:', error);
    }
  }

  /**
   * Get the main window instance
   */
  getMainWindow(): BrowserWindow | null {
    return this.window;
  }

  /**
   * Set the main window instance (for backward compatibility)
   */
  setMainWindow(window: BrowserWindow): void {
    this.window = window;
  }

  /**
   * Minimize the window
   */
  minimize(): void {
    this.window?.minimize();
  }

  /**
   * Toggle maximize/unmaximize
   */
  maximize(): void {
    if (this.window?.isMaximized()) {
      this.window.unmaximize();
    } else {
      this.window?.maximize();
    }
  }

  /**
   * Close the window
   */
  close(): void {
    this.window?.close();
  }

  /**
   * Focus the window
   */
  focus(): void {
    this.window?.focus();
  }

  /**
   * Check if window is minimized
   */
  isMinimized(): boolean {
    return this.window?.isMinimized() || false;
  }

  /**
   * Check if window is maximized
   */
  isMaximized(): boolean {
    return this.window?.isMaximized() || false;
  }

  /**
   * Check if window is focused
   */
  isFocused(): boolean {
    return this.window?.isFocused() || false;
  }
}
