'use client';

import { PageTransition } from '@/components/page-transition';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
} as const;

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-foreground">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
    title: 'Curated Internship Matching',
    description:
      'We surface only verified, high-quality internship openings that match your stack and experience level. No irrelevant noise — just roles you can actually land.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-foreground">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    title: 'Application Tracker',
    description:
      'Monitor every application in one dashboard — applied, in review, interview scheduled, offer received. Never lose track of where you stand with a company.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-foreground">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
      </svg>
    ),
    title: 'Direct Hiring-Team Messaging',
    description:
      'Message the engineers and recruiters behind a posting without going through an agency. Real conversations, faster decisions — no middleman taking a cut.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-foreground">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
      </svg>
    ),
    title: 'Skill-Based Filtering',
    description:
      'Filter by programming language, framework, role type, location, and stipend. Find internships that actually fit your current skill set — not just any listing.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6 text-foreground">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: 'Resume & Portfolio Review',
    description:
      'Submit your resume and GitHub profile for async review by senior developers on our team. Get concrete, actionable feedback before you send a single application.',
  },
];

export default function FeaturesPage() {
  return (
    <PageTransition className="min-h-screen pt-48 pb-20 px-6">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Hero */}
        <section className="text-center space-y-4">
          <h1 className="text-[2.5rem] font-bold leading-[1.1] tracking-tight text-foreground">
            Everything You Need to<br />Get Your First Role
          </h1>
          <p className="text-lg text-foreground/70 font-light max-w-xl mx-auto">
            Devstart is purpose-built for early-career developers. Every feature
            exists to reduce friction between you and your first internship offer.
          </p>
        </section>



        {/* Feature Grid */}
        <section>
          <motion.div
            className="grid sm:grid-cols-2 gap-5"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className={`group flex flex-col gap-5 rounded-2xl border border-[#1c1c1c] bg-[#121212] p-7 hover:bg-[#1a1a1a] hover:border-[#333] transition-all duration-300 ${
                  // Last item spans full width on odd total count
                  i === features.length - 1 && features.length % 2 !== 0
                    ? 'sm:col-span-2'
                    : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-foreground/10 flex items-center justify-center shrink-0">
                    {feature.icon}
                  </div>
                  <h2 className="text-foreground font-semibold text-base leading-snug">{feature.title}</h2>
                </div>
                <p className="text-muted/80 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* CTA */}
        <section className="text-center space-y-4 pt-4">
          <p className="text-muted/80 text-sm">
            More features shipping soon — follow our progress or sign up to get early access.
          </p>
        </section>

      </div>
    </PageTransition>
  );
}
