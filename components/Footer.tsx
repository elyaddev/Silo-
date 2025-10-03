// components/Footer.tsx
'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-neutral-900 text-neutral-300">
      <div className="max-w-7xl mx-auto px-4 py-12 grid gap-8 sm:grid-cols-3">
        {/* Column 1 */}
        <div>
          <h3 className="text-white text-lg font-semibold">Silo</h3>
          <p className="mt-2 text-sm text-neutral-400">
            Tools and rooms for student-athletes.
          </p>
        </div>
        {/* Column 2 */}
        <div>
          <h4 className="text-neutral-100 text-sm font-semibold uppercase tracking-wide">
            Product
          </h4>
          <ul className="mt-3 space-y-1">
            <li>
              <Link href="/" className="hover:text-orange-400 transition">Home</Link>
            </li>
            <li>
              <Link href="/rooms" className="hover:text-orange-400 transition">Rooms</Link>
            </li>
            <li>
              <Link href="/silo-pro" className="hover:text-orange-400 transition">Silo Pro</Link>
            </li>
            <li>
              <Link href="/account" className="hover:text-orange-400 transition">Account</Link>
            </li>
          </ul>
        </div>
        {/* Column 3 */}
        <div>
          <h4 className="text-neutral-100 text-sm font-semibold uppercase tracking-wide">
            Stay in touch
          </h4>
          <ul className="mt-3 space-y-1">
            <li>
              <a href="mailto:hello@athletechat.app" className="hover:text-orange-400 transition">
                hello@athletechat.app
              </a>
            </li>
            <li>
              <a href="https://twitter.com" className="hover:text-orange-400 transition">
                X / Twitter
              </a>
            </li>
            <li>
              <a href="https://instagram.com" className="hover:text-orange-400 transition">
                Instagram
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-neutral-800 py-4 text-center text-xs text-neutral-500">
        &copy; {new Date().getFullYear()} Silo. All rights reserved.
      </div>
    </footer>
  );
}
