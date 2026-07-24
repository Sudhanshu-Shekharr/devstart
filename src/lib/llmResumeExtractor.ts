import { z } from 'zod';

export const extractedResumeSchema = z.object({
  skills: z.array(z.string().trim().min(1)).default([]),
  domains: z.array(z.string().trim().min(1)).default([]),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  missingKeywords: z.array(z.string().trim().min(1)).default([]),
});

export type ExtractedResumeData = z.infer<typeof extractedResumeSchema>;

/**
 * Strips markdown code blocks (e.g. ```json ... ```) from LLM output.
 */
function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

/**
 * Fallback heuristic extractor when no LLM API key is available or LLM request fails.
 * Extracts standard developer skills/domains defensively.
 */
function fallbackExtraction(text: string): ExtractedResumeData {
  const lower = text.toLowerCase();
  
  const knownSkills = [
    'React', 'Next.js', 'Node.js', 'TypeScript', 'JavaScript', 'Python', 'Go',
    'Rust', 'Java', 'C++', 'PostgreSQL', 'MongoDB', 'GraphQL', 'Tailwind',
    'Docker', 'AWS', 'Git', 'HTML', 'CSS', 'SQL', 'Redux', 'Prisma', 'Express',
  ];

  const extractedSkills: string[] = [];
  for (const skill of knownSkills) {
    if (lower.includes(skill.toLowerCase())) {
      extractedSkills.push(skill);
    }
  }

  const extractedDomains: string[] = [];
  if (lower.includes('frontend') || lower.includes('react') || lower.includes('ui')) extractedDomains.push('frontend');
  if (lower.includes('backend') || lower.includes('node') || lower.includes('database') || lower.includes('api')) extractedDomains.push('backend');
  if (lower.includes('fullstack') || lower.includes('full-stack')) extractedDomains.push('fullstack');
  if (lower.includes('machine learning') || lower.includes('ai') || lower.includes('python')) extractedDomains.push('ml');
  if (lower.includes('mobile') || lower.includes('react native') || lower.includes('flutter')) extractedDomains.push('mobile');
  if (lower.includes('devops') || lower.includes('docker') || lower.includes('aws')) extractedDomains.push('devops');

  let experienceLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner';
  if (lower.includes('senior') || lower.includes('lead') || lower.includes('years') && (lower.includes('5+') || lower.includes('6+'))) {
    experienceLevel = 'advanced';
  } else if (lower.includes('intermediate') || lower.includes('mid') || (lower.includes('years') && (lower.includes('2+') || lower.includes('3+')))) {
    experienceLevel = 'intermediate';
  }

  const missingKeywords: string[] = [];
  if (!extractedSkills.includes('Docker')) missingKeywords.push('Docker');
  if (!extractedSkills.includes('TypeScript')) missingKeywords.push('TypeScript');
  if (!extractedSkills.includes('PostgreSQL')) missingKeywords.push('PostgreSQL');

  return {
    skills: extractedSkills.length > 0 ? extractedSkills : ['JavaScript', 'HTML', 'CSS'],
    domains: extractedDomains.length > 0 ? extractedDomains : ['frontend'],
    experienceLevel,
    missingKeywords,
  };
}

/**
 * Sends parsed resume text to Groq or Gemini LLM to extract structured skills, domains, and recommendations.
 */
export async function extractResumeWithLLM(text: string): Promise<ExtractedResumeData> {
  const groqApiKey = process.env.GROQ_API_KEY?.trim();
  const geminiApiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.trim();

  const prompt = `Extract details from this resume. Return JSON ONLY, no preamble or prose.
Use exact JSON format:
{
  "skills": ["string"],
  "domains": ["frontend", "backend", "fullstack", "ml", "mobile", "devops"],
  "experienceLevel": "beginner" | "intermediate" | "advanced",
  "missingKeywords": ["string"]
}

Resume content:
${text.slice(0, 8000)}`;

  let rawLlmOutput = '';

  try {
    if (groqApiKey) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: 'You are a technical resume parser. Return valid JSON only.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        rawLlmOutput = data.choices?.[0]?.message?.content || '';
      }
    } else if (geminiApiKey) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        rawLlmOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }
    }
  } catch (error) {
    console.error('[llmResumeExtractor] LLM request error, falling back to heuristic:', error);
  }

  if (!rawLlmOutput) {
    return fallbackExtraction(text);
  }

  // Defensive parsing
  try {
    const cleaned = cleanJsonString(rawLlmOutput);
    const parsedObj = JSON.parse(cleaned);
    const validated = extractedResumeSchema.safeParse(parsedObj);

    if (validated.success) {
      return validated.data;
    } else {
      console.warn('[llmResumeExtractor] LLM JSON schema mismatch, falling back:', validated.error.flatten());
      return fallbackExtraction(text);
    }
  } catch (parseErr) {
    console.warn('[llmResumeExtractor] Failed to parse LLM response as JSON, falling back:', parseErr);
    return fallbackExtraction(text);
  }
}
