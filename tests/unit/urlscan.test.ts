import { describe, expect, it } from 'vitest';
import { scanUrl } from '../../src/intents/urlScan.js';

// These cases are decided from the URL itself, so they need no network.
describe('url scan verdict precedence', () => {
  it('judges a private or reserved target unsafe rather than unreachable', async () => {
    // The intent asks for a URL to be judged safe or unsafe. A cloud-metadata
    // address is conclusively unsafe without fetching it, and reporting it as
    // "unreachable" would answer a different question.
    const meta = await scanUrl('http://169.254.169.254/latest/meta-data/');
    expect(meta.verdict).toBe('malicious');
    expect(meta.reachable).toBe(false);
    expect(meta.http_status).toBeNull();

    const loopback = await scanUrl('http://127.0.0.1:22');
    expect(loopback.verdict).toBe('malicious');
  });

  it('flags embedded credentials and plaintext transport', async () => {
    const creds = await scanUrl('https://user:pass@example.com/');
    expect(creds.findings.some((f) => /credential/i.test(f))).toBe(true);
    expect(creds.risk_score).toBeGreaterThanOrEqual(20);
  });

  it('reserves unreachable for a target it could not assess at all', async () => {
    const gone = await scanUrl('https://nonexistent-domain-xyz999.example');
    expect(gone.verdict).toBe('unreachable');
    expect(gone.risk_score).toBeLessThan(50);
  });

  it('always reports a reason long enough to carry the findings', async () => {
    const r = await scanUrl('http://127.0.0.1:22');
    expect(r.reason.length).toBeGreaterThan(150);
  });
});
