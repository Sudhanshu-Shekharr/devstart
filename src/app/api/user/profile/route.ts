import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { ratelimit } from '@/lib/ratelimit';

// ─── Validation schema ────────────────────────────────────────────────────────

const patchSchema = z.object({
  domains: z.array(z.string().trim().min(1)).default([]),
  skills: z.array(z.string().trim().min(1)).default([]),
  locationPref: z.string().trim().optional(),
});

// ─── GET /api/user/profile ────────────────────────────────────────────────────
// Returns the current session user's profile fields for form pre-fill.
// userId is always derived from the server session — never from the request.

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';
  const { success } = await ratelimit.limit(`api:${ip}`);
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        domains: true,
        skills: true,
        locationPref: true,
        experienceLevel: true,
        missingKeywords: true,
        resumeText: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      profile: {
        domains: user.domains,
        skills: user.skills,
        locationPref: user.locationPref,
        experienceLevel: user.experienceLevel,
        missingKeywords: user.missingKeywords,
        hasResume: !!user.resumeText,
      },
    });
  } catch (error) {
    console.error('[GET /api/user/profile] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PATCH /api/user/profile ──────────────────────────────────────────────────
// Updates the current session user's profile.
// userId is derived from getServerSession — never from the request body.

export async function PATCH(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';
  const { success } = await ratelimit.limit(`api:${ip}`);
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { domains, skills, locationPref } = parsed.data;

  try {
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        domains,
        skills,
        // Allow explicit clear (empty string) as well as omitted (keep existing)
        ...(locationPref !== undefined ? { locationPref } : {}),
      },
      select: {
        domains: true,
        skills: true,
        locationPref: true,
      },
    });

    return NextResponse.json({ profile: updated });
  } catch (error) {
    console.error('[PATCH /api/user/profile] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
