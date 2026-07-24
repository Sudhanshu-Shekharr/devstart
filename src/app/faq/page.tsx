import type { Metadata } from 'next';
import { PageTransition } from '@/components/page-transition';
import { FaqAccordion } from './faq-accordion';

export const metadata: Metadata = {
  title: 'FAQs — Devstart',
  description:
    'Got questions about Devstart? Find answers about who can apply, how listings are vetted, how companies post roles, and what happens after you apply.',
};

export default function FaqPage() {
  return (
    <PageTransition className="min-h-screen pt-48 pb-20 px-6">
      <div className="max-w-2xl mx-auto space-y-10">

        {/* Header */}
        <section className="space-y-3">
          <h1 className="text-[2.5rem] font-bold leading-[1.1] tracking-tight text-foreground">
            Frequently Asked<br />Questions
          </h1>
          <p className="text-muted/80 text-base font-light">
            Everything you need to know before you start applying.
          </p>
        </section>

        {/* Accordion */}
        <FaqAccordion />

        {/* Footer nudge */}
        <section className="text-center pt-4">
          <p className="text-muted/70 text-sm">
            Still have questions?{' '}
            <a href="mailto:hello@devstart.dev" className="text-muted underline hover:text-foreground transition-colors duration-200">
              Drop us a line
            </a>
            {' '}and we&apos;ll get back to you within 24 hours.
          </p>
        </section>

      </div>
    </PageTransition>
  );
}
