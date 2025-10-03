"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const links = [
    { href: "/", label: "Home" },
    { href: "/rooms", label: "Rooms" },
    { href: "/silo-pro", label: "Silo Pro" },
    { href: "/contact", label: "Contact" },
    { href: "/account", label: "Account" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-[#FFF7EF]/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center font-extrabold text-3xl tracking-tight"
        >
          <span className="text-[#F58220]">S</span>
          <span className="text-slate-900 ml-1">ilo</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center space-x-8 font-medium">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`transition-colors hover:text-[#F58220] ${
                pathname === href ? "text-[#F58220]" : "text-gray-800"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden flex flex-col space-y-1.5"
          onClick={() => setIsOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <span className="block h-0.5 w-6 bg-gray-800" />
          <span className="block h-0.5 w-6 bg-gray-800" />
          <span className="block h-0.5 w-6 bg-gray-800" />
        </button>
      </div>

      {/* Mobile dropdown */}
      {isOpen && (
        <div className="md:hidden flex flex-col items-center space-y-3 py-4 bg-[#FFF7EF] border-t border-gray-200">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setIsOpen(false)}
              className={`transition-colors hover:text-[#F58220] ${
                pathname === href ? "text-[#F58220]" : "text-gray-800"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
