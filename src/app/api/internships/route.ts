import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ratelimit } from '@/lib/ratelimit';
import { scoreMatch, hasProfile } from '@/lib/scoreMatch';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

// ─── Query param schema ───────────────────────────────────────────────────────
const querySchema = z.object({
  domain: z.string().trim().optional(),
  location: z.string().trim().optional(),
  q: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

// ─── Route handler ────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  // 1. Rate-limit by IP ──────────────────────────────────────────────────────
  // x-forwarded-for is set by Vercel/proxies; fall back to a fixed string in
  // pure localhost dev so the limiter still works.
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    '127.0.0.1';

  const { success, reset, remaining } = await ratelimit.limit(ip);

  if (!success) {
    // RFC 6585 §4 — return Retry-After in seconds
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    return NextResponse.json(
      {
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${retryAfter}s.`,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(reset),
        },
      },
    );
  }

  // 2. Parse & validate query params ─────────────────────────────────────────
  const rawParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(rawParams);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { domain, location, q, page, limit } = parsed.data;
  const skip = (page - 1) * limit;

  // 3. Build Prisma `where` clause ───────────────────────────────────────────
  const where: Prisma.InternshipWhereInput = {
    ...(domain
      ? {
          domain: {
            // Postgres array contains operator via Prisma
            has: domain,
          },
        }
      : {}),

    ...(location
      ? {
          location: {
            contains: location,
            mode: 'insensitive' as const,
          },
        }
      : {}),

    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' as const } },
            { company: { contains: q, mode: 'insensitive' as const } },
            { description: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  // 4. Fetch session in parallel with the DB query ──────────────────────────
  // getServerSession is cheap (reads JWT from cookie, no network call), so
  // we run it alongside the DB query to avoid adding latency on the hot path.
  const [sessionResult, internships, total] = await Promise.all([
    getServerSession(authOptions),
    prisma.internship.findMany({
      where,
      select: {
        id: true,
        title: true,
        company: true,
        domain: true,
        skills: true,
        location: true,
        stipend: true,
        applyUrl: true,
        source: true,
        postedAt: true,
        deadline: true,
        description: true,
      },
      orderBy: { postedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.internship.count({ where }),
  ]);

  // 5. Personalization — score & sort if authenticated + profile exists ───────
  // Falls back to existing postedAt-desc order if:
  //   • no session (anonymous browse), OR
  //   • session exists but all profile fields are empty (just signed up)
  let rankedInternships = internships;
  let isPersonalized = false;

  if (sessionResult?.user?.id) {
    // Fetch profile lazily only when we have a session, keeping the unauthenticated
    // path at zero extra DB calls.
    const userProfile = await prisma.user.findUnique({
      where: { id: sessionResult.user.id },
      select: { domains: true, skills: true, locationPref: true },
    });

    if (userProfile && hasProfile(userProfile)) {
      // Score each internship on the already-paginated slice, then sort desc.
      // v1: per-page scoring (global ranking deferred to pgvector phase).
      rankedInternships = [...internships].sort(
        (a, b) => scoreMatch(userProfile, b) - scoreMatch(userProfile, a),
      );
      isPersonalized = true;
    }
  }

  const totalPages = Math.ceil(total / limit);

  return NextResponse.json(
    {
      internships: rankedInternships,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    },
    {
      status: 200,
      headers: {
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(reset),
        // Personalized results must not be shared across users by a CDN.
        // Anonymous results keep the short public cache for efficiency.
        'Cache-Control': isPersonalized
          ? 'private, no-store'
          : 'public, max-age=30, stale-while-revalidate=60',
      },
    },
  );
}
