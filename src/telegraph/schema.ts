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
    domain: { type: 'string' },
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
    valid: { type: 'boolean' },
    chain_complete: { type: ['boolean', 'null'] },
    issuer: { type: ['string', 'null'] },
    valid_to: { type: ['string', 'null'] },
    days_remaining: { type: ['integer', 'null'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    reason: { type: 'string' },
    checked_at: { type: 'string' },
  },
} as const;
