/**
 * Structured Logging Helpers
 *
 * Provides structured logging with context objects
 * Validates: Requirements 15.1, 15.2, 15.3
 */
import log from 'electron-log';
/**
 * Structured logger class
 * Validates: Requirements 15.1, 15.2, 15.3
 */
export class Logger {
    context;
    constructor(context = {}) {
        this.context = context;
    }
    /**
     * Create a child logger with additional context
     *
     * @param additionalContext - Additional context to merge
     * @returns New logger instance with merged context
     */
    child(additionalContext) {
        return new Logger({
            ...this.context,
            ...additionalContext
        });
    }
    /**
     * Log info message with context
     * Validates: Requirement 15.1
     *
     * @param message - Log message
     * @param context - Additional context
     */
    info(message, context) {
        const fullContext = { ...this.context, ...context };
        log.info(this.formatMessage(message, fullContext));
    }
    /**
     * Log warning message with context
     * Validates: Requirement 15.2
     *
     * @param message - Log message
     * @param context - Additional context
     */
    warn(message, context) {
        const fullContext = { ...this.context, ...context };
        log.warn(this.formatMessage(message, fullContext));
    }
    /**
     * Log error message with context
     * Validates: Requirement 15.3
     *
     * @param message - Log message
     * @param context - Additional context
     */
    error(message, context) {
        const fullContext = { ...this.context, ...context };
        log.error(this.formatMessage(message, fullContext));
    }
    /**
     * Log debug message with context
     *
     * @param message - Log message
     * @param context - Additional context
     */
    debug(message, context) {
        const fullContext = { ...this.context, ...context };
        log.debug(this.formatMessage(message, fullContext));
    }
    /**
     * Format log message with context
     *
     * @param message - Log message
     * @param context - Context object
     * @returns Formatted message
     */
    formatMessage(message, context) {
        if (Object.keys(context).length === 0) {
            return message;
        }
        try {
            const contextStr = JSON.stringify(context, null, 2);
            return `${message}\n${contextStr}`;
        }
        catch (error) {
            return `${message} [Context serialization failed]`;
        }
    }
}
// Export default logger instance
export const logger = new Logger();
// Export convenience functions
export const logInfo = (message, context) => logger.info(message, context);
export const logWarn = (message, context) => logger.warn(message, context);
export const logError = (message, context) => logger.error(message, context);
export const logDebug = (message, context) => logger.debug(message, context);
