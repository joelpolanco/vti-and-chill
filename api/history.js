// /api/history?symbol=VTI
// Vercel serverless function — proxies Yahoo Finance v8/chart for daily price history.
// Returns split- and dividend-adjusted closes, suitable for total-return comparison.
//
// Why proxy: browsers can't fetch Yahoo Finance directly (no CORS headers from Yahoo).
// Vercel's edge runs server-side, so it can fetch and re-serve with permissive CORS.

export const config = {
  runtime: 'edge',
};

const YAHOO_BASE = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const ALLOW_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=900, s-maxage=900', // 15 min CDN cache
  'Content-Type': 'application/json; charset=utf-8',
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: ALLOW_HEADERS });
}

function isValidSymbol(s) {
  // Allow letters, digits, dot, hyphen, caret (e.g. ^GSPC, BRK-B). Length <= 10.
  return typeof s === 'string' && /^[A-Za-z0-9.\-^]{1,10}$/.test(s);
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: ALLOW_HEADERS });
  }
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const url = new URL(request.url);
  const symbol = (url.searchParams.get('symbol') || '').trim().toUpperCase();
  if (!symbol) return jsonResponse({ error: 'Missing symbol' }, 400);
  if (!isValidSymbol(symbol)) {
    return jsonResponse({ error: 'Invalid symbol format' }, 400);
  }

  // Pull as much daily data as Yahoo will give us. range=max + interval=1d
  // events=div%2Csplit gets dividend & split events but we only need adjclose.
  const yahooUrl = `${YAHOO_BASE}${encodeURIComponent(symbol)}?range=max&interval=1d&includePrePost=false`;

  let res;
  try {
    res = await fetch(yahooUrl, {
      headers: {
        // Yahoo blocks default Node UA — present a normal browser UA.
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'application/json,text/plain,*/*',
      },
    });
  } catch (err) {
    return jsonResponse({ error: `Upstream fetch failed: ${err.message}` }, 502);
  }

  if (!res.ok) {
    if (res.status === 404) {
      return jsonResponse({ error: `Unknown symbol: ${symbol}` }, 404);
    }
    return jsonResponse({ error: `Upstream returned ${res.status}` }, 502);
  }

  let data;
  try {
    data = await res.json();
  } catch (_err) {
    return jsonResponse({ error: 'Upstream returned invalid JSON' }, 502);
  }

  const result = data?.chart?.result?.[0];
  if (!result || data?.chart?.error) {
    const msg = data?.chart?.error?.description || `No data for ${symbol}`;
    return jsonResponse({ error: msg }, 404);
  }

  const timestamps = result.timestamp || [];
  const indicators = result.indicators || {};
  const quote = indicators.quote?.[0] || {};
  const adjclose = indicators.adjclose?.[0]?.adjclose || [];
  const closes = quote.close || [];
  const currency = result.meta?.currency || 'USD';

  if (!timestamps.length || !closes.length) {
    return jsonResponse({ error: `No price history for ${symbol}` }, 404);
  }

  const prices = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    const close = closes[i];
    const adj = adjclose[i];
    if (close == null || adj == null) continue;
    const d = new Date(timestamps[i] * 1000);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    prices.push({
      date: `${yyyy}-${mm}-${dd}`,
      close: Number(close.toFixed(4)),
      adjclose: Number(adj.toFixed(4)),
    });
  }

  if (!prices.length) {
    return jsonResponse({ error: `No usable price data for ${symbol}` }, 404);
  }

  return jsonResponse({
    symbol,
    currency,
    prices,
    latest: prices[prices.length - 1],
  });
}
