'use client';

import Link from 'next/link';
import Image from 'next/image';

interface AppBarProps {
  showBackButton?: boolean;
  backHref?: string;
  rightContent?: React.ReactNode;
}

export default function AppBar({ showBackButton, backHref = '/', rightContent }: AppBarProps) {
  return (
    <header className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-40 shadow-soft">
      <div className="container mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left side - Logo and back button */}
          <div className="flex items-center gap-3">
            {showBackButton && (
              <Link
                href={backHref}
                className="p-2 -ml-2 hover:bg-[var(--surface-secondary)] rounded-xl transition-colors"
              >
                <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
            )}
            
            {/* Clickable Logo */}
            <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
              <Image
                src="/logo.svg"
                alt="Meal Planner"
                width={36}
                height={36}
                className="w-9 h-9"
              />
              <span className="text-lg sm:text-xl font-semibold text-[var(--foreground)] hidden sm:inline">
                Meal Planner
              </span>
            </Link>
          </div>

          {/* Right side - Custom content */}
          {rightContent && (
            <div className="flex items-center gap-2 sm:gap-3">
              {rightContent}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
