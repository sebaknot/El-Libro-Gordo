import LangToggle from "./LangToggle";

export default function Shell({
  children,
  lang,
}: {
  children: React.ReactNode;
  lang: "es" | "en";
}) {
  return (
    <main className="flex min-h-screen items-start justify-center bg-slate-50 p-4 pt-10">
      <div className="w-full max-w-md">
        <div className="mb-3 flex justify-end">
          <LangToggle lang={lang} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {children}
        </div>
      </div>
    </main>
  );
}
