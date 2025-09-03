/**
 * E2E Logger for comprehensive debugging
 * Provides structured logging for user interactions, service calls, and processing steps
 */

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  component: string;
  action: string;
  details: Record<string, any>;
  sessionId: string;
  userId?: string;
}

export class E2ELogger {
  private static instance: E2ELogger;
  private logs: LogEntry[] = [];
  private sessionId: string;
  private maxLogs = 1000;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.log('INFO', 'E2ELogger', 'session_start', { 
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href
    });
  }

  public static getInstance(): E2ELogger {
    if (!E2ELogger.instance) {
      E2ELogger.instance = new E2ELogger();
    }
    return E2ELogger.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public log(
    level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG',
    component: string,
    action: string,
    details: Record<string, any> = {}
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      action,
      details,
      sessionId: this.sessionId
    };

    this.logs.push(entry);
    
    // Keep only recent logs to prevent memory issues
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output for debugging
    const logMessage = `[${entry.timestamp}] ${level} [${component}] ${action}: ${JSON.stringify(details)}`;
    
    switch (level) {
      case 'ERROR':
        console.error(logMessage);
        break;
      case 'WARN':
        console.warn(logMessage);
        break;
      case 'DEBUG':
        console.debug(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }

  public info(component: string, action: string, details?: Record<string, any>): void {
    this.log('INFO', component, action, details);
  }

  public warn(component: string, action: string, details?: Record<string, any>): void {
    this.log('WARN', component, action, details);
  }

  public error(component: string, action: string, details?: Record<string, any>): void {
    this.log('ERROR', component, action, details);
  }

  public debug(component: string, action: string, details?: Record<string, any>): void {
    this.log('DEBUG', component, action, details);
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public exportLogs(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      logs: this.logs,
      exportTime: new Date().toISOString()
    }, null, 2);
  }

  public clearLogs(): void {
    this.logs = [];
    this.log('INFO', 'E2ELogger', 'logs_cleared');
  }

  public getSessionId(): string {
    return this.sessionId;
  }
}

// Export singleton instance
export const e2eLogger = E2ELogger.getInstance();