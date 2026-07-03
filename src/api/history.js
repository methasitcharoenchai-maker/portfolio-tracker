// ─── Historical Price Data ─────────────────────────────────────────────────
// Yahoo Finance chart endpoint supports a `range` param that returns a full
// time series (not just the latest tick). Works for stocks, ETFs, and any
// Yahoo-listed instrument. NOT available for Thai mutual funds or for
// CoinGecko-only crypto IDs that aren't also on Yahoo — those get a
// CoinGecko-based history fetch instead.

const RANGE_TO_INTERVAL = {
  '1mo': '1d',
  '3mo': '1d',
  '6mo': '1d',
  '1y':  '1wk',
  '5y':  '1mo',
};

export async function fetchStockHistory(symbol, range = '3mo') {
  try {
    const interval = RANGE_TO_INTERVAL[range] || '1d';
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxy, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const outer = await res.json();
    if (!outer?.contents) return null;
    const parsed = JSON.parse(outer.contents);
    const result = parsed?.chart?.result?.[0];
    if (!result) return null;

    const timestamps = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];

    const points = timestamps
      .map((t, i) => ({ date: new Date(t * 1000), price: closes[i] }))
      .filter(p => typeof p.price === 'number' && p.price > 0)
      .map(p => ({
        date: p.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        price: parseFloat(p.price.toFixed(4)),
      }));

    return points.length > 0 ? points : null;
  } catch { return null; }
}

// CoinGecko historical market chart — works for any coin ID, independent of Yahoo
const RANGE_TO_DAYS = { '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365, '5y': 1825 };

export async function fetchCryptoHistory(coinId, range = '3mo') {
  try {
    const days = RANGE_TO_DAYS[range] || 90;
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const data = await res.json();
    const prices = data?.prices || [];
    if (prices.length === 0) return null;

    // Downsample so charts don't choke on hundreds of points for long ranges
    const step = Math.max(1, Math.floor(prices.length / 90));
    const points = prices
      .filter((_, i) => i % step === 0)
      .map(([ts, price]) => ({
        date: new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        price: parseFloat(price.toFixed(2)),
      }));

    return points;
  } catch { return null; }
}
