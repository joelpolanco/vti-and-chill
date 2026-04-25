/* VTI vs. Portfolio — performance comparison tool
 * All logic runs in the browser. Prices come from /api/history (Yahoo Finance proxy). */

// --------------------------- STATE ---------------------------
const state = {
  transactions: [], // {id, date:'YYYY-MM-DD', symbol, action:'buy'|'sell', quantity, price}
  rawCsv: null,
  pendingMapping: null, // {headers, rows, guess}
  priceCache: new Map(), // symbol -> {prices, latest, currency}
  results: null,
  chart: null,
};

let nextTxnId = 1;

// --------------------------- HELPERS ---------------------------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const fmtMoney = (n, opts = {}) => {
  if (n == null || !isFinite(n)) return '—';
  const sign = opts.signed && n > 0 ? '+' : '';
  return (
    sign +
    n.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
};
const fmtPct = (n, opts = {}) => {
  if (n == null || !isFinite(n)) return '—';
  const sign = opts.signed && n > 0 ? '+' : '';
  return `${sign}${(n * 100).toFixed(2)}%`;
};
const fmtNum = (n) => {
  if (n == null || !isFinite(n)) return '—';
  return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
};

function parseDateLoose(v) {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v) ? null : v;
  const s = String(v).trim();
  if (!s) return null;
  // Try ISO first
  let d = new Date(s);
  if (!isNaN(d) && /^\d{4}-\d{2}-\d{2}/.test(s)) return d;
  // M/D/YYYY or MM/DD/YYYY (US — most US brokers)
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    let [, mm, dd, yy] = m;
    if (yy.length === 2) yy = '20' + yy;
    d = new Date(`${yy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T12:00:00Z`);
    if (!isNaN(d)) return d;
  }
  // YYYY/MM/DD
  m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
  if (m) {
    d = new Date(`${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}T12:00:00Z`);
    if (!isNaN(d)) return d;
  }
  // Mon DD, YYYY (e.g. "Jan 15, 2024")
  d = new Date(s);
  return isNaN(d) ? null : d;
}

function toIsoDate(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseNumber(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v;
  let s = String(v).trim();
  if (!s) return null;
  // Handle parens for negatives, $, commas, %
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[$,\s]/g, '').replace(/%$/, '');
  if (s === '' || s === '-') return null;
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return neg ? -n : n;
}

// --------------------------- CSV PARSE & DETECT ---------------------------

// Map from a normalized action string to 'buy' | 'sell' | null.
//
// We use word-boundary substring matches for full-word hints (buy/bought/etc),
// because some columns embed a key word inside a phrase like "You bought".
// Short tickerless codes (B / S / BTO / STC) are NOT in this list — they are
// matched as exact tokens in classifyActionWithCode below, since substring-
// matching them creates false positives like "common stock" → "sto" → sell.
function classifyAction(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s) return null;
  // Word-anchored hints. Each must appear with a non-letter boundary on both sides
  // to avoid e.g. "common stock" matching the bare hint 'sto'.
  const buyHints = [
    'buy',
    'bought',
    'purchase',
    'purchased',
    'reinvestment',
    'reinvest',
    'reinv',
  ];
  const sellHints = [
    'sell',
    'sold',
    'sale',
    'redemption',
    'redeem',
  ];
  // \b only treats letters/digits as word chars; we need a regex per hint to
  // anchor it as a whole word.
  const matchWord = (s, h) => new RegExp(`\\b${h}\\b`, 'i').test(s);
  for (const h of buyHints) if (matchWord(s, h)) return 'buy';
  for (const h of sellHints) if (matchWord(s, h)) return 'sell';
  return null;
}

// Header heuristics. Each role lists candidate column-name fragments in priority order.
const HEADER_HINTS = {
  date: [
    'trade date',
    'run date',
    'transaction date',
    'date',
    'settlement date',
    'activity date',
    'process date',
  ],
  action: [
    'trans code',          // Robinhood
    'transaction type',
    'transaction',
    'action',
    'activity',
    'type',
    // 'description' deliberately omitted — it usually contains the security
    // name ("Apple Inc. - Common Stock"), not the buy/sell verb. Falling back
    // to the manual mapper is better than misreading it.
  ],
  symbol: ['symbol', 'ticker', 'security', 'instrument'],
  quantity: ['quantity', 'shares', 'qty', 'units'],
  price: ['price', 'avg price', 'average price', 'price per share', 'unit price'],
  amount: ['amount', 'total', 'net amount', 'principal amount', 'value'],
};

function findColumn(headers, role) {
  const hints = HEADER_HINTS[role];
  const lower = headers.map((h) => (h || '').toString().trim().toLowerCase());
  // Exact match first
  for (const hint of hints) {
    const idx = lower.indexOf(hint);
    if (idx >= 0) return idx;
  }
  // Then "contains" match — but prefer most specific (longest hint that hits).
  let best = { idx: -1, score: 0 };
  for (let i = 0; i < lower.length; i++) {
    for (const hint of hints) {
      if (lower[i].includes(hint) && hint.length > best.score) {
        best = { idx: i, score: hint.length };
      }
    }
  }
  return best.idx;
}

function detectSchema(headers) {
  return {
    date: findColumn(headers, 'date'),
    action: findColumn(headers, 'action'),
    symbol: findColumn(headers, 'symbol'),
    quantity: findColumn(headers, 'quantity'),
    price: findColumn(headers, 'price'),
    amount: findColumn(headers, 'amount'),
  };
}

// Short trade codes used by Robinhood / brokers in a dedicated "Trans Code" column.
//   Robinhood: Buy, Sell, BTO, STC, ACH, REC, SLIP, CDIV, etc.
//   Some exporters use single letters: B, S.
//   Options: BTO (buy to open), STC (sell to close), STO (sell to open), BTC (buy to close).
// These must be matched as EXACT tokens — substring matching them inside
// other text causes false positives (e.g. "common stock" contains "sto").
function classifyActionWithCode(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().toUpperCase();
  if (!s) return null;
  if (s === 'B' || s === 'BTO' || s === 'BTC' || s === 'BUY') return 'buy';
  if (s === 'S' || s === 'STO' || s === 'STC' || s === 'SELL') return 'sell';
  return classifyAction(raw);
}

function parseCsvText(text) {
  // Some broker CSVs include preamble lines (e.g. Schwab adds "Transactions for account ...").
  // PapaParse will use the first row as header, so first strip blank/non-data preamble.
  const cleaned = stripPreamble(text);
  const result = Papa.parse(cleaned, {
    header: true,
    skipEmptyLines: 'greedy',
    dynamicTyping: false,
    transformHeader: (h) => (h || '').trim(),
  });
  return {
    headers: result.meta.fields || [],
    rows: result.data || [],
  };
}

function stripPreamble(text) {
  // Remove leading lines until we find one that contains common header tokens.
  const lines = text.split(/\r?\n/);
  const tokens = ['date', 'symbol', 'ticker', 'action', 'transaction', 'type', 'quantity', 'shares'];
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const lower = lines[i].toLowerCase();
    let hits = 0;
    for (const t of tokens) if (lower.includes(t)) hits++;
    if (hits >= 2 && lines[i].includes(',')) {
      return lines.slice(i).join('\n');
    }
  }
  return text;
}

function tryAutoConvert(headers, rows) {
  const schema = detectSchema(headers);
  const required = ['date', 'symbol', 'action', 'quantity'];
  for (const r of required) {
    if (schema[r] < 0) return { ok: false, schema };
  }
  const out = [];
  const errors = [];
  let row = 0;
  for (const raw of rows) {
    row++;
    const arr = headers.map((h) => raw[h]);
    const txn = rowToTxn(arr, schema);
    if (txn) out.push(txn);
    else errors.push(row);
  }
  return { ok: out.length > 0, schema, txns: out, errors, total: rows.length };
}

function rowToTxn(arr, schema) {
  const dateRaw = arr[schema.date];
  const symbolRaw = arr[schema.symbol];
  const actionRaw = arr[schema.action];
  const qtyRaw = schema.quantity >= 0 ? arr[schema.quantity] : null;
  const priceRaw = schema.price >= 0 ? arr[schema.price] : null;
  const amountRaw = schema.amount >= 0 ? arr[schema.amount] : null;

  const date = parseDateLoose(dateRaw);
  if (!date) return null;

  let symbol = (symbolRaw || '').toString().trim().toUpperCase();
  // Some Fidelity rows put symbol in parens after a name, or only have a description.
  if (!symbol) return null;
  // Strip option/derivative descriptors — we only support equities/ETFs (single-token symbol).
  symbol = symbol.split(/\s+/)[0].replace(/[^A-Z0-9.\-]/g, '');
  if (!symbol || symbol.length > 8) return null;

  const action = classifyActionWithCode(actionRaw);
  if (!action) return null;

  let quantity = parseNumber(qtyRaw);
  let price = parseNumber(priceRaw);
  const amount = parseNumber(amountRaw);

  // Quantity may be negative in some exports (sells as -shares). Normalize to positive.
  if (quantity != null && quantity < 0) quantity = -quantity;

  // If price is missing but amount + quantity exist, derive
  if ((price == null || price <= 0) && amount != null && quantity != null && quantity > 0) {
    price = Math.abs(amount) / quantity;
  }

  if (quantity == null || quantity <= 0) return null;
  if (price == null || price <= 0) return null;

  return {
    id: nextTxnId++,
    date: toIsoDate(date),
    symbol,
    action,
    quantity,
    price,
  };
}

function showMapper(headers, rows) {
  state.pendingMapping = { headers, rows };
  const grid = $('#mapper-grid');
  grid.innerHTML = '';
  const guess = detectSchema(headers);
  const roles = [
    { key: 'date', label: 'Date *' },
    { key: 'symbol', label: 'Symbol *' },
    { key: 'action', label: 'Action / Type *' },
    { key: 'quantity', label: 'Quantity / Shares *' },
    { key: 'price', label: 'Price per share' },
    { key: 'amount', label: 'Amount / Total' },
  ];
  for (const r of roles) {
    const lbl = document.createElement('label');
    lbl.innerHTML = `<span>${r.label}</span>`;
    const sel = document.createElement('select');
    sel.dataset.role = r.key;
    sel.innerHTML =
      `<option value="-1">— none —</option>` +
      headers
        .map(
          (h, i) =>
            `<option value="${i}" ${guess[r.key] === i ? 'selected' : ''}>${
              h || `(column ${i + 1})`
            }</option>`
        )
        .join('');
    lbl.appendChild(sel);
    grid.appendChild(lbl);
  }
  $('#csv-mapper').hidden = false;
}

function applyMapping() {
  const map = {};
  $$('#mapper-grid select').forEach((s) => {
    map[s.dataset.role] = parseInt(s.value, 10);
  });
  if (map.date < 0 || map.symbol < 0 || map.action < 0 || map.quantity < 0) {
    setStatus('Please pick a column for date, symbol, action, and quantity.', true);
    return;
  }
  const { headers, rows } = state.pendingMapping;
  const out = [];
  for (const raw of rows) {
    const arr = headers.map((h) => raw[h]);
    const txn = rowToTxn(arr, map);
    if (txn) out.push(txn);
  }
  if (!out.length) {
    setStatus('No valid rows after mapping. Check your column choices.', true);
    return;
  }
  $('#csv-mapper').hidden = true;
  state.pendingMapping = null;
  appendTransactions(out);
  setStatus('');
}

// --------------------------- TXN STATE ---------------------------
function appendTransactions(txns) {
  // Sort by date as we add (oldest first)
  for (const t of txns) state.transactions.push(t);
  state.transactions.sort((a, b) => a.date.localeCompare(b.date));
  renderTxnList();
  updateRunButton();
}

function renderTxnList() {
  const wrap = $('#txn-list-wrap');
  const tbody = $('#txn-tbody');
  if (!state.transactions.length) {
    wrap.hidden = true;
    return;
  }
  wrap.hidden = false;
  $('#txn-count').textContent = state.transactions.length;
  tbody.innerHTML = state.transactions
    .map(
      (t) => `
      <tr data-id="${t.id}">
        <td class="mono">${t.date}</td>
        <td><span class="action-${t.action}">${t.action.toUpperCase()}</span></td>
        <td class="mono">${t.symbol}</td>
        <td class="num">${fmtNum(t.quantity)}</td>
        <td class="num">${fmtMoney(t.price)}</td>
        <td class="num">${fmtMoney(t.quantity * t.price)}</td>
        <td><button class="txn-row-remove" data-remove="${t.id}" title="Remove">✕</button></td>
      </tr>`
    )
    .join('');
}

function removeTxn(id) {
  state.transactions = state.transactions.filter((t) => t.id !== id);
  renderTxnList();
  updateRunButton();
}

function updateRunButton() {
  $('#run-analysis').disabled = state.transactions.length === 0;
}

function clearAll() {
  state.transactions = [];
  state.results = null;
  state.priceCache.clear();
  if (state.chart) {
    state.chart.destroy();
    state.chart = null;
  }
  renderTxnList();
  updateRunButton();
  $('#results').hidden = true;
  setStatus('');
}

function setStatus(text, isError = false) {
  const el = $('#run-status');
  el.classList.toggle('error', !!isError);
  el.innerHTML = text;
}

// --------------------------- PRICE FETCH ---------------------------
// On vtiandchill.com the price API is served by a Vercel serverless function
// at /api/history. Same origin, so no CORS plumbing needed.
const API_BASE = '';

async function fetchHistory(symbol) {
  if (state.priceCache.has(symbol)) return state.priceCache.get(symbol);
  const url = `${API_BASE}/api/history?symbol=${encodeURIComponent(symbol)}`;
  const r = await fetch(url);
  if (!r.ok) {
    let msg = `Could not fetch ${symbol}`;
    try {
      const j = await r.json();
      if (j.error) msg = `${symbol}: ${j.error}`;
    } catch (_) {}
    throw new Error(msg);
  }
  const data = await r.json();
  if (!data.prices || !data.prices.length) {
    throw new Error(`${symbol}: no price history`);
  }
  // Build a date -> {close, adjclose} index for fast lookup
  const byDate = new Map();
  for (const p of data.prices) byDate.set(p.date, p);
  data.byDate = byDate;
  state.priceCache.set(symbol, data);
  return data;
}

// Find the price record for a date — use the date if it's a trading day,
// otherwise the next available trading day (so weekend/holiday buys roll forward).
function priceOnOrAfter(history, isoDate) {
  if (history.byDate.has(isoDate)) return history.byDate.get(isoDate);
  // Linear search on sorted array (fast enough; <10k items)
  for (const p of history.prices) {
    if (p.date >= isoDate) return p;
  }
  return null;
}
function priceOnOrBefore(history, isoDate) {
  if (history.byDate.has(isoDate)) return history.byDate.get(isoDate);
  let last = null;
  for (const p of history.prices) {
    if (p.date <= isoDate) last = p;
    else break;
  }
  return last;
}

// --------------------------- ANALYSIS ENGINE ---------------------------

/* The core algorithm:
 *
 * For each transaction in chronological order:
 *   - Look up the symbol's adjusted close on the trade date (or next trading day).
 *   - For BUY: dollars = quantity * price (user's actual fill), or fallback: quantity * close.
 *     We use the user's reported fill so realized cost basis matches their broker.
 *   - VTI sleeve: shares_vti += dollars / vti_close(date) for buys, shares_vti -= proportion * shares_vti
 *     for sells (releases the same fraction of VTI sleeve as the user is releasing of that symbol).
 *
 * For per-symbol breakdown:
 *   - Track running shares & cost basis per symbol.
 *   - On sell: realized PnL added; cost basis reduced by avg_cost * sold_qty.
 *   - At end: position_value = remaining_shares * latest_close; total_return = realized + (position_value - remaining_cost).
 *
 * For the time series: mark-to-market every distinct trading day from first txn to today.
 */

async function runAnalysis() {
  if (!state.transactions.length) return;
  setStatus('<span class="spinner"></span> Fetching prices…');
  $('#run-analysis').disabled = true;

  const txns = [...state.transactions].sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  const symbols = Array.from(new Set(txns.map((t) => t.symbol)));
  if (!symbols.includes('VTI')) symbols.push('VTI');

  // Fetch all in parallel; collect per-symbol failures
  const failed = [];
  const fetched = await Promise.all(
    symbols.map(async (s) => {
      try {
        const h = await fetchHistory(s);
        return [s, h];
      } catch (e) {
        failed.push({ symbol: s, error: e.message });
        return [s, null];
      }
    })
  );
  const histMap = new Map(fetched.filter(([, v]) => v));
  const vti = histMap.get('VTI');
  if (!vti) {
    setStatus(
      'Could not load VTI price history — try again in a moment.',
      true
    );
    $('#run-analysis').disabled = false;
    return;
  }

  // Drop transactions whose symbol failed to fetch (non-VTI)
  const usable = txns.filter((t) => histMap.has(t.symbol));
  const skipped = txns.filter((t) => !histMap.has(t.symbol));

  setStatus('Crunching numbers…');

  // Per-symbol position tracking
  const positions = new Map(); // symbol -> {shares, cost, realized}
  // Hypothetical VTI sleeve: total shares purchased via the "what if VTI" replay.
  // We also track per-symbol VTI "shadow" so the breakdown table can show
  // what VTI would have done with the same dollars on the same days.
  const vtiShadow = new Map(); // symbol -> {shares, cost, realized}
  let portfolioVtiShares = 0;
  let portfolioVtiCost = 0; // gross dollars routed into the VTI sleeve (less proportional sells)

  function getPos(map, sym) {
    if (!map.has(sym)) map.set(sym, { shares: 0, cost: 0, realized: 0 });
    return map.get(sym);
  }

  for (const t of usable) {
    const dollars = t.quantity * t.price;
    const vtiPrice = priceOnOrAfter(vti, t.date);
    if (!vtiPrice) continue;
    const vtiClose = vtiPrice.adjclose;

    const pos = getPos(positions, t.symbol);
    const shadow = getPos(vtiShadow, t.symbol);

    if (t.action === 'buy') {
      pos.shares += t.quantity;
      pos.cost += dollars;
      const vtiShares = dollars / vtiClose;
      shadow.shares += vtiShares;
      shadow.cost += dollars;
      portfolioVtiShares += vtiShares;
      portfolioVtiCost += dollars;
    } else {
      // sell: release proportional shares
      const sellQty = Math.min(t.quantity, pos.shares);
      if (sellQty <= 0) continue;
      const avgCost = pos.shares > 0 ? pos.cost / pos.shares : 0;
      const proceeds = sellQty * t.price;
      const costRemoved = sellQty * avgCost;
      pos.realized += proceeds - costRemoved;
      pos.shares -= sellQty;
      pos.cost -= costRemoved;

      // Shadow VTI: release the same fraction of the shadow's shares as
      // the user released of their actual position (proportion of shares sold).
      const fraction = sellQty / (sellQty + pos.shares); // = sellQty / shares_before
      const vtiSharesReleased = shadow.shares * fraction;
      const vtiCostReleased = shadow.cost * fraction;
      const vtiProceeds = vtiSharesReleased * vtiClose;
      shadow.realized += vtiProceeds - vtiCostReleased;
      shadow.shares -= vtiSharesReleased;
      shadow.cost -= vtiCostReleased;

      // Portfolio-wide VTI sleeve: same proportional release
      // Use proceeds-equivalent dollars to reduce sleeve.
      const portfolioFraction =
        portfolioVtiCost > 0 ? dollars / (pos.cost + costRemoved + dollars) : 0;
      // Simpler: track sleeve mirroring per-symbol shadow aggregate at end.
      portfolioVtiShares -= vtiSharesReleased;
      portfolioVtiCost -= vtiCostReleased;
    }
  }

  // Today value
  const vtiLatest = vti.latest.adjclose;

  // Per-symbol breakdown
  const breakdown = [];
  let totalNetInvested = 0;
  let totalCurrentValue = 0;
  let totalRealized = 0;
  let totalVtiCurrentValue = 0;
  let totalVtiRealized = 0;
  let totalVtiCost = 0;

  for (const sym of symbols) {
    if (sym === 'VTI') continue;
    if (!positions.has(sym)) continue;
    const pos = positions.get(sym);
    const shadow = vtiShadow.get(sym) || { shares: 0, cost: 0, realized: 0 };
    const hist = histMap.get(sym);
    const latest = hist?.latest?.adjclose ?? 0;
    const positionValue = pos.shares * latest;
    const totalReturn = pos.realized + (positionValue - pos.cost);
    const netInvested = pos.cost; // dollars currently at risk
    // For the original-investment-relative return, use total dollars invested
    // (cost + realized cost-basis already withdrawn) as denominator.
    const grossInvested =
      pos.cost + (pos.realized != null ? Math.max(0, 0) : 0); // pos.cost already reduced by sells; we reconstruct gross via shadow.cost which mirrors.
    // Use shadow.cost + shadow.realizedCostRemoved as the "base" — but shadow.cost
    // also already had cost removed on sell. Instead compute from the original transactions.
    // Simpler: reconstruct gross invested = sum of buy dollars - sum of sell dollars (net).
    // We'll recompute below with a clean pass for accuracy.

    const symTxns = usable.filter((t) => t.symbol === sym);
    let grossBuy = 0;
    let grossSell = 0;
    for (const t of symTxns) {
      if (t.action === 'buy') grossBuy += t.quantity * t.price;
      else grossSell += t.quantity * t.price;
    }

    const yourReturnPct =
      grossBuy > 0 ? (positionValue + grossSell - grossBuy) / grossBuy : 0;

    const vtiPositionValue = shadow.shares * vtiLatest;
    // VTI replay return: dollars in = grossBuy; dollars out = realized proceeds + final value
    // But shadow.realized already captures proceeds-cost diff, and shadow.cost = remaining cost.
    // Cleaner: compute gross VTI buys / sells by replaying.
    let vtiBuyDollars = 0;
    let vtiSellDollars = 0;
    let vtiSharesRunning = 0;
    let vtiCostRunning = 0;
    let symPosShares = 0;
    let symPosCost = 0;
    for (const t of symTxns) {
      const vp = priceOnOrAfter(vti, t.date);
      if (!vp) continue;
      const c = vp.adjclose;
      const dollars = t.quantity * t.price;
      if (t.action === 'buy') {
        const vshares = dollars / c;
        vtiSharesRunning += vshares;
        vtiCostRunning += dollars;
        vtiBuyDollars += dollars;
        symPosShares += t.quantity;
        symPosCost += dollars;
      } else {
        const sellQty = Math.min(t.quantity, symPosShares);
        if (sellQty <= 0) continue;
        const fraction = sellQty / symPosShares;
        const vSharesReleased = vtiSharesRunning * fraction;
        const vCostReleased = vtiCostRunning * fraction;
        const vProceeds = vSharesReleased * c;
        vtiSellDollars += vProceeds;
        vtiSharesRunning -= vSharesReleased;
        vtiCostRunning -= vCostReleased;
        symPosCost -= (symPosCost / symPosShares) * sellQty;
        symPosShares -= sellQty;
      }
    }
    const vtiFinalValue = vtiSharesRunning * vtiLatest;
    const vtiReturnPct =
      vtiBuyDollars > 0
        ? (vtiFinalValue + vtiSellDollars - vtiBuyDollars) / vtiBuyDollars
        : 0;

    breakdown.push({
      symbol: sym,
      grossBuy,
      grossSell,
      remainingShares: pos.shares,
      latestPrice: latest,
      positionValue,
      yourReturnPct,
      yourReturnDollars: positionValue + grossSell - grossBuy,
      vtiPositionValue: vtiFinalValue,
      vtiReturnPct,
      vtiReturnDollars: vtiFinalValue + vtiSellDollars - vtiBuyDollars,
      alphaPct: yourReturnPct - vtiReturnPct,
      alphaDollars:
        positionValue + grossSell - grossBuy - (vtiFinalValue + vtiSellDollars - vtiBuyDollars),
    });

    totalNetInvested += grossBuy - grossSell;
    totalCurrentValue += positionValue;
    totalRealized += grossSell;
    totalVtiCurrentValue += vtiFinalValue;
    totalVtiRealized += vtiSellDollars;
    totalVtiCost += vtiBuyDollars;
  }

  const totalGrossBuy = breakdown.reduce((s, b) => s + b.grossBuy, 0);
  const totalGrossSell = breakdown.reduce((s, b) => s + b.grossSell, 0);
  const portfolioReturnDollars =
    totalCurrentValue + totalGrossSell - totalGrossBuy;
  const vtiReturnDollars = totalVtiCurrentValue + totalVtiRealized - totalVtiCost;
  const portfolioReturnPct = totalGrossBuy > 0 ? portfolioReturnDollars / totalGrossBuy : 0;
  const vtiReturnPct = totalVtiCost > 0 ? vtiReturnDollars / totalVtiCost : 0;

  // --- Time series for chart ---
  // For each trading day from first txn to today, compute portfolio mark-to-market and
  // VTI replay value. We use VTI's trading calendar as the master date axis.
  const firstDate = usable[0].date;
  const dateAxis = vti.prices.filter((p) => p.date >= firstDate).map((p) => p.date);

  // Build per-day price lookups: for each symbol, map date -> adjclose
  // For days where the symbol has no record (early before listing), value = 0.
  const series = {
    dates: dateAxis,
    portfolio: [],
    vti: [],
  };

  // Pre-build sym histories for fast access
  const symHist = new Map();
  for (const sym of symbols) {
    const h = histMap.get(sym);
    if (h) symHist.set(sym, h);
  }

  // Replay txns day by day, tracking per-symbol shares + VTI sleeve
  const liveShares = new Map(); // symbol -> shares
  let vtiSleeveShares = 0;
  // index pointer into txns
  let ti = 0;
  // For perf we walk dateAxis once
  for (const d of dateAxis) {
    // Apply all txns whose date <= d (and not yet applied)
    while (ti < usable.length && usable[ti].date <= d) {
      const t = usable[ti++];
      const vp = priceOnOrAfter(vti, t.date);
      if (!vp) continue;
      const cur = liveShares.get(t.symbol) || 0;
      if (t.action === 'buy') {
        liveShares.set(t.symbol, cur + t.quantity);
        vtiSleeveShares += (t.quantity * t.price) / vp.adjclose;
      } else {
        const sellQty = Math.min(t.quantity, cur);
        if (sellQty > 0) {
          const fraction = sellQty / cur;
          // Release the same fraction of the VTI sleeve attributed to this symbol.
          // For simplicity in the time-series view, scale total VTI sleeve by the
          // proportional dollars (sellQty * t.price) over the *gross buys* of that
          // symbol up to this point. To keep the chart simple and intuitive, we
          // release VTI sleeve dollars equal to the sale proceeds (i.e. simulate
          // taking the same dollars out of the VTI sleeve too).
          const proceedsDollars = sellQty * t.price;
          const vtiSharesOut = proceedsDollars / vp.adjclose;
          vtiSleeveShares = Math.max(0, vtiSleeveShares - vtiSharesOut);
          liveShares.set(t.symbol, cur - sellQty);
        }
      }
    }
    // Mark to market
    let val = 0;
    for (const [sym, shares] of liveShares) {
      if (shares <= 0) continue;
      const h = symHist.get(sym);
      if (!h) continue;
      const p = priceOnOrBefore(h, d);
      if (p) val += shares * p.adjclose;
    }
    const vp = priceOnOrBefore(vti, d);
    const vtiVal = vp ? vtiSleeveShares * vp.adjclose : 0;
    series.portfolio.push(val);
    series.vti.push(vtiVal);
  }

  state.results = {
    totalGrossBuy,
    totalGrossSell,
    totalCurrentValue,
    totalVtiCurrentValue,
    totalVtiCost,
    totalVtiRealized,
    portfolioReturnDollars,
    portfolioReturnPct,
    vtiReturnDollars,
    vtiReturnPct,
    breakdown,
    series,
    skipped,
    failed,
    asOf: vti.latest.date,
  };

  renderResults();
  setStatus('');
  $('#run-analysis').disabled = false;
}

// --------------------------- RESULTS RENDER ---------------------------
function renderResults() {
  const r = state.results;
  $('#results').hidden = false;
  // KPIs
  $('#kpi-portfolio').textContent = fmtMoney(r.totalCurrentValue);
  $('#kpi-portfolio-sub').textContent = `${fmtMoney(
    r.totalGrossBuy
  )} invested · ${fmtMoney(r.totalGrossSell)} realized`;

  $('#kpi-vti').textContent = fmtMoney(r.totalVtiCurrentValue);
  $('#kpi-vti-sub').textContent = `same ${fmtMoney(r.totalVtiCost)} replayed into VTI`;

  const alpha = r.portfolioReturnDollars - r.vtiReturnDollars;
  const alphaPct = r.portfolioReturnPct - r.vtiReturnPct;
  const alphaEl = $('#kpi-alpha');
  alphaEl.textContent = `${fmtMoney(alpha, { signed: true })}  ·  ${fmtPct(
    alphaPct,
    { signed: true }
  )}`;
  alphaEl.classList.toggle('value-positive', alpha > 0);
  alphaEl.classList.toggle('value-negative', alpha < 0);
  $('#kpi-alpha-sub').textContent =
    alpha > 0
      ? `you beat the market — as of ${r.asOf}`
      : alpha < 0
      ? `the market beat you — as of ${r.asOf}`
      : `flat — as of ${r.asOf}`;

  // Breakdown table
  const tbody = $('#breakdown-tbody');
  const sorted = [...r.breakdown].sort(
    (a, b) => Math.abs(b.alphaDollars) - Math.abs(a.alphaDollars)
  );
  tbody.innerHTML = sorted
    .map((b) => {
      const yourCls =
        b.yourReturnDollars > 0
          ? 'value-positive'
          : b.yourReturnDollars < 0
          ? 'value-negative'
          : '';
      const vtiCls =
        b.vtiReturnDollars > 0
          ? 'value-positive'
          : b.vtiReturnDollars < 0
          ? 'value-negative'
          : '';
      const aCls =
        b.alphaDollars > 0
          ? 'value-positive'
          : b.alphaDollars < 0
          ? 'value-negative'
          : '';
      return `
        <tr>
          <td class="mono"><strong>${b.symbol}</strong></td>
          <td class="num">${fmtMoney(b.grossBuy - b.grossSell)}</td>
          <td class="num">${fmtMoney(b.positionValue)}</td>
          <td class="num ${yourCls}">${fmtMoney(b.yourReturnDollars, {
        signed: true,
      })}<br><span style="font-size:.8em">${fmtPct(b.yourReturnPct, {
        signed: true,
      })}</span></td>
          <td class="num ${vtiCls}">${fmtMoney(b.vtiReturnDollars, {
        signed: true,
      })}<br><span style="font-size:.8em">${fmtPct(b.vtiReturnPct, {
        signed: true,
      })}</span></td>
          <td class="num ${aCls}">${fmtMoney(b.alphaDollars, {
        signed: true,
      })}<br><span style="font-size:.8em">${fmtPct(
        b.yourReturnPct - b.vtiReturnPct,
        { signed: true }
      )}</span></td>
        </tr>`;
    })
    .join('');

  // Skipped rows notice
  if (r.failed && r.failed.length) {
    const list = r.failed
      .map((f) => `<strong>${f.symbol}</strong> (${f.error})`)
      .join(', ');
    setStatus(`Note: skipped ${list}`, false);
  }

  drawChart(r.series);
  $('#results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function drawChart(series) {
  if (state.chart) state.chart.destroy();
  const ctx = $('#chart').getContext('2d');

  // Build gradient for portfolio line
  const css = getComputedStyle(document.body);
  const accent = css.getPropertyValue('--accent').trim() || '#00d4aa';
  const muted = css.getPropertyValue('--text-muted').trim() || '#8b949e';

  // Sample down for performance: keep ~250 points max
  const total = series.dates.length;
  const stride = Math.max(1, Math.floor(total / 250));
  const xs = [];
  const ys = [];
  const vtis = [];
  for (let i = 0; i < total; i += stride) {
    xs.push(series.dates[i]);
    ys.push(series.portfolio[i]);
    vtis.push(series.vti[i]);
  }
  // Always include last point
  if (xs[xs.length - 1] !== series.dates[total - 1]) {
    xs.push(series.dates[total - 1]);
    ys.push(series.portfolio[total - 1]);
    vtis.push(series.vti[total - 1]);
  }

  state.chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: xs,
      datasets: [
        {
          label: 'Your portfolio',
          data: ys,
          borderColor: accent,
          backgroundColor: hexA(accent, 0.12),
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.25,
          fill: true,
        },
        {
          label: 'If you bought VTI',
          data: vtis,
          borderColor: muted,
          borderDash: [6, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.25,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          labels: {
            color: '#8b949e',
            font: { family: "'Satoshi', 'Inter', sans-serif", size: 12 },
            boxWidth: 12,
          },
        },
        tooltip: {
          backgroundColor: '#161b22',
          borderColor: '#30363d',
          borderWidth: 1,
          titleColor: '#e6edf3',
          bodyColor: '#e6edf3',
          padding: 12,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${fmtMoney(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: '#6e7681',
            font: { family: "'JetBrains Mono', monospace", size: 11 },
            maxTicksLimit: 8,
          },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        y: {
          ticks: {
            color: '#8b949e',
            font: { family: "'JetBrains Mono', monospace", size: 11 },
            callback: (v) =>
              '$' +
              Number(v).toLocaleString('en-US', {
                maximumFractionDigits: 0,
              }),
          },
          grid: { color: 'rgba(255,255,255,0.06)' },
        },
      },
    },
  });
}

function hexA(hex, alpha) {
  // Accept #rrggbb or rgb()
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (m) {
    const r = parseInt(m[1].slice(0, 2), 16);
    const g = parseInt(m[1].slice(2, 4), 16);
    const b = parseInt(m[1].slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return hex;
}

// --------------------------- DOWNLOAD RESULTS ---------------------------
function downloadResults() {
  if (!state.results) return;
  const r = state.results;
  const lines = [
    'symbol,gross_buy,gross_sell,position_value,your_return_dollars,your_return_pct,vti_return_dollars,vti_return_pct,alpha_dollars,alpha_pct',
  ];
  for (const b of r.breakdown) {
    lines.push(
      [
        b.symbol,
        b.grossBuy.toFixed(2),
        b.grossSell.toFixed(2),
        b.positionValue.toFixed(2),
        b.yourReturnDollars.toFixed(2),
        (b.yourReturnPct * 100).toFixed(4) + '%',
        b.vtiReturnDollars.toFixed(2),
        (b.vtiReturnPct * 100).toFixed(4) + '%',
        b.alphaDollars.toFixed(2),
        ((b.yourReturnPct - b.vtiReturnPct) * 100).toFixed(4) + '%',
      ].join(',')
    );
  }
  lines.push('');
  lines.push(
    `TOTAL,${r.totalGrossBuy.toFixed(2)},${r.totalGrossSell.toFixed(
      2
    )},${r.totalCurrentValue.toFixed(2)},${r.portfolioReturnDollars.toFixed(
      2
    )},${(r.portfolioReturnPct * 100).toFixed(
      4
    )}%,${r.vtiReturnDollars.toFixed(2)},${(r.vtiReturnPct * 100).toFixed(
      4
    )}%,${(r.portfolioReturnDollars - r.vtiReturnDollars).toFixed(2)},${(
      (r.portfolioReturnPct - r.vtiReturnPct) *
      100
    ).toFixed(4)}%`
  );
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vti-vs-portfolio-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 100);
}

// --------------------------- SAMPLE DATA ---------------------------
// All prices are split-adjusted closes on the buy/sell date.

// Sample 1 — Big Tech 2022–2024 (the original "how does this work" demo).
const SAMPLE_BIGTECH = [
  { date: '2022-03-15', symbol: 'AAPL',  action: 'buy',  quantity: 25, price: 155.09 },
  { date: '2022-06-10', symbol: 'MSFT',  action: 'buy',  quantity: 15, price: 252.99 },
  { date: '2022-09-22', symbol: 'NVDA',  action: 'buy',  quantity: 30, price: 132.65 },
  { date: '2023-01-05', symbol: 'TSLA',  action: 'buy',  quantity: 20, price: 110.34 },
  { date: '2023-05-18', symbol: 'AMZN',  action: 'buy',  quantity: 18, price: 116.25 },
  { date: '2023-11-30', symbol: 'GOOGL', action: 'buy',  quantity: 22, price: 133.32 },
  { date: '2024-04-12', symbol: 'TSLA',  action: 'sell', quantity: 10, price: 171.05 },
  { date: '2024-08-20', symbol: 'NVDA',  action: 'sell', quantity: 15, price: 124.58 },
];

// Sample 2 — Diversified blue-chips bought across 2016–2023.
// (Nasdaq's free historical feed only goes back ~10 years, so we cap at 2016.)
const SAMPLE_DIVERSIFIED = [
  { date: '2016-08-15', symbol: 'JNJ',  action: 'buy', quantity: 40, price: 122.31 },
  { date: '2017-03-20', symbol: 'KO',   action: 'buy', quantity: 100, price: 42.18 },
  { date: '2018-09-04', symbol: 'DIS',  action: 'buy', quantity: 35, price: 110.85 },
  { date: '2019-11-12', symbol: 'JPM',  action: 'buy', quantity: 25, price: 129.16 },
  { date: '2020-06-22', symbol: 'HD',   action: 'buy', quantity: 12, price: 249.16 },
  { date: '2021-10-25', symbol: 'COST', action: 'buy', quantity: 8,  price: 490.10 },
  { date: '2023-04-10', symbol: 'CAT',  action: 'buy', quantity: 15, price: 215.53 },
];

// Sample 3 — Meme stocks bought on or near their viral moments, 2020–2024.
const SAMPLE_MEMES = [
  { date: '2020-10-01', symbol: 'PLTR', action: 'buy', quantity: 200, price: 9.46 },
  { date: '2021-01-27', symbol: 'GME',  action: 'buy', quantity: 30,  price: 86.88 },
  { date: '2021-01-27', symbol: 'BB',   action: 'buy', quantity: 80,  price: 25.10 },
  { date: '2021-06-02', symbol: 'AMC',  action: 'buy', quantity: 8,   price: 393.28 },
  { date: '2021-08-04', symbol: 'HOOD', action: 'buy', quantity: 25,  price: 70.39 },
];

const SAMPLE_PORTFOLIOS = {
  bigtech: SAMPLE_BIGTECH,
  diversified: SAMPLE_DIVERSIFIED,
  memes: SAMPLE_MEMES,
};

function loadSample(key = 'bigtech') {
  const data = SAMPLE_PORTFOLIOS[key];
  if (!data) return;
  clearAll();
  const txns = data.map((t) => ({ ...t, id: nextTxnId++ }));
  appendTransactions(txns);
}

// --------------------------- WIRING ---------------------------
function setupTabs() {
  $$('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.tab').forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      const target = tab.dataset.tab;
      $$('.tab-panel').forEach((p) => {
        p.classList.toggle('active', p.dataset.panel === target);
      });
    });
  });
}

function setupDropzone() {
  const dz = $('#dropzone');
  const input = $('#file-input');
  dz.addEventListener('click', () => input.click());
  dz.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      input.click();
    }
  });
  dz.tabIndex = 0;
  dz.setAttribute('role', 'button');
  ['dragover', 'dragenter'].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.add('dragging');
    })
  );
  ['dragleave', 'drop'].forEach((ev) =>
    dz.addEventListener(ev, (e) => {
      e.preventDefault();
      dz.classList.remove('dragging');
    })
  );
  dz.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFile(file);
    input.value = ''; // allow re-uploading same file
  });
}

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target.result;
      const { headers, rows } = parseCsvText(text);
      if (!headers.length || !rows.length) {
        setStatus('That file looks empty. Try a different CSV.', true);
        return;
      }
      const result = tryAutoConvert(headers, rows);
      if (result.ok && result.txns.length) {
        appendTransactions(result.txns);
        const skipped = result.total - result.txns.length;
        setStatus(
          `Loaded ${result.txns.length} transaction${
            result.txns.length === 1 ? '' : 's'
          }${skipped ? ` (skipped ${skipped} non-trade rows)` : ''}.`
        );
      } else {
        setStatus(
          'Couldn\'t auto-detect the columns — pick them manually below.',
          true
        );
        showMapper(headers, rows);
      }
    } catch (err) {
      console.error(err);
      setStatus('Could not parse that CSV: ' + err.message, true);
    }
  };
  reader.onerror = () => setStatus('Could not read file.', true);
  reader.readAsText(file);
}

function setupManualForm() {
  const form = $('#manual-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const txn = {
      id: nextTxnId++,
      date: data.get('date'),
      symbol: data.get('symbol').toString().trim().toUpperCase(),
      action: data.get('action'),
      quantity: parseFloat(data.get('quantity')),
      price: parseFloat(data.get('price')),
    };
    if (!txn.symbol || !txn.date || !(txn.quantity > 0) || !(txn.price > 0)) {
      setStatus('Please fill all fields with positive values.', true);
      return;
    }
    appendTransactions([txn]);
    setStatus(`Added ${txn.action.toUpperCase()} ${txn.quantity} ${txn.symbol}.`);
    form.reset();
  });
}

function setupMisc() {
  // Wire up each sample-portfolio button (data-sample attr selects which set).
  $$('.sample-card .btn').forEach((btn) => {
    btn.addEventListener('click', () => loadSample(btn.dataset.sample));
  });
  $('#clear-all').addEventListener('click', clearAll);
  $('#reset-all').addEventListener('click', clearAll);
  $('#apply-mapping').addEventListener('click', applyMapping);
  $('#run-analysis').addEventListener('click', runAnalysis);
  $('#download-results').addEventListener('click', downloadResults);

  // Event delegation for txn row remove buttons
  $('#txn-tbody').addEventListener('click', (e) => {
    const id = e.target.closest('[data-remove]')?.dataset.remove;
    if (id) removeTxn(parseInt(id, 10));
  });
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  setupTabs();
  setupDropzone();
  setupManualForm();
  setupMisc();
});
