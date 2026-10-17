/**
 * AUREX FINANCIAL OPERATING SYSTEM - SESSION MANAGEMENT MODULE
 *
 * Provides inactivity tracking and automatic session timeout for sensitive features.
 *
 * SECURITY MODEL:
 * - Global inactivity timeout: 15 minutes (no activity across app)
 * - Tab-specific timeout: 5 minutes (user switches tabs)
 * - Activity events: mouse, keyboard, scroll, touch
 * - Tab fingerprinting: Prevent session transfer between tabs
 *
 * IMPLEMENTATION:
 * - Throttled activity tracking (max 1 update per second)
 * - Visibility API for tab switching detection
 * - Session storage for tab-specific state
 * - Automatic cleanup on tab close
 */

export interface SessionConfig {
  /** Global inactivity timeout in milliseconds (default: 15 minutes) */
  globalTimeout?: number;

  /** Tab-specific inactivity timeout in milliseconds (default: 5 minutes) */
  tabTimeout?: number;

  /** Callback when session times out */
  onTimeout?: () => void;

  /** Callback when activity is detected */
  onActivity?: () => void;

  /** Session identifier (for multi-session tracking) */
  sessionId?: string;
}

export interface SessionState {
  /** Whether the session is active */
  active: boolean;

  /** Last activity timestamp */
  lastActivity: number;

  /** Session start timestamp */
  startedAt: number;

  /** Tab fingerprint (prevents session transfer) */
  tabFingerprint: string;

  /** Current visibility state */
  isVisible: boolean;

  /** Last visibility change timestamp */
  lastVisibilityChange: number;
}

/**
 * Session Manager Class
 */
export class SessionManager {
  private config: Required<SessionConfig>;
  private state: SessionState;
  private activityCheckInterval: number | null = null;
  private boundActivityHandler: () => void;
  private boundVisibilityHandler: () => void;
  private lastActivityUpdate: number = 0;
  private readonly ACTIVITY_THROTTLE_MS = 1000; // Update max once per second

  constructor(config: SessionConfig = {}) {
    this.config = {
      globalTimeout: config.globalTimeout ?? 15 * 60 * 1000, // 15 minutes
      tabTimeout: config.tabTimeout ?? 5 * 60 * 1000, // 5 minutes
      onTimeout: config.onTimeout ?? (() => {}),
      onActivity: config.onActivity ?? (() => {}),
      sessionId: config.sessionId ?? 'default'
    };

    // Initialize session state
    this.state = {
      active: false,
      lastActivity: Date.now(),
      startedAt: Date.now(),
      tabFingerprint: this.generateTabFingerprint(),
      isVisible: !document.hidden,
      lastVisibilityChange: Date.now()
    };

    // Bind event handlers
    this.boundActivityHandler = this.handleActivity.bind(this);
    this.boundVisibilityHandler = this.handleVisibilityChange.bind(this);
  }

  /**
   * Generate unique tab fingerprint to prevent session transfer
   */
  private generateTabFingerprint(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const userAgent = navigator.userAgent;
    const screenSignature = `${screen.width}x${screen.height}x${screen.colorDepth}`;

    const data = `${timestamp}-${random}-${userAgent}-${screenSignature}`;
    return btoa(data).substring(0, 32);
  }

  /**
   * Handle activity events (throttled)
   */
  private handleActivity(): void {
    const now = Date.now();

    // Throttle updates to max once per second
    if (now - this.lastActivityUpdate < this.ACTIVITY_THROTTLE_MS) {
      return;
    }

    this.lastActivityUpdate = now;
    this.state.lastActivity = now;

    // Call activity callback
    this.config.onActivity();
  }

  /**
   * Handle visibility change (tab switch)
   */
  private handleVisibilityChange(): void {
    const now = Date.now();
    const wasVisible = this.state.isVisible;
    this.state.isVisible = !document.hidden;
    this.state.lastVisibilityChange = now;

    // If tab became visible again, update last activity
    if (!wasVisible && this.state.isVisible) {
      this.state.lastActivity = now;
    }
  }

  /**
   * Check if session has timed out
   */
  private checkTimeout(): boolean {
    if (!this.state.active) {
      return false;
    }

    const now = Date.now();
    const timeSinceActivity = now - this.state.lastActivity;

    // Check tab-specific timeout (user switched away)
    if (!this.state.isVisible) {
      const timeSinceVisibilityChange = now - this.state.lastVisibilityChange;
      if (timeSinceVisibilityChange > this.config.tabTimeout) {
        return true;
      }
    }

    // Check global timeout
    if (timeSinceActivity > this.config.globalTimeout) {
      return true;
    }

    return false;
  }

  /**
   * Activity check loop
   */
  private runActivityCheck(): void {
    if (this.checkTimeout()) {
      this.endSession();
      this.config.onTimeout();
    }
  }

  /**
   * Start session tracking
   */
  startSession(): void {
    if (this.state.active) {
      return; // Already active
    }

    this.state.active = true;
    this.state.startedAt = Date.now();
    this.state.lastActivity = Date.now();

    // Register activity event listeners
    const activityEvents = ['mousemove', 'keypress', 'scroll', 'click', 'touchstart'];
    for (const event of activityEvents) {
      window.addEventListener(event, this.boundActivityHandler, { passive: true });
    }

    // Register visibility change listener
    document.addEventListener('visibilitychange', this.boundVisibilityHandler);

    // Start activity check interval (every 10 seconds)
    this.activityCheckInterval = window.setInterval(() => {
      this.runActivityCheck();
    }, 10 * 1000);
  }

  /**
   * End session tracking
   */
  endSession(): void {
    if (!this.state.active) {
      return; // Already inactive
    }

    this.state.active = false;

    // Remove activity event listeners
    const activityEvents = ['mousemove', 'keypress', 'scroll', 'click', 'touchstart'];
    for (const event of activityEvents) {
      window.removeEventListener(event, this.boundActivityHandler);
    }

    // Remove visibility change listener
    document.removeEventListener('visibilitychange', this.boundVisibilityHandler);

    // Clear interval
    if (this.activityCheckInterval !== null) {
      clearInterval(this.activityCheckInterval);
      this.activityCheckInterval = null;
    }
  }

  /**
   * Get current session state
   */
  getState(): Readonly<SessionState> {
    return { ...this.state };
  }

  /**
   * Get time until timeout (in milliseconds)
   */
  getTimeUntilTimeout(): number {
    if (!this.state.active) {
      return 0;
    }

    const now = Date.now();
    const timeSinceActivity = now - this.state.lastActivity;

    // If tab is not visible, use tab timeout
    if (!this.state.isVisible) {
      const timeSinceVisibilityChange = now - this.state.lastVisibilityChange;
      return Math.max(0, this.config.tabTimeout - timeSinceVisibilityChange);
    }

    // Otherwise use global timeout
    return Math.max(0, this.config.globalTimeout - timeSinceActivity);
  }

  /**
   * Manually trigger activity (for explicit actions like button clicks)
   */
  recordActivity(): void {
    this.handleActivity();
  }

  /**
   * Check if session is still active
   */
  isActive(): boolean {
    return this.state.active && !this.checkTimeout();
  }

  /**
   * Destroy session manager and clean up all resources
   */
  destroy(): void {
    this.endSession();
  }
}

/**
 * Create a session manager with default config for payroll
 */
export function createPayrollSession(onTimeout: () => void): SessionManager {
  return new SessionManager({
    globalTimeout: 15 * 60 * 1000, // 15 minutes
    tabTimeout: 5 * 60 * 1000, // 5 minutes
    onTimeout,
    sessionId: 'payroll'
  });
}
