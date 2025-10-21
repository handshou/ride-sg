/**
 * Client-side Logger Utility
 *
 * Provides a consistent logging interface for client-side React components.
 * This is a lightweight wrapper that could be upgraded to use Effect patterns
 * when needed.
 *
 * For server-side or Effect-based code, use Effect.log/logError/logWarning instead.
 */

type LogLevel = "log" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  data?: unknown;
}

class ClientLogger {
  private isDevelopment = process.env.NODE_ENV === "development";

  /**
   * Format log message with timestamp and emoji
   */
  private format(emoji: string, message: string): string {
    const timestamp = new Date().toISOString().split("T")[1].split(".")[0];
    return `[${timestamp}] ${emoji} ${message}`;
  }

  /**
   * Internal logging method
   */
  private logInternal(
    level: LogLevel,
    emoji: string,
    message: string,
    data?: unknown,
  ): void {
    // In production, only suppress 'log' and 'debug' levels
    // Keep info, warn, and error visible for monitoring
    if (!this.isDevelopment && level === "log") {
      return;
    }

    const formattedMessage = this.format(emoji, message);
    const _logEntry: LogEntry = {
      level,
      message: formattedMessage,
      timestamp: Date.now(),
      data,
    };

    // Use appropriate console method based on level
    const consoleMethod = console[level] || console.log;

    if (data !== undefined) {
      consoleMethod(formattedMessage, data);
    } else {
      consoleMethod(formattedMessage);
    }

    // Could be extended to send logs to a service in production
    // this.sendToLoggingService(logEntry);
  }

  /**
   * Log general information
   */
  log(message: string, data?: unknown): void {
    this.logInternal("log", "📝", message, data);
  }

  /**
   * Log informational messages
   */
  info(message: string, data?: unknown): void {
    this.logInternal("info", "ℹ️", message, data);
  }

  /**
   * Log warnings
   */
  warn(message: string, data?: unknown): void {
    this.logInternal("warn", "⚠️", message, data);
  }

  /**
   * Log errors
   */
  error(message: string, data?: unknown): void {
    this.logInternal("error", "❌", message, data);
  }

  /**
   * Log success messages
   */
  success(message: string, data?: unknown): void {
    this.logInternal("log", "✅", message, data);
  }

  /**
   * Log debug messages (only in development)
   */
  debug(message: string, data?: unknown): void {
    if (this.isDevelopment) {
      this.logInternal("log", "🔍", message, data);
    }
  }
}

/**
 * Singleton logger instance
 */
export const logger = new ClientLogger();

/**
 * Convenience exports
 */
export const { log, info, warn, error, success, debug } = logger;
