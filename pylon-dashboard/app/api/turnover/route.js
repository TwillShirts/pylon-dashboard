import { NextResponse } from 'next/server';
import { getTurnoverForPeriod, PERIOD_DEFS } from '../../../lib/pylon';

// Always run this on the server per request (never statically cached) -
// lib/pylon.js does its own short-lived caching in front of the real API.
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const requested = searchParams.get('period');
  const period = PERIOD_DEFS[requested] ? requested : 'today';

  try {
    const data = await getTurnoverForPeriod(period);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
