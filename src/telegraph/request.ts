export interface TelegraphVerificationRequest {
  domain: string;
}

// The Engine's router decides what key a domain arrives under, and daemon
// traffic is generated from natural-language questions rather than a fixed
// schema. A probe whose hostname we fail to find is a request we answer with
// an error instead of a verdict, so extraction accepts any plausible key and
// falls back to reading a hostname out of free text.
const DOMAIN_KEYS = [
  'domain',
  'target',
  'host',
  'hostname',
  'url',
  'uri',
  'site',
  'website',
  'server',
  'endpoint',
  'address',
  'fqdn',
  'cn',
  'common_name',
  'q',
  'query',
  'input',
  'text',
  'question',
  'prompt',
  'value',
];

const URL_PATTERN = /\bhttps?:\/\/([^\s/?#:]+)(?::(\d{1,5}))?/i;
// Hostname with at least one dot and a plausible TLD, optionally with a port.
// Unicode letters are allowed so IDNs survive; parseTarget handles punycode.
const HOSTNAME_PATTERN =
  /\b((?:[\p{L}\p{N}_-]+\.)+[\p{L}]{2,63})(?::(\d{1,5}))?(?=[\s,;:!?)"']|$)/u;
const IPV4_PATTERN = /\b(\d{1,3}(?:\.\d{1,3}){3})(?::(\d{1,5}))?\b/;

function hostFromText(value: string): string | undefined {
  const text = value.trim();
  if (text.length === 0) return undefined;
  // A bare hostname or host:port that is the whole value needs no extraction.
  if (!/\s/.test(text)) return text;
  const url = URL_PATTERN.exec(text);
  if (url?.[1]) return url[2] ? `${url[1]}:${url[2]}` : url[1];
  const ipv4 = IPV4_PATTERN.exec(text);
  if (ipv4?.[1]) return ipv4[2] ? `${ipv4[1]}:${ipv4[2]}` : ipv4[1];
  const host = HOSTNAME_PATTERN.exec(text);
  if (host?.[1]) return host[2] ? `${host[1]}:${host[2]}` : host[1];
  return undefined;
}

function searchValues(value: unknown, depth = 0): string | undefined {
  if (depth > 4) return undefined;
  if (typeof value === 'string') return hostFromText(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = searchValues(item, depth + 1);
      if (found) return found;
    }
    return undefined;
  }
  if (typeof value === 'object' && value !== null) {
    const record = value as Record<string, unknown>;
    for (const key of DOMAIN_KEYS) {
      const candidate = record[key];
      if (typeof candidate === 'string') {
        const found = hostFromText(candidate);
        if (found) return found;
      }
    }
    for (const nested of Object.values(record)) {
      const found = searchValues(nested, depth + 1);
      if (found) return found;
    }
  }
  return undefined;
}

export function extractDomain(value: unknown): TelegraphVerificationRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('request body must be an object');
  }
  const found = searchValues(value);
  if (found) return { domain: found };
  throw new TypeError('missing required field: domain');
}

export function extractDomainFromQuery(query: URLSearchParams): TelegraphVerificationRequest {
  for (const key of DOMAIN_KEYS) {
    const candidate = query.get(key);
    if (candidate) {
      const found = hostFromText(candidate);
      if (found) return { domain: found };
    }
  }
  for (const [, candidate] of query) {
    const found = hostFromText(candidate);
    if (found) return { domain: found };
  }
  throw new TypeError('missing required query parameter: domain');
}
