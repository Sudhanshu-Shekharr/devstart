'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ApplicationModal } from '@/components/application-modal';
import { InboxDrawer } from '@/components/inbox-drawer';
import { ResumeUploadModal } from '@/components/resume-upload-modal';
import { KanbanBoard, ApplicationItem, ApplicationStatus } from '@/components/kanban-board';
import { InternshipListings } from '@/app/internships/internship-listings';

/* -------------------------------------------------------------------------- */
/*  Mock / placeholder data                                                    */
/* -------------------------------------------------------------------------- */

const recommendedInternships = [
  {
    id: 1,
    role: 'Frontend Engineer Intern',
    company: 'Luminary Labs',
    tags: ['React', 'TypeScript', 'Remote'],
    match: '97% match — strong React & TypeScript alignment with your profile.',
  },
  {
    id: 2,
    role: 'Full-Stack Developer Intern',
    company: 'Stackform',
    tags: ['Node.js', 'PostgreSQL', 'Hybrid'],
    match: '91% match — your Node.js and expertise with PostgreSql makes up for a great fit here.',
  },
  {
    id: 3,
    role: 'Backend Engineer Intern',
    company: 'Orbital Systems',
    tags: ['Python', 'FastAPI', 'On-site'],
    match: '88% match — your API projects stand out for this role.',
  },
  {
    id: 4,
    role: 'Dev Tools Engineer Intern',
    company: 'Codeshift',
    tags: ['Rust', 'CLI', 'Remote'],
    match: '82% match — CLI projects in your portfolio are a great signal.',
  },
];

type PipelineStage = 'Applied' | 'In Review' | 'Interview Scheduled' | 'Offer Received';

const stageStyle: Record<PipelineStage, { border: string; text: string; bg: string }> = {
  Applied:               { border: 'border-[#333]',   text: 'text-muted/80', bg: 'bg-foreground/5' },
  'In Review':           { border: 'border-foreground/20', text: 'text-foreground/70', bg: 'bg-foreground/[0.08]' },
  'Interview Scheduled': { border: 'border-foreground/40', text: 'text-foreground/90', bg: 'bg-foreground/10' },
  'Offer Received':      { border: 'border-foreground',    text: 'text-foreground',    bg: 'bg-foreground/20' },
};

const messages = [
  {
    id: 1,
    from: 'Priya Sharma',
    company: 'Luminary Labs',
    snippet: 'Hi! We loved your portfolio. Would you be available for a 30-min call this week?',
    time: '2h ago',
  },
  {
    id: 2,
    from: 'Marcus Lee',
    company: 'Stackform',
    snippet: "Congrats on making it to the technical round! Here's what to expect…",
    time: '1d ago',
  },
  {
    id: 3,
    from: 'Aisha Rauf',
    company: 'Nexus Cloud',
    snippet: "We've reviewed your application and have a few follow-up questions.",
    time: '3d ago',
  },
];

const reviewStatus = {
  reviewer: 'Jordan Kim',
  role: 'Senior Engineer @ Stripe',
  suggestions: 2,
  note: '"Strong project descriptions. Quantify impact and trim the skills list to your top 6."',
  updatedAt: 'Jul 5, 2026',
};

const quickActions = [
  { label: 'Browse Internships', href: '/internships' },
  { label: 'Update Profile',    href: '#' },
  { label: 'Upload Resume',     href: '#' },
  { label: 'View Inbox',        href: '#' },
];

/* -------------------------------------------------------------------------- */
/*  Animation variants                                                        */
/* -------------------------------------------------------------------------- */

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
} as const;

/* -------------------------------------------------------------------------- */
/*  Dashboard Page                                                             */
/* -------------------------------------------------------------------------- */

export default function DashboardPage() {
  const router = useRouter();
  
  // Dynamic applications state for Kanban board & stats
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(true);
  const [selectedInternship, setSelectedInternship] = useState<{ role: string; company: string; id: number | string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Inbox & Resume Drawer / Modal controls
  const [isInboxOpen, setIsInboxOpen] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [resume, setResume] = useState<{ filename: string; size: string; uploadedAt: string; status: 'analyzing' | 'reviewed'; suggestions?: string[] } | null>(null);

  // Load state from API
  const loadState = async () => {
    try {
      setIsLoadingApps(true);
      const res = await fetch('/api/applications');
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);
      }
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setIsLoadingApps(false);
    }
  };

  useEffect(() => {
    loadState();
    
    const storedResume = localStorage.getItem('devstart:resume');
    if (storedResume) {
      setResume(JSON.parse(storedResume));
    }

    window.addEventListener('devstart:state-change', loadState);
    return () => window.removeEventListener('devstart:state-change', loadState);
  }, []);

  // Status update handler with optimistic UI and rollback
  const handleStatusChange = async (id: string, newStatus: ApplicationStatus) => {
    const previousApps = [...applications];

    // Optimistic update
    setApplications((prev) =>
      prev.map((app) =>
        app.id === id
          ? { ...app, status: newStatus, updatedAt: new Date().toISOString() }
          : app
      )
    );

    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        console.error('Failed to update application status, rolling back.');
        setApplications(previousApps);
      } else {
        window.dispatchEvent(new Event('devstart:state-change'));
      }
    } catch (error) {
      console.error('Network error updating status, rolling back:', error);
      setApplications(previousApps);
    }
  };

  // Resume analysis simulator (5s timer)
  useEffect(() => {
    if (resume?.status === 'analyzing') {
      const timer = setTimeout(() => {
        const updatedResume = {
          ...resume,
          status: 'reviewed' as const,
          suggestions: [
            'Quantify bullet points: add concrete percentages to your React & TypeScript metrics.',
            'Tailor profile alignment: add Node.js and AWS terms to match Stackform requirements.',
            'Trim layout: ensure descriptions are crisp and focus on your top 6 skills.'
          ]
        };
        setResume(updatedResume);
        localStorage.setItem('devstart:resume', JSON.stringify(updatedResume));
        window.dispatchEvent(new Event('devstart:state-change'));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [resume]);

  const handleApplySuccess = async (role: string, company: string) => {
    try {
      const item = recommendedInternships.find(i => i.role === role && i.company === company);
      if (!item) return;

      await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internshipId: String(item.id),
          status: 'applied'
        })
      });

      window.dispatchEvent(new Event('devstart:state-change'));
    } catch (e) {
      console.error(e);
    }
  };

  const savedIds = applications.filter((a) => a.status === 'saved').map((a) => a.internshipId);

  const toggleBookmark = async (id: string) => {
    const parsedId = id.replace('rec-', '');
    const isBookmarked = savedIds.includes(parsedId);
    
    try {
      if (!isBookmarked) {
        await fetch('/api/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            internshipId: parsedId,
            status: 'saved'
          })
        });
      }
      window.dispatchEvent(new Event('devstart:state-change'));
    } catch (e) {
      console.error(e);
    }
  };

  const handleResumeUploadSuccess = (filename: string) => {
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const newResume = {
      filename,
      size: '242 KB',
      uploadedAt: formattedDate,
      status: 'analyzing' as const
    };
    setResume(newResume);
    localStorage.setItem('devstart:resume', JSON.stringify(newResume));
    window.dispatchEvent(new Event('devstart:state-change'));
  };

  // Dynamic statistics row based on Kanban items
  const dynamicStats = [
    { label: 'Saved Internships', value: String(applications.filter(a => a.status === 'saved').length), delta: 'updated live' },
    { label: 'Applied Internships', value: String(applications.filter(a => a.status === 'applied').length), delta: 'updated live' },
    { label: 'Interviews Scheduled', value: String(applications.filter(a => a.status === 'interview').length), delta: 'Live scheduling' },
    { label: 'Offers Received', value: String(applications.filter(a => a.status === 'offer').length), delta: 'Congrats! ✉️' },
    { label: 'Profile Strength', value: '84%', delta: '+6% since last week' },
  ];

  return (
    <div className="relative min-h-screen">
      {/* Static black backdrop — covers particle canvas on /dashboard only */}
      <div className="absolute inset-0 bg-black z-0 pointer-events-none" />

      {/* All page content — above backdrop */}
      <motion.div
        className="relative z-10 pt-32 pb-20 px-6"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="max-w-7xl mx-auto space-y-10">

          {/* -------------------------------------------------------------- */}
          {/* 1. Header                                                        */}
          {/* -------------------------------------------------------------- */}
          <div className="space-y-2">
            <p className="text-muted/70 text-xs uppercase tracking-[0.2em] font-medium">Developer Portal</p>
            <h1 className="text-[2.5rem] font-bold leading-[1.1] tracking-tight text-foreground">Dashboard</h1>
            <p className="text-muted/80 text-sm font-light">
              Welcome back. Here&apos;s where your internship journey stands today.
            </p>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* 1.5. Quick Search Hero Widget                                    */}
          {/* -------------------------------------------------------------- */}
          <motion.div
            variants={itemVariants}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-[#1c1c1c] bg-[#090909] p-6 space-y-4"
          >
            <div>
              <p className="text-muted/70 text-xs uppercase tracking-[0.15em] font-medium">Find Opportunities</p>
              <h2 className="text-[1.3rem] font-bold leading-tight tracking-tight text-foreground mt-0.5">
                Search Internships
              </h2>
            </div>
            
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted/70 pointer-events-none">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </span>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) {
                  setIsSearchModalOpen(true);
                }
              }}>
                <input
                  type="text"
                  placeholder="Search by role, company, stack, or location…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-24 py-3 bg-black border border-[#1c1c1c] rounded-full text-foreground text-sm placeholder:text-foreground/30 focus:outline-none focus:border-foreground/30 transition-colors"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1.5 text-xs font-semibold text-black bg-foreground rounded-full px-4 py-2 hover:bg-foreground/90 transition-all duration-200 cursor-pointer"
                >
                  Search
                </button>
              </form>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-foreground/45 uppercase font-bold tracking-wide">Popular:</span>
              {['Remote', 'React', 'TypeScript', 'Node.js', 'Go', 'Python', 'ML'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setSearchQuery(tag);
                    setIsSearchModalOpen(true);
                  }}
                  className="text-[10px] text-muted border border-[#1c1c1c] hover:border-[#333] hover:text-foreground rounded-full px-2.5 py-1 transition-all duration-200 cursor-pointer"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </motion.div>

          {/* -------------------------------------------------------------- */}
          {/* 2. Stats Row                                                     */}
          {/* -------------------------------------------------------------- */}
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {dynamicStats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={itemVariants}
                className="rounded-2xl border border-[#1c1c1c] bg-[#090909] p-5 cursor-pointer hover:bg-[#121212] hover:border-[#333] transition-all duration-300"
              >
                <p className="text-muted/70 text-xs font-medium uppercase tracking-wider leading-snug">
                  {stat.label}
                </p>
                <p className="text-[2rem] font-bold text-foreground mt-2 leading-none tracking-tight">
                  {stat.value}
                </p>
                <p className="text-muted/70 text-xs mt-2 font-light">{stat.delta}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* -------------------------------------------------------------- */}
          {/* Main two-column layout                                           */}
          {/* -------------------------------------------------------------- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ========================================================== */}
            {/* LEFT (2/3): Recommended Internships + Application Tracker   */}
            {/* ========================================================== */}
            <div className="lg:col-span-2 space-y-6">

              {/* 3. Recommended Internships -------------------------------- */}
              <div className="rounded-2xl border border-[#1c1c1c] bg-[#090909] p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted/70 text-xs uppercase tracking-[0.15em] font-medium">Curated for You</p>
                    <h2 className="text-[1.3rem] font-bold leading-tight tracking-tight text-foreground mt-0.5">
                      Recommended Internships
                    </h2>
                  </div>
                  <button
                    onClick={() => setIsSearchModalOpen(true)}
                    className="text-xs font-semibold text-black bg-foreground rounded-full px-4 py-2 hover:bg-foreground/90 transition-all duration-200 whitespace-nowrap cursor-pointer"
                  >
                    View all →
                  </button>
                </div>

                <motion.div
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  {recommendedInternships.map((item) => {
                    const isApplied = applications.some(
                      (app) => app.internship?.title === item.role && app.internship?.company === item.company
                    );
                    const isBookmarked = savedIds.includes(`rec-${item.id}`);

                    return (
                      <motion.div
                        key={item.id}
                        variants={itemVariants}
                        className="rounded-xl border border-[#1c1c1c] bg-[#121212] p-4 space-y-3 cursor-pointer hover:bg-[#1a1a1a] hover:border-[#333] transition-all duration-300 relative"
                      >
                        <div className="pr-8">
                          <p className="text-foreground font-semibold text-sm leading-snug tracking-tight">{item.role}</p>
                          <p className="text-muted/80 text-xs mt-0.5">{item.company}</p>
                        </div>

                        {/* Bookmark Button */}
                        <button
                          onClick={() => toggleBookmark(`rec-${item.id}`)}
                          className="absolute top-4 right-4 text-muted/70 hover:text-foreground transition-colors p-1.5 rounded-full hover:bg-foreground/5 cursor-pointer"
                          title={isBookmarked ? 'Remove from Saved' : 'Save Internship'}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill={isBookmarked ? 'currentColor' : 'none'}
                            stroke="currentColor"
                            strokeWidth={1.5}
                            className="w-4 h-4"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                          </svg>
                        </button>

                        <div className="flex flex-wrap gap-1.5">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] text-muted border border-[#1c1c1c] rounded-full px-2.5 py-0.5 font-medium tracking-wide"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <p className="text-muted/70 text-xs leading-relaxed">{item.match}</p>
                        <button
                          disabled={isApplied}
                          onClick={() => {
                            setSelectedInternship({
                              id: `rec-${item.id}`,
                              role: item.role,
                              company: item.company,
                            });
                            setIsModalOpen(true);
                          }}
                          className={cn(
                            "w-full rounded-full border text-xs py-2.5 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 text-center font-medium",
                            isApplied
                              ? "bg-[#121212] text-muted/70 border-[#1c1c1c] cursor-not-allowed"
                              : "border-foreground/10 bg-transparent text-foreground/70 hover:bg-foreground hover:text-black hover:border-transparent"
                          )}
                        >
                          {isApplied ? (
                            <>
                              <svg className="w-3 h-3 text-muted/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                              </svg>
                              <span>Applied</span>
                            </>
                          ) : (
                            'View & Apply'
                          )}
                        </button>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>

              {/* 4. Application Tracker Kanban Board ---------------------- */}
              <div className="rounded-2xl border border-[#1c1c1c] bg-[#090909] p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted/70 text-xs uppercase tracking-[0.15em] font-medium">Pipeline</p>
                    <h2 className="text-[1.3rem] font-bold leading-tight tracking-tight text-foreground mt-0.5">
                      Application Tracker
                    </h2>
                  </div>
                  <p className="text-xs text-muted/70 font-light hidden sm:block">
                    Drag &amp; drop cards across columns to update status
                  </p>
                </div>

                <KanbanBoard
                  applications={applications}
                  isLoading={isLoadingApps}
                  onStatusChange={handleStatusChange}
                />
              </div>
            </div>

            {/* ========================================================== */}
            {/* RIGHT (1/3): Messages + Resume Review + Quick Actions       */}
            {/* ========================================================== */}
            <div className="space-y-6">

              {/* 5. Messages Preview --------------------------------------- */}
              <div className="rounded-2xl border border-[#1c1c1c] bg-[#090909] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted/70 text-xs uppercase tracking-[0.15em] font-medium">Hiring Teams</p>
                    <h2 className="text-[1.1rem] font-bold leading-tight tracking-tight text-foreground mt-0.5">Messages</h2>
                  </div>
                  <button
                    onClick={() => setIsInboxOpen(true)}
                    className="text-[10px] font-semibold text-black bg-foreground rounded-full px-3 py-1.5 hover:bg-foreground/90 transition-all duration-200 cursor-pointer"
                  >
                    Inbox →
                  </button>
                </div>

                <div className="space-y-2">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      onClick={() => setIsInboxOpen(true)}
                      className="rounded-xl border border-[#1c1c1c] bg-[#121212] p-3.5 space-y-1.5 cursor-pointer hover:bg-[#1a1a1a] hover:border-[#333] transition-all duration-200"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-foreground/10 border border-[#333] flex items-center justify-center shrink-0">
                            <span className="text-[9px] text-foreground/70 font-bold">
                              {msg.from.split(' ').map((n) => n[0]).join('')}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-foreground text-xs font-semibold truncate">{msg.from}</p>
                            <p className="text-muted/70 text-[10px] truncate">{msg.company}</p>
                          </div>
                        </div>
                        <span className="text-foreground/30 text-[10px] shrink-0">{msg.time}</span>
                      </div>
                      <p className="text-muted/80 text-xs leading-relaxed line-clamp-2">{msg.snippet}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 6. Resume & Portfolio Review ------------------------------ */}
              <div className="rounded-2xl border border-[#1c1c1c] bg-[#090909] p-6 space-y-4">
                <div>
                  <p className="text-muted/70 text-xs uppercase tracking-[0.15em] font-medium">Async Review</p>
                  <h2 className="text-[1.1rem] font-bold leading-tight tracking-tight text-foreground mt-0.5">
                    Resume &amp; Portfolio
                  </h2>
                </div>

                {!resume ? (
                  // Default baseline review card
                  <div className="rounded-xl border border-[#333] bg-[#121212] p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                      <span className="text-xs font-semibold text-foreground">
                        Reviewed — {reviewStatus.suggestions} suggestions
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-foreground/10 border border-[#333] flex items-center justify-center shrink-0">
                        <span className="text-[9px] text-foreground/70 font-bold">
                          {reviewStatus.reviewer.split(' ').map((n) => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="text-foreground/70 text-xs font-medium">{reviewStatus.reviewer}</p>
                        <p className="text-muted/70 text-[10px]">{reviewStatus.role}</p>
                      </div>
                    </div>
                    <p className="text-muted/80 text-xs leading-relaxed italic border-l border-[#333] pl-3">
                      {reviewStatus.note}
                    </p>
                    <p className="text-foreground/30 text-[10px]">Updated {reviewStatus.updatedAt}</p>
                  </div>
                ) : resume.status === 'analyzing' ? (
                  // Simulated uploading/analyzing loader state
                  <div className="rounded-xl border border-[#333] bg-[#121212] p-6 flex flex-col items-center justify-center text-center space-y-3">
                    <svg className="animate-spin h-6 w-6 text-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Analyzing {resume.filename}...</p>
                      <p className="text-[10px] text-muted/70 mt-1">Our automated critique scanner is reviewing formatting and metrics alignment.</p>
                    </div>
                  </div>
                ) : (
                  // Custom processed reviewed suggestions state
                  <div className="rounded-xl border border-[#333] bg-[#121212] p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
                      <span className="text-xs font-semibold text-foreground">
                        Review Complete — 3 Suggestions
                      </span>
                    </div>
                    <div className="text-[10px] text-muted/70 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="truncate">File: {resume.filename} ({resume.size})</span>
                    </div>
                    <div className="space-y-2 border-l border-[#333] pl-3">
                      {resume.suggestions?.map((s, index) => (
                        <p key={index} className="text-muted text-xs leading-relaxed">
                          • {s}
                        </p>
                      ))}
                    </div>
                    <p className="text-foreground/30 text-[10px]">Updated {resume.uploadedAt}</p>
                  </div>
                )}

                <button 
                  disabled={resume?.status === 'analyzing'}
                  onClick={() => setIsResumeModalOpen(true)}
                  className="w-full text-xs font-semibold text-foreground/70 border border-[#1c1c1c] hover:border-[#333] hover:text-foreground rounded-full py-2.5 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Upload New Version
                </button>
              </div>

              {/* 7. Quick Actions ------------------------------------------ */}
              <div className="rounded-2xl border border-[#1c1c1c] bg-[#090909] p-6 space-y-3">
                <div>
                  <p className="text-muted/70 text-xs uppercase tracking-[0.15em] font-medium">Shortcuts</p>
                  <h2 className="text-[1.1rem] font-bold leading-tight tracking-tight text-foreground mt-0.5">
                    Quick Actions
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => {
                        if (action.label === 'View Inbox') {
                          setIsInboxOpen(true);
                        } else if (action.label === 'Upload Resume') {
                          setIsResumeModalOpen(true);
                        } else if (action.label === 'Browse Internships') {
                          setIsSearchModalOpen(true);
                        } else if (action.href !== '#') {
                          router.push(action.href);
                        }
                      }}
                      className="text-xs text-center font-medium text-foreground/70 hover:text-foreground border border-[#1c1c1c] hover:border-[#333] hover:bg-[#121212] bg-[#121212] sm:bg-transparent rounded-xl px-3 py-3 transition-all duration-200 cursor-pointer"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </motion.div>

      {/* Application Form Drawer/Modal */}
      <ApplicationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        internship={selectedInternship}
        onSubmitSuccess={handleApplySuccess}
      />

      {/* Messaging Inbox Slide-over Drawer */}
      <InboxDrawer
        isOpen={isInboxOpen}
        onClose={() => setIsInboxOpen(false)}
      />

      {/* Resume Upload Modal */}
      <ResumeUploadModal
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
        onUploadSuccess={handleResumeUploadSuccess}
      />

      {/* Search Overlay Modal */}
      <AnimatePresence>
        {isSearchModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSearchModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="relative w-full max-w-5xl max-h-[90vh] rounded-2xl border border-[#333] bg-[#090909] p-6 shadow-2xl overflow-y-auto z-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-foreground">Find Opportunities</h2>
                <button
                  onClick={() => setIsSearchModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-foreground/10 text-foreground/70 hover:bg-foreground/20 hover:text-foreground transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <InternshipListings initialQuery={searchQuery} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
