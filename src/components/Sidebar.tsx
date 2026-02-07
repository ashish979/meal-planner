'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: '/',
    label: 'Calendar',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/meal-items',
    label: 'Meal Items',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  {
    href: '/meals',
    label: 'Meals',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[var(--surface)] border-r border-[var(--border)] h-screen sticky top-0">
      {/* Logo */}
      <div className="p-4 border-b border-[var(--border)]">
        <Link href="/" className="flex items-center gap-3">
          {/* Indian Thali Icon */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] flex items-center justify-center shadow-soft">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
              <circle cx="12" cy="12" r="6" strokeWidth="1.5" />
              <circle cx="7" cy="9" r="2" strokeWidth="1.5" />
              <circle cx="17" cy="9" r="2" strokeWidth="1.5" />
              <circle cx="7" cy="15" r="2" strokeWidth="1.5" />
              <circle cx="17" cy="15" r="2" strokeWidth="1.5" />
            </svg>
          </div>
          <span className="text-xl font-bold text-[var(--foreground)]">Meal Planner</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive
                      ? 'bg-[var(--primary)] text-white'
                      : 'text-[var(--foreground)] hover:bg-[var(--surface-secondary)]'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--border)]">
        <p className="text-xs text-[var(--text-muted)] text-center">
          Plan your meals with ease
        </p>
      </div>
    </aside>
  );
}
