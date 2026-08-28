import type { TLSVerificationResult } from '../tls/types.js';

export interface LiveCertResponse {
  chain_complete: boolean | null;
  chain_length?: number | null;
  checked_at: string;
  cipher?: string | null;
  confidence: number;
  days_remaining: number | null;
  domain: string;
  expired?: boolean;
  hostname_match?: boolean;
  issuer: string | null;
  key_bits?: number | null;
  reason: string;
  subject?: string | null;
  subject_alt_names?: string[] | null;
  tls_protocol?: string | null;
  trusted?: boolean;
  unreachable_reason?: string;
  verdict:
    | 'valid'
    | 'expired'
    | 'not_yet_valid'
    | 'hostname_mismatch'
    | 'self_signed'
    | 'untrusted'
    | 'unreachable';
  valid: boolean;
  valid_from?: string | null;
  valid_to: string | null;
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
    return `The TLS/SSL endpoint for ${domain} could not be reached (${result.failureCode}). ${result.failureMessage ?? 'No further connection details were available.'}`;
  if (verdict === 'expired') return `The TLS/SSL certificate for ${domain} is expired.`;
  if (verdict === 'not_yet_valid') return `The TLS/SSL certificate for ${domain} is not yet valid.`;
  if (verdict === 'hostname_mismatch')
    return `The TLS/SSL certificate presented by ${domain} does not match the requested hostname.`;
  if (verdict === 'self_signed')
    return `The TLS/SSL certificate for ${domain} is self-signed and is not trusted.`;
  if (verdict === 'untrusted') {
    const issuer = result.certificate?.issuer ? `, issued by ${result.certificate.issuer}` : '';
    return `The TLS/SSL certificate for ${domain} is not trusted${issuer}. The presented certificate chain does not build to a trusted root.`;
  }
  const expiry =
    days === null
      ? 'with no readable expiry'
      : `expiring in ${days} days on ${dateOnly(result.certificate?.validTo)}`;
  const issuer = result.certificate?.issuer ? `, issued by ${result.certificate.issuer}` : '';
  const chain = result.certificate?.chainComplete
    ? `The server presented a complete chain of ${result.certificate.chainLength ?? 'multiple'} certificates including intermediates.`
    : 'The server did not present a complete certificate chain.';
  const names = result.certificate?.subjectAltNames?.length
    ? ` against Subject Alternative Name ${result.certificate.subjectAltNames.join(', ')}`
    : '';
  const protocol = result.tlsProtocol ? ` The connection negotiated ${result.tlsProtocol}` : '';
  const cipher = result.cipher ? ` with cipher suite ${result.cipher}` : '';
  const keyBits = result.keyBits ? ` and a ${result.keyBits}-bit key` : '';
  return `The TLS/SSL certificate for ${domain} is valid and trusted${issuer}, ${expiry}. ${chain} Hostname validation passes${names}.${protocol}${cipher}${keyBits}.`;
}

export function toTelegraphResponse(
  result: TLSVerificationResult,
  now = new Date(),
): LiveCertResponse {
  const verdict = verdictFor(result);
  const days = daysRemaining(result.certificate?.validTo, now);
  const response: LiveCertResponse = {
    chain_complete: result.certificate?.chainComplete ?? null,
    checked_at: now.toISOString(),
    confidence: 1,
    days_remaining: days,
    domain: result.normalizedHost || result.input,
    issuer: result.certificate?.issuer ?? null,
    reason: reasonFor(result, verdict, days),
    valid: result.valid,
    valid_to: dateOnly(result.certificate?.validTo),
    verdict,
  };
  if (result.certificatePresent) {
    response.chain_length = result.certificate?.chainLength ?? null;
    response.cipher = result.cipher ?? null;
    response.expired = result.failureCode === 'EXPIRED';
    response.hostname_match = result.hostnameValid === true;
    response.key_bits = result.keyBits ?? result.certificate?.keyBits ?? null;
    response.subject = result.certificate?.subject ?? null;
    response.subject_alt_names = result.certificate?.subjectAltNames ?? null;
    response.tls_protocol = result.tlsProtocol ?? null;
    response.trusted = result.chainTrusted === true;
    response.valid_from = dateOnly(result.certificate?.validFrom);
  }
  if (!result.reachable || !result.handshakeSucceeded)
    response.unreachable_reason = result.failureMessage ?? result.failureCode;
  return response;
}
