import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { ratelimit } from '@/lib/ratelimit';
// Validation schema for creating applications or saved internships
const applicationSchema = z.object({
  internshipId: z.string(),
  status: z.enum(['saved', 'applied']).default('saved'),
});

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';
  const { success } = await ratelimit.limit(`api:${ip}`);
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const applications = await prisma.application.findMany({
      where: { userId: session.user.id },
      include: {
        internship: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    
    return NextResponse.json({ applications });
  } catch (error) {
    console.error('Failed to fetch applications:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';
  const { success } = await ratelimit.limit(`api:${ip}`);
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const json = await req.json();
    const body = applicationSchema.safeParse(json);
    
    if (!body.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { internshipId, status } = body.data;

    // Use upsert to handle both creation and toggling saved state if it exists
    const application = await prisma.application.upsert({
      where: {
        userId_internshipId: {
          userId: session.user.id,
          internshipId,
        },
      },
      update: {
        status,
      },
      create: {
        userId: session.user.id,
        internshipId,
        status,
      },
    });

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    console.error('Failed to create/save application:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
