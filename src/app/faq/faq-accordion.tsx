'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
} as const;

const FAQS = [
  {
    q: 'Who can apply to internships on Devstart?',
    a: 'Any developer can apply — whether you\'re a CS student, a bootcamp graduate, or self-taught. We don\'t gatekeep by degree or prior experience. If you can write code and want to grow, Devstart is for you.',
  },
  {
    q: 'Is Devstart free for developers?',
    a: 'Yes, completely free. Devstart has been and always will be free for developers to browse listings, submit applications, and use all platform features. We charge companies, not candidates.',
  },
  {
    q: 'How are internship listings vetted?',
    a: 'Our team manually reviews every company before approving their listings. We verify that the role is real, the stipend (if any) is accurately stated, and the company can support a dev intern. Listings that don\'t pass review never go live.',
  },
  {
    q: 'How do companies post an opening on Devstart?',
    a: 'Companies apply through our company portal. After we verify the company\'s details and review their first listing, they get access to post roles directly. There\'s no unlimited self-serve posting — every listing still goes through a final check.',
  },
  {
    q: 'What happens after I submit an application?',
    a: 'Your application goes directly to the hiring team. You\'ll see the status update in your Application Tracker dashboard. Most companies respond within 5–10 business days. If you\'re shortlisted, you\'ll be contacted through our platform messaging.',
  },
  {
    q: 'What if I don\'t hear back from a company?',
    a: 'If there\'s no status update after 14 calendar days, we follow up with the company on your behalf and flag the listing for review. Ghosting applicants is grounds for suspension from our platform.',
  },
  {
    q: 'Are international and remote internships available?',
    a: 'Yes. We have listings from companies in North America, Europe, and Asia-Pacific, as well as fully-remote roles with no geographic restrictions. Filter by "Remote" in the Browse Internships page to see what\'s available worldwide.',
  },
  {
    q: 'Can I apply to multiple internships at once?',
    a: 'Yes — there\'s no cap on the number of simultaneous applications. We actually encourage applying to several roles at once. Your applications are private; companies cannot see who else you\'ve applied to.',
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <motion.div
      className="space-y-3"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {FAQS.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <motion.div
            key={i}
            variants={itemVariants}
            className={cn(
              'rounded-2xl border transition-colors duration-200',
              isOpen ? 'border-[#333] bg-[#121212]' : 'border-[#1c1c1c] bg-[#090909]',
            )}
          >
            <button
              id={`faq-btn-${i}`}
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left"
              aria-expanded={isOpen}
            >
              <span className={cn('text-sm font-medium leading-snug transition-colors duration-200', isOpen ? 'text-foreground' : 'text-foreground/70')}>
                {item.q}
              </span>
              <span
                className={cn(
                  'shrink-0 w-5 h-5 text-muted/70 transition-transform duration-400 ease-out',
                  isOpen ? 'rotate-180' : 'rotate-0',
                )}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-5">
                    <p className="text-muted/80 text-sm leading-relaxed">{item.a}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
