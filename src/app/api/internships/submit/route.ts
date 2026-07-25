import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth-session';
import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';
import { prisma } from '@/lib/prisma';
import { isSafeUrl } from '@/lib/ssrf';
import { generateInternshipHash } from '@/lib/hash';
import { ratelimit } from '@/lib/ratelimit';

export const internshipSchema = z.object({
  title: z.string().min(2, 'Title is too short'),
  company: z.string().min(2, 'Company is too short'),
  domain: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  location: z.string().optional(),
  stipend: z.string().optional(),
  applyUrl: z.string().min(1, 'Apply URL is required').url('Invalid URL').startsWith('https://', 'URL must be https'),
  deadline: z.string().optional(), // Expecting ISO string or valid date string
  description: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';
    const { success } = await ratelimit.limit(`api:${ip}`);
    if (!success) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = internshipSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation Error', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // SSRF Check for applyUrl
    if (data.applyUrl) {
      const isSafe = await isSafeUrl(data.applyUrl);
      if (!isSafe) {
        return NextResponse.json(
          { error: 'Invalid or unsafe applyUrl' },
          { status: 400 }
        );
      }
    }

    // Sanitize description to prevent XSS
    const sanitizedDescription = data.description
      ? sanitizeHtml(data.description, {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
        })
      : '';

    // Generate hash
    const dateObj = data.deadline ? new Date(data.deadline) : new Date();
    const hash = generateInternshipHash(data.title, data.company, dateObj);

    // Upsert to handle potential duplicates cleanly
    const internship = await prisma.internship.upsert({
      where: { hash },
      update: {
        domain: data.domain,
        skills: data.skills,
        location: data.location,
        stipend: data.stipend,
        applyUrl: data.applyUrl,
        deadline: data.deadline ? new Date(data.deadline) : null,
        description: sanitizedDescription,
        source: 'manual',
      },
      create: {
        title: data.title,
        company: data.company,
        domain: data.domain,
        skills: data.skills,
        location: data.location,
        stipend: data.stipend,
        applyUrl: data.applyUrl,
        deadline: data.deadline ? new Date(data.deadline) : null,
        description: sanitizedDescription,
        source: 'manual',
        hash,
        postedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, internship }, { status: 200 });
  } catch (error) {
    console.error('Error submitting internship:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
