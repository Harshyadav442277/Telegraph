import { afterEach, describe, expect, it, vi } from 'vitest';
import { lookupTvl } from '../../src/intents/tvl.js';
import { getCryptoPrice } from '../../src/intents/cryptoPrice.js';

afterEach(() => vi.unstubAllGlobals());

function failLlama(): void {
  const real = globalThis.fetch;
  vi.stubGlobal('fetch', (...args: Parameters<typeof fetch>) => {
    const target = args[0];
    const url =
      typeof target === 'string' ? target : target instanceof URL ? target.href : target.url;
    if (url.includes('llama.fi')) return Promise.reject(new Error('simulated outage'));
    return real(...args);
  });
}

describe('upstream failure is not evidence of absence', () => {
  it('reports TVL as unavailable rather than not_found when DefiLlama is down', async () => {
    failLlama();
    const r = await lookupTvl('aave');
    expect(r.verdict).toBe('unavailable');
    expect(r.tvl_usd).toBeNull();
    // The old behaviour asserted the protocol was untracked, which is false
    // when the API simply did not answer.
    expect(r.reason).not.toMatch(/does not (track|index)/i);
    expect(r.reason).toMatch(/did not respond/i);
    expect(r.reason.length).toBeGreaterThan(150);
  });

  it('reports a price as unavailable rather than not_found when the feed is down', async () => {
    failLlama();
    const r = await getCryptoPrice('BTC');
    expect(r.verdict).toBe('unavailable');
    expect(r.price_usd).toBeNull();
    expect(r.reason).not.toMatch(/does not track/i);
    expect(r.reason).toMatch(/did not respond/i);
  });

  it('still reports a genuinely unknown asset as not_found', async () => {
    const r = await getCryptoPrice('definitelynotarealassetxyz123');
    expect(r.verdict).toBe('not_found');
  });
});
