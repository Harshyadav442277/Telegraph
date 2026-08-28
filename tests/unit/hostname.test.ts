import { describe, expect, it } from 'vitest';
import { parseTarget } from '../../src/tls/hostname.js';

describe('target normalization', () => {
  it('normalizes case, IDNA, and one trailing dot', () => {
    expect(parseTarget('https://EXAMPLE.com./path')).toMatchObject({
      hostname: 'example.com',
      port: 443,
    });
    expect(parseTarget('https://münich.example')).toMatchObject({
      hostname: 'xn--mnich-kva.example',
    });
  });
  it('supports explicit ports and IPv6 literals', () => {
    expect(parseTarget('example.com:8443')).toMatchObject({ hostname: 'example.com', port: 8443 });
    expect(parseTarget('https://[::1]:443')).toMatchObject({
      hostname: '::1',
      port: 443,
      isIpLiteral: true,
    });
  });
  it('rejects unsafe or malformed URL forms', () => {
    expect(() => parseTarget('')).toThrow();
    expect(() => parseTarget('http://example.com')).toThrow();
    expect(() => parseTarget('https://user:pass@example.com')).toThrow();
    expect(() => parseTarget('https://example.com:99999')).toThrow();
  });
});
