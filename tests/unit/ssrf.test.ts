import { describe, expect, it } from 'vitest';
import { isSafeAddress } from '../../src/security/ssrf.js';

describe('SSRF destination policy', () => {
  it('blocks private, loopback, metadata, multicast, and unsafe IPv6 ranges', () => {
    for (const address of [
      '127.0.0.1',
      '10.0.0.1',
      '172.16.0.1',
      '192.168.1.1',
      '169.254.169.254',
      '224.0.0.1',
      '::1',
      'fc00::1',
      'fe80::1',
      'ff02::1',
    ]) {
      expect(isSafeAddress(address)).toBe(false);
    }
  });
  it('allows public addresses and supports explicit test override', () => {
    expect(isSafeAddress('93.184.216.34')).toBe(true);
    expect(isSafeAddress('127.0.0.1', true)).toBe(true);
  });
});
