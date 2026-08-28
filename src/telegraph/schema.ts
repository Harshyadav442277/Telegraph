export const TELEGRAPH_INTENT = 'SSL_VERIFICATION' as const;

export const inputSchema = {
  type: 'object',
  required: ['domain'],
  properties: {
    domain: {
      type: 'string',
      description: 'Hostname, HTTPS URL, or host:port to verify.',
    },
  },
} as const;

export const outputSchema = {
  type: 'object',
  properties: {
    chain_complete: { type: ['boolean', 'null'] },
    chain_length: { type: ['integer', 'null'] },
    checked_at: { type: 'string' },
    cipher: { type: ['string', 'null'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    days_remaining: { type: ['integer', 'null'] },
    domain: { type: 'string' },
    expired: { type: 'boolean' },
    hostname_match: { type: 'boolean' },
    issuer: { type: ['string', 'null'] },
    key_bits: { type: ['integer', 'null'] },
    reason: { type: 'string' },
    subject: { type: ['string', 'null'] },
    subject_alt_names: { type: ['array', 'null'] },
    tls_protocol: { type: ['string', 'null'] },
    trusted: { type: 'boolean' },
    unreachable_reason: { type: 'string' },
    valid: { type: 'boolean' },
    valid_from: { type: ['string', 'null'] },
    valid_to: { type: ['string', 'null'] },
    verdict: {
      type: 'string',
      enum: [
        'valid',
        'expired',
        'not_yet_valid',
        'hostname_mismatch',
        'self_signed',
        'untrusted',
        'unreachable',
      ],
    },
  },
} as const;
