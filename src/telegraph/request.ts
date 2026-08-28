export interface TelegraphVerificationRequest {
  domain: string;
}

export function extractDomain(value: unknown): TelegraphVerificationRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('request body must be an object');
  }
  const body = value as Record<string, unknown>;
  for (const key of ['domain', 'target', 'host', 'url']) {
    const candidate = body[key];
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return { domain: candidate };
    }
  }
  throw new TypeError('missing required field: domain');
}

export function extractDomainFromQuery(query: URLSearchParams): TelegraphVerificationRequest {
  for (const key of ['domain', 'target', 'host', 'url']) {
    const candidate = query.get(key);
    if (candidate?.trim()) return { domain: candidate };
  }
  throw new TypeError('missing required query parameter: domain');
}
