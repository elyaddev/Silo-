// components/Logo.tsx
'use client';

import Link from 'next/link';

export default function Logo({ className = '' }: { className?: string }) {
  const root = ['inline-flex items-baseline leading-none select-none', className].filter(Boolean).join(' ');
  return (
    <Link href="/" aria-label="Silo home" className={root} style={{ letterSpacing: '0.03em' }}>
      <span
        className="text-[var(--color-brand)] font-extrabold text-3xl md:text-4xl"
      >
        S
      </span>
      <span
        className="text-neutral-900 font-semibold text-2xl md:text-3xl"
      >
        ilo
      </span>
    </Link>
  );
}
