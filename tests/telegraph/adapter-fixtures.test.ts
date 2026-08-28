import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { extractDomain, extractDomainFromQuery } from '../../src/telegraph/request.js';

const fixture = (name: string): URL => new URL(`./fixtures/${name}`, import.meta.url);

describe('observed Telegraph adapter fixtures', () => {
  it('accepts the observed domain request shape and aliases', async () => {
    const request = JSON.parse(await readFile(fixture('request-domain.json'), 'utf8')) as unknown;
    expect(extractDomain(request).domain).toBe('example.com');
    expect(extractDomainFromQuery(new URLSearchParams('target=example.com')).domain).toBe(
      'example.com',
    );
  });
  it('keeps livecert and txlens observed shapes as explicit compatibility fixtures', async () => {
    const livecert = JSON.parse(
      await readFile(fixture('livecert-response.json'), 'utf8'),
    ) as Record<string, unknown>;
    const txlens = JSON.parse(await readFile(fixture('txlens-response.json'), 'utf8')) as Record<
      string,
      unknown
    >;
    expect(livecert.verdict).toBe('valid');
    expect(livecert.valid).toBe(true);
    expect(txlens.status).toBe('ok');
    expect(txlens.authorized).toBe(true);
  });
});
