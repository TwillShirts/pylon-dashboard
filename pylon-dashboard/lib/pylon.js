// lib/pylon.js
//
// Adapter around the PYLON Connectivity API (reached via Epsilon Digital).
//
// IMPORTANT: Epsilon Net does not publish the Connectivity API's exact
// endpoint paths / payload shape publicly - you get those from PYLON /
// Epsilon Digital support once your API User + service account exist
// (Epsilon Digital -> Subscription -> Actions -> Create API User ->
// Create service account - see README.md "Getting real Pylon access").
//
// Until then, PYLON_MOCK=true (the default) makes the dashboard run on
// realistic generated data end to end, for any of the supported periods
// (see PERIOD_DEFS below). Flip PYLON_MOCK to false and fill in the env
// vars once support confirms the real auth flow and endpoint(s), and
// implement realTurnoverForPeriod() below to match what they give you.

function parseStores() {
  // PYLON_STORES="Display name:pylon-store-id,Display name:pylon-store-id"
  const raw = process.env.PYLON_STORES || 'Κατάστημα 1:1,Κατάστημα 2:2,Κατάστημα 3:3';
  return raw.split(',').map((pair) => {
    const [name, id] = pair.split(':');
    return { name: (name || '').trim(), id: (id || name || '').trim() };
  });
}

const isMock = () => (process.env.PYLON_MOCK || 'true').toLowerCase() !== 'false';

export const PERIOD_DEFS = {
  today: { label: 'Σήμερα' },
  week: { label: '1 εβδομάδα' },
  month: { label: '1 μήνας' },
  sixmonths: { label: '6 μήνες' },
  ytd: { label: 'Από την αρχή του έτους' },
  year: { label: 'Τελευταίο έτος' },
};

// Get the current date/time in Europe/Athens regardless of the server's
// own clock - Vercel's serverless functions run in UTC, so without this
// "today" / "this hour" math would be off by 2-3 hours from real Greek
// wall-clock time (the bug a user of this dashboard flagged: numbers
// looked wrong for the time of day).
function athensNow() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Athens',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return {
    year: get('year'),
    month: get('month'), // 1-12
    day: get('day'),
    hour: get('hour') % 24, // Intl can return "24" for midnight
    minute: get('minute'),
  };
}

// Per-period, per-store cache. Keeps a handful of phones polling the same
// dashboard from hammering the real Pylon API; swap for a shared cache
// (e.g. Vercel KV) if this grows beyond one dashboard's worth of traffic.
const periodCache = new Map();
const CACHE_MS = 60 * 1000; // 1 minute

export async function getTurnoverForPeriod(periodKey) {
  const key = PERIOD_DEFS[periodKey] ? periodKey : 'today';
  const cached = periodCache.get(key);
  const now = Date.now();
  if (cached && now - cached.at < CACHE_MS) return cached.data;

  const data = isMock() ? await mockTurnoverForPeriod(key) : await realTurnoverForPeriod(key);
  periodCache.set(key, { at: now, data });
  return data;
}

async function realTurnoverForPeriod(periodKey) {
  const baseUrl = process.env.PYLON_BASE_URL;
  const clientId = process.env.PYLON_CLIENT_ID;
  const clientSecret = process.env.PYLON_CLIENT_SECRET;

  if (!baseUrl || !clientId || !clientSecret) {
    throw new Error(
      'Missing PYLON_BASE_URL / PYLON_CLIENT_ID / PYLON_CLIENT_SECRET env vars. ' +
        'Set PYLON_MOCK=true to run on demo data instead.'
    );
  }

  // TODO once PYLON / Epsilon Digital support confirms the real
  // endpoints: authenticate (see the old client-credentials sketch this
  // replaced, in git history) and map periodKey ('today' | 'week' |
  // 'month' | 'sixmonths' | 'ytd' | 'year') to whatever report(s) they
  // give you, returning the same shape mockTurnoverForPeriod() produces:
  // { period, periodLabel, stores: [{ store, total, buckets: [{label,
  // value, partial}] }], generatedAt, source: 'pylon' }.
  throw new Error(
    `Το PYLON report για περίοδο "${periodKey}" δεν έχει οριστεί ακόμα σε αυτόν τον κώδικα - ` +
      'πρόσθεσέ το σε realTurnoverForPeriod() στο lib/pylon.js μόλις σου το δώσει η υποστήριξη.'
  );
}

const WEEKDAY_SHORT = ['Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ', 'Κυρ'];
const MONTH_SHORT = [
  'Ιαν', 'Φεβ', 'Μάρ', 'Απρ', 'Μάι', 'Ιούν', 'Ιούλ', 'Αύγ', 'Σεπ', 'Οκτ', 'Νοέ', 'Δεκ',
];

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// Builds the list of buckets (one per bar in the chart) for a period,
// anchored to "now" in Athens time. Each bucket carries a `kind` (used to
// scale its mock value) and a `seed` (used to make that value stable
// rather than re-randomized on every request).
function buildBuckets(periodKey, athens) {
  const noonUTC = Date.UTC(athens.year, athens.month - 1, athens.day, 12);

  if (periodKey === 'today') {
    const startHour = 9;
    const endHour = Math.min(21, athens.hour);
    const out = [];
    for (let h = startHour; h <= endHour; h++) {
      const isCurrent = h === athens.hour;
      out.push({
        kind: 'hour',
        seed: h,
        label: `${h}:00`,
        partial: isCurrent,
        fraction: isCurrent ? Math.max(0.1, athens.minute / 60) : undefined,
      });
    }
    if (out.length === 0) {
      out.push({ kind: 'hour', seed: startHour, label: `${startHour}:00`, partial: true, fraction: 0.1 });
    }
    return out;
  }

  if (periodKey === 'week') {
    const out = [];
    for (let back = 6; back >= 0; back--) {
      const d = new Date(noonUTC - back * 86400000);
      const weekday = (d.getUTCDay() + 6) % 7; // 0 = Monday
      const isToday = back === 0;
      out.push({
        kind: 'day',
        seed: d.getUTCFullYear() * 400 + d.getUTCMonth() * 31 + d.getUTCDate(),
        label: WEEKDAY_SHORT[weekday],
        partial: isToday,
        fraction: isToday ? Math.max(0.1, (athens.hour + athens.minute / 60) / 21) : undefined,
      });
    }
    return out;
  }

  if (periodKey === 'month') {
    // 4 rolling 7-day buckets, most recent last.
    const out = [];
    for (let back = 3; back >= 0; back--) {
      const start = new Date(noonUTC - (back * 7 + 6) * 86400000);
      const isCurrent = back === 0;
      out.push({
        kind: 'week',
        seed: Math.floor(start.getTime() / (7 * 86400000)),
        label: `${start.getUTCDate()}/${start.getUTCMonth() + 1}`,
        partial: isCurrent,
        fraction: isCurrent ? Math.max(0.15, (athens.day % 7 || 7) / 7) : undefined,
      });
    }
    return out;
  }

  // Month-granularity periods.
  let monthsBack;
  if (periodKey === 'sixmonths') monthsBack = 5;
  else if (periodKey === 'year') monthsBack = 11;
  else monthsBack = athens.month - 1; // ytd

  const out = [];
  for (let back = monthsBack; back >= 0; back--) {
    let m = athens.month - back;
    let y = athens.year;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    const isCurrent = back === 0;
    out.push({
      kind: 'month',
      seed: y * 20 + m,
      label: MONTH_SHORT[m - 1],
      partial: isCurrent,
      fraction: isCurrent ? Math.max(0.1, athens.day / daysInMonth(y, m)) : undefined,
    });
  }
  return out;
}

// Deterministic pseudo-random in [0,1) so the mock data is stable across
// requests (same bucket => same value) instead of jumping around on
// every refresh.
function pseudoRandom(seedA, seedB) {
  const x = Math.sin(seedA * 12.9898 + seedB * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function seededValue(storeIndex, seed, base) {
  const variance = 0.6 + 0.8 * pseudoRandom(storeIndex, seed);
  return Math.round(base * variance);
}

async function mockTurnoverForPeriod(periodKey) {
  const stores = parseStores();
  const athens = athensNow();
  const buckets = buildBuckets(periodKey, athens);

  const data = stores.map((store, i) => {
    const dailyPace = 700 + i * 300; // each store has its own typical full-day pace
    const series = buckets.map((b) => {
      let base;
      if (b.kind === 'hour') base = dailyPace / 13; // ~13 open hours/day
      else if (b.kind === 'day') base = dailyPace;
      else if (b.kind === 'week') base = dailyPace * 7;
      else base = dailyPace * 30; // month

      let value = seededValue(i, b.seed, base);
      if (b.partial && b.fraction != null) value = Math.round(value * b.fraction);
      return { label: b.label, value, partial: !!b.partial };
    });
    const total = series.reduce((sum, x) => sum + x.value, 0);
    return { store: store.name, total, buckets: series };
  });

  return {
    period: periodKey,
    periodLabel: PERIOD_DEFS[periodKey]?.label || periodKey,
    stores: data,
    generatedAt: new Date().toISOString(),
    source: 'mock',
  };
}
