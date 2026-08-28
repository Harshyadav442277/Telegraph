import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { extractDomain, extractDomainFromQuery } from '../telegraph/request.js';
import { toTelegraphResponse } from '../telegraph/response.js';
import { verifyTLS } from '../tls/verify.js';
import type { AppConfig } from './config.js';
import { createLogger } from '../observability/logger.js';

const MAX_BODY_BYTES = 64 * 1024;

function requestId(request: IncomingMessage): string {
  const supplied = request.headers['x-request-id'];
  return typeof supplied === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(supplied)
    ? supplied
    : randomUUID();
}

function send(response: ServerResponse, status: number, body: unknown, id: string): void {
  const payload = JSON.stringify(body);
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.setHeader('cache-control', 'no-store');
  response.setHeader('x-request-id', id);
  response.end(payload);
}

function sendText(
  response: ServerResponse,
  status: number,
  body: string,
  contentType: string,
  id: string,
): void {
  response.statusCode = status;
  response.setHeader('content-type', contentType);
  response.setHeader('cache-control', 'no-store');
  response.setHeader('x-request-id', id);
  response.end(body);
}

async function readBody(request: IncomingMessage): Promise<unknown> {
  let bytes = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > MAX_BODY_BYTES) throw new TypeError('request body is too large');
    chunks.push(Buffer.from(buffer));
  }
  if (bytes === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new TypeError('request body must be valid JSON');
  }
}

// Bundled layouts differ between the container build (dist/server/) and the
// serverless build, so the YAML is looked up relative to both.
async function readMinerYaml(): Promise<string> {
  const candidates = [
    new URL('../../telegraph/miner.yaml', import.meta.url),
    new URL('../../../telegraph/miner.yaml', import.meta.url),
    pathToFileURL(resolve(process.cwd(), 'telegraph/miner.yaml')),
  ];
  for (const candidate of candidates) {
    try {
      return await readFile(candidate, 'utf8');
    } catch {
      continue;
    }
  }
  throw new Error('miner.yaml not found');
}

export type RequestHandler = (request: IncomingMessage, response: ServerResponse) => Promise<void>;

export function createRequestHandler(config: AppConfig): RequestHandler {
  const log = createLogger(config.logLevel);
  return async (request, response) => {
    const id = requestId(request);
    const started = performance.now();
    const method = request.method ?? 'GET';
    const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
    try {
      if (method === 'GET' && (url.pathname === '/health' || url.pathname === '/healthz')) {
        send(response, 200, { status: 'ok', service: 'preflight', version: config.version }, id);
        return;
      }
      if (method === 'GET' && url.pathname === '/ready') {
        send(response, 200, { status: 'ready', service: 'preflight' }, id);
        return;
      }
      if (method === 'GET' && url.pathname === '/miner.yaml') {
        const yaml = await readMinerYaml();
        sendText(response, 200, yaml, 'application/yaml; charset=utf-8', id);
        return;
      }
      if (
        !['GET', 'POST'].includes(method) ||
        !['/ssl-check', '/v1/ssl-check'].includes(url.pathname)
      ) {
        send(response, 404, { error: 'not_found', code: 'NOT_FOUND', requestId: id }, id);
        return;
      }
      const requestInput =
        method === 'GET'
          ? extractDomainFromQuery(url.searchParams)
          : extractDomain(await readBody(request));
      const tlsResult = await verifyTLS(requestInput.domain, {
        maxInputLength: config.maxInputLength,
        requestTimeoutMs: config.requestTimeoutMs,
        dnsTimeoutMs: config.dnsTimeoutMs,
        connectTimeoutMs: config.connectTimeoutMs,
        handshakeTimeoutMs: config.handshakeTimeoutMs,
        allowPrivateTargets: config.allowPrivateTargets,
      });
      const telegraphResponse = toTelegraphResponse(tlsResult);
      log('ssl_verification', {
        requestId: id,
        intent: 'SSL_VERIFICATION',
        rawInput: requestInput.domain,
        normalizedHost: tlsResult.normalizedHost,
        resolvedAddresses: tlsResult.network.resolvedAddresses,
        selectedAddress: tlsResult.network.selectedAddress,
        reachable: tlsResult.reachable,
        handshakeSucceeded: tlsResult.handshakeSucceeded,
        chainTrusted: tlsResult.chainTrusted,
        hostnameValid: tlsResult.hostnameValid,
        timeValid: tlsResult.timeValid,
        canonicalValid: tlsResult.valid,
        telegraphResponse,
        latencyMs: Math.round(performance.now() - started),
      });
      send(response, 200, telegraphResponse, id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const invalid = error instanceof TypeError;
      log(
        'request_failed',
        {
          requestId: id,
          method,
          path: url.pathname,
          error: message,
          latencyMs: Math.round(performance.now() - started),
        },
        invalid ? 'info' : 'error',
      );
      send(
        response,
        invalid ? 400 : 500,
        {
          error: invalid ? 'invalid_request' : 'internal_error',
          code: invalid ? 'INVALID_INPUT' : 'INTERNAL_ERROR',
          message: invalid ? message : 'unexpected internal error',
          requestId: id,
        },
        id,
      );
    }
  };
}

export function createHttpServer(config: AppConfig): Server {
  const handler = createRequestHandler(config);
  const server = createServer((request, response) => {
    void handler(request, response);
  });
  server.keepAliveTimeout = 5_000;
  server.headersTimeout = 10_000;
  server.requestTimeout = config.requestTimeoutMs;
  server.timeout = config.requestTimeoutMs;
  return server;
}
