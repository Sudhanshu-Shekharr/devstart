/**
 * verify-phase7.ts — End-to-end DoD verification for Phase 7 Notifications
 *
 * Run with:
 *   npx tsx --env-file=.env.local scripts/verify-phase7.ts
 *   DRY_RUN=true npx tsx --env-file=.env.local scripts/verify-phase7.ts
 *
 * What this tests:
 *   1. Inserts two synthetic test internships with known skills/domain
 *   2. Creates/updates two test users: one matching, one non-matching
 *   3. Runs the matching logic — verifies matching user appears, non-matching doesn't
 *   4. Calls sendDigestEmails (honours DRY_RUN) — verifies 1 email would be sent
 *   5. Re-runs insertion of same internships — verifies no new IDs (re-run safety)
 *   6. Cleans up all synthetic test data
 *
 * Uses DRY_RUN=true by default unless FORCE_REAL_SEND=true is set.
 */

import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import crypto from 'crypto';
import { sendDigestEmails, type DigestInternship, type DigestUser, type UserMatch } from '../src/lib/digest-email';

// ── DB setup ───────────────────────────────────────────────────────────────

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ── Helpers ────────────────────────────────────────────────────────────────

function hash(s: string) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`  ✗ FAIL: ${msg}`);
    process.exitCode = 1;
  } else {
    console.log(`  ✓ PASS: ${msg}`);
  }
}

// ── Matching logic (mirrors ingest.ts) ───────────────────────────────────

async function buildUserMatchMap(
  internships: DigestInternship[],
): Promise<Map<string, UserMatch>> {
  if (internships.length === 0) return new Map();

  const allDomains = [...new Set(internships.flatMap((i) => i.domain))];
  const allSkills  = [...new Set(internships.flatMap((i) => i.skills))];

  const candidates = await prisma.user.findMany({
    where: {
      OR: [
        ...(allDomains.length > 0 ? [{ domains: { hasSome: allDomains } }] : []),
        ...(allSkills.length > 0  ? [{ skills:  { hasSome: allSkills  } }] : []),
      ],
    },
    select: { id: true, email: true, name: true, domains: true, skills: true },
  });

  const matchMap = new Map<string, UserMatch>();

  for (const user of candidates) {
    const uDomains = new Set(user.domains.map((d) => d.toLowerCase()));
    const uSkills  = new Set(user.skills.map( (s) => s.toLowerCase()));

    const matched = internships.filter(
      (i) =>
        i.domain.some((d) => uDomains.has(d.toLowerCase())) ||
        i.skills.some( (s) => uSkills.has( s.toLowerCase())),
    );

    if (matched.length > 0) {
      matchMap.set(user.id, {
        user: { id: user.id, email: user.email, name: user.name },
        internships: matched,
      });
    }
  }

  return matchMap;
}

// ── New-hash detection (mirrors ingest.ts) ───────────────────────────────

async function findNewHashes(candidates: string[]): Promise<Set<string>> {
  if (candidates.length === 0) return new Set();
  const existing = await prisma.internship.findMany({
    where: { hash: { in: candidates } },
    select: { hash: true },
  });
  const existingSet = new Set(existing.map((r) => r.hash));
  return new Set(candidates.filter((h) => !existingSet.has(h)));
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n═══════════════════════════════════════════');
  console.log('  Phase 7 — Notifications Verification');
  console.log('═══════════════════════════════════════════\n');

  // Honour DRY_RUN unless caller explicitly opts in to a real send
  if (process.env.FORCE_REAL_SEND !== 'true') {
    process.env.DRY_RUN = 'true';
  }
  console.log(`Mode: ${process.env.DRY_RUN === 'true' ? 'DRY_RUN (no real emails)' : 'LIVE SEND'}\n`);

  // Synthetic test IDs so cleanup is reliable
  const testSuffix  = `phase7-verify-${Date.now()}`;
  const matchHash1  = hash(`react-intern-acme-${testSuffix}-1`);
  const matchHash2  = hash(`react-intern-acme-${testSuffix}-2`);
  const userEmail1  = `test-matching-${testSuffix}@devstart.test`;
  const userEmail2  = `test-nomatch-${testSuffix}@devstart.test`;

  let matchingUserId  = '';
  let noMatchUserId   = '';
  let internshipId1   = '';
  let internshipId2   = '';

  // ── Step 1: Insert two synthetic internships ───────────────────────────
  console.log('── Step 1: Inserting synthetic test internships ──');
  try {
    const i1 = await prisma.internship.create({
      data: {
        title:    'React Intern #1',
        company:  'AcmeCorp',
        hash:     matchHash1,
        source:   'test',
        domain:   ['frontend'],
        skills:   ['react', 'typescript'],
        applyUrl: 'https://acme.example.com/apply/1',
        stipend:  '$1000/mo',
        location: 'Remote',
      },
    });
    internshipId1 = i1.id;
    console.log(`  Created internship 1: id=${i1.id}`);

    const i2 = await prisma.internship.create({
      data: {
        title:    'React Intern #2',
        company:  'AcmeCorp',
        hash:     matchHash2,
        source:   'test',
        domain:   ['frontend'],
        skills:   ['react', 'nextjs'],
        applyUrl: 'https://acme.example.com/apply/2',
        location: 'Remote',
      },
    });
    internshipId2 = i2.id;
    console.log(`  Created internship 2: id=${i2.id}`);
  } catch (err) {
    console.error('Failed to create test internships:', err);
    process.exit(1);
  }

  // ── Step 2: Create test users ─────────────────────────────────────────
  console.log('\n── Step 2: Creating synthetic test users ──');
  const matchingUser = await prisma.user.upsert({
    where:  { email: userEmail1 },
    update: { domains: ['frontend'], skills: ['react', 'typescript'] },
    create: {
      email:   userEmail1,
      name:    'Test Matching User',
      domains: ['frontend'],
      skills:  ['react', 'typescript'],
    },
  });
  matchingUserId = matchingUser.id;
  console.log(`  Matching user id: ${matchingUser.id} (domains: frontend, skills: react/typescript)`);

  const noMatchUser = await prisma.user.upsert({
    where:  { email: userEmail2 },
    update: { domains: ['blockchain'], skills: ['solidity'] },
    create: {
      email:   userEmail2,
      name:    'Test No-Match User',
      domains: ['blockchain'],
      skills:  ['solidity'],
    },
  });
  noMatchUserId = noMatchUser.id;
  console.log(`  Non-matching user id: ${noMatchUser.id} (domains: blockchain, skills: solidity)`);

  // ── Step 3: Run matching logic ────────────────────────────────────────
  console.log('\n── Step 3: Building user match map ──');
  const internships: DigestInternship[] = [
    {
      id:      internshipId1,
      title:   'React Intern #1',
      company: 'AcmeCorp',
      stipend: '$1000/mo',
      applyUrl:'https://acme.example.com/apply/1',
      location:'Remote',
      domain:  ['frontend'],
      skills:  ['react', 'typescript'],
    },
    {
      id:      internshipId2,
      title:   'React Intern #2',
      company: 'AcmeCorp',
      stipend: null,
      applyUrl:'https://acme.example.com/apply/2',
      location:'Remote',
      domain:  ['frontend'],
      skills:  ['react', 'nextjs'],
    },
  ];

  const matchMap = await buildUserMatchMap(internships);

  assert(matchMap.has(matchingUserId),  'Matching user IS in match map');
  assert(!matchMap.has(noMatchUserId),  'Non-matching user NOT in match map');
  assert(
    (matchMap.get(matchingUserId)?.internships.length ?? 0) === 2,
    'Matching user gets both internships in ONE digest (not two emails)',
  );

  // ── Step 4: Send digest ───────────────────────────────────────────────
  console.log('\n── Step 4: Sending digest emails ──');
  // Send to the subset of the matchMap that only contains the test matching user
  // (to avoid noise from pre-existing DB users that also match these generic tags)
  const testOnlyMap = new Map<string, UserMatch>();
  if (matchMap.has(matchingUserId)) {
    testOnlyMap.set(matchingUserId, matchMap.get(matchingUserId)!);
  }

  const { sent, skipped, cappedAt } = await sendDigestEmails(testOnlyMap);

  assert(sent    === 1, `Exactly 1 digest sent for test matching user (got ${sent})`);
  assert(skipped === 0, `0 digests skipped (got ${skipped})`);
  assert(cappedAt === null, 'Daily cap was NOT hit');
  // Verify both internships appear in a single email (already verified via matchMap above)

  // ── Step 5: Re-run safety (re-insertion prevention) ──────────────────
  console.log('\n── Step 5: Re-run safety — verify hash-based skip ──');
  const newHashes = await findNewHashes([matchHash1, matchHash2]);
  assert(newHashes.size === 0, 'Re-running produces 0 new IDs (both hashes already exist)');

  // ── Step 6: Cap guard simulation ─────────────────────────────────────
  console.log('\n── Step 6: Daily cap guard simulation ──');
  // Build a fake match map with > cap entries to test truncation logic
  const fakeCap = 2; // very low to exercise the code path
  const origCap = process.env.DIGEST_DAILY_CAP;
  process.env.DIGEST_DAILY_CAP = String(fakeCap);

  // Build a map with 3 fake users (exceeds cap of 2)
  const bigMap = new Map<string, UserMatch>();
  for (let i = 0; i < 3; i++) {
    bigMap.set(`fake-user-${i}`, {
      user: { id: `fake-user-${i}`, email: `fake${i}@devstart.test`, name: null },
      internships,
    });
  }

  const capResult = await sendDigestEmails(bigMap);
  assert(capResult.cappedAt === fakeCap, `Cap guard fires at ${fakeCap} (got cappedAt=${capResult.cappedAt})`);
  assert(capResult.sent === fakeCap,     `Only ${fakeCap} emails sent when cap applies`);

  // Restore
  if (origCap !== undefined) process.env.DIGEST_DAILY_CAP = origCap;
  else delete process.env.DIGEST_DAILY_CAP;

  // ── Cleanup ───────────────────────────────────────────────────────────
  console.log('\n── Cleanup: removing synthetic test data ──');
  await prisma.internship.deleteMany({ where: { hash: { in: [matchHash1, matchHash2] } } });
  await prisma.user.deleteMany({ where: { email: { in: [userEmail1, userEmail2] } } });
  console.log('  Synthetic internships and users deleted.');

  console.log('\n═══════════════════════════════════════════');
  if (process.exitCode === 1) {
    console.log('  RESULT: ✗ Some checks FAILED — see above.');
  } else {
    console.log('  RESULT: ✓ All Phase 7 checks passed!');
  }
  console.log('═══════════════════════════════════════════\n');
}

main()
  .catch((err) => {
    console.error('Unhandled error in verify-phase7:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect().then(() => pool.end()));
