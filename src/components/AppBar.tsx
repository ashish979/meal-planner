'use client';

import Link from 'next/link';

interface AppBarProps {
  showBackButton?: boolean;
  backHref?: string;
  title?: string;
  rightContent?: React.ReactNode;
  hideLogo?: boolean;
}

export default function AppBar({ showBackButton, backHref = '/', title, rightContent, hideLogo }: AppBarProps) {
  return (
    <header className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-40 shadow-soft">
      <div className="px-4 sm:px-6 py-3">
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
            
            {/* Logo - only show on mobile when hideLogo is false */}
            {!hideLogo && (
              <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity md:hidden">
                {/* Indian Thali Icon */}
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center shadow-soft">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
                    <circle cx="12" cy="12" r="6" strokeWidth="1.5" />
                    <circle cx="7" cy="9" r="2" strokeWidth="1.5" />
                    <circle cx="17" cy="9" r="2" strokeWidth="1.5" />
                    <circle cx="7" cy="15" r="2" strokeWidth="1.5" />
                    <circle cx="17" cy="15" r="2" strokeWidth="1.5" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-[var(--foreground)]">
                  Meal Planner
                </span>
              </Link>
            )}

            {/* Title for inner pages */}
            {title && (
              <h1 className="text-lg font-semibold text-[var(--foreground)]">{title}</h1>
            )}
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
