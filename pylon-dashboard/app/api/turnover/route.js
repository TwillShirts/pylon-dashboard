import { NextResponse } from 'next/server';
import { getDailyTurnover } from '../../../lib/pylon';

// Always run this on the server per request (never statically cached) -
// lib/pylon.js does its own short-lived caching in front of the real API.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getDailyTurnover();
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
