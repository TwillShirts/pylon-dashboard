'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const REFRESH_MS = 5 * 60 * 1000; // 5 minutes
const SERIES_COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];

const currency = new Intl.NumberFormat('el-GR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export default function Page() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState(null);
  const timerRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/turnover', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json);
      setError(null);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
      setLastFetched(new Date());
    }
  }, []);

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, REFRESH_MS);
    return () => clearInterval(timerRef.current);
  }, [load]);

  const total = data?.stores?.reduce((sum, s) => sum + s.total, 0) ?? null;

  return (
    <main className="page">
      <div className="header">
        <h1>Ημερήσιος τζίρος</h1>
        <div className="subtitle">3 καταστήματα · ανανέωση κάθε 5 λεπτά</div>
      </div>

      {data?.source === 'mock' && (
        <div className="banner">
          Demo δεδομένα (χωρίς σύνδεση στο PYLON ακόμα) — ρύθμισε τα
          PYLON_MOCK / PYLON_BASE_URL κ.λπ. στα environment variables όταν
          έχεις τα credentials από την Epsilon Digital.
        </div>
      )}

      {error && (
        <div className="banner error">Σφάλμα φόρτωσης: {error}</div>
      )}

      <div className="hero">
        <div className="label">Σύνολο σήμερα</div>
        <div className="value">{total !== null ? currency.format(total) : loading ? '—' : '—'}</div>
      </div>

      <div className="tiles">
        {(data?.stores ?? []).map((store, i) => (
          <StoreTile key={store.store} store={store} color={SERIES_COLORS[i % SERIES_COLORS.length]} />
        ))}
        {!data && loading && <div className="banner">Φόρτωση δεδομένων…</div>}
      </div>

      <div className="footer">
        <span className="updated">
          {lastFetched ? `Ενημερώθηκε ${lastFetched.toLocaleTimeString('el-GR')}` : ''}
        </span>
        <button className="refresh-btn" onClick={load}>
          Ανανέωση
        </button>
      </div>
    </main>
  );
}

function StoreTile({ store, color }) {
  return (
    <div className="tile">
      <div className="top">
        <span className="name">
          <span className="dot" style={{ background: color }} />
          {store.store}
        </span>
      </div>
      <div className="value">{currency.format(store.total)}</div>
      <Sparkline points={store.hourly} color={color} />
    </div>
  );
}

function Sparkline({ points, color }) {
  if (!points || points.length < 2) {
    return <svg className="sparkline" viewBox="0 0 100 36" preserveAspectRatio="none" />;
  }
  const max = Math.max(...points, 1);
  const min = 0;
  const w = 100;
  const h = 32;
  const step = w / (points.length - 1);
  const coords = points.map((v, i) => {
    const x = i * step;
    const y = h - ((v - min) / (max - min || 1)) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = coords[coords.length - 1].split(',');

  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h + 4}`} preserveAspectRatio="none">
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last[0]} cy={last[1]} r="4" fill={color} stroke="var(--surface-1)" strokeWidth="2" />
    </svg>
  );
}
