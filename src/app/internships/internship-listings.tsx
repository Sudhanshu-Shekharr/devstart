'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Internship {
  id: string;
  title: string;
  company: string;
  domain: string[];
  skills: string[];
  location: string | null;
  stipend: string | null;
  applyUrl: string | null;
  source: string | null;
  postedAt: string | null;
  deadline: string | null;
  description: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ─── Animation variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
} as const;

// ─── Domain tag colours (cosmetic only) ───────────────────────────────────────

const DOMAIN_COLORS: Record<string, string> = {
  frontend:  'bg-blue-600/15 text-blue-300 border-blue-500/30',
  backend:   'bg-emerald-600/15 text-emerald-300 border-emerald-500/30',
  ml:        'bg-purple-600/15 text-purple-300 border-purple-500/30',
  ai:        'bg-purple-600/15 text-purple-300 border-purple-500/30',
  mobile:    'bg-amber-600/15 text-amber-300 border-amber-500/30',
  devops:    'bg-indigo-600/15 text-indigo-300 border-indigo-500/30',
  fullstack: 'bg-rose-600/15 text-rose-300 border-rose-500/30',
};

function domainColor(d: string) {
  return DOMAIN_COLORS[d.toLowerCase()] ?? 'bg-foreground/5 text-muted/70 border-foreground/10';
}

// ─── Location badge helper ────────────────────────────────────────────────────

function locationTag(location: string | null): string {
  if (!location) return 'Unknown';
  const l = location.toLowerCase();
  if (l.includes('remote')) return 'Remote';
  if (l.includes('hybrid')) return 'Hybrid';
  return location;
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-foreground/5 bg-[#090909] p-6 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2 flex-1">
          <div className="h-4 w-3/4 rounded bg-foreground/8" />
          <div className="h-3 w-1/3 rounded bg-foreground/5" />
        </div>
        <div className="h-6 w-16 rounded-full bg-foreground/5" />
      </div>
      <div className="h-3 w-1/2 rounded bg-foreground/5" />
      <div className="space-y-1.5">
        <div className="h-3 w-full rounded bg-foreground/5" />
        <div className="h-3 w-5/6 rounded bg-foreground/5" />
        <div className="h-3 w-4/6 rounded bg-foreground/5" />
      </div>
      <div className="h-9 w-full rounded-full bg-foreground/5 mt-auto" />
    </div>
  );
}

// ─── Internship card ─────────────────────────────────────────────────────────

function InternshipCard({ item, savedIds, onToggleBookmark, onClickLog }: {
  item: Internship;
  savedIds: Set<string>;
  onToggleBookmark: (id: string) => void;
  /** fire-and-forget click logger (analytics without redirect) */
  onClickLog: (id: string) => void;
}) {
  const isBookmarked = savedIds.has(item.id);
  const tag = locationTag(item.location);
  const primaryDomain = item.domain[0] ?? '';

  return (
    <motion.div
      variants={itemVariants}
      className="flex flex-col gap-4 rounded-2xl border border-[#1c1c1c] bg-[#090909] p-6
                 hover:bg-[#0d0d0d] hover:border-[#2a2a2a] transition-all duration-300 relative group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pr-8">
        <div>
          <h2 className="text-foreground font-semibold text-sm leading-snug">{item.title}</h2>
          <p className="text-muted/80 text-xs mt-0.5">{item.company}</p>
        </div>
        <span className="shrink-0 text-[11px] px-2.5 py-1 rounded-full border bg-foreground/5 text-muted/80 border-foreground/10">
          {tag}
        </span>
      </div>

      {/* Bookmark */}
      <button
        onClick={() => onToggleBookmark(item.id)}
        className="absolute top-6 right-6 text-muted/70 hover:text-foreground transition-colors p-1.5 rounded-full hover:bg-foreground/5 cursor-pointer"
        title={isBookmarked ? 'Remove from Saved' : 'Save Internship'}
        aria-label={isBookmarked ? 'Unsave internship' : 'Save internship'}
      >
        <svg
          viewBox="0 0 24 24"
          fill={isBookmarked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={1.5}
          className="w-4 h-4"
        >
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
        </svg>
      </button>

      {/* Domain chips */}
      {item.domain.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.domain.slice(0, 3).map((d) => (
            <span
              key={d}
              className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${domainColor(d)}`}
            >
              {d}
            </span>
          ))}
        </div>
      )}

      {/* Location + skills */}
      <div className="space-y-1">
        {item.location && (
          <p className="text-muted/70 text-xs flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3 h-3 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            {item.location}
          </p>
        )}
        {item.skills.length > 0 && (
          <p className="text-foreground/35 text-xs truncate">
            {item.skills.slice(0, 5).join(' · ')}
          </p>
        )}
        {item.stipend && (
          <p className="text-emerald-400/70 text-xs font-medium">{item.stipend}</p>
        )}
      </div>

      {/* Description */}
      {item.description && (
        <p className="text-foreground/45 text-sm leading-relaxed line-clamp-3 flex-1">
          {item.description}
        </p>
      )}

      {/* Apply button — direct <a> tag, no internal redirect ─────────────── */}
      {item.applyUrl ? (
        <a
          id={`apply-btn-${item.id}`}
          href={item.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onClickLog(item.id)}
          className={cn(
            'w-full rounded-full border text-sm py-2.5 font-medium transition-all duration-200 mt-auto',
            'flex items-center justify-center gap-1.5 text-center',
            'border-foreground/10 bg-transparent text-foreground/70',
            'hover:bg-foreground hover:text-black hover:border-transparent',
          )}
        >
          Apply Now
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>
      ) : (
        <span className="w-full mt-auto rounded-full border border-foreground/5 bg-[#0d0d0d] text-foreground/25 text-sm py-2.5 text-center cursor-not-allowed select-none">
          No Apply Link
        </span>
      )}
    </motion.div>
  );
}

// ─── Main export (Suspense boundary for useSearchParams) ─────────────────────

export function InternshipListings({ initialQuery }: { initialQuery?: string }) {
  return (
    <Suspense fallback={
      <div className="grid sm:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    }>
      <InternshipListingsInner initialQuery={initialQuery} />
    </Suspense>
  );
}

// ─── Inner component ──────────────────────────────────────────────────────────

function InternshipListingsInner({ initialQuery }: { initialQuery?: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // ── Local UI state ──────────────────────────────────────────────────────
  const [query, setQuery] = useState(
    initialQuery ?? searchParams.get('q') ?? searchParams.get('search') ?? searchParams.get('query') ?? '',
  );
  const [domainFilter, setDomainFilter] = useState(searchParams.get('domain') ?? '');
  const [locationFilter, setLocationFilter] = useState(searchParams.get('location') ?? '');
  const [page, setPage] = useState(1);

  // ── Server data state ───────────────────────────────────────────────────
  const [internships, setInternships] = useState<Internship[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Saved internship IDs ────────────────────────────────────────────────
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // ── Debounce ref for search ─────────────────────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch from API ──────────────────────────────────────────────────────
  const fetchInternships = useCallback(
    async (q: string, domain: string, location: string, pg: number) => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (q)        params.set('q', q);
      if (domain)   params.set('domain', domain);
      if (location) params.set('location', location);
      params.set('page', String(pg));
      params.set('limit', '12');

      try {
        const res = await fetch(`/api/internships?${params.toString()}`);
        if (res.status === 429) {
          const retryAfter = res.headers.get('Retry-After') ?? '60';
          setError(`Rate limit exceeded — please wait ${retryAfter}s before retrying.`);
          setLoading(false);
          return;
        }
        if (!res.ok) {
          setError('Failed to load internships. Please try again.');
          setLoading(false);
          return;
        }
        const data = await res.json();
        setInternships(data.internships ?? []);
        setPagination(data.pagination ?? null);
      } catch {
        setError('Network error — please check your connection.');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // ── On mount: load saved application IDs ───────────────────────────────
  useEffect(() => {
    const loadSaved = async () => {
      try {
        const res = await fetch('/api/applications');
        if (!res.ok) return;
        const data = await res.json();
        const saved: string[] = (data.applications ?? [])
          .filter((a: { status: string }) => a.status === 'saved')
          .map((a: { internshipId: string }) => a.internshipId);
        setSavedIds(new Set(saved));
      } catch {
        // non-fatal — user just won't see bookmark state
      }
    };

    loadSaved();

    const handler = () => loadSaved();
    window.addEventListener('devstart:state-change', handler);
    return () => window.removeEventListener('devstart:state-change', handler);
  }, []);

  // ── Debounced fetch on filter change ───────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchInternships(query, domainFilter, locationFilter, 1);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, domainFilter, locationFilter]);

  // ── Page change ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetchInternships(query, domainFilter, locationFilter, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // ── Bookmark toggle ─────────────────────────────────────────────────────
  const toggleBookmark = async (id: string) => {
    const isBookmarked = savedIds.has(id);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (isBookmarked) next.delete(id); else next.add(id);
      return next;
    });

    if (!isBookmarked) {
      try {
        await fetch('/api/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ internshipId: id, status: 'saved' }),
        });
        window.dispatchEvent(new Event('devstart:state-change'));
      } catch {
        // revert optimistic update
        setSavedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    }
  };

  // ── Click logging (fire-and-forget — no redirect) ───────────────────────
  const logClick = (id: string) => {
    // Non-blocking: we don't await, and we don't route via /redirect
    fetch('/api/internships/log-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ internshipId: id }),
    }).catch(() => {
      // intentionally silent — analytics must never break navigation
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Free-text search */}
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/70 pointer-events-none">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </span>
          <input
            id="internship-search"
            type="text"
            placeholder="Search title, company, or description…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-foreground/5 border border-foreground/10 rounded-full text-foreground text-sm
                       placeholder:text-foreground/30 focus:outline-none focus:border-foreground/30 transition-colors"
          />
        </div>

        {/* Domain filter */}
        <select
          id="internship-domain-filter"
          value={domainFilter}
          onChange={(e) => setDomainFilter(e.target.value)}
          className="px-4 py-3 bg-foreground/5 border border-foreground/10 rounded-full text-foreground/70 text-sm
                     focus:outline-none focus:border-foreground/30 transition-colors appearance-none cursor-pointer min-w-[140px]"
        >
          <option value="">All Domains</option>
          <option value="frontend">Frontend</option>
          <option value="backend">Backend</option>
          <option value="fullstack">Full Stack</option>
          <option value="ml">ML / AI</option>
          <option value="mobile">Mobile</option>
          <option value="devops">DevOps</option>
        </select>

        {/* Location filter */}
        <select
          id="internship-location-filter"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="px-4 py-3 bg-foreground/5 border border-foreground/10 rounded-full text-foreground/70 text-sm
                     focus:outline-none focus:border-foreground/30 transition-colors appearance-none cursor-pointer min-w-[140px]"
        >
          <option value="">All Locations</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="on-site">On-site</option>
        </select>
      </div>

      {/* Results count */}
      <p className="text-muted/70 text-xs">
        {loading
          ? 'Loading…'
          : pagination
            ? `${pagination.total} internship${pagination.total !== 1 ? 's' : ''} found${query ? ` for "${query}"` : ''}`
            : ''}
      </p>

      {/* Error banner */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Cards grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : internships.length > 0 ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${query}-${domainFilter}-${locationFilter}-${page}`}
            className="grid sm:grid-cols-2 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {internships.map((item) => (
              <InternshipCard
                key={item.id}
                item={item}
                savedIds={savedIds}
                onToggleBookmark={toggleBookmark}
                onClickLog={logClick}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      ) : (
        !error && (
          <div className="text-center py-16 text-muted/70">
            No internships match your search. Try a different term.
          </div>
        )
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && !loading && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <button
            id="pagination-prev"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!pagination.hasPrevPage}
            className="px-4 py-2 text-sm rounded-full border border-foreground/10 text-muted
                       hover:bg-foreground/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            ← Prev
          </button>

          <span className="text-muted/70 text-sm">
            {pagination.page} / {pagination.totalPages}
          </span>

          <button
            id="pagination-next"
            onClick={() => setPage((p) => p + 1)}
            disabled={!pagination.hasNextPage}
            className="px-4 py-2 text-sm rounded-full border border-foreground/10 text-muted
                       hover:bg-foreground/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
