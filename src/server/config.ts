import type { LogLevel } from '../observability/logger.js';

function numberEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export interface AppConfig {
  host: string;
  port: number;
  logLevel: LogLevel;
  maxInputLength: number;
  requestTimeoutMs: number;
  dnsTimeoutMs: number;
  connectTimeoutMs: number;
  handshakeTimeoutMs: number;
  allowPrivateTargets: boolean;
  responseProfile: 'livecert';
  version: string;
}

export function loadConfig(): AppConfig {
  const logLevel = process.env.LOG_LEVEL;
  return {
    host: process.env.HOST || '0.0.0.0',
    port: Number(process.env.PORT || 3000),
    logLevel:
      logLevel === 'debug' || logLevel === 'warn' || logLevel === 'error' ? logLevel : 'info',
    maxInputLength: numberEnv('MAX_INPUT_LENGTH', 2_048),
    requestTimeoutMs: numberEnv('REQUEST_TIMEOUT_MS', 15_000),
    dnsTimeoutMs: numberEnv('DNS_TIMEOUT_MS', 5_000),
    connectTimeoutMs: numberEnv('CONNECT_TIMEOUT_MS', 8_000),
    handshakeTimeoutMs: numberEnv('HANDSHAKE_TIMEOUT_MS', 10_000),
    allowPrivateTargets: process.env.ALLOW_PRIVATE_TARGETS === 'true',
    responseProfile: 'livecert',
    version: '0.1.0',
  };
}
