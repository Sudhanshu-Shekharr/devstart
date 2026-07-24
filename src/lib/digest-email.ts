/**
 * digest-email.ts
 *
 * Composes and sends a single batched digest email per user via Resend.
 * Enforces a per-run cap so we don't blow through the Resend free tier
 * (100 emails/day). Cap defaults to 90, overridable via DIGEST_DAILY_CAP.
 *
 * PII contract: only user IDs and counts are logged — never email addresses.
 */

import nodemailer from 'nodemailer';

// ---------------------------------------------------------------------------
// Types (self-contained to avoid Next.js server-only imports in the script)
// ---------------------------------------------------------------------------

export interface DigestInternship {
  id: string;
  title: string;
  company: string;
  stipend: string | null;
  applyUrl: string | null;
  location: string | null;
  domain: string[];
  skills: string[];
}

export interface DigestUser {
  id: string;
  email: string;
  name: string | null;
}

export interface UserMatch {
  user: DigestUser;
  internships: DigestInternship[];
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const FROM_EMAIL = process.env.DIGEST_FROM_EMAIL ?? 'DevStart <noreply@devstart.dev>';

// DAILY_CAP is read dynamically inside sendDigestEmails() so runtime overrides
// (e.g. in test scripts) are respected without reloading the module.

// ---------------------------------------------------------------------------
// HTML template — plain, scannable, no CSS framework
// ---------------------------------------------------------------------------

function renderDigestHtml(user: DigestUser, internships: DigestInternship[]): string {
  const greeting = user.name ? `Hi ${user.name},` : 'Hi there,';
  const count = internships.length;
  const noun = count === 1 ? 'internship matches' : 'internships match';

  const items = internships
    .map((i) => {
      const stipendLine = i.stipend
        ? `<p style="margin:4px 0;color:#6b7280;font-size:14px;">💰 ${i.stipend}</p>`
        : '';
      const locationLine = i.location
        ? `<p style="margin:4px 0;color:#6b7280;font-size:14px;">📍 ${i.location}</p>`
        : '';
      const applyLine = i.applyUrl
        ? `<p style="margin:8px 0 0;"><a href="${i.applyUrl}" style="display:inline-block;padding:8px 16px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">Apply Now →</a></p>`
        : '';

      return `
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px;background:#fff;">
        <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:#111827;">${escapeHtml(i.title)}</p>
        <p style="margin:0 0 6px;font-size:14px;color:#374151;">${escapeHtml(i.company)}</p>
        ${locationLine}
        ${stipendLine}
        ${applyLine}
      </div>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:32px auto;padding:0 16px;">
    <div style="background:#4f46e5;border-radius:12px 12px 0 0;padding:24px 24px 20px;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">DevStart</h1>
      <p style="margin:4px 0 0;color:#c7d2fe;font-size:14px;">Your personalised internship digest</p>
    </div>
    <div style="background:#fff;padding:24px;border:1px solid #e5e7eb;border-top:none;">
      <p style="margin:0 0 16px;font-size:16px;color:#111827;">${greeting}</p>
      <p style="margin:0 0 20px;font-size:15px;color:#374151;">
        <strong>${count} new ${noun}</strong> your DevStart profile since the last check:
      </p>
      ${items}
      <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">
        You're receiving this because your DevStart profile has domains or skills that overlap with these postings.
        Log in to <a href="https://devstart.dev" style="color:#4f46e5;">devstart.dev</a> to manage your profile.
      </p>
    </div>
    <div style="padding:16px 0;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">© DevStart · Automated digest · Sent at most every 6 hours</p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// Subject line
// ---------------------------------------------------------------------------

function buildSubject(count: number): string {
  return count === 1
    ? '1 new internship matches your DevStart profile'
    : `${count} new internships match your DevStart profile`;
}

// ---------------------------------------------------------------------------
// Main send function
// ---------------------------------------------------------------------------

export interface SendDigestResult {
  sent: number;
  skipped: number;
  cappedAt: number | null; // non-null if we hit the cap
}

export async function sendDigestEmails(
  matches: Map<string, UserMatch>,
): Promise<SendDigestResult> {
  const dryRun = process.env.DRY_RUN === 'true';

  // Validate key presence — fail loudly (not a silent no-op)
  // In DRY_RUN mode the key is not needed; skip validation so the verify script
  // can exercise all matching/batching logic without a live Resend account.
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!dryRun && (!gmailUser || !gmailPass)) {
    throw new Error(
      '[digest-email] GMAIL_USER and GMAIL_APP_PASSWORD are not set. ' +
        'Add them to .env.local for local testing and to GitHub Secrets for CI.',
    );
  }

  // Only instantiate the client when we actually need to send
  const transporter = (!dryRun && gmailUser && gmailPass) ? nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  }) : null;

  const entries = [...matches.values()];
  let cappedAt: number | null = null;

  // Daily cap guard — read dynamically so runtime env overrides take effect
  const DAILY_CAP = parseInt(process.env.DIGEST_DAILY_CAP ?? '90', 10);
  if (entries.length > DAILY_CAP) {
    console.warn(
      `[digest-email] WARNING: ${entries.length} matched users exceeds daily cap of ${DAILY_CAP}. ` +
        `Sending only first ${DAILY_CAP}. Remaining ${entries.length - DAILY_CAP} skipped this run.`,
    );
    cappedAt = DAILY_CAP;
    entries.splice(DAILY_CAP); // truncate in place
  }

  let sent = 0;
  let skipped = 0;

  for (const { user, internships } of entries) {
    if (!user.email) {
      // Should never happen (email is unique + required), but guard anyway
      console.warn(`[digest-email] User ${user.id} has no email — skipping.`);
      skipped++;
      continue;
    }

    if (internships.length === 0) {
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(
        `[digest-email] DRY_RUN: would send to user ${user.id} ` +
          `(${internships.length} internship(s), subject: "${buildSubject(internships.length)}")`,
      );
      sent++;
      continue;
    }

    try {
      await transporter!.sendMail({
        from: FROM_EMAIL,
        to: user.email,
        subject: buildSubject(internships.length),
        html: renderDigestHtml(user, internships),
      });

      console.log(
        `[digest-email] Sent digest to user ${user.id} — ${internships.length} match(es).`,
      );
      sent++;
    } catch (err: any) {
      console.error(`[digest-email] Exception sending to user ${user.id}:`, err.message || err);
      skipped++;
    }
  }

  return { sent, skipped, cappedAt };
}
