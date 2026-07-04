// Vercel Serverless Function — runs on Vercel's servers, not in the browser.
// Server-to-server requests aren't subject to CORS, so this sidesteps the
// entire "does FINNOMENA send CORS headers" problem permanently.
//
// FINNOMENA's unofficial API appears to reject requests that don't look like
// they came from a real browser (no User-Agent / Referer = easy to block).
// We send browser-like headers here to get past that.
//
// Deployed automatically by Vercel because it lives in /api (repo root) —
// no extra config. Called from the frontend as:
//   fetch(`/api/finnomena-nav?code=SCBUSAA`)

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid fund code' });
  }

  const targetUrl = `https://api.finnomena.com/fund/public/v2/funds/${encodeURIComponent(code)}/nav/latest`;

  try {
    const upstream = await fetch(targetUrl, {
      signal: AbortSignal.timeout(6000),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.finnomena.com/',
        'Origin': 'https://www.finnomena.com',
      },
    });

    if (!upstream.ok) {
      // Surface the real upstream status + a snippet of the body so we can
      // actually see WHY it failed (blocked, renamed endpoint, rate limit, etc)
      // instead of guessing from a generic 502 in the browser console.
      const bodyText = await upstream.text().catch(() => '');
      return res.status(502).json({
        error: `Finnomena responded ${upstream.status}`,
        upstreamStatus: upstream.status,
        upstreamBody: bodyText.slice(0, 300),
      });
    }

    const data = await upstream.json();

    // Cache for 60s at Vercel's edge so repeated page loads / multiple funds
    // don't all hammer FINNOMENA fresh every time.
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(504).json({ error: 'Finnomena fetch timed out', detail: String(err) });
  }
}
