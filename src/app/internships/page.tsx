import type { Metadata } from 'next';
import { PageTransition } from '@/components/page-transition';
import { InternshipListings } from './internship-listings';

export const metadata: Metadata = {
  title: 'Browse Internships — Devstart',
  description:
    'Browse curated developer internship opportunities across frontend, backend, ML, mobile, DevOps, and full stack roles. Filter by role, company, or tech stack.',
};

export default function InternshipsPage() {
  return (
    <PageTransition className="min-h-screen pt-48 pb-20 px-6">
      <div className="max-w-4xl mx-auto space-y-10">

        {/* Header */}
        <section className="space-y-3">
          <h1 className="text-[2.5rem] font-bold leading-[1.1] tracking-tight text-foreground">
            Browse Internships
          </h1>
          <p className="text-muted/80 text-base font-light">
            Curated, verified openings updated weekly. Apply directly — no recruiter required.
          </p>
        </section>

        {/* Listings (client component with search) */}
        <InternshipListings />

      </div>
    </PageTransition>
  );
}
