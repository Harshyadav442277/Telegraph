import { describe, expect, it } from 'vitest';
import { toTelegraphResponse } from '../../src/telegraph/response.js';
import type { TLSVerificationResult } from '../../src/tls/types.js';

const base: TLSVerificationResult = {
  input: 'EXAMPLE.com.',
  normalizedHost: 'example.com',
  port: 443,
  reachable: true,
  dnsResolved: true,
  handshakeSucceeded: true,
  certificatePresent: true,
  chainTrusted: true,
  hostnameValid: true,
  timeValid: true,
  valid: true,
  failureCode: 'NONE',
  network: { resolvedAddresses: ['93.184.216.34'], selectedAddress: '93.184.216.34', family: 4 },
  certificate: { issuer: 'Test CA', validTo: '2030-01-01T00:00:00.000Z', chainComplete: true },
  timingMs: { total: 10 },
};

describe('Telegraph response adapter', () => {
  it('formats the stable livecert-compatible valid shape', () => {
    const response = toTelegraphResponse(base, new Date('2026-01-01T00:00:00.000Z'));
    expect(response.domain).toBe('example.com');
    expect(response.verdict).toBe('valid');
    expect(response.valid).toBe(true);
    expect(response.chain_complete).toBe(true);
    expect(response.issuer).toBe('Test CA');
    expect(response.valid_to).toBe('2030-01-01');
    expect(response.days_remaining).toBe(1461);
    expect(response.confidence).toBe(1);
    expect(response.reason).toContain('valid');
    expect(response.checked_at).toBe('2026-01-01T00:00:00.000Z');
  });
  it('maps negative results without turning them into transport errors', () => {
    expect(
      toTelegraphResponse(
        { ...base, valid: false, failureCode: 'HOSTNAME_MISMATCH', hostnameValid: false },
        new Date('2026-01-01T00:00:00.000Z'),
      ).verdict,
    ).toBe('hostname_mismatch');
    expect(
      toTelegraphResponse({
        ...base,
        reachable: false,
        handshakeSucceeded: false,
        certificatePresent: false,
        chainTrusted: null,
        hostnameValid: null,
        timeValid: null,
        valid: false,
        failureCode: 'TIMEOUT',
      }).verdict,
    ).toBe('unreachable');
  });
});
