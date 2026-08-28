import { isIP } from 'node:net';

export interface NormalizedTarget {
  input: string;
  hostname: string;
  port: number;
  isIpLiteral: boolean;
}

const MAX_HOST_LENGTH = 253;

function fail(message: string): never {
  throw new TypeError(message);
}

export function parseTarget(input: string, maxInputLength = 2_048): NormalizedTarget {
  if (typeof input !== 'string') {
    fail('target must be a string');
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    fail('target must not be empty');
  }
  if (trimmed.length > maxInputLength) {
    fail(`target must be ${maxInputLength} characters or fewer`);
  }

  let candidate = trimmed;
  if (!candidate.includes('://')) {
    candidate = `https://${candidate}`;
  }
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    fail('target is not a valid hostname or URL');
  }

  if (parsed.protocol !== 'https:') {
    fail('target must use https or be a bare hostname');
  }
  if (parsed.username || parsed.password) {
    fail('target credentials are not accepted');
  }
  if (!parsed.hostname) {
    fail('target hostname is missing');
  }

  const hostValue = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const isIpLiteral = isIP(hostValue) !== 0;
  const hostname = isIpLiteral ? hostValue : hostValue.replace(/\.$/, '');
  if (hostname.length === 0 || hostname.length > MAX_HOST_LENGTH) {
    fail('target hostname length is invalid');
  }
  if (!isIpLiteral && hostname.includes('..')) {
    fail('target hostname contains an empty label');
  }

  return {
    input: trimmed,
    hostname,
    port: parsed.port ? Number(parsed.port) : 443,
    isIpLiteral,
  };
}

export function parseSubjectAlternativeNames(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const names = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(/^DNS:/i, '').replace(/^IP Address:/i, ''))
    .sort((a, b) => a.localeCompare(b));
  return names.length > 0 ? names : undefined;
}
