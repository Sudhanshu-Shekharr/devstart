/**
 * ingest.ts — Phase 2 ingestion pipeline (extended for Phase 7 notifications)
 *
 * Fetches internships from RemoteOK and Adzuna, upserts into Postgres.
 * Tracks which rows were *newly created* this run (vs already-existing).
 * After all sources complete, matches new internships to users whose
 * domains/skills overlap, and sends each matched user a single batched
 * digest email via Resend.
 *
 * Phase 7 re-notification safeguard:
 *   The `hash` unique constraint prevents re-insertion of existing rows.
 *   Therefore, the set of "new this run" IDs is always truly new — a manual
 *   re-run against the same window produces zero new IDs and exits early.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import sanitizeHtml from 'sanitize-html';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { sendDigestEmails, type DigestInternship, type DigestUser, type UserMatch } from '../src/lib/digest-email';

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

dotenv.config({ path: '.env.local' });
dotenv.config();

// Validate required secrets upfront — fail loudly so CI catches missing config
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('[ingest] DATABASE_URL is required');
}

// Gmail credentials are validated inside sendDigestEmails(), but surface the
// error early here too so the Action fails at the start rather than at the end.
// Skip this check in DRY_RUN mode (used by the verification script).
if ((!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) && process.env.DRY_RUN !== 'true') {
  throw new Error(
    '[ingest] GMAIL_USER and GMAIL_APP_PASSWORD are required. ' +
      'Set them in .env.local (local) or as GitHub Secrets (CI).',
  );
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function generateHash(title: string, company: string, date: Date | string | null): string {
  let roughDate = '';
  if (date) {
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      roughDate = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    }
  }
  const rawString =
    `${title.toLowerCase().trim()}-${company.toLowerCase().trim()}-${roughDate}`;
  return crypto.createHash('sha256').update(rawString).digest('hex');
}

function sanitize(text: string) {
  return sanitizeHtml(text, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
  });
}

// ---------------------------------------------------------------------------
// New-insert detection helper
// ---------------------------------------------------------------------------

/**
 * Given a list of hashes about to be upserted, returns the subset that do
 * NOT yet exist in the DB — i.e. the rows that will be created (not skipped).
 */
async function findNewHashes(candidates: string[]): Promise<Set<string>> {
  if (candidates.length === 0) return new Set();
  const existing = await prisma.internship.findMany({
    where: { hash: { in: candidates } },
    select: { hash: true },
  });
  const existingSet = new Set(existing.map((r) => r.hash));
  return new Set(candidates.filter((h) => !existingSet.has(h)));
}

// ---------------------------------------------------------------------------
// Source: RemoteOK
// ---------------------------------------------------------------------------

async function fetchRemoteOK(): Promise<string[]> {
  console.log('[ingest] Fetching from RemoteOK...');
  const newIds: string[] = [];

  try {
    const res = await fetch('https://remoteok.com/api');
    if (!res.ok) throw new Error(`RemoteOK failed: ${res.statusText}`);
    const data = await res.json();

    // First item in RemoteOK API is usually a legal/stat object
    const jobs = data.slice(1);
    const internships = jobs.filter(
      (job: any) =>
        job.position?.toLowerCase().includes('intern') || job.tags?.includes('internship'),
    );
    console.log(`[ingest] Found ${internships.length} internships on RemoteOK.`);

    // Detect which are genuinely new before upserting
    const hashes = internships.map((job: any) =>
      generateHash(job.position, job.company, new Date(job.date)),
    );
    const newHashes = await findNewHashes(hashes);
    console.log(`[ingest] RemoteOK: ${newHashes.size} new of ${internships.length} fetched.`);

    for (const job of internships) {
      const date = new Date(job.date);
      const hash = generateHash(job.position, job.company, date);

      const result = await prisma.internship.upsert({
        where: { hash },
        update: {}, // Don't update if exists
        create: {
          title: job.position,
          company: job.company,
          location: job.location || 'Remote',
          applyUrl: job.url,
          skills: job.tags || [],
          description: sanitize(job.description || ''),
          source: 'RemoteOK',
          postedAt: date,
          hash,
        },
        select: { id: true, hash: true },
      });

      if (newHashes.has(hash)) {
        newIds.push(result.id);
      }
    }
  } catch (err) {
    console.error('[ingest] RemoteOK Error:', err);
  }

  return newIds;
}

// ---------------------------------------------------------------------------
// Source: Adzuna
// ---------------------------------------------------------------------------

async function fetchAdzuna(): Promise<string[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  if (!appId || !appKey) {
    console.warn('[ingest] Adzuna credentials not found. Skipping Adzuna ingestion.');
    return [];
  }

  console.log('[ingest] Fetching from Adzuna...');
  const newIds: string[] = [];

  try {
    const res = await fetch(
      `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=50&what=intern`,
    );
    if (!res.ok) throw new Error(`Adzuna failed: ${res.statusText}`);
    const data = await res.json();

    const jobs = data.results || [];
    console.log(`[ingest] Found ${jobs.length} internships on Adzuna.`);

    const hashes = jobs.map((job: any) =>
      generateHash(job.title, job.company.display_name, new Date(job.created)),
    );
    const newHashes = await findNewHashes(hashes);
    console.log(`[ingest] Adzuna: ${newHashes.size} new of ${jobs.length} fetched.`);

    for (const job of jobs) {
      const date = new Date(job.created);
      const hash = generateHash(job.title, job.company.display_name, date);

      const result = await prisma.internship.upsert({
        where: { hash },
        update: {},
        create: {
          title: job.title,
          company: job.company.display_name,
          location: job.location?.display_name || 'India',
          applyUrl: job.redirect_url,
          skills: job.category?.tag ? [job.category.tag] : [],
          description: sanitize(job.description || ''),
          source: 'Adzuna',
          postedAt: date,
          hash,
        },
        select: { id: true, hash: true },
      });

      if (newHashes.has(hash)) {
        newIds.push(result.id);
      }
    }
  } catch (err) {
    console.error('[ingest] Adzuna Error:', err);
  }

  return newIds;
}

// ---------------------------------------------------------------------------
// User → internship matching
// ---------------------------------------------------------------------------

/**
 * Given a list of newly inserted internships, finds all users whose
 * `domains` or `skills` overlap with any internship's `domain`/`skills`,
 * then builds a per-user map of which internships actually matched them.
 *
 * A user with N matches gets exactly ONE digest email listing all N.
 */
async function buildUserMatchMap(
  newInternships: DigestInternship[],
): Promise<Map<string, UserMatch>> {
  if (newInternships.length === 0) return new Map();

  // Collect all unique tags across all new internships for the broad query
  const allDomains = [...new Set(newInternships.flatMap((i) => i.domain))];
  const allSkills = [...new Set(newInternships.flatMap((i) => i.skills))];

  // Broad match: fetch users who overlap on ANY of the new tags
  const candidateUsers = await prisma.user.findMany({
    where: {
      OR: [
        ...(allDomains.length > 0
          ? [{ domains: { hasSome: allDomains } }]
          : []),
        ...(allSkills.length > 0
          ? [{ skills: { hasSome: allSkills } }]
          : []),
      ],
    },
    select: {
      id: true,
      email: true,
      name: true,
      domains: true,
      skills: true,
    },
  });

  console.log(`[ingest] ${candidateUsers.length} candidate user(s) matched the broad tag set.`);

  const matchMap = new Map<string, UserMatch>();

  for (const user of candidateUsers) {
    const userDomainSet = new Set(user.domains.map((d) => d.toLowerCase()));
    const userSkillSet = new Set(user.skills.map((s) => s.toLowerCase()));

    // Narrow match: only internships that actually overlap with THIS user
    const matched = newInternships.filter((i) => {
      const domainOverlap = i.domain.some((d) => userDomainSet.has(d.toLowerCase()));
      const skillOverlap = i.skills.some((s) => userSkillSet.has(s.toLowerCase()));
      return domainOverlap || skillOverlap;
    });

    if (matched.length > 0) {
      matchMap.set(user.id, {
        user: { id: user.id, email: user.email, name: user.name },
        internships: matched,
      });
    }
  }

  console.log(
    `[ingest] After narrow matching: ${matchMap.size} user(s) will receive a digest.`,
  );

  return matchMap;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('[ingest] Starting ingestion pipeline...');

  const [remoteOKNewIds, adzunaNewIds] = await Promise.all([
    fetchRemoteOK(),
    fetchAdzuna(),
  ]);

  const allNewIds = [...remoteOKNewIds, ...adzunaNewIds];
  console.log(`[ingest] Ingestion complete. ${allNewIds.length} new internship(s) this run.`);

  // ── Phase 7: Notification pipeline ─────────────────────────────────────

  if (allNewIds.length === 0) {
    console.log('[ingest] No new internships this run — skipping notifications. ✓');
    return;
  }

  // Fetch the full records for new internships
  const newInternships = await prisma.internship.findMany({
    where: { id: { in: allNewIds } },
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

  // Build per-user match map
  const matchMap = await buildUserMatchMap(newInternships);

  if (matchMap.size === 0) {
    console.log('[ingest] No users matched new internships — no emails to send.');
    return;
  }

  // Send batched digest emails
  console.log(`[ingest] Sending digest emails to ${matchMap.size} user(s)...`);
  const { sent, skipped, cappedAt } = await sendDigestEmails(matchMap);

  if (cappedAt !== null) {
    console.warn(
      `[ingest] ⚠ Daily cap hit (${cappedAt}). ${matchMap.size - cappedAt} user(s) not notified this run.`,
    );
  }

  console.log(
    `[ingest] Notification summary: ${sent} digest(s) sent, ${skipped} skipped. ` +
      `(Matched: ${matchMap.size}, New internships: ${allNewIds.length})`,
  );
}

main().catch(console.error).finally(() => prisma.$disconnect());
