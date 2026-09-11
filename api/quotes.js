const HOST = process.env.RAPIDAPI_HOST || 'apidojo-yahoo-finance-v1.p.rapidapi.com';

function cleanSymbols(value = '') {
  return value
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s) => /^[A-Z0-9.^-]{1,15}$/.test(s))
    .slice(0, 25);
}

function requestKey(req) {
  const raw = req.headers['x-stockswap-api-key'];
  const browserKey = Array.isArray(raw) ? raw[0] : raw;
  return String(browserKey || process.env.RAPIDAPI_KEY || '').trim();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const key = requestKey(req);
  if (!key) return res.status(503).json({ error: 'Market data is not configured' });

  const symbols = cleanSymbols(req.query.symbols || '');
  if (!symbols.length) return res.status(400).json({ error: 'Provide at least one valid symbol' });

  const url = new URL(`https://${HOST}/market/v2/get-quotes`);
  url.searchParams.set('region', 'US');
  url.searchParams.set('symbols', symbols.join(','));

  try {
    const upstream = await fetch(url, {
      headers: {
        'x-rapidapi-host': HOST,
        'x-rapidapi-key': key,
        'content-type': 'application/json'
      }
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(upstream.status).json({ error: 'Market data provider error', detail: text.slice(0, 200) });
    }

    const json = await upstream.json();
    const rows = json?.quoteResponse?.result || [];
    const quotes = rows.map((q) => ({
      symbol: q.symbol,
      name: q.shortName || q.longName || q.symbol,
      price: Number(q.regularMarketPrice),
      previousClose: Number(q.regularMarketPreviousClose),
      changePercent: Number(q.regularMarketChangePercent),
      currency: q.currency || 'USD',
      marketState: q.marketState || null,
      marketTime: q.regularMarketTime || null
    })).filter((q) => q.symbol && Number.isFinite(q.price));

    res.setHeader('Cache-Control', req.headers['x-stockswap-api-key'] ? 'no-store' : 's-maxage=10, stale-while-revalidate=20');
    return res.status(200).json({ source: 'Yahoo Finance via RapidAPI', quotes });
  } catch (error) {
    return res.status(502).json({ error: 'Unable to reach market data provider' });
  }
};
