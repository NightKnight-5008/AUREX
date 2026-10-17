/**
 * WindowManager Unit Tests
 * Validates: Requirements 1.1, 1.2, 1.3, 1.5, 1.6, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BrowserWindow, app, screen } from 'electron';
import { WindowManager } from '../lib/window-manager';
import { SecureStorageManager } from '../lib/secure-storage';

// Mock electron modules
vi.mock('electron', () => ({
  BrowserWindow: vi.fn(),
  app: {
    getPath: vi.fn(() => '/mock/path')
  },
  screen: {
    getPrimaryDisplay: vi.fn(() => ({
      workAreaSize: { width: 1920, height: 1080 }
    }))
  },
  session: {
    defaultSession: {
      webRequest: {
        onHeadersReceived: vi.fn()
      }
    }
  }
}));

vi.mock('electron-log', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  }
}));

describe('WindowManager', () => {
  let windowManager: WindowManager;
  let mockWindow: any;
  let mockStorage: any;

  beforeEach(() => {
    // Create mock window
    mockWindow = {
      loadURL: vi.fn().mockResolvedValue(undefined),
      loadFile: vi.fn().mockResolvedValue(undefined),
      show: vi.fn(),
      maximize: vi.fn(),
      unmaximize: vi.fn(),
      minimize: vi.fn(),
      close: vi.fn(),
      focus: vi.fn(),
      isMaximized: vi.fn(() => false),
      isMinimized: vi.fn(() => false),
      isFocused: vi.fn(() => false),
      getBounds: vi.fn(() => ({ width: 1400, height: 900, x: 100, y: 100 })),
      on: vi.fn(),
      once: vi.fn(),
      webContents: {
        openDevTools: vi.fn(),
        on: vi.fn(),
        setWindowOpenHandler: vi.fn()
      }
    };

    // Mock BrowserWindow constructor
    (BrowserWindow as any).mockImplementation(() => mockWindow);

    // Create mock storage
    mockStorage = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(true)
    };

    windowManager = new WindowManager(mockStorage);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Window Creation', () => {
    it('should create window with minimum dimensions of 1024x768', async () => {
      // Validates: Requirement 1.1
      await windowManager.createWindow();

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          minWidth: 1024,
          minHeight: 768
        })
      );
    });

    it('should enable context isolation', async () => {
      // Validates: Requirement 1.2
      await windowManager.createWindow();

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          webPreferences: expect.objectContaining({
            contextIsolation: true
          })
        })
      );
    });

    it('should disable nodeIntegration', async () => {
      // Validates: Requirement 1.3
      await windowManager.createWindow();

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          webPreferences: expect.objectContaining({
            nodeIntegration: false
          })
        })
      );
    });

    it('should load preload script', async () => {
      // Validates: Requirement 1.4
      await windowManager.createWindow();

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          webPreferences: expect.objectContaining({
            preload: expect.stringContaining('preload.js')
          })
        })
      );
    });

    it('should load Vite dev server in development mode', async () => {
      // Validates: Requirement 1.5
      process.env.NODE_ENV = 'development';
      windowManager = new WindowManager(mockStorage);

      await windowManager.createWindow();

      expect(mockWindow.loadURL).toHaveBeenCalledWith('http://localhost:5173');
      expect(mockWindow.webContents.openDevTools).toHaveBeenCalled();
    });

    it('should load built index.html in production mode', async () => {
      // Validates: Requirement 1.6
      process.env.NODE_ENV = 'production';
      windowManager = new WindowManager(mockStorage);

      await windowManager.createWindow();

      expect(mockWindow.loadFile).toHaveBeenCalledWith(
        expect.stringContaining('index.html')
      );
    });
  });

  describe('Window State Persistence', () => {
    it('should restore window state from storage', async () => {
      // Validates: Requirement 5.2
      const savedState = {
        width: 1600,
        height: 1000,
        x: 200,
        y: 150,
        isMaximized: false
      };

      mockStorage.get.mockResolvedValue(JSON.stringify(savedState));

      await windowManager.createWindow();

      expect(mockStorage.get).toHaveBeenCalledWith('window-state');
      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: savedState.width,
          height: savedState.height,
          x: savedState.x,
          y: savedState.y
        })
      );
    });

    it('should use default dimensions when no saved state exists', async () => {
      // Validates: Requirement 5.2
      mockStorage.get.mockResolvedValue(null);

      await windowManager.createWindow();

      expect(BrowserWindow).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 1400,
          height: 900
        })
      );
    });

    it('should restore maximized state', async () => {
      // Validates: Requirement 5.2
      const savedState = {
        width: 1600,
        height: 1000,
        isMaximized: true
      };

      mockStorage.get.mockResolvedValue(JSON.stringify(savedState));

      await windowManager.createWindow();

      expect(mockWindow.maximize).toHaveBeenCalled();
    });
  });

  describe('Window Lifecycle Events', () => {
    it('should setup minimize event handler', async () => {
      // Validates: Requirement 5.3
      await windowManager.createWindow();

      expect(mockWindow.on).toHaveBeenCalledWith('minimize', expect.any(Function));
    });

    it('should setup maximize event handler', async () => {
      // Validates: Requirement 5.4
      await windowManager.createWindow();

      expect(mockWindow.on).toHaveBeenCalledWith('maximize', expect.any(Function));
    });

    it('should setup resize event handler for state persistence', async () => {
      // Validates: Requirement 5.2
      await windowManager.createWindow();

      expect(mockWindow.on).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('should setup move event handler for state persistence', async () => {
      // Validates: Requirement 5.2
      await windowManager.createWindow();

      expect(mockWindow.on).toHaveBeenCalledWith('move', expect.any(Function));
    });

    it('should setup closed event handler', async () => {
      // Validates: Requirement 5.5
      await windowManager.createWindow();

      expect(mockWindow.on).toHaveBeenCalledWith('closed', expect.any(Function));
    });
  });

  describe('Security Handlers', () => {
    it('should setup navigation prevention handler', async () => {
      // Validates: Requirements 9.1, 9.2
      await windowManager.createWindow();

      expect(mockWindow.webContents.on).toHaveBeenCalledWith(
        'will-navigate',
        expect.any(Function)
      );
    });

    it('should setup new window prevention handler', async () => {
      // Validates: Requirements 9.4, 9.5
      await windowManager.createWindow();

      expect(mockWindow.webContents.setWindowOpenHandler).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });
  });

  describe('Window Control Methods', () => {
    beforeEach(async () => {
      await windowManager.createWindow();
    });

    it('should minimize window', () => {
      windowManager.minimize();
      expect(mockWindow.minimize).toHaveBeenCalled();
    });

    it('should maximize window when not maximized', () => {
      mockWindow.isMaximized.mockReturnValue(false);
      windowManager.maximize();
      expect(mockWindow.maximize).toHaveBeenCalled();
    });

    it('should unmaximize window when maximized', () => {
      mockWindow.isMaximized.mockReturnValue(true);
      windowManager.maximize();
      expect(mockWindow.unmaximize).toHaveBeenCalled();
    });

    it('should close window', () => {
      windowManager.close();
      expect(mockWindow.close).toHaveBeenCalled();
    });

    it('should focus window', () => {
      windowManager.focus();
      expect(mockWindow.focus).toHaveBeenCalled();
    });

    it('should check if window is minimized', () => {
      mockWindow.isMinimized.mockReturnValue(true);
      expect(windowManager.isMinimized()).toBe(true);
    });

    it('should check if window is maximized', () => {
      mockWindow.isMaximized.mockReturnValue(true);
      expect(windowManager.isMaximized()).toBe(true);
    });

    it('should check if window is focused', () => {
      mockWindow.isFocused.mockReturnValue(true);
      expect(windowManager.isFocused()).toBe(true);
    });
  });

  describe('Window State Getters', () => {
    it('should return main window instance', async () => {
      await windowManager.createWindow();
      expect(windowManager.getMainWindow()).toBe(mockWindow);
    });

    it('should return null when window is not created', () => {
      expect(windowManager.getMainWindow()).toBeNull();
    });
  });

  describe('Content Security Policy', () => {
    it('should set CSP header for all web requests', async () => {
      // Validates: Requirement 8.1
      const { session } = await import('electron');
      
      await windowManager.createWindow();

      expect(session.defaultSession.webRequest.onHeadersReceived).toHaveBeenCalled();
    });

    it('should configure CSP with all required directives in development', async () => {
      // Validates: Requirements 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
      process.env.NODE_ENV = 'development';
      windowManager = new WindowManager(mockStorage);

      const { session } = await import('electron');
      let cspCallback: any;
      
      (session.defaultSession.webRequest.onHeadersReceived as any).mockImplementation((callback: any) => {
        cspCallback = callback;
      });

      await windowManager.createWindow();

      // Simulate a web request
      const mockDetails = { responseHeaders: {} };
      const mockCallback = vi.fn();
      cspCallback(mockDetails, mockCallback);

      const cspHeader = mockCallback.mock.calls[0][0].responseHeaders['Content-Security-Policy'][0];

      // Requirement 8.2: Scripts from 'self', 'unsafe-inline', 'unsafe-eval'
      expect(cspHeader).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");

      // Requirement 8.3: Styles from 'self' and 'unsafe-inline'
      expect(cspHeader).toContain("style-src 'self' 'unsafe-inline'");

      // Requirement 8.4: Images from 'self', data:, https:
      expect(cspHeader).toContain("img-src 'self' data: https:");

      // Requirement 8.5: Fonts from 'self' and data:
      expect(cspHeader).toContain("font-src 'self' data:");

      // Requirement 8.6: Connections to 'self', Supabase, AUREX backend
      expect(cspHeader).toContain("connect-src 'self'");
      expect(cspHeader).toContain("https://*.supabase.co");
      expect(cspHeader).toContain("wss://*.supabase.co");
      expect(cspHeader).toContain("https://api-production.creao.ai");

      // Requirement 8.7: Block other resource types by default
      expect(cspHeader).toContain("default-src 'self'");
      expect(cspHeader).toContain("media-src 'self'");
      expect(cspHeader).toContain("object-src 'none'");
      expect(cspHeader).toContain("frame-src 'none'");
      expect(cspHeader).toContain("base-uri 'self'");
      expect(cspHeader).toContain("form-action 'self'");
    });

    it('should use stricter CSP in production (no unsafe-inline/eval for scripts)', async () => {
      // Validates: Requirement 8.2 (production mode)
      process.env.NODE_ENV = 'production';
      windowManager = new WindowManager(mockStorage);

      const { session } = await import('electron');
      let cspCallback: any;
      
      (session.defaultSession.webRequest.onHeadersReceived as any).mockImplementation((callback: any) => {
        cspCallback = callback;
      });

      await windowManager.createWindow();

      // Simulate a web request
      const mockDetails = { responseHeaders: {} };
      const mockCallback = vi.fn();
      cspCallback(mockDetails, mockCallback);

      const cspHeader = mockCallback.mock.calls[0][0].responseHeaders['Content-Security-Policy'][0];

      // Production should NOT have unsafe-inline or unsafe-eval for scripts
      expect(cspHeader).toContain("script-src 'self'");
      expect(cspHeader).not.toContain("'unsafe-inline'");
      expect(cspHeader).not.toContain("'unsafe-eval'");

      // But should still allow unsafe-inline for styles (required for styled components)
      expect(cspHeader).toContain("style-src 'self' 'unsafe-inline'");
    });

    it('should include all security directives in CSP', async () => {
      // Validates: Requirement 8.7
      await windowManager.createWindow();

      const { session } = await import('electron');
      let cspCallback: any;
      
      (session.defaultSession.webRequest.onHeadersReceived as any).mockImplementation((callback: any) => {
        cspCallback = callback;
      });

      await windowManager.createWindow();

      const mockDetails = { responseHeaders: {} };
      const mockCallback = vi.fn();
      cspCallback(mockDetails, mockCallback);

      const cspHeader = mockCallback.mock.calls[0][0].responseHeaders['Content-Security-Policy'][0];

      // Verify all security directives are present
      const requiredDirectives = [
        'default-src',
        'script-src',
        'style-src',
        'img-src',
        'font-src',
        'connect-src',
        'media-src',
        'object-src',
        'frame-src',
        'base-uri',
        'form-action'
      ];

      requiredDirectives.forEach(directive => {
        expect(cspHeader).toContain(directive);
      });
    });
  });
});
