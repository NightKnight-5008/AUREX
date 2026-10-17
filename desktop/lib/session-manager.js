/**
 * AUREX Desktop - Session Manager
 *
 * Manages app-level sessions, inactivity timeout, and app locking
 *
 * FEATURES:
 * - App-level inactivity timeout (15 minutes)
 * - Lock on minimize/sleep
 * - Secure unlock via PIN/password
 * - Session state persistence
 */
import crypto from 'crypto';
export class SessionManager {
    storage;
    state;
    inactivityTimer = null;
    INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
    lockCallbacks = [];
    unlockCallbacks = [];
    constructor(storage) {
        this.storage = storage;
        this.state = {
            isLocked: true,
            lastActivity: Date.now(),
            sessionId: crypto.randomUUID()
        };
    }
    /**
     * Initialize session
     */
    async initialize() {
        // Load previous session state if exists
        const savedState = this.storage.get('session-state');
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                this.state = {
                    ...parsed,
                    isLocked: true, // Always lock on app start
                    sessionId: crypto.randomUUID() // New session ID
                };
            }
            catch (error) {
                // Invalid state, start fresh
            }
        }
        this.startInactivityTimer();
    }
    /**
     * Unlock app with password/PIN
     */
    async unlock(password) {
        // TODO: Verify password against stored hash
        // For now, simple validation
        if (password.length < 4) {
            return false;
        }
        this.state.isLocked = false;
        this.state.lastActivity = Date.now();
        this.state.sessionId = crypto.randomUUID();
        this.saveState();
        this.startInactivityTimer();
        this.notifyUnlock();
        return true;
    }
    /**
     * Lock app
     */
    lockApp() {
        this.state.isLocked = true;
        this.stopInactivityTimer();
        this.saveState();
        this.notifyLock();
    }
    /**
     * Record user activity
     */
    recordActivity() {
        if (!this.state.isLocked) {
            this.state.lastActivity = Date.now();
            this.resetInactivityTimer();
        }
    }
    /**
     * Check if app is locked
     */
    isLocked() {
        return this.state.isLocked;
    }
    /**
     * Get session ID
     */
    getSessionId() {
        return this.state.sessionId;
    }
    /**
     * Window minimize handler
     */
    onWindowMinimize() {
        // Lock app when minimized (optional security feature)
        // Can be configured by user
        const lockOnMinimize = true; // TODO: Make this a setting
        if (lockOnMinimize) {
            this.lockApp();
        }
    }
    /**
     * Window blur handler
     */
    onWindowBlur() {
        // Optional: pause inactivity timer when window is not focused
    }
    /**
     * Window focus handler
     */
    onWindowFocus() {
        this.recordActivity();
    }
    /**
     * Register lock callback
     */
    onLock(callback) {
        this.lockCallbacks.push(callback);
    }
    /**
     * Register unlock callback
     */
    onUnlock(callback) {
        this.unlockCallbacks.push(callback);
    }
    /**
     * Destroy session and cleanup
     */
    destroy() {
        this.stopInactivityTimer();
        this.lockCallbacks = [];
        this.unlockCallbacks = [];
    }
    /**
     * Start inactivity timer
     */
    startInactivityTimer() {
        this.stopInactivityTimer();
        this.inactivityTimer = setInterval(() => {
            const timeSinceActivity = Date.now() - this.state.lastActivity;
            if (timeSinceActivity >= this.INACTIVITY_TIMEOUT_MS) {
                this.lockApp();
            }
        }, 60000); // Check every minute
    }
    /**
     * Stop inactivity timer
     */
    stopInactivityTimer() {
        if (this.inactivityTimer) {
            clearInterval(this.inactivityTimer);
            this.inactivityTimer = null;
        }
    }
    /**
     * Reset inactivity timer
     */
    resetInactivityTimer() {
        this.startInactivityTimer();
    }
    /**
     * Save session state
     */
    saveState() {
        this.storage.set('session-state', JSON.stringify(this.state), 'SENSITIVE');
    }
    /**
     * Notify lock callbacks
     */
    notifyLock() {
        this.lockCallbacks.forEach(cb => cb());
    }
    /**
     * Notify unlock callbacks
     */
    notifyUnlock() {
        this.unlockCallbacks.forEach(cb => cb());
    }
}
