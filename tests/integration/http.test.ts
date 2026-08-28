import { request } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHttpServer } from '../../src/server/http.js';
import type { AppConfig } from '../../src/server/config.js';

const config: AppConfig = {
  host: '127.0.0.1',
  port: 0,
  logLevel: 'error',
  maxInputLength: 2048,
  requestTimeoutMs: 1000,
  dnsTimeoutMs: 1000,
  connectTimeoutMs: 1000,
  handshakeTimeoutMs: 1000,
  allowPrivateTargets: false,
  responseProfile: 'livecert',
  version: 'test',
};
let server: ReturnType<typeof createHttpServer>;
let port = 0;

function get(path: string): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, path, method: 'GET' }, (res) => {
      const chunks: string[] = [];
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => chunks.push(chunk));
      res.on('end', () =>
        resolve({
          status: res.statusCode ?? 0,
          body: JSON.parse(chunks.join('')) as Record<string, unknown>,
        }),
      );
    });
    req.on('error', reject);
    req.end();
  });
}

beforeAll(
  () =>
    new Promise<void>((resolve) => {
      server = createHttpServer(config);
      server.listen(0, '127.0.0.1', () => {
        const address = server.address() as AddressInfo;
        port = address.port;
        resolve();
      });
    }),
);
afterAll(
  () =>
    new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    ),
);

describe('HTTP miner', () => {
  it('serves health and malformed input deterministically', async () => {
    expect((await get('/health')).body.status).toBe('ok');
    const response = await get('/ssl-check');
    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_INPUT');
  });
  it('does not permit private targets in production mode', async () => {
    const response = await get('/ssl-check?domain=127.0.0.1');
    expect(response.status).toBe(200);
    expect(response.body.verdict).toBe('unreachable');
  });
});
