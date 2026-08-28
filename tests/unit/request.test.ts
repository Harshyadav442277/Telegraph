import { describe, expect, it } from 'vitest';
import { extractDomain, extractDomainFromQuery } from '../../src/telegraph/request.js';

const query = (search: string): URLSearchParams => new URLSearchParams(search);

describe('domain extraction', () => {
  it('accepts the documented key and common aliases', () => {
    expect(extractDomainFromQuery(query('domain=example.com'))).toEqual({ domain: 'example.com' });
    for (const key of ['target', 'host', 'hostname', 'url', 'site', 'server', 'fqdn']) {
      expect(extractDomainFromQuery(query(`${key}=example.com`))).toEqual({
        domain: 'example.com',
      });
    }
  });

  it('reads a hostname out of a natural-language question', () => {
    // Daemon traffic is generated from free-text questions, so the router may
    // pass the whole sentence rather than an isolated hostname.
    expect(
      extractDomainFromQuery(query('query=Is the SSL certificate for example.com valid?')),
    ).toEqual({ domain: 'example.com' });
    expect(
      extractDomain({ question: 'Check whether https://sub.example.co.uk/x is expired' }),
    ).toEqual({ domain: 'sub.example.co.uk' });
    expect(extractDomain({ text: 'verify 93.184.216.34 please' })).toEqual({
      domain: '93.184.216.34',
    });
  });

  it('preserves an explicit port from text and from a bare value', () => {
    expect(extractDomain({ text: 'please check example.com:8443 now' })).toEqual({
      domain: 'example.com:8443',
    });
    expect(extractDomainFromQuery(query('domain=example.com:8443'))).toEqual({
      domain: 'example.com:8443',
    });
  });

  it('falls back to nested values and unknown parameter names', () => {
    expect(extractDomain({ context: { params: { some_field: 'example.com' } } })).toEqual({
      domain: 'example.com',
    });
    expect(extractDomainFromQuery(query('unexpected_key=example.com'))).toEqual({
      domain: 'example.com',
    });
  });

  it('still rejects a request carrying no hostname at all', () => {
    expect(() => extractDomainFromQuery(query(''))).toThrow();
    expect(() => extractDomain({})).toThrow();
    expect(() => extractDomain({ question: 'what is the weather today' })).toThrow();
    expect(() => extractDomain('not-an-object')).toThrow();
  });
});
