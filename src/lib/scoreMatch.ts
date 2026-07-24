/**
 * scoreMatch.ts — Rule-based internship relevance scorer (v1).
 *
 * Pure functions only. No DB access, no HTTP, no side effects.
 * Every export here is independently unit-testable.
 */

// ─── Lightweight profile shapes ───────────────────────────────────────────────
// These mirror the Prisma User / Internship fields we care about for scoring.
// Using narrow interfaces here rather than the full generated types keeps this
// lib decoupled from Prisma internals.

export interface UserProfile {
  domains: string[];
  skills: string[];
  locationPref: string | null | undefined;
}

export interface InternshipProfile {
  domain: string[];
  skills: string[];
  location: string | null | undefined;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the case-insensitive intersection of two string arrays.
 * e.g. intersect(["React", "Node"], ["react", "python"]) → ["React"]
 */
export function intersect(a: string[], b: string[]): string[] {
  const bLower = new Set(b.map((s) => s.toLowerCase()));
  return a.filter((s) => bLower.has(s.toLowerCase()));
}

/**
 * Returns true if the user profile has at least one non-empty value.
 * Used to decide whether to apply scoring or fall back to default order.
 */
export function hasProfile(user: UserProfile): boolean {
  return (
    user.domains.length > 0 ||
    user.skills.length > 0 ||
    (user.locationPref != null && user.locationPref.trim() !== '')
  );
}

// ─── Scoring function ─────────────────────────────────────────────────────────

/**
 * Computes a relevance score for a single internship against a user profile.
 *
 * Rules (additive):
 *   +10 per matching skill (case-insensitive)
 *   +20 if any user domain appears in the internship's domain array
 *   +15 if locationPref matches internship location OR internship is Remote
 *
 * Returns 0 for a completely unrelated pairing (never negative).
 */
export function scoreMatch(
  user: UserProfile,
  internship: InternshipProfile,
): number {
  let score = 0;

  // Skill overlap
  score += intersect(user.skills, internship.skills).length * 10;

  // Domain match — any user domain found anywhere in the internship's domain array
  if (user.domains.some((d) => internship.domain.includes(d))) {
    score += 20;
  }

  // Location preference
  const loc = internship.location?.toLowerCase() ?? '';
  const pref = user.locationPref?.toLowerCase() ?? '';
  if (pref && (pref === loc || loc.includes('remote'))) {
    score += 15;
  }

  return score;
}
