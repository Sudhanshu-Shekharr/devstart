import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const schema = z.object({
  internshipId: z.string().min(1).max(100),
});

/**
 * POST /api/internships/log-click
 *
 * Fire-and-forget click analytics endpoint.
 * Records that a user opened an external apply link.
 * This is intentionally NOT a redirect — it logs on the same request
 * that rendered the page, not via a /redirect?url= hop (which would
 * turn the domain into an open-redirect phishing vector).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // TODO: persist to DB / analytics service when needed.
    // For now, log server-side only (visible in server logs / Vercel function logs).
    console.info('[click]', {
      internshipId: parsed.data.internshipId,
      ts: new Date().toISOString(),
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    // Non-fatal — analytics must never break navigation
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
