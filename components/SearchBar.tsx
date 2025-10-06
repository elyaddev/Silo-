// Adapted search bar from the original repository.
// Changes:
//  * Highlighting now matches whole words only instead of arbitrary
//    substrings.  This complements the server‑side search changes and
//    prevents partial matches such as “hindrance” being highlighted when
//    searching for “hi”.

"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import ClientTime from "@/components/ClientTime";

type Item = {
  id: string;
  room_id: string;
  title: string;
  snippet: string;
  created_at: string;
};

export default function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close results when the route changes
  useEffect(() => {
    setOpen(false);
    setItems([]);
    setQ("");
  }, [pathname]);

  const debouncedQ = useDebounce(q, 250);

  useEffect(() => {
    if (!debouncedQ || debouncedQ.length < 2) {
      setItems([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQ)}`, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok) {
          if (res.status === 401) {
            if (!cancelled) {
              setItems([
                {
                  id: "__login__",
                  room_id: "",
                  title: "Sign in to search discussions",
                  snippet: "",
                  created_at: new Date().toISOString(),
                },
              ]);
            }
          } else {
            if (!cancelled) setItems([]);
          }
        } else {
          const data = (await res.json()) as { items?: Item[] };
          if (!cancelled) setItems(data.items ?? []);
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQ]);

  // "/" to focus, Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const go = (i: number) => {
    const item = items[i];
    if (!item) return;
    setOpen(false);

    if (item.id === "__login__") {
      const next = pathname || "/";
      router.push(`/login?next=${encodeURIComponent(next)}`);
      return;
    }
    router.push(`/rooms/${item.room_id}/d/${item.id}`);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (!open) setOpen(true);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(items.length ? items.length - 1 : 0, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(highlight);
    }
  };

  return (
    <div ref={boxRef} className="relative w-[280px]">
      <div className="flex items-center gap-2 rounded-xl border px-3 py-1.5 bg-white">
        <Search size={16} />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search discussions…"
          className="w-full outline-none text-sm"
        />
        {loading && <Loader2 size={16} className="animate-spin" />}
      </div>

      {open && q.length >= 2 && (
        <div className="absolute right-0 z-50 mt-2 w-[420px] max-w-[90vw] rounded-xl border bg-white shadow-xl">
          {items.length === 0 && !loading ? (
            <div className="px-4 py-3 text-sm text-slate-500">No matches</div>
          ) : (
            <ul className="max-h-[60vh] overflow-auto py-2">
              {items.map((it, i) => (
                <li
                  key={`${it.id}-${i}`}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    go(i);
                  }}
                  className={[
                    "px-4 py-2 cursor-pointer",
                    i === highlight ? "bg-orange-50" : "bg-transparent",
                  ].join(" ")}
                >
                  <div className="text-sm font-semibold text-slate-900 line-clamp-1">
                    {highlightMatch(it.title, q)}
                  </div>
                  {it.snippet && (
                    <div className="mt-0.5 text-xs text-slate-600 line-clamp-2">
                      {highlightMatch(it.snippet, q)}
                    </div>
                  )}
                  <div className="mt-1 text-[11px] text-slate-400">
                    <ClientTime iso={it.created_at} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function useDebounce<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

function highlightMatch(text: string, q: string) {
  if (!q) return text;
  // Escape special regex characters in q
  const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b${escapeRegExp(q)}\\b`, "i");
  const match = text.match(re);
  if (!match || match.index === undefined) return text;
  const idx = match.index;
  const before = text.slice(0, idx);
  const matchStr = match[0];
  const after = text.slice(idx + matchStr.length);
  return (
    <>
      {before}
      <mark className="bg-yellow-200">{matchStr}</mark>
      {after}
    </>
  );
}