export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const weights: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export function createLogger(level: LogLevel = 'info') {
  return (
    event: string,
    fields: Record<string, unknown> = {},
    logLevel: LogLevel = 'info',
  ): void => {
    if (weights[logLevel] < weights[level]) return;
    process.stdout.write(
      `${JSON.stringify({ timestamp: new Date().toISOString(), level: logLevel, event, ...fields })}\n`,
    );
  };
}
