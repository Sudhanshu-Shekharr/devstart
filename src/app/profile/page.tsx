'use client';

import { useState, useEffect, useCallback, KeyboardEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ResumeSection } from './resume-section';

// ─── Constants ────────────────────────────────────────────────────────────────

const DOMAINS = [
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend', label: 'Backend' },
  { value: 'fullstack', label: 'Full Stack' },
  { value: 'ml', label: 'ML / AI' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'devops', label: 'DevOps' },
] as const;

const LOCATION_OPTIONS = [
  { value: '', label: 'No preference' },
  { value: 'Remote', label: 'Remote' },
  { value: 'Hybrid', label: 'Hybrid' },
  { value: 'On-site', label: 'On-site' },
] as const;

const DOMAIN_COLORS: Record<string, string> = {
  frontend:  'bg-blue-500/15 text-blue-300 border-blue-500/25',
  backend:   'bg-green-500/15 text-green-300 border-green-500/25',
  ml:        'bg-purple-500/15 text-purple-300 border-purple-500/25',
  mobile:    'bg-orange-500/15 text-orange-300 border-orange-500/25',
  devops:    'bg-yellow-500/15 text-yellow-300 border-yellow-500/25',
  fullstack: 'bg-pink-500/15 text-pink-300 border-pink-500/25',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  domains: string[];
  skills: string[];
  locationPref: string | null;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// ─── Sub-components ───────────────────────────────────────────────────────────

function DomainCheckbox({
  value,
  label,
  checked,
  onChange,
}: {
  value: string;
  label: string;
  checked: boolean;
  onChange: (v: string, checked: boolean) => void;
}) {
  const colorClass = DOMAIN_COLORS[value] ?? 'bg-foreground/10 text-foreground/70 border-foreground/15';

  return (
    <label
      htmlFor={`domain-${value}`}
      className={cn(
        'flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border cursor-pointer',
        'transition-all duration-200 select-none text-sm font-medium',
        checked
          ? colorClass
          : 'bg-foreground/[0.03] border-foreground/8 text-muted/70 hover:border-foreground/15 hover:text-muted',
      )}
    >
      <input
        id={`domain-${value}`}
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(value, e.target.checked)}
      />
      <span
        className={cn(
          'w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-all',
          checked ? 'border-current bg-current/20' : 'border-foreground/20 bg-transparent',
        )}
      >
        {checked && (
          <svg viewBox="0 0 12 12" fill="none" className="w-2.5 h-2.5">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label}
    </label>
  );
}

function SkillChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.15 }}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-foreground/8 border border-foreground/12
                 text-foreground/70 text-xs font-medium"
    >
      {label}
      <button
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className="text-muted/70 hover:text-foreground/80 transition-colors ml-0.5 leading-none"
      >
        ×
      </button>
    </motion.span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { status } = useSession();
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────
  const [domains, setDomains] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [locationPref, setLocationPref] = useState('');
  const [skillInput, setSkillInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  // ── Redirect if unauthenticated ────────────────────────────────────────────
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/?flow=login');
    }
  }, [status, router]);

  // ── Pre-fill from API ──────────────────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (!res.ok) return;
      const data: { profile: Profile } = await res.json();
      setDomains(data.profile.domains ?? []);
      setSkills(data.profile.skills ?? []);
      setLocationPref(data.profile.locationPref ?? '');
    } catch {
      // non-fatal — form starts empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      loadProfile();
    }
  }, [status, loadProfile]);

  // ── Domain toggle ──────────────────────────────────────────────────────────
  const toggleDomain = (value: string, checked: boolean) => {
    setDomains((prev) =>
      checked ? [...prev, value] : prev.filter((d) => d !== value),
    );
  };

  // ── Skills input ───────────────────────────────────────────────────────────
  const addSkill = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    // Support comma-separated paste
    const incoming = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    setSkills((prev) => {
      const lowerSet = new Set(prev.map((s) => s.toLowerCase()));
      const deduped = incoming.filter((s) => !lowerSet.has(s.toLowerCase()));
      return [...prev, ...deduped];
    });
    setSkillInput('');
  };

  const handleSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(skillInput);
    } else if (e.key === 'Backspace' && skillInput === '' && skills.length > 0) {
      setSkills((prev) => prev.slice(0, -1));
    }
  };

  const removeSkill = (idx: number) => {
    setSkills((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaveState('saving');
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains, skills, locationPref: locationPref || undefined }),
      });
      if (!res.ok) throw new Error('Save failed');
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2500);
    } catch {
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  };

  // ── Loading / auth skeleton ────────────────────────────────────────────────
  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-foreground/20 border-t-white/60 animate-spin" />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen px-4 pt-32 pb-20">
      <div className="max-w-2xl mx-auto space-y-10">

        {/* Header */}
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight"
          >
            Your Profile
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.06 }}
            className="mt-2 text-foreground/45 text-sm"
          >
            We use this to rank internships by relevance — the more complete your
            profile, the better the matches.
          </motion.p>
        </div>

        {loading ? (
          /* Skeleton */
          <div className="space-y-6 animate-pulse">
            {[180, 140, 80].map((h, i) => (
              <div key={i} className="rounded-2xl bg-foreground/[0.04] border border-foreground/5 h-[var(--h)]"
                style={{ '--h': `${h}px` } as React.CSSProperties} />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="space-y-6"
          >
            {/* ── Domains ── */}
            <section className="rounded-2xl border border-foreground/8 bg-foreground/[0.02] p-6 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Domains</h2>
                <p className="text-xs text-muted/70 mt-0.5">
                  Select all areas you're interested in.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {DOMAINS.map(({ value, label }) => (
                  <DomainCheckbox
                    key={value}
                    value={value}
                    label={label}
                    checked={domains.includes(value)}
                    onChange={toggleDomain}
                  />
                ))}
              </div>
            </section>

            {/* ── Skills ── */}
            <section className="rounded-2xl border border-foreground/8 bg-foreground/[0.02] p-6 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Skills</h2>
                <p className="text-xs text-muted/70 mt-0.5">
                  Add technologies, frameworks, or tools. Press{' '}
                  <kbd className="px-1 py-0.5 text-[10px] rounded bg-foreground/8 border border-foreground/10 font-mono">
                    Enter
                  </kbd>{' '}
                  or{' '}
                  <kbd className="px-1 py-0.5 text-[10px] rounded bg-foreground/8 border border-foreground/10 font-mono">
                    ,
                  </kbd>{' '}
                  to add.
                </p>
              </div>

              {/* Tag input container */}
              <div
                className="min-h-[44px] flex flex-wrap gap-2 p-2.5 rounded-xl border border-foreground/10
                           bg-foreground/[0.03] focus-within:border-foreground/25 transition-colors cursor-text"
                onClick={() => document.getElementById('skill-input')?.focus()}
              >
                <AnimatePresence mode="popLayout">
                  {skills.map((skill, idx) => (
                    <SkillChip key={skill} label={skill} onRemove={() => removeSkill(idx)} />
                  ))}
                </AnimatePresence>
                <input
                  id="skill-input"
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleSkillKeyDown}
                  onBlur={() => { if (skillInput.trim()) addSkill(skillInput); }}
                  placeholder={skills.length === 0 ? 'e.g. React, TypeScript, Python…' : ''}
                  className="flex-1 min-w-[140px] bg-transparent text-foreground text-sm outline-none
                             placeholder:text-foreground/25 py-0.5"
                />
              </div>
            </section>

            {/* ── Location preference ── */}
            <section className="rounded-2xl border border-foreground/8 bg-foreground/[0.02] p-6 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-foreground">Location Preference</h2>
                <p className="text-xs text-muted/70 mt-0.5">
                  Boosts internships that match your preferred work mode.
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {LOCATION_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    id={`loc-${value || 'none'}`}
                    onClick={() => setLocationPref(value)}
                    className={cn(
                      'px-4 py-2 rounded-xl border text-sm font-medium transition-all duration-200',
                      locationPref === value
                        ? 'bg-foreground/12 border-foreground/30 text-foreground'
                        : 'bg-foreground/[0.03] border-foreground/8 text-muted/70 hover:border-foreground/18 hover:text-muted',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>

            {/* ── Resume Analyser ── */}
            <ResumeSection
              onProfileUpdated={(updated) => {
                if (updated.domains) setDomains(updated.domains);
                if (updated.skills) setSkills(updated.skills);
                if (updated.locationPref !== undefined) setLocationPref(updated.locationPref || '');
              }}
            />

            {/* ── Save button ── */}
            <div className="flex items-center gap-4">
              <button
                id="profile-save-btn"
                onClick={handleSave}
                disabled={saveState === 'saving'}
                className={cn(
                  'px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  saveState === 'error'
                    ? 'bg-red-500/20 border border-red-500/30 text-red-300'
                    : saveState === 'saved'
                    ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                    : 'bg-foreground text-black hover:bg-foreground/90 active:scale-[0.97]',
                )}
              >
                {saveState === 'saving' && (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-black/20 border-t-black animate-spin" />
                    Saving…
                  </span>
                )}
                {saveState === 'saved' && '✓ Saved'}
                {saveState === 'error' && 'Error — try again'}
                {saveState === 'idle' && 'Save Profile'}
              </button>

              <AnimatePresence>
                {saveState === 'saved' && (
                  <motion.p
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-muted/70"
                  >
                    Internship rankings will update on your next browse.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
