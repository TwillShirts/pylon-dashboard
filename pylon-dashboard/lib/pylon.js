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
// realistic generated data end to end. Flip it to false and fill in the
// env vars once support confirms the real auth flow and endpoint(s), and
// adjust realTurnover() below to match what they give you.

function parseStores() {
  // PYLON_STORES="Display name:pylon-store-id,Display name:pylon-store-id"
  const raw = process.env.PYLON_STORES || 'Κατάστημα 1:1,Κατάστημα 2:2,Κατάστημα 3:3';
  return raw.split(',').map((pair) => {
    const [name, id] = pair.split(':');
    return { name: (name || '').trim(), id: (id || name || '').trim() };
  });
}

const isMock = () => (process.env.PYLON_MOCK || 'true').toLowerCase() !== 'false';

// Simple in-memory cache per serverless instance, so several phones
// polling at once don't each trigger a fresh Pylon call. Good enough for
// 3 stores / one dashboard; swap for a shared cache (e.g. Vercel KV) if
// you scale this up to many concurrent viewers.
let cache = { at: 0, data: null };
const CACHE_MS = 60 * 1000; // 1 minute

export async function getDailyTurnover() {
  const now = Date.now();
  if (cache.data && now - cache.at < CACHE_MS) return cache.data;

  const data = isMock() ? await mockTurnover() : await realTurnover();
  cache = { at: now, data };
  return data;
}

async function realTurnover() {
  const stores = parseStores();
  const baseUrl = process.env.PYLON_BASE_URL;
  const clientId = process.env.PYLON_CLIENT_ID;
  const clientSecret = process.env.PYLON_CLIENT_SECRET;

  if (!baseUrl || !clientId || !clientSecret) {
    throw new Error(
      'Missing PYLON_BASE_URL / PYLON_CLIENT_ID / PYLON_CLIENT_SECRET env vars. ' +
        'Set PYLON_MOCK=true to run on demo data instead.'
    );
  }

  // 1) Token request - client-credentials is the common shape for an
  //    API-user + service-account setup like Pylon's, but CONFIRM the
  //    exact token endpoint and field names with support before relying
  //    on this in production.
  const tokenRes = await fetch(`${baseUrl}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!tokenRes.ok) {
    throw new Error(`Pylon auth failed: HTTP ${tokenRes.status}`);
  }
  const tokenJson = await tokenRes.json();
  const accessToken = tokenJson.access_token;

  // 2) Per-store daily turnover - REPLACE this path/response mapping with
  //    whatever endpoint support gives you (e.g. a turnover-by-store or
  //    sales-by-day report). Keep the return shape { store, total, hourly }
  //    so the frontend doesn't need to change.
  const results = await Promise.all(
    stores.map(async (store) => {
      const res = await fetch(`${baseUrl}/api/v1/stores/${store.id}/turnover/today`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        throw new Error(`Pylon turnover request failed for ${store.name}: HTTP ${res.status}`);
      }
      const json = await res.json();
      return {
        store: store.name,
        total: Number(json.turnover ?? json.total ?? 0),
        hourly: Array.isArray(json.hourly) ? json.hourly : [],
      };
    })
  );

  return { stores: results, generatedAt: new Date().toISOString(), source: 'pylon' };
}

async function mockTurnover() {
  const stores = parseStores();
  const now = new Date();
  const hourNow = now.getHours() + now.getMinutes() / 60;

  const data = stores.map((store, i) => {
    const pace = 700 + i * 300; // gives each store its own daily rhythm
    const hourly = [];
    let running = 0;
    for (let h = 0; h <= Math.floor(hourNow); h++) {
      const openFactor = h >= 9 && h <= 21 ? 1 : 0.1;
      running += pace * openFactor * (0.55 + 0.85 * pseudoRandom(i, h));
      hourly.push(Math.round(running));
    }
    return { store: store.name, total: Math.round(running), hourly };
  });

  return { stores: data, generatedAt: now.toISOString(), source: 'mock' };
}

// Deterministic pseudo-random in [0,1) so the mock data is stable within
// a render but still varies hour to hour / store to store.
function pseudoRandom(seedA, seedB) {
  const x = Math.sin(seedA * 12.9898 + seedB * 78.233) * 43758.5453;
  return x - Math.floor(x);
}
