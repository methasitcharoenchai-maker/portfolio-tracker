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
// Reality check: there is no fully reliable, free, no-key, CORS-open NAV API
// for Thai mutual funds. FINNOMENA's endpoint is unofficial/reverse-engineered
// and can change or break without notice. SEC Thailand's official API requires
// a subscription key + an internal proj_id (not the fund ticker), so it can't
// be called directly from a public ticker code without a registered key.
//
// FINNOMENA also sends no CORS headers, so calling it directly from the
// browser is always blocked. Public CORS proxies (allorigins, corsproxy.io,
// etc.) are unauthenticated, shared by the whole internet, and go down or
// start blocking traffic unpredictably — using them means your app's
// reliability rides on services you don't control.
//
// The durable fix: route through OUR OWN Vercel serverless function
// (/api/finnomena-nav.js), which fetches FINNOMENA server-side. Server-to-
// server requests aren't subject to browser CORS at all, so this removes
// the whole class of problem — no proxy uptime to gamble on.
//
// NOTE: this endpoint only exists once deployed on Vercel (or when running
// `vercel dev` locally). A plain `npm start` / `react-scripts start` dev
// server has no /api routes, so Thai funds will show "manual" on localhost
// unless you use `vercel dev` instead.
//
// Strategy used here:
//   1. Call our own /api/finnomena-nav endpoint
//   2. If it fails, return a clean "manual" flag (NOT an error) so the UI
//      treats manual NAV entry as a normal first-class path, not a failure state
async function fetchFinnomenaNav(code) {
  try {
    const res = await fetch(`/api/finnomena-nav?code=${encodeURIComponent(code)}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const nav  = json?.data?.nav ?? json?.data?.value ?? json?.nav;
    if (nav && parseFloat(nav) > 0) {
      return { json, nav: parseFloat(nav) };
    }
    return null;
  } catch {
    return null;
  }
}

export async function fetchThaiMutualFund(fundCode) {
  const code = fundCode.trim().toUpperCase();

  try {
    const result = await fetchFinnomenaNav(code);
    if (result) {
      const { json, nav } = result;
      const prev = json?.data?.prev_nav ?? json?.data?.prev_value ?? nav;
      const change = nav - parseFloat(prev);
      const changePct = prev ? (change / parseFloat(prev)) * 100 : 0;
      return {
        symbol: code, price: nav, change, changePct,
        currency: 'THB', name: TH_FUND_NAMES[code] || code, source: 'finnomena',
      };
    }
  } catch { /* expected to fail sometimes — fall through to manual */ }

  // No reliable auto-source available right now — manual entry is the path
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
