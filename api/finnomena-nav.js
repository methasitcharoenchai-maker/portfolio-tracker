// Vercel Serverless Function — runs on Vercel's servers, not in the browser.
// Server-to-server requests aren't subject to CORS, so this sidesteps the
// entire "does FINNOMENA send CORS headers" problem permanently, and removes
// the need for flaky third-party proxies like allorigins/corsproxy.io.
//
// Deployed automatically by Vercel because it lives in /api — no extra config.
// Called from the frontend as: fetch(`/api/finnomena-nav?code=SCBUSAA`)

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid fund code' });
  }

  try {
    const upstream = await fetch(
      `https://api.finnomena.com/fund/public/v2/funds/${encodeURIComponent(code)}/nav/latest`,
      { signal: AbortSignal.timeout(6000) }
    );

    if (!upstream.ok) {
      return res.status(502).json({ error: `Finnomena responded ${upstream.status}` });
    }

    const data = await upstream.json();

    // Cache for 60s at Vercel's edge so repeated page loads / multiple funds
    // don't all hammer FINNOMENA fresh every time.
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(504).json({ error: 'Finnomena fetch timed out' });
  }
}
