// ─── CONSTANTS ───────────────────────────────────────────────────────────────
export const TH_FUND_NAMES = {
  'SCBUSAA':    'SCB US Equity Fund A',
  'MEGA10-A':   'MFC MEGA 10 Fund A',
  'KFLTFDIV-A': 'Krungsri LTF Dividend A',
  'SCBSET':     'SCB SET Index Fund',
  'BCARE':      'Bualuang Healthcare',
  'TMBGQG':     'TMB Global Quality Growth',
  'KFDIV':      'Krungsri Dividend Fund',
  'UOBSCI':     'UOB Smart China India',
  'SCBKEQTG':   'SCB Equity Global',
  'TISCO100RIF':'TISCO 100 RIF',
};

// ─── API: YAHOO FINANCE (Stocks / ETFs / US Mutual Funds) ────────────────────
export async function fetchStockPrice(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxy, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const outer = await res.json();
    if (!outer?.contents) return null;
    const parsed = JSON.parse(outer.contents);
    const result = parsed?.chart?.result?.[0];
    if (!result || result?.meta == null) return null;

    const price     = result.meta.regularMarketPrice;
    const prevClose = result.meta.chartPreviousClose ?? result.meta.previousClose;

    // Defensive checks — reject garbage/negative/zero data instead of showing it
    if (typeof price !== 'number' || price <= 0) return null;
    if (typeof prevClose !== 'number' || prevClose <= 0) {
      return {
        symbol, price, change: 0, changePct: 0,
        currency: result.meta.currency || 'USD',
        name: result.meta.longName || symbol,
      };
    }

    const change    = price - prevClose;
    const changePct = (change / prevClose) * 100;
    const currency  = result.meta.currency || 'USD';
    return { symbol, price, change, changePct, currency, name: result.meta.longName || symbol };
  } catch { return null; }
}

// ─── API: THAI MUTUAL FUNDS ──────────────────────────────────────────────────
// Decision: Thai mutual fund NAV auto-fetching has been removed entirely.
// FINNOMENA's unofficial API has no stable public endpoint (it 404s, appears
// to require an internal fund ID rather than the ticker, and the site itself
// was rebuilt at some point — old reverse-engineered paths no longer work).
// SEC Thailand's official API requires a paid subscription key + registered
// proj_id. Neither is worth chasing for a personal tracker.
//
// Manual entry is simple, reliable, and already fully supported by the UI
// (see the "manual" price tag / editable price field in Holdings). This
// function always returns the manual-entry shape immediately — no network
// call, no timeout, no flakiness.
export async function fetchThaiMutualFund(fundCode) {
  const code = fundCode.trim().toUpperCase();
  return {
    symbol: code, price: null, change: 0, changePct: 0,
    currency: 'THB', name: TH_FUND_NAMES[code] || code,
    manual: true,
  };
}

// ─── API: CRYPTO (CoinGecko, no key) ─────────────────────────────────────────
export async function fetchCryptoPrice(coinId) {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd,thb&include_24hr_change=true`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    if (!data[coinId]) return null;
    const priceUSD = data[coinId].usd;
    const priceTHB = data[coinId].thb;
    const changePct = data[coinId].usd_24h_change || 0;
    return {
      symbol: coinId.toUpperCase(), priceUSD, priceTHB,
      price: priceUSD, change: (priceUSD * changePct) / 100,
      changePct, currency: 'USD', name: coinId,
    };
  } catch { return null; }
}

// ─── API: USD→THB Exchange Rate ───────────────────────────────────────────────
export async function fetchUSDTHB() {
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', { signal: AbortSignal.timeout(6000) });
    const data = await res.json();
    return data?.rates?.THB ?? 36.5;
  } catch { return 36.5; }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
export function fmtCurrency(amount, currency = 'USD') {
  if (amount == null || isNaN(amount)) return '—';
  const sym = currency === 'THB' ? '฿' : '$';
  return `${sym}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function convertAmount(amount, from, to, rate) {
  if (amount == null) return null;
  if (from === to) return amount;
  if (from === 'USD' && to === 'THB') return amount * rate;
  if (from === 'THB' && to === 'USD') return amount / rate;
  return amount;
}
