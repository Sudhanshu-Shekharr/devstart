import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { ratelimit } from '@/lib/ratelimit';
const patchSchema = z.object({
  status: z.enum(['saved', 'applied', 'interview', 'offer', 'rejected']),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    const json = await req.json();
    const body = patchSchema.safeParse(json);
    
    if (!body.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { status } = body.data;

    // Verify ownership
    const existing = await prisma.application.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.application.update({
      where: { id },
      data: { status },
      include: {
        internship: true,
      },
    });

    return NextResponse.json({ application: updated });
  } catch (error) {
    console.error('Failed to update application:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
