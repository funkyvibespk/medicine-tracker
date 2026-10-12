"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const destinations = [
  ["/dashboard", "Overview"],
  ["/medicines", "Medicines"],
  ["/inventory", "Inventory"],
  ["/history", "History"],
] as const;

type WorkspaceDestination = (typeof destinations)[number][0];

function WorkspaceIcon({ destination }: { destination: WorkspaceDestination }) {
  const common = { className: "h-5 w-5", "aria-hidden": true as const };

  if (destination === "/dashboard") return <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>;
  if (destination === "/medicines") return <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>;
  if (destination === "/inventory") return <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 9 5v8l-9 5-9-5V8l9-5Z"/><path d="m3.5 7.5 8.5 5 8.5-5M12 21v-8.5"/></svg>;
  return <svg {...common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>;
}

export default function WorkspaceNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white px-4 py-6 lg:block dark:border-slate-800 dark:bg-slate-900/40">
      <p className="px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Workspace</p>
      <nav className="mt-3 space-y-1" aria-label="Dashboard navigation">
        {destinations.map(([href, label]) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"}`}
            >
              <WorkspaceIcon destination={href} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-10 rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 to-white p-4 dark:border-teal-900/50 dark:from-teal-950/40 dark:to-slate-900">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Stay on track</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Your medicines and dose history stay in this browser.</p>
      </div>
    </aside>
  );
}
