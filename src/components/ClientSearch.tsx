"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Result = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  status: string;
  household_name: string;
};

export default function ClientSearch({ placeholder }: { placeholder: string }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (res.ok) setResults(await res.json());
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [q]);

  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        autoFocus
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
      />
      {loading && (
        <span className="absolute right-4 top-3.5 text-xs text-slate-400">…</span>
      )}
      {results !== null && (
        <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {results.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-400">No matches</p>
          )}
          {results.map((r) => (
            <Link
              key={r.id}
              href={`/clients/${r.id}`}
              className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 text-sm last:border-0 hover:bg-blue-50"
            >
              <span>
                <span className="font-medium">
                  {r.last_name}, {r.first_name}
                </span>{" "}
                <span className="text-slate-500">· {r.household_name}</span>
              </span>
              <span className="text-xs text-slate-400">{r.phone ?? r.email ?? ""}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
