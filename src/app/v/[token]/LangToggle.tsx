"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { V_DICT } from "@/lib/vdict";

function Toggle({ lang }: { lang: "es" | "en" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function toggle() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("lang", lang === "es" ? "en" : "es");
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <button
      onClick={toggle}
      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600"
    >
      🌐 {V_DICT[lang].langToggle}
    </button>
  );
}

export default function LangToggle({ lang }: { lang: "es" | "en" }) {
  return (
    <Suspense fallback={null}>
      <Toggle lang={lang} />
    </Suspense>
  );
}
