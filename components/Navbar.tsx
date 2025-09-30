"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/Logo";
import { Menu, X } from "lucide-react";
import NavAuth from "@/components/NavAuth";

const NAV = [
  { id: "home", label: "Home", href: "/" },
  { id: "rooms", label: "Rooms", href: "/rooms" },
  { id: "silo-pro", label: "Silo Pro", href: "/silo-pro" },
  { id: "contact", label: "Contact", href: "/contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href;

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white/70 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2" aria-label="Athlete Chat home">
          <Logo />
          <span className="sr-only">Athlete Chat</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`text-sm font-medium transition-opacity hover:opacity-100 ${
                isActive(item.href) ? "opacity-100" : "opacity-70"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <NavAuth />
        </nav>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden rounded p-2"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile sheet */}
      {open && (
        <div className="md:hidden border-t bg-white/90 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-2">
            {NAV.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`py-2 ${isActive(item.href) ? "font-semibold" : "text-gray-700"}`}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-2">
              <NavAuth />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
