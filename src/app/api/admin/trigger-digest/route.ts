/**
 * POST /api/admin/trigger-digest
 *
 * Gated debug endpoint to manually trigger a notification digest send for
 * testing without waiting for the 6-hour ingestion cron.
 *
 * Auth: session.user.id (server-derived) + ADMIN_EMAIL env var check.
 * Rate-limited: 3 requests / 60 s per IP (Upstash).
 *
 * Body: { internshipIds?: string[] }
 *   - If `internshipIds` is provided, runs the digest for those specific rows.
 *   - If omitted, falls back to the most recently inserted 10 internships.
 *
 * Security: never trust client-supplied userId. The session-derived email is
 *           compared against ADMIN_EMAIL. If not set, endpoint is disabled.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ratelimit } from '@/lib/ratelimit';
import { sendDigestEmails, type DigestInternship } from '@/lib/digest-email';
import { z } from 'zod';

const bodySchema = z.object({
  internshipIds: z.array(z.string()).max(50).optional(),
});

async function buildUserMatchMap(
  internships: DigestInternship[],
): Promise<Map<string, { user: { id: string; email: string; name: string | null }; internships: DigestInternship[] }>> {
  if (internships.length === 0) return new Map();

  const allDomains = [...new Set(internships.flatMap((i) => i.domain))];
  const allSkills = [...new Set(internships.flatMap((i) => i.skills))];

  const candidates = await prisma.user.findMany({
    where: {
      OR: [
        ...(allDomains.length > 0 ? [{ domains: { hasSome: allDomains } }] : []),
        ...(allSkills.length > 0 ? [{ skills: { hasSome: allSkills } }] : []),
      ],
    },
    select: { id: true, email: true, name: true, domains: true, skills: true },
  });

  const matchMap = new Map<string, { user: { id: string; email: string; name: string | null }; internships: DigestInternship[] }>();

  for (const user of candidates) {
    const userDomains = new Set(user.domains.map((d) => d.toLowerCase()));
    const userSkills = new Set(user.skills.map((s) => s.toLowerCase()));

    const matched = internships.filter(
      (i) =>
        i.domain.some((d) => userDomains.has(d.toLowerCase())) ||
        i.skills.some((s) => userSkills.has(s.toLowerCase())),
    );

    if (matched.length > 0) {
      matchMap.set(user.id, { user: { id: user.id, email: user.email, name: user.name }, internships: matched });
    }
  }

  return matchMap;
}

export async function POST(req: NextRequest) {
  // ── Auth: session-derived only ─────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Admin gate ─────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return NextResponse.json(
      { error: 'Admin endpoint is disabled (ADMIN_EMAIL not configured).' },
      { status: 403 },
    );
  }

  // Fetch email from DB using server-derived user ID — never trust client
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });

  if (!dbUser || dbUser.email !== adminEmail) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ── Rate-limit ─────────────────────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';
  const { success } = await ratelimit.limit(`admin-digest:${ip}`);
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // ── Validate body ──────────────────────────────────────────────────────
  let body: z.infer<typeof bodySchema> = {};
  try {
    const raw = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Malformed JSON' }, { status: 400 });
  }

  // ── Fetch internships ──────────────────────────────────────────────────
  const where = body.internshipIds?.length
    ? { id: { in: body.internshipIds } }
    : undefined;

  const internships = await prisma.internship.findMany({
    where,
    orderBy: { postedAt: 'desc' },
    take: body.internshipIds?.length ? undefined : 10,
    select: {
      id: true,
      title: true,
      company: true,
      stipend: true,
      applyUrl: true,
      location: true,
      domain: true,
      skills: true,
    },
  });

  if (internships.length === 0) {
    return NextResponse.json({ message: 'No internships found to match against.' });
  }

  // ── Match and send ─────────────────────────────────────────────────────
  const matchMap = await buildUserMatchMap(internships);

  if (matchMap.size === 0) {
    return NextResponse.json({
      message: 'No users matched the given internships.',
      internshipsChecked: internships.length,
    });
  }

  const { sent, skipped, cappedAt } = await sendDigestEmails(matchMap);

  return NextResponse.json({
    message: 'Digest send complete.',
    internshipsChecked: internships.length,
    matchedUsers: matchMap.size,
    sent,
    skipped,
    cappedAt,
    dryRun: process.env.DRY_RUN === 'true',
  });
}
