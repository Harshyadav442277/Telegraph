import type { IncomingMessage, ServerResponse } from 'node:http';
import { createRequestHandler } from '../src/server/http.js';
import { loadConfig } from '../src/server/config.js';

const handler = createRequestHandler(loadConfig());

export default async function (request: IncomingMessage, response: ServerResponse): Promise<void> {
  await handler(request, response);
}
