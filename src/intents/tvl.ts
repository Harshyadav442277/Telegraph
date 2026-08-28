export interface TvlResponse {
  query: string;
  resolved_name: string | null;
  kind: 'protocol' | 'chain' | 'not_found';
  verdict: 'protocol' | 'chain' | 'not_found';
  tvl_usd: number | null;
  tvl_formatted: string | null;
  change_1d_pct: number | null;
  change_7d_pct: number | null;
  category: string | null;
  chains: string[];
  symbol: string | null;
  url: string | null;
  source: string;
  confidence: number;
  reason: string;
  checked_at: string;
}

const LLAMA = 'https://api.llama.fi';

interface LlamaChain {
  name?: string;
  tokenSymbol?: string | null;
  tvl?: number;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function formatUsd(value: number): string {
  const abs = Math.abs(value);
  const units: Array<[number, string]> = [
    [1e12, 'trillion'],
    [1e9, 'billion'],
    [1e6, 'million'],
    [1e3, 'thousand'],
  ];
  for (const [size, label] of units) {
    if (abs >= size) return `$${(value / size).toFixed(2)} ${label}`;
  }
  return `$${value.toFixed(2)}`;
}

async function getJson<T>(url: string, timeoutMs = 9_000): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function titleCase(value: string): string {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** `/tvl/{slug}` returns a bare number; an empty body means "not a protocol". */
async function getProtocolTvl(slug: string, timeoutMs = 9_000): Promise<number | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${LLAMA}/tvl/${slug}`, { signal: controller.signal });
    if (!response.ok) return null;
    const text = (await response.text()).trim();
    if (!text) return null;
    const value = Number(text);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function lookupTvl(query: string, now = new Date()): Promise<TvlResponse> {
  const slug = slugify(query);
  const base = {
    query,
    source: 'DefiLlama',
    confidence: 1,
    checked_at: now.toISOString(),
  };

  // The full /protocol/{slug} document embeds complete TVL history — nearly
  // 2 MB for a large protocol — so the bare /tvl/{slug} number is used
  // instead and chains are resolved from the compact chain list.
  const [protocolTvl, chains] = await Promise.all([
    slug ? getProtocolTvl(slug) : Promise.resolve(null),
    getJson<LlamaChain[]>(`${LLAMA}/v2/chains`),
  ]);

  const match = chains?.find(
    (c) =>
      slugify(c.name ?? '') === slug ||
      (c.tokenSymbol ?? '').toLowerCase() === query.trim().toLowerCase(),
  );

  // An exact chain-name match wins: "TVL of Base" means the chain, even when
  // a protocol of the same name also exists.
  const chainNameMatches = match?.name !== undefined && slugify(match.name) === slug;

  if (!chainNameMatches && protocolTvl !== null && protocolTvl > 0) {
    const name = titleCase(query);
    return {
      ...base,
      resolved_name: name,
      kind: 'protocol',
      verdict: 'protocol',
      tvl_usd: protocolTvl,
      tvl_formatted: formatUsd(protocolTvl),
      change_1d_pct: null,
      change_7d_pct: null,
      category: null,
      chains: [],
      symbol: null,
      url: `https://defillama.com/protocol/${slug}`,
      reason:
        `The ${name} protocol currently holds a total value locked of ${formatUsd(protocolTvl)} ` +
        `(${protocolTvl.toFixed(2)} USD) according to DefiLlama. Total value locked measures the ` +
        `aggregate USD value of all assets deposited in the protocol's smart contracts across ` +
        `every chain it is deployed on, and is the standard measure of a DeFi protocol's scale.`,
    };
  }

  if (match?.name) {
    const tvl = match.tvl ?? 0;
    return {
      ...base,
      resolved_name: match.name,
      kind: 'chain',
      verdict: 'chain',
      tvl_usd: tvl,
      tvl_formatted: formatUsd(tvl),
      change_1d_pct: null,
      change_7d_pct: null,
      category: 'Chain',
      chains: [match.name],
      symbol: match.tokenSymbol ?? null,
      url: null,
      reason:
        `The ${match.name} chain currently holds a total value locked of ${formatUsd(tvl)} ` +
        `(${tvl.toFixed(2)} USD) across all DeFi protocols tracked on it by DefiLlama` +
        `${match.tokenSymbol ? `, with ${match.tokenSymbol} as its native token` : ''}. ` +
        `Total value locked measures the aggregate USD value of assets deposited in on-chain contracts.`,
    };
  }

  return {
    ...base,
    resolved_name: null,
    kind: 'not_found',
    verdict: 'not_found',
    tvl_usd: null,
    tvl_formatted: null,
    change_1d_pct: null,
    change_7d_pct: null,
    category: null,
    chains: [],
    symbol: null,
    url: null,
    reason:
      `No protocol or chain matching "${query}" is tracked by DefiLlama, so no total value ` +
      `locked figure can be reported for it. The name may be misspelled, may refer to a ` +
      `protocol that DefiLlama does not index, or may not hold any on-chain deposits.`,
  };
}
