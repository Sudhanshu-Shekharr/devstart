'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  internship: {
    role: string;
    company: string;
    id: number | string;
  } | null;
  onSubmitSuccess: (role: string, company: string) => void;
}

export function ApplicationModal({ isOpen, onClose, internship, onSubmitSuccess }: ApplicationModalProps) {
  const [name, setName] = useState('User');
  const [email, setEmail] = useState('');
  const [resumeName, setResumeName] = useState('resume_july_2026.pdf');
  const [pitch, setPitch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.email) {
          setEmail(session.user.email);
          setName(session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'User');
        }
      });
      setIsSuccess(false);
      setIsSubmitting(false);
      setPitch('');
    }
  }, [isOpen]);

  if (!internship) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API request delay
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      
      // Callback to parent to update parent state/localStorage
      setTimeout(() => {
        onSubmitSuccess(internship.role, internship.company);
        onClose();
      }, 1500);
    }, 1800);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.15 }}
            className="relative w-full max-w-lg rounded-2xl border border-[#333] bg-[#090909] p-6 shadow-2xl overflow-hidden"
          >
            {/* Top design highlight */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-border-strong via-muted to-border-strong" />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted/70 hover:text-foreground transition-colors cursor-pointer"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <AnimatePresence mode="wait">
              {!isSuccess ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-5"
                >
                  <div>
                    <span className="text-[10px] text-muted/70 uppercase tracking-[0.2em] font-semibold">Applying for</span>
                    <h2 className="text-xl font-bold text-foreground tracking-tight mt-0.5">{internship.role}</h2>
                    <p className="text-sm text-muted/80">{internship.company}</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name & Email fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-muted/80 uppercase tracking-wider font-semibold">Full Name</label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-black border border-[#1c1c1c] rounded-xl py-2 px-3 text-foreground text-xs placeholder:text-muted/40 focus:outline-none focus:border-foreground/30 transition-colors"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-muted/80 uppercase tracking-wider font-semibold">Email Address</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-black border border-[#1c1c1c] rounded-xl py-2 px-3 text-foreground text-xs placeholder:text-muted/40 focus:outline-none focus:border-foreground/30 transition-colors"
                          required
                        />
                      </div>
                    </div>

                    {/* Resume Upload Box */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-muted/80 uppercase tracking-wider font-semibold">Resume / CV</label>
                      <div className="border border-dashed border-[#333] hover:border-foreground/30 rounded-xl p-4 bg-background/50 text-center transition-colors cursor-pointer group">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <svg className="w-5 h-5 text-foreground/30 group-hover:text-muted transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                          <span className="text-xs text-foreground font-medium">{resumeName}</span>
                          <span className="text-[10px] text-foreground/30">Click or drag new PDF to update</span>
                        </div>
                      </div>
                    </div>

                    {/* Short Pitch */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-muted/80 uppercase tracking-wider font-semibold">
                        Why are you a good fit? (Optional)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Briefly describe your relevant experience, projects, or why you're interested in this role..."
                        value={pitch}
                        onChange={(e) => setPitch(e.target.value)}
                        className="w-full bg-black border border-[#1c1c1c] rounded-xl py-2 px-3 text-foreground text-xs placeholder:text-muted/40 focus:outline-none focus:border-foreground/30 transition-colors resize-none leading-relaxed"
                      />
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full rounded-full bg-foreground text-black font-semibold py-2.5 hover:bg-foreground/90 disabled:bg-border-strong disabled:text-neutral-500 transition-all duration-200 text-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Submitting Application...</span>
                        </>
                      ) : (
                        'Submit Application'
                      )}
                    </button>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="py-8 text-center space-y-4"
                >
                  <div className="mx-auto w-12 h-12 rounded-full bg-foreground flex items-center justify-center shadow-lg">
                    <svg className="h-6 w-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">Application Submitted!</h3>
                    <p className="text-xs text-muted/80 mt-1">
                      Your profile has been shared with {internship.company}.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
