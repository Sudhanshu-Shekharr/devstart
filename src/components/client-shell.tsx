'use client';

import React from 'react';
import { DottedSurface } from '@/components/dotted-surface';
import { SiteNav } from '@/components/site-nav';

/* -------------------------------------------------------------------------- */
/*  ClientShell — mounts DottedSurface + SiteNav once for all routes.        */
/*  Lives in the root layout (server component) as a client boundary.        */
/* -------------------------------------------------------------------------- */

interface ClientShellProps {
  children: React.ReactNode;
}

export function ClientShell({ children }: ClientShellProps) {
  return (
    <div className="relative min-h-screen bg-black flex flex-col">
      {/* Particle background — fixed, never unmounts across route changes */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <DottedSurface />
      </div>

      {/* Nav bar — fixed position, always visible */}
      <SiteNav />

      {/* Page content — swaps on navigation */}
      <div className="flex flex-col flex-1">
        {children}
      </div>
    </div>
  );
}
