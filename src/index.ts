import { createHttpServer } from './server/http.js';
import { loadConfig } from './server/config.js';

const config = loadConfig();
const server = createHttpServer(config);
server.listen(config.port, config.host, () => {
  process.stdout.write(
    `${JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', event: 'server_started', host: config.host, port: config.port, version: config.version })}\n`,
  );
});

let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  process.stdout.write(
    `${JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', event: 'shutdown_started', signal })}\n`,
  );
  server.close((error) => {
    if (error) {
      process.stderr.write(
        `${JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', event: 'shutdown_failed', error: error.message })}\n`,
      );
      process.exitCode = 1;
    }
  });
}
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  process.stderr.write(
    `${JSON.stringify({ timestamp: new Date().toISOString(), level: 'error', event: 'unhandled_rejection', reason: String(reason) })}\n`,
  );
});
