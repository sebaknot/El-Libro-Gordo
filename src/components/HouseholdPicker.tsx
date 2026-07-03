"use client";

import { useEffect, useRef, useState } from "react";

type Result = { id: string; household_id: string; first_name: string; last_name: string; household_name: string };
type Picked = { id: string; name: string };

/** Search-and-select households (searches by member name/phone). */
export default function HouseholdPicker({ placeholder }: { placeholder: string }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [picked, setPicked] = useState<Picked[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const query = q.trim();
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (res.ok) setResults(await res.json());
      } catch {
        /* aborted */
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [q]);

  function add(r: Result) {
    if (!picked.some((p) => p.id === r.household_id)) {
      setPicked([...picked, { id: r.household_id, name: r.household_name }]);
    }
    setQ("");
    setResults([]);
  }

  return (
    <div>
      {picked.map((p) => (
        <input key={p.id} type="hidden" name="household_id" value={p.id} />
      ))}
      <div className="flex flex-wrap gap-1.5">
        {picked.map((p) => (
          <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
            {p.name}
            <button type="button" onClick={() => setPicked(picked.filter((x) => x.id !== p.id))} className="text-blue-500 hover:text-blue-900">
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="relative mt-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        {results.length > 0 && (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => add(r)}
                className="block w-full border-b border-slate-100 px-4 py-2 text-left text-sm last:border-0 hover:bg-blue-50"
              >
                <span className="font-medium">{r.household_name}</span>{" "}
                <span className="text-slate-500">
                  · {r.last_name}, {r.first_name}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
