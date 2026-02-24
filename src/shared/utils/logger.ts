import { env } from '../../config/env.js';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private isDevelopment = env.nodeEnv === 'development';

  private log(level: LogLevel, message: string, meta?: unknown): void {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      ...(meta && { meta }),
    };

    if (this.isDevelopment) {
      // Pretty print in development
      console[level === 'error' ? 'error' : 'log'](
        `[${timestamp}] ${level.toUpperCase()}: ${message}`,
        meta || '',
      );
    } else {
      // JSON format for production (easier to parse in log aggregators)
      console.log(JSON.stringify(logData));
    }
  }

  info(message: string, meta?: unknown): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: unknown): void {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: unknown): void {
    this.log('error', message, meta);
  }

  debug(message: string, meta?: unknown): void {
    if (this.isDevelopment) {
      this.log('debug', message, meta);
    }
  }
}

export const logger = new Logger();
