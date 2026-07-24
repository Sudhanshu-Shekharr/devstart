'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { PageTransition } from '@/components/page-transition';
import { DottedSurface } from '@/components/dotted-surface';

export default function SubmitInternshipPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title'),
      company: formData.get('company'),
      domain: formData.get('domain')?.toString().split(',').map(s => s.trim()).filter(Boolean) || [],
      skills: formData.get('skills')?.toString().split(',').map(s => s.trim()).filter(Boolean) || [],
      location: formData.get('location'),
      stipend: formData.get('stipend'),
      applyUrl: formData.get('applyUrl'),
      deadline: formData.get('deadline'),
      description: formData.get('description'),
    };

    try {
      const res = await fetch('/api/internships/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'Failed to submit internship');
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push('/internships');
        }, 2000);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageTransition>
      <main className="min-h-screen pt-48 pb-20 px-6 relative flex flex-col items-center">
        <DottedSurface className="absolute inset-0 z-[-1] opacity-50" />
        
        <div className="w-full max-w-2xl mx-auto z-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="mb-10 text-center"
          >
            <h1 className="text-[2.5rem] font-bold leading-[1.1] tracking-tight text-foreground mb-4">
              Submit an Internship
            </h1>
            <p className="text-lg text-foreground/70 font-light">
              Add a new opportunity to the platform. We verify all submissions.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
            className="bg-[#090909] border border-[#1c1c1c] rounded-2xl p-6 md:p-8"
          >
            {success ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-foreground/10 rounded-full flex items-center justify-center mx-auto mb-6 text-foreground text-2xl">
                  ✓
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Submission Successful!</h2>
                <p className="text-muted/80">Redirecting to internships...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm">
                    {error}
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs text-muted/70 uppercase tracking-wider font-semibold">Title</label>
                    <input
                      name="title"
                      required
                      placeholder="e.g. Frontend Engineer Intern"
                      className="w-full bg-[#111] border border-[#1c1c1c] text-foreground placeholder-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-[#333] transition-colors"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs text-muted/70 uppercase tracking-wider font-semibold">Company</label>
                    <input
                      name="company"
                      required
                      placeholder="e.g. Vercel"
                      className="w-full bg-[#111] border border-[#1c1c1c] text-foreground placeholder-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-[#333] transition-colors"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs text-muted/70 uppercase tracking-wider font-semibold">Location</label>
                    <input
                      name="location"
                      placeholder="e.g. Remote, San Francisco"
                      className="w-full bg-[#111] border border-[#1c1c1c] text-foreground placeholder-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-[#333] transition-colors"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs text-muted/70 uppercase tracking-wider font-semibold">Stipend (Optional)</label>
                    <input
                      name="stipend"
                      placeholder="e.g. $8,000/mo"
                      className="w-full bg-[#111] border border-[#1c1c1c] text-foreground placeholder-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-[#333] transition-colors"
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs text-muted/70 uppercase tracking-wider font-semibold">Apply URL</label>
                    <input
                      name="applyUrl"
                      type="url"
                      required
                      placeholder="https://..."
                      className="w-full bg-[#111] border border-[#1c1c1c] text-foreground placeholder-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-[#333] transition-colors"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs text-muted/70 uppercase tracking-wider font-semibold">Domains (comma separated)</label>
                    <input
                      name="domain"
                      placeholder="e.g. Frontend, Fullstack"
                      className="w-full bg-[#111] border border-[#1c1c1c] text-foreground placeholder-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-[#333] transition-colors"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs text-muted/70 uppercase tracking-wider font-semibold">Skills (comma separated)</label>
                    <input
                      name="skills"
                      placeholder="e.g. React, TypeScript, Node.js"
                      className="w-full bg-[#111] border border-[#1c1c1c] text-foreground placeholder-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-[#333] transition-colors"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs text-muted/70 uppercase tracking-wider font-semibold">Deadline (Optional)</label>
                    <input
                      name="deadline"
                      type="date"
                      className="w-full bg-[#111] border border-[#1c1c1c] text-foreground placeholder-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-[#333] transition-colors"
                    />
                  </div>
                  
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-xs text-muted/70 uppercase tracking-wider font-semibold">Description</label>
                    <textarea
                      name="description"
                      rows={4}
                      placeholder="Brief details about the role..."
                      className="w-full bg-[#111] border border-[#1c1c1c] text-foreground placeholder-white/20 rounded-xl px-4 py-3 focus:outline-none focus:border-[#333] transition-colors resize-none"
                    ></textarea>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-foreground text-black font-bold py-3.5 px-6 rounded-xl hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Submitting...' : 'Submit Internship'}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      </main>
    </PageTransition>
  );
}
