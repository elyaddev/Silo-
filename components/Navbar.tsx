"use client";

import Link from "next/link";
import Logo from "@/components/Logo";

/**
 * Taller navbar with more generous spacing and larger link text.
 * Keeps your light background + subtle border/shadow for contrast.
 */
export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-neutral-200 shadow-sm">
      <nav className="mx-auto max-w-7xl h-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <Logo className="shrink-0" />

        <ul className="flex items-center gap-6 sm:gap-8">
          <li>
            <Link
              href="/"
              className="text-[15px] md:text-[16px] text-neutral-700 hover:text-orange-600 transition"
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              href="/rooms"
              className="text-[15px] md:text-[16px] text-neutral-700 hover:text-orange-600 transition"
            >
              Rooms
            </Link>
          </li>
          <li>
            <Link
              href="/silo-pro"
              className="text-[15px] md:text-[16px] text-neutral-700 hover:text-orange-600 transition"
            >
              Silo Pro
            </Link>
          </li>
          <li>
            <Link
              href="/contact"
              className="text-[15px] md:text-[16px] text-neutral-700 hover:text-orange-600 transition"
            >
              Contact
            </Link>
          </li>
          <li>
            <Link
              href="/account"
              className="text-[15px] md:text-[16px] text-neutral-700 hover:text-orange-600 transition"
            >
              Account
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
