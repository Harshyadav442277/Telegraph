import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { isSafeAddress } from '../security/ssrf.js';
import { verifyTLS } from '../tls/verify.js';
import type { TLSVerificationOptions } from '../tls/types.js';

export interface UrlScanResponse {
  url: string;
  final_url: string | null;
  hostname: string;
  scheme: string;
  verdict: 'safe' | 'suspicious' | 'malicious' | 'unreachable';
  risk_score: number;
  reachable: boolean;
  http_status: number | null;
  redirect_count: number;
  redirect_chain: string[];
  tls_valid: boolean | null;
  tls_issuer: string | null;
  tls_days_remaining: number | null;
  resolved_addresses: string[];
  findings: string[];
  security_headers: Record<string, string | null>;
  confidence: number;
  reason: string;
  checked_at: string;
}

const SECURITY_HEADERS = [
  'strict-transport-security',
  'content-security-policy',
  'x-frame-options',
  'x-content-type-options',
  'referrer-policy',
];

const SUSPICIOUS_TLDS = new Set([
  'zip',
  'mov',
  'tk',
  'ml',
  'ga',
  'cf',
  'gq',
  'top',
  'xyz',
  'click',
  'link',
  'work',
  'country',
]);

// Weights are additive and capped; each corresponds to one reported finding so
// the score is always explainable from the findings list.
const WEIGHTS = {
  notHttps: 25,
  credentialsInUrl: 30,
  ipLiteralHost: 20,
  punycode: 15,
  manySubdomains: 10,
  suspiciousTld: 10,
  longHost: 5,
  tlsInvalid: 30,
  tlsExpiringSoon: 10,
  openRedirectParam: 10,
  missingHsts: 5,
  manyRedirects: 10,
};

function normalizeUrl(raw: string): URL {
  const trimmed = raw.trim();
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return new URL(candidate);
}

export async function scanUrl(
  raw: string,
  tlsOptions: Partial<TLSVerificationOptions> = {},
  now = new Date(),
): Promise<UrlScanResponse> {
  const url = normalizeUrl(raw);
  const hostname = url.hostname.toLowerCase();
  const findings: string[] = [];
  let risk = 0;

  const add = (weight: number, finding: string): void => {
    risk += weight;
    findings.push(finding);
  };

  if (url.protocol !== 'https:') {
    add(
      WEIGHTS.notHttps,
      `The URL uses ${url.protocol.replace(':', '')} rather than HTTPS, so traffic is not encrypted in transit.`,
    );
  }
  if (url.username || url.password) {
    add(
      WEIGHTS.credentialsInUrl,
      'The URL embeds credentials in the authority component, a common phishing and credential-leak pattern.',
    );
  }
  if (isIP(hostname) !== 0) {
    add(
      WEIGHTS.ipLiteralHost,
      'The host is a bare IP literal rather than a domain name, which legitimate sites rarely use.',
    );
  }
  if (hostname.startsWith('xn--') || hostname.includes('.xn--')) {
    add(
      WEIGHTS.punycode,
      'The hostname contains punycode labels, which can be used for homograph impersonation of a known brand.',
    );
  }
  const labels = hostname.split('.');
  if (labels.length > 4) {
    add(
      WEIGHTS.manySubdomains,
      `The hostname has ${labels.length} labels; deeply nested subdomains are often used to make a URL look like a trusted domain.`,
    );
  }
  const tld = labels[labels.length - 1] ?? '';
  if (SUSPICIOUS_TLDS.has(tld)) {
    add(
      WEIGHTS.suspiciousTld,
      `The top-level domain .${tld} is disproportionately represented in abuse reporting.`,
    );
  }
  if (hostname.length > 50) {
    add(
      WEIGHTS.longHost,
      'The hostname is unusually long, which is a weak indicator of generated or throwaway infrastructure.',
    );
  }
  for (const [key, value] of url.searchParams) {
    if (
      /^(redirect|redirect_uri|next|url|target|dest|destination|continue|return|returnurl)$/i.test(
        key,
      ) &&
      /^https?:\/\//i.test(value)
    ) {
      add(
        WEIGHTS.openRedirectParam,
        `The query parameter "${key}" carries an absolute URL, which can indicate an open-redirect chain.`,
      );
      break;
    }
  }

  let resolved: string[] = [];
  try {
    if (isIP(hostname) !== 0) {
      resolved = [hostname];
    } else {
      const records = await lookup(hostname, { all: true });
      resolved = records.map((r) => r.address);
    }
  } catch {
    resolved = [];
  }
  const allowPrivate = tlsOptions.allowPrivateTargets ?? false;
  const unsafeTarget =
    resolved.length > 0 && resolved.every((a) => !isSafeAddress(a, allowPrivate));
  if (unsafeTarget) {
    add(
      WEIGHTS.ipLiteralHost,
      'The hostname resolves only to private or reserved address space, which is not routable on the public internet.',
    );
  }

  // TLS posture, reusing the same verification engine as SSL_VERIFICATION.
  let tlsValid: boolean | null = null;
  let tlsIssuer: string | null = null;
  let tlsDays: number | null = null;
  let tlsHandshake = false;
  if (url.protocol === 'https:' && !unsafeTarget) {
    try {
      const port = url.port ? Number(url.port) : 443;
      const tls = await verifyTLS(`${hostname}:${port}`, tlsOptions);
      tlsHandshake = tls.handshakeSucceeded;
      tlsValid = tls.valid;
      tlsIssuer = tls.certificate?.issuer ?? null;
      if (tls.certificate?.validTo) {
        tlsDays = Math.floor((Date.parse(tls.certificate.validTo) - now.getTime()) / 86_400_000);
      }
      if (tls.handshakeSucceeded && !tls.valid) {
        add(
          WEIGHTS.tlsInvalid,
          `The TLS certificate does not validate (${tls.failureCode}), so the site's identity cannot be trusted.`,
        );
      } else if (tlsDays !== null && tlsDays >= 0 && tlsDays < 14) {
        add(WEIGHTS.tlsExpiringSoon, `The TLS certificate expires in ${tlsDays} days.`);
      }
    } catch {
      tlsValid = null;
    }
  }

  // Fetch, following redirects manually so the chain is reportable.
  const redirectChain: string[] = [];
  let status: number | null = null;
  let finalUrl: string | null = null;
  let reachable = false;
  const headers: Record<string, string | null> = Object.fromEntries(
    SECURITY_HEADERS.map((h) => [h, null]),
  );

  if (!unsafeTarget) {
    let current = url.toString();
    for (let hop = 0; hop < 6; hop += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8_000);
      try {
        const response = await fetch(current, {
          method: 'GET',
          redirect: 'manual',
          signal: controller.signal,
          headers: {
            'user-agent': 'PREFLIGHT-URLScan/1.0 (+https://preflight-ssl-verification.vercel.app)',
          },
        });
        reachable = true;
        status = response.status;
        finalUrl = current;
        for (const key of SECURITY_HEADERS) headers[key] = response.headers.get(key);
        const location = response.headers.get('location');
        if (response.status >= 300 && response.status < 400 && location) {
          const next = new URL(location, current).toString();
          redirectChain.push(next);
          current = next;
          continue;
        }
        break;
      } catch {
        break;
      } finally {
        clearTimeout(timer);
      }
    }
  }

  if (redirectChain.length >= 4) {
    add(
      WEIGHTS.manyRedirects,
      `The request passed through ${redirectChain.length} redirects before resolving.`,
    );
  }
  if (reachable && url.protocol === 'https:' && headers['strict-transport-security'] === null) {
    add(
      WEIGHTS.missingHsts,
      'The response does not set Strict-Transport-Security, so downgrade attacks are not prevented.',
    );
  }

  const riskScore = Math.min(100, risk);
  // A completed TLS handshake proves the host is reachable even when fetch()
  // refuses the response over an invalid certificate. Reporting that case as
  // "unreachable" would hide the security finding that actually matters.
  const observed = reachable || tlsHandshake;
  const verdict: UrlScanResponse['verdict'] = !observed
    ? 'unreachable'
    : riskScore >= 50
      ? 'malicious'
      : riskScore >= 20
        ? 'suspicious'
        : 'safe';

  const headline =
    verdict === 'unreachable'
      ? `The URL ${url.toString()} could not be retrieved and no TLS handshake completed, so no content or transport assessment could be made.`
      : verdict === 'safe'
        ? `The URL ${url.toString()} scanned clean with a risk score of ${riskScore} out of 100 and no significant risk indicators.`
        : `The URL ${url.toString()} is ${verdict} with a risk score of ${riskScore} out of 100.`;

  const tlsSentence =
    tlsValid === null
      ? ''
      : tlsValid
        ? ` Its TLS certificate is valid and trusted${tlsIssuer ? `, issued by ${tlsIssuer}` : ''}${tlsDays === null ? '' : `, with ${tlsDays} days remaining`}.`
        : ' Its TLS certificate failed validation.';
  const httpSentence =
    status === null
      ? ''
      : ` The server responded with HTTP ${status}${redirectChain.length > 0 ? ` after ${redirectChain.length} redirect${redirectChain.length === 1 ? '' : 's'}` : ''}.`;
  const dnsSentence =
    resolved.length > 0 ? ` The hostname ${hostname} resolves to ${resolved.join(', ')}.` : '';
  const findingSentence =
    findings.length > 0
      ? ` Findings: ${findings.join(' ')}`
      : ' No risk indicators were triggered.';

  return {
    url: url.toString(),
    final_url: finalUrl,
    hostname,
    scheme: url.protocol.replace(':', ''),
    verdict,
    risk_score: riskScore,
    reachable: observed,
    http_status: status,
    redirect_count: redirectChain.length,
    redirect_chain: redirectChain,
    tls_valid: tlsValid,
    tls_issuer: tlsIssuer,
    tls_days_remaining: tlsDays,
    resolved_addresses: resolved,
    findings,
    security_headers: headers,
    confidence: 1,
    reason: `${headline}${tlsSentence}${httpSentence}${dnsSentence}${findingSentence}`,
    checked_at: now.toISOString(),
  };
}
