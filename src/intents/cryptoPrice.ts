export interface CryptoPriceResponse {
  query: string;
  asset: string | null;
  symbol: string | null;
  price_usd: number | null;
  price_formatted: string | null;
  source_confidence: number | null;
  observed_at: string | null;
  found: boolean;
  verdict: 'found' | 'not_found' | 'unavailable';
  source: string;
  confidence: number;
  reason: string;
  checked_at: string;
}

const COINS = 'https://coins.llama.fi/prices/current';

// Tickers and common names the router is likely to hand us, mapped to the
// CoinGecko ids DefiLlama keys on. Anything not listed is slugified and tried
// directly, which covers the long tail of full asset names.
const ALIASES: Record<string, string> = {
  btc: 'bitcoin',
  xbt: 'bitcoin',
  eth: 'ethereum',
  ether: 'ethereum',
  sol: 'solana',
  usdc: 'usd-coin',
  usdt: 'tether',
  dai: 'dai',
  bnb: 'binancecoin',
  xrp: 'ripple',
  ada: 'cardano',
  doge: 'dogecoin',
  avax: 'avalanche-2',
  matic: 'matic-network',
  pol: 'polygon-ecosystem-token',
  dot: 'polkadot',
  link: 'chainlink',
  uni: 'uniswap',
  aave: 'aave',
  ltc: 'litecoin',
  atom: 'cosmos',
  arb: 'arbitrum',
  op: 'optimism',
  ton: 'the-open-network',
  trx: 'tron',
  near: 'near',
  apt: 'aptos',
  sui: 'sui',
  steth: 'staked-ether',
  wbtc: 'wrapped-bitcoin',
  shib: 'shiba-inu',
  pepe: 'pepe',
  mkr: 'maker',
  crv: 'curve-dao-token',
  ldo: 'lido-dao',
};

const STOPWORDS = new Set([
  'the',
  'current',
  'price',
  'of',
  'what',
  'is',
  'how',
  'much',
  'for',
  'in',
  'usd',
  'today',
  'now',
  'value',
  'worth',
  'cost',
  'a',
  'an',
  'to',
  'and',
  'crypto',
  'cryptocurrency',
  'coin',
  'token',
  'right',
  'quote',
]);

/** Best-effort asset identifier from a ticker, name, or whole question. */
export function assetIdFrom(query: string): { id: string; label: string } {
  const cleaned = query
    .trim()
    .toLowerCase()
    .replace(/[?!.,]/g, '');
  const direct = ALIASES[cleaned];
  if (direct) return { id: direct, label: cleaned.toUpperCase() };
  if (!/\s/.test(cleaned)) return { id: cleaned.replace(/\s+/g, '-'), label: cleaned };

  for (const word of cleaned.split(/\s+/)) {
    if (STOPWORDS.has(word)) continue;
    const mapped = ALIASES[word];
    if (mapped) return { id: mapped, label: word.toUpperCase() };
  }
  const words = cleaned.split(/\s+/).filter((w) => !STOPWORDS.has(w));
  return { id: words.join('-'), label: words.join(' ') || cleaned };
}

function formatPrice(value: number): string {
  if (value >= 1) return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toPrecision(4)}`;
}

interface CoinEntry {
  price?: number;
  symbol?: string;
  timestamp?: number;
  confidence?: number;
}

export async function getCryptoPrice(
  query: string,
  now = new Date(),
): Promise<CryptoPriceResponse> {
  const { id, label } = assetIdFrom(query);
  const base = {
    query,
    source: 'DefiLlama coins',
    confidence: 1,
    checked_at: now.toISOString(),
  };

  let entry: CoinEntry | undefined;
  let key = '';
  // A feed that did not answer is not evidence that an asset is untracked.
  let upstreamAnswered = false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9_000);
  try {
    const response = await fetch(`${COINS}/coingecko:${encodeURIComponent(id)}`, {
      signal: controller.signal,
    });
    if (response.ok) {
      upstreamAnswered = true;
      const payload = (await response.json()) as { coins?: Record<string, CoinEntry> };
      const coins = payload.coins ?? {};
      key = Object.keys(coins)[0] ?? '';
      if (key) entry = coins[key];
    }
  } catch {
    entry = undefined;
  } finally {
    clearTimeout(timer);
  }

  if (!upstreamAnswered) {
    return {
      ...base,
      asset: id,
      symbol: null,
      price_usd: null,
      price_formatted: null,
      source_confidence: null,
      observed_at: null,
      found: false,
      verdict: 'unavailable',
      reason:
        `The current price of "${query}" could not be retrieved because the DefiLlama price feed ` +
        `did not respond. This is a temporary upstream failure, not a statement about whether ` +
        `"${query}" is a tracked asset; its price is unknown rather than zero or unlisted.`,
    };
  }

  if (!entry || typeof entry.price !== 'number') {
    return {
      ...base,
      asset: null,
      symbol: null,
      price_usd: null,
      price_formatted: null,
      source_confidence: null,
      observed_at: null,
      found: false,
      verdict: 'not_found',
      reason:
        `No current USD price could be found for "${query}". The asset identifier resolved to ` +
        `"${id}", which DefiLlama's price feed does not track. The name may be misspelled, may ` +
        `refer to an asset that is not listed, or may not be a cryptocurrency at all.`,
    };
  }

  const observedAt = entry.timestamp ? new Date(entry.timestamp * 1000).toISOString() : null;
  const symbol = entry.symbol ?? label.toUpperCase();
  const ageSentence = observedAt
    ? ` The quote was observed at ${observedAt}, ${Math.max(0, Math.round((now.getTime() - Date.parse(observedAt)) / 1000))} seconds before this response.`
    : '';
  const confidenceSentence =
    typeof entry.confidence === 'number'
      ? ` The feed reports a source confidence of ${entry.confidence} for this quote.`
      : '';

  return {
    ...base,
    asset: id,
    symbol,
    price_usd: entry.price,
    price_formatted: formatPrice(entry.price),
    source_confidence: entry.confidence ?? null,
    observed_at: observedAt,
    found: true,
    verdict: 'found',
    reason:
      `The current price of ${symbol} is ${formatPrice(entry.price)} US dollars ` +
      `(${entry.price} USD exactly), aggregated by DefiLlama across its price sources.` +
      `${ageSentence}${confidenceSentence} This is a spot price in USD and does not include ` +
      `exchange fees or slippage.`,
  };
}
