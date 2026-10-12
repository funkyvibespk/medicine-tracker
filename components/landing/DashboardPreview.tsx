import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

const sampleDoses = [
  {
    time: "8:00 AM",
    name: "Calan",
    detail: "Tablet · 40 mg · 1 tablet",
    stock: "30 tablets remaining",
    status: "Taken at 8:05 AM",
    tone: "taken",
  },
  {
    time: "2:00 PM",
    name: "Vitamin D",
    detail: "Capsule · 1000 IU · 1 capsule",
    stock: "18 capsules remaining",
    status: "Upcoming",
    tone: "upcoming",
  },
  {
    time: "8:00 PM",
    name: "Omeprazole",
    detail: "Capsule · 20 mg · 1 capsule",
    stock: "4 capsules remaining · Low stock",
    status: "Upcoming",
    tone: "upcoming",
  },
];

export default function DashboardPreview() {
  return (
    <section className="relative z-20 -mt-28 scroll-mt-24 px-3 pb-14 sm:-mt-36 sm:px-6 sm:pb-20 lg:-mt-40 lg:px-8 lg:pb-24">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-white/90 bg-white shadow-[0_28px_90px_-32px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 sm:rounded-3xl dark:border-slate-800 dark:bg-slate-900 dark:ring-slate-700/70">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo markClassName="h-9 w-9" wordmarkClassName="text-base font-bold" />
            <span className="hidden rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 sm:inline-flex dark:bg-teal-950/50 dark:text-teal-300">
              Dashboard
            </span>
          </div>
          <span className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-teal-600 px-3 py-2 text-xs font-semibold text-white shadow-sm sm:px-4 sm:text-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-4 w-4" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            <span className="hidden sm:inline">Add Medicine</span>
            <span className="sm:hidden">Add</span>
          </span>
        </header>

        <div className="bg-slate-50/70 p-4 sm:p-6 lg:p-8 dark:bg-slate-950/50">
          <div className="mb-5 rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent p-4 shadow-sm sm:p-6 dark:border-teal-900/40 dark:from-teal-950/40 dark:via-emerald-950/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">Today&apos;s Schedule</p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl dark:text-white">Your daily doses</h2>
                <p className="mt-1 text-xs text-slate-500 sm:text-sm dark:text-slate-400">A clear view of what&apos;s taken and what&apos;s coming up.</p>
              </div>
              <div className="min-w-44 rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Today&apos;s adherence</span>
                  <span className="text-lg font-extrabold text-teal-700 dark:text-teal-300">33%</span>
                </div>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">1 of 3 doses taken</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-teal-500 to-emerald-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 sm:text-base dark:text-white">Scheduled medicines</h3>
              <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs dark:text-slate-400">Each dose has its own time and status.</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 sm:text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">Sample data</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sampleDoses.map((dose) => (
              <article key={dose.name} className={`flex min-w-0 flex-col rounded-2xl border p-4 shadow-sm ${dose.tone === "taken" ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{dose.time}</span>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${dose.tone === "taken" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300" : "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"}`}>{dose.status}</span>
                </div>
                <h4 className="mt-4 text-base font-bold text-slate-950 dark:text-white">{dose.name}</h4>
                <p className="mt-1 text-xs font-medium text-teal-700 dark:text-teal-300">{dose.detail}</p>
                <p className={`mt-3 text-[11px] ${dose.stock.includes("Low stock") ? "font-semibold text-amber-700 dark:text-amber-300" : "text-slate-500 dark:text-slate-400"}`}>{dose.stock}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
      <p className="mx-auto mt-4 max-w-3xl px-4 text-center text-xs text-slate-500 dark:text-slate-400">
        Sample screen for illustration. <Link href="/dashboard" className="font-semibold text-teal-700 underline decoration-teal-300 underline-offset-4 hover:text-teal-800 dark:text-teal-300">Open your live dashboard</Link> to use your saved medicine and dose data.
      </p>
    </section>
  );
}
