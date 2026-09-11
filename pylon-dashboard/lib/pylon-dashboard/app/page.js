'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const REFRESH_MS = 5 * 60 * 1000; // 5 minutes
const SERIES_COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];

const PERIODS = [
  { key: 'today', label: 'Σήμερα' },
  { key: 'week', label: '1 Εβδ.' },
  { key: 'month', label: '1 Μήνας' },
  { key: 'sixmonths', label: '6 Μήνες' },
  { key: 'ytd', label: 'YTD' },
  { key: 'year', label: 'Έτος' },
];

const currency = new Intl.NumberFormat('el-GR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export default function Page() {
  const [period, setPeriod] = useState('today');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState(null);
  const timerRef = useRef(null);

  const load = useCallback(async (p) => {
    try {
      const res = await fetch(`/api/turnover?period=${encodeURIComponent(p)}`, { cache: 'no-store' });
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
    setLoading(true);
    load(period);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => load(period), REFRESH_MS);
    return () => clearInterval(timerRef.current);
  }, [period, load]);

  const total = data?.stores?.reduce((sum, s) => sum + s.total, 0) ?? null;

  return (
    <main className="page">
      <div className="header">
        <h1>Τζίρος καταστημάτων</h1>
        <div className="subtitle">3 καταστήματα · ανανέωση κάθε 5 λεπτά</div>
      </div>

      <div className="period-selector">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            className={'period-pill' + (period === p.key ? ' active' : '')}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {data?.source === 'mock' && (
        <div className="banner">
          Demo δεδομένα (χωρίς σύνδεση στο PYLON ακόμα) — ρύθμισε τα
          PYLON_MOCK / PYLON_BASE_URL κ.λπ. στα environment variables όταν
          έχεις τα credentials από την Epsilon Digital.
        </div>
      )}

      {error && <div className="banner error">Σφάλμα φόρτωσης: {error}</div>}

      <div className="hero">
        <div className="label">Σύνολο · {data?.periodLabel || '...'}</div>
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
        <button className="refresh-btn" onClick={() => load(period)}>
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
      <BucketChart buckets={store.buckets} color={color} />
    </div>
  );
}

function compactNumber(v) {
  if (v >= 1000) {
    const k = v / 1000;
    return (k >= 10 ? k.toFixed(0) : k.toFixed(1)) + 'K€';
  }
  return `${v}€`;
}

function BucketChart({ buckets, color }) {
  const w = 300;
  const h = 110;

  if (!buckets || buckets.length === 0) {
    return <svg className="bucket-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" />;
  }

  const max = Math.max(...buckets.map((b) => b.value), 1);
  const baseline = h - 22;
  const maxBarHeight = baseline - 18;
  const slot = w / buckets.length;
  const barWidth = Math.max(4, Math.min(24, slot * 0.55));

  return (
    <svg className="bucket-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet">
      {buckets.map((b, i) => {
        const barHeight = Math.max(2, (b.value / max) * maxBarHeight);
        const x = i * slot + (slot - barWidth) / 2;
        const y = baseline - barHeight;
        const isLast = i === buckets.length - 1;
        return (
          <g key={`${b.label}-${i}`}>
            <rect x={x} y={y} width={barWidth} height={barHeight} rx={3} fill={color} opacity={b.partial ? 0.5 : 1} />
            {isLast && (
              <text x={x + barWidth / 2} y={Math.max(10, y - 6)} textAnchor="middle" className="bar-value">
                {compactNumber(b.value)}
              </text>
            )}
            <text x={x + barWidth / 2} y={baseline + 14} textAnchor="middle" className="bar-label">
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
