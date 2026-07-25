'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';

/* -------------------------------------------------------------------------- */
/*  AnimatedNavLink — hover slides duplicate text upward (DESIGN_SYSTEM.md)  */
/* -------------------------------------------------------------------------- */

interface AnimatedNavLinkProps {
  href: string;
  children: React.ReactNode;
}

function AnimatedNavLink({ href, children }: AnimatedNavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        'group relative inline-block text-xs lg:text-sm leading-5 overflow-hidden',
        isActive ? 'text-foreground' : 'text-muted',
      )}
      style={{ height: '1.25rem' }}
    >
      <span className="block transition-transform duration-[400ms] ease-out group-hover:-translate-y-full">
        {children}
      </span>
      <span
        className={cn(
          'absolute left-0 top-full block transition-transform duration-[400ms] ease-out group-hover:-translate-y-full text-foreground',
        )}
        aria-hidden="true"
      >
        {children}
      </span>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*  SiteNav — persistent nav bar, shared across all routes                   */
/* -------------------------------------------------------------------------- */

export function SiteNav() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [headerShapeClass, setHeaderShapeClass] = useState('rounded-full');
  const shapeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auth State from Supabase
  const supabase = createClient();
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUser(session?.user ?? null);
      setIsAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ?? null);
      setIsAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isLoggedIn = !!sessionUser;
  const userEmail = sessionUser?.email || '';
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close dropdown on click outside
    const clickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };

    window.addEventListener('click', clickOutside);

    return () => {
      window.removeEventListener('click', clickOutside);
    };
  }, []);

  useEffect(() => {
    if (shapeTimeoutRef.current) clearTimeout(shapeTimeoutRef.current);

    if (isOpen) {
      setHeaderShapeClass('rounded-xl');
    } else {
      shapeTimeoutRef.current = setTimeout(() => {
        setHeaderShapeClass('rounded-full');
      }, 300);
    }

    return () => {
      if (shapeTimeoutRef.current) clearTimeout(shapeTimeoutRef.current);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const logoElement = (
    <Link href={isLoggedIn ? '/dashboard' : '/'} className="flex items-center gap-2 group relative" aria-label="Home">
      {/* Soft gradient/glow accent behind the logo */}
      {isLoggedIn && (
        <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      )}
      <div className={cn("relative flex items-center justify-center shrink-0", isLoggedIn ? "w-5 h-5" : "w-5 h-5")}>
        <div className="absolute inset-0 bg-foreground/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <span className={cn("absolute rounded-full bg-foreground top-0 left-1/2 transform -translate-x-1/2 transition-all duration-300 group-hover:-translate-y-0.5", isLoggedIn ? "w-1.5 h-1.5" : "w-1.5 h-1.5")} />
        <span className={cn("absolute rounded-full bg-foreground left-0 top-1/2 transform -translate-y-1/2 transition-all duration-300 group-hover:-translate-x-0.5", isLoggedIn ? "w-1.5 h-1.5" : "w-1.5 h-1.5")} />
        <span className={cn("absolute rounded-full bg-foreground right-0 top-1/2 transform -translate-y-1/2 transition-all duration-300 group-hover:translate-x-0.5", isLoggedIn ? "w-1.5 h-1.5" : "w-1.5 h-1.5")} />
        <span className={cn("absolute rounded-full bg-foreground bottom-0 left-1/2 transform -translate-x-1/2 transition-all duration-300 group-hover:translate-y-0.5", isLoggedIn ? "w-1.5 h-1.5" : "w-1.5 h-1.5")} />
        <span className={cn("absolute rounded-full bg-foreground/50", isLoggedIn ? "w-1 h-1" : "w-1 h-1")} />
      </div>
      <span className={cn("text-foreground font-bold tracking-[-0.02em] select-none", isLoggedIn ? "text-base" : "text-sm")}>
        Devstart
      </span>
    </Link>
  );

  const navLinksData = [
    { label: 'About Us', href: '/about' },
    { label: 'Features', href: '/features' },
    { label: 'Browse Internships', href: '/internships' },
    { label: 'FAQs', href: '/faq' },
  ];

  // Auth buttons: navigate to root with flow query param
  const loginButton = (
    <button
      id="nav-login-btn"
      onClick={() => router.push('/?flow=login')}
      className="px-2.5 py-1.5 lg:px-4 lg:py-2 text-xs lg:text-sm rounded-full transition-all duration-200 w-full md:w-auto border border-[#333] bg-[rgba(31,31,31,0.62)] text-muted hover:border-foreground/50 hover:text-foreground cursor-pointer"
    >
      LogIn
    </button>
  );

  const signupButton = (
    <button
      id="nav-signup-btn"
      onClick={() => router.push('/?flow=signup')}
      className="px-2.5 py-1.5 lg:px-4 lg:py-2 text-xs lg:text-sm rounded-full transition-all duration-200 z-10 w-full md:w-auto bg-foreground text-black font-medium hover:bg-foreground/90 cursor-pointer"
    >
      Sign up to Devstart
    </button>
  );

  if (isAuthLoading) {
    return null;
  }

  return (
    <header
      className={cn(
        'fixed z-20',
        isLoggedIn
          ? 'top-0 left-0 w-full h-[72px] flex items-center justify-center backdrop-blur-md bg-black/40 border-b border-white/5 transition-all duration-300'
          : cn(
              'top-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center transition-[border-radius,background-color] duration-300',
              'pl-6 pr-6 py-3 backdrop-blur-sm',
              headerShapeClass,
              'border border-[#333] bg-[#1f1f1f57]',
              'w-[calc(100%-2rem)] md:w-auto'
            )
      )}
    >
      {/* Desktop row */}
      <div className={cn("flex items-center justify-between w-full gap-x-3 md:gap-x-6 lg:gap-x-8", isLoggedIn ? "max-w-7xl mx-auto px-6 h-full" : "px-6")}>
        <div className="flex items-center">{logoElement}</div>

        {!isLoggedIn && (
          <nav className="hidden md:flex items-center space-x-3 lg:space-x-6 text-xs lg:text-sm">
            {navLinksData.map((link) => (
              <AnimatedNavLink key={link.href} href={link.href}>
                {link.label === 'Browse Internships' ? (
                  <>
                    <span className="hidden lg:inline">Browse </span>Internships
                  </>
                ) : (
                  link.label
                )}
              </AnimatedNavLink>
            ))}
          </nav>
        )}

        <div className={cn("flex items-center gap-1.5 lg:gap-3", !isLoggedIn && "hidden md:flex")}>
          {isLoggedIn ? (
            <div className="flex items-center relative" ref={dropdownRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDropdownOpen(!dropdownOpen);
                }}
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer select-none relative',
                  dropdownOpen
                    ? 'bg-white/10 text-foreground ring-2 ring-white/20 ring-offset-1 ring-offset-black'
                    : 'bg-transparent text-muted hover:text-foreground hover:bg-white/5 hover:ring-2 hover:ring-white/10 hover:ring-offset-1 hover:ring-offset-black'
                )}
                aria-label="Profile Menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
              
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="absolute right-0 top-full mt-3 w-56 rounded-xl border border-[#333] bg-[#121212] shadow-2xl z-30 overflow-hidden origin-top-right"
                  >
                    {/* Top pointy arrow */}
                    <div className="absolute -top-[6px] right-6 w-2.5 h-2.5 bg-[#121212] border-t border-l border-[#333] rotate-45" />

                    {/* User info */}
                    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#1c1c1c]">
                      <div className="w-7 h-7 rounded-full border border-[#1c1c1c] bg-[#121212] flex items-center justify-center text-foreground/70 shrink-0">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">Account</p>
                        <p className="text-[10px] text-muted/70 truncate">{userEmail}</p>
                      </div>
                    </div>

                    {/* Nav items */}
                    <div className="p-1.5">
                      <Link
                        href="/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted hover:text-foreground hover:bg-foreground/5 transition-all"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Dashboard
                      </Link>
                      <Link
                        href="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted hover:text-foreground hover:bg-foreground/5 transition-all"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Profile &amp; Preferences
                      </Link>
                    </div>

                    {/* Logout */}
                    <div className="p-1.5 border-t border-[#1c1c1c]">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted/80 hover:text-red-400 hover:bg-red-500/8 transition-all cursor-pointer"
                      >
                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <>
              {loginButton}
              {signupButton}
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        {!isLoggedIn && (
          <button
            className="md:hidden flex items-center justify-center w-8 h-8 text-muted focus:outline-none"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'Close Menu' : 'Open Menu'}
          >
            {isOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* Mobile dropdown */}
      {!isLoggedIn && (
        <div
          className={cn(
            'md:hidden flex flex-col items-center w-full transition-all ease-in-out duration-300 overflow-hidden',
            isOpen ? 'max-h-[1000px] opacity-100 pt-4' : 'max-h-0 opacity-0 pt-0 pointer-events-none',
          )}
        >
          <nav className="flex flex-col items-center space-y-4 text-base w-full">
            {navLinksData.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="text-muted hover:text-foreground transition-colors w-full text-center"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex flex-col items-center space-y-4 mt-4 w-full">
            {loginButton}
            {signupButton}
          </div>
        </div>
      )}
    </header>
  );
}
