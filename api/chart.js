const HOST = process.env.RAPIDAPI_HOST || 'apidojo-yahoo-finance-v1.p.rapidapi.com';

const RANGE_MAP = {
  '1D': { range: '1d', interval: '5m' },
  '1W': { range: '5d', interval: '30m' },
  '1M': { range: '1mo', interval: '60m' },
  '3M': { range: '3mo', interval: '1d' },
  '1Y': { range: '1y', interval: '1d' }
};

function validSymbol(value = '') {
  const symbol = String(value).trim().toUpperCase();
  return /^[A-Z0-9.^-]{1,15}$/.test(symbol) ? symbol : null;
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

  const symbol = validSymbol(req.query.symbol);
  const rangeKey = String(req.query.range || '1D').toUpperCase();
  const config = RANGE_MAP[rangeKey] || RANGE_MAP['1D'];
  if (!symbol) return res.status(400).json({ error: 'Invalid symbol' });

  const url = new URL(`https://${HOST}/stock/v2/get-chart`);
  url.searchParams.set('region', 'US');
  url.searchParams.set('symbol', symbol);
  url.searchParams.set('range', config.range);
  url.searchParams.set('interval', config.interval);

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
    const root = json?.chart?.result?.[0] || json;
    const timestamps = root?.timestamp || [];
    const quote = root?.indicators?.quote?.[0] || {};
    const closes = quote.close || [];
    const opens = quote.open || [];
    const highs = quote.high || [];
    const lows = quote.low || [];
    const volumes = quote.volume || [];

    const bars = timestamps.map((time, i) => ({
      time: Number(time),
      open: Number(opens[i]),
      high: Number(highs[i]),
      low: Number(lows[i]),
      close: Number(closes[i]),
      volume: Number(volumes[i])
    })).filter((bar) => Number.isFinite(bar.time) && Number.isFinite(bar.close));

    res.setHeader('Cache-Control', req.headers['x-stockswap-api-key'] ? 'no-store' : 's-maxage=20, stale-while-revalidate=40');
    return res.status(200).json({
      source: 'Yahoo Finance via RapidAPI',
      symbol,
      range: rangeKey,
      currency: root?.meta?.currency || 'USD',
      bars
    });
  } catch (error) {
    return res.status(502).json({ error: 'Unable to reach market data provider' });
  }
};
