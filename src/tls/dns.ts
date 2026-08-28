import dns from 'node:dns';
import { isIP } from 'node:net';
import { assertSafeAddress } from '../security/ssrf.js';

export interface DNSResolution {
  addresses: Array<{ address: string; family: 4 | 6 }>;
  elapsedMs: number;
}

function timeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

export async function resolveDeterministically(
  hostname: string,
  timeoutMs: number,
  allowPrivateTargets: boolean,
): Promise<DNSResolution> {
  const started = performance.now();
  const raw: dns.LookupAddress[] = await timeout(
    dns.promises.lookup(hostname, { all: true, verbatim: true }),
    timeoutMs,
    'DNS lookup timed out',
  );
  const addresses = raw
    .map((entry) => {
      const family: 4 | 6 = entry.family === 6 ? 6 : 4;
      return { address: entry.address, family };
    })
    .filter((entry) => isIP(entry.address) !== 0)
    .sort((a, b) => a.family - b.family || a.address.localeCompare(b.address));
  if (addresses.length === 0) {
    throw new Error('DNS returned no usable addresses');
  }
  for (const entry of addresses) assertSafeAddress(entry.address, allowPrivateTargets);
  return { addresses, elapsedMs: Math.max(0, Math.round(performance.now() - started)) };
}
