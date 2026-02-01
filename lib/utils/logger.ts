import * as Sentry from '@sentry/nextjs';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

export interface LogContext {
  userId?: string;
  action?: string;
  [key: string]: any;
}

export function log(level: LogLevel, message: string, context?: LogContext) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context
  };

  // 输出到控制台
  const consoleMethod = console[level] || console.log;
  consoleMethod(JSON.stringify(logEntry));

  // 发送到 Sentry
  if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_SENTRY_DSN) {
    if (level === LogLevel.ERROR) {
      Sentry.withScope((scope) => {
        if (context) {
          if (context.userId) scope.setUser({ id: context.userId });
          scope.setExtras(context);
        }
        // 如果 context中有 error 对象，优先使用
        const error = context?.error instanceof Error ? context.error : new Error(message);
        Sentry.captureException(error);
      });
    } else if (level === LogLevel.WARN) {
      Sentry.withScope((scope) => {
        if (context) {
          if (context.userId) scope.setUser({ id: context.userId });
          scope.setExtras(context);
        }
        Sentry.captureMessage(message, 'warning');
      });
    }
  }
}

/**
 * 记录业务指标
 * @param name 指标名称
 * @param value 指标值
 * @param tags 标签
 */
export function logMetric(name: string, value: number, tags?: Record<string, string>) {
  // 1. 结构化日志输出，便于日志系统采集
  console.log(JSON.stringify({
    type: 'metric',
    name,
    value,
    timestamp: new Date().toISOString(),
    ...tags
  }));
}

