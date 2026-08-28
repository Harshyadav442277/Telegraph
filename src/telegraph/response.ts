import type { TLSVerificationResult } from '../tls/types.js';

export interface LiveCertResponse {
  domain: string;
  verdict:
    | 'valid'
    | 'expired'
    | 'not_yet_valid'
    | 'hostname_mismatch'
    | 'self_signed'
    | 'untrusted'
    | 'unreachable';
  valid: boolean;
  chain_complete: boolean | null;
  issuer: string | null;
  valid_to: string | null;
  days_remaining: number | null;
  confidence: number;
  reason: string;
  checked_at: string;
}

function verdictFor(result: TLSVerificationResult): LiveCertResponse['verdict'] {
  if (result.valid) return 'valid';
  if (!result.reachable || !result.handshakeSucceeded) return 'unreachable';
  switch (result.failureCode) {
    case 'EXPIRED':
      return 'expired';
    case 'NOT_YET_VALID':
      return 'not_yet_valid';
    case 'HOSTNAME_MISMATCH':
      return 'hostname_mismatch';
    case 'UNTRUSTED_CHAIN':
      return /DEPTH_ZERO_SELF_SIGNED/i.test(result.failureMessage ?? '') ||
        (result.certificate?.subject !== undefined &&
          result.certificate.subject === result.certificate.issuer)
        ? 'self_signed'
        : 'untrusted';
    default:
      return 'untrusted';
  }
}

function dateOnly(iso: string | undefined): string | null {
  return iso ? iso.slice(0, 10) : null;
}

function daysRemaining(validTo: string | undefined, now: Date): number | null {
  if (!validTo) return null;
  return Math.floor((Date.parse(validTo) - now.getTime()) / 86_400_000);
}

function reasonFor(
  result: TLSVerificationResult,
  verdict: LiveCertResponse['verdict'],
  days: number | null,
): string {
  const domain = result.normalizedHost || result.input;
  if (verdict === 'unreachable')
    return `The TLS/SSL endpoint for ${domain} could not be reached (${result.failureCode}).`;
  if (verdict === 'expired') return `The TLS/SSL certificate for ${domain} is expired.`;
  if (verdict === 'not_yet_valid') return `The TLS/SSL certificate for ${domain} is not yet valid.`;
  if (verdict === 'hostname_mismatch')
    return `The TLS/SSL certificate presented by ${domain} does not match the requested hostname.`;
  if (verdict === 'self_signed')
    return `The TLS/SSL certificate for ${domain} is self-signed and is not trusted.`;
  if (verdict === 'untrusted') return `The TLS/SSL certificate chain for ${domain} is not trusted.`;
  const expiry =
    days === null
      ? 'with no readable expiry'
      : `expiring in ${days} days on ${dateOnly(result.certificate?.validTo)}`;
  const issuer = result.certificate?.issuer ? `, issued by ${result.certificate.issuer}` : '';
  return `The TLS/SSL certificate configuration for ${domain} is valid. Certificate validity: the certificate is currently valid, ${expiry}${issuer}. Chain trust: the server presented a trusted certificate chain. Hostname verification: passes. The connection negotiated TLS.`;
}

export function toTelegraphResponse(
  result: TLSVerificationResult,
  now = new Date(),
): LiveCertResponse {
  const verdict = verdictFor(result);
  const days = daysRemaining(result.certificate?.validTo, now);
  return {
    domain: result.normalizedHost || result.input,
    verdict,
    valid: result.valid,
    chain_complete: result.certificate?.chainComplete ?? null,
    issuer: result.certificate?.issuer ?? null,
    valid_to: dateOnly(result.certificate?.validTo),
    days_remaining: days,
    confidence: result.handshakeSucceeded && result.certificatePresent ? 1 : 0,
    reason: reasonFor(result, verdict, days),
    checked_at: now.toISOString(),
  };
}
