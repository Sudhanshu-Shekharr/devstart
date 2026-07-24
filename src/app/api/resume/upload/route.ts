import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseResumeBuffer } from '@/lib/resumeParser';
import { extractResumeWithLLM } from '@/lib/llmResumeExtractor';
import { z } from 'zod';
import { ratelimit } from '@/lib/ratelimit';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const uploadSchema = z.object({
  fileName: z.string().trim().min(1),
  fileType: z.enum(['pdf', 'docx']),
  size: z.number().int().max(MAX_FILE_SIZE, 'File size exceeds maximum allowed limit of 5MB'),
});

/**
 * Case-insensitive set merge for array of strings.
 * Preserves canonical casing of first occurrence.
 */
function mergeStringArrays(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing.map((s) => s.toLowerCase()));
  const merged = [...existing];

  for (const item of incoming) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (!seen.has(trimmed.toLowerCase())) {
      seen.add(trimmed.toLowerCase());
      merged.push(trimmed);
    }
  }

  return merged;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';
  const { success } = await ratelimit.limit(`api:${ip}`);
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // 1. Session-derived userId
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No resume file provided' }, { status: 400 });
    }

    const fileName = file.name || '';
    const ext = fileName.split('.').pop()?.toLowerCase();
    let fileType: 'pdf' | 'docx' | undefined;

    if (ext === 'pdf' || file.type === 'application/pdf') {
      fileType = 'pdf';
    } else if (
      ext === 'docx' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'application/msword'
    ) {
      fileType = 'docx';
    }

    if (!fileType) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF (.pdf) and DOCX (.docx) files are supported.' },
        { status: 400 },
      );
    }

    // Server-side Zod validation of file metadata
    const validationResult = uploadSchema.safeParse({
      fileName,
      fileType,
      size: file.size,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid file metadata', details: validationResult.error.flatten() },
        { status: 400 },
      );
    }

    // 2. Parse file buffer in-memory to extract plain text
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let parsedResult: { text: string };
    try {
      parsedResult = await parseResumeBuffer(buffer, fileType);
    } catch (parseErr: any) {
      return NextResponse.json(
        { error: parseErr.message || 'Failed to extract text from resume file' },
        { status: 422 },
      );
    }

    const resumeText = parsedResult.text;
    if (!resumeText || resumeText.trim().length === 0) {
      return NextResponse.json(
        { error: 'No readable text content found in resume file' },
        { status: 422 },
      );
    }

    // Log upload event without logging sensitive resume content (PII rule)
    console.log(`[POST /api/resume/upload] Processing resume for userId: ${session.user.id}, file: ${fileName}, extracted char length: ${resumeText.length}`);

    // 3. Extract structured data via LLM with defensive parsing
    const extracted = await extractResumeWithLLM(resumeText);

    // 4. Fetch existing user profile & merge skills/domains
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { skills: true, domains: true },
    });

    const existingSkills = currentUser?.skills || [];
    const existingDomains = currentUser?.domains || [];

    const updatedSkills = mergeStringArrays(existingSkills, extracted.skills);
    const updatedDomains = mergeStringArrays(existingDomains, extracted.domains);

    // 5. Save parsed text and extracted metadata to User record
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        resumeText,
        skills: updatedSkills,
        domains: updatedDomains,
        experienceLevel: extracted.experienceLevel,
        missingKeywords: extracted.missingKeywords,
      },
      select: {
        domains: true,
        skills: true,
        locationPref: true,
        experienceLevel: true,
        missingKeywords: true,
      },
    });

    return NextResponse.json({
      success: true,
      profile: {
        domains: updatedUser.domains,
        skills: updatedUser.skills,
        locationPref: updatedUser.locationPref,
      },
      extracted: {
        skills: extracted.skills,
        domains: extracted.domains,
        experienceLevel: updatedUser.experienceLevel,
        missingKeywords: updatedUser.missingKeywords,
      },
    });
  } catch (error: any) {
    console.error('[POST /api/resume/upload] Internal Error:', error?.message || error);
    return NextResponse.json({ error: 'Internal server error while processing resume' }, { status: 500 });
  }
}
