import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-session';
import { prisma } from '@/lib/prisma';
import { ratelimit } from '@/lib/ratelimit';

// ─── GET /api/resume ──────────────────────────────────────────────────────────
// Returns the user's current resume status & extracted metadata (without returning full resume text).
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
        resumeText: true,
        experienceLevel: true,
        missingKeywords: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      hasResume: !!user.resumeText,
      experienceLevel: user.experienceLevel || null,
      missingKeywords: user.missingKeywords || [],
    });
  } catch (error) {
    console.error('[GET /api/resume] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE /api/resume ───────────────────────────────────────────────────────
// Clears resumeText and resume-extracted metadata fields from the User row.
// Session-derived userId only. Does NOT delete the User record or applications.
export async function DELETE(req: NextRequest) {
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
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        resumeText: null,
        experienceLevel: null,
        missingKeywords: [],
      },
    });

    console.log(`[DELETE /api/resume] Cleared resume fields for userId: ${session.user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Resume data successfully deleted.',
    });
  } catch (error) {
    console.error('[DELETE /api/resume] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
