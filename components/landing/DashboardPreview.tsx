import { BrandLogo } from "@/components/BrandLogo";

const overviewCards = [
  { label: "Today’s doses", value: "—", note: "Your schedule" },
  { label: "Active medicines", value: "—", note: "Your medicine list" },
  { label: "Stock alerts", value: "—", note: "Inventory status" },
  { label: "Adherence", value: "—", note: "Your recent progress" },
];

const workspaceLinks = ["Overview", "Medicines", "Inventory", "History"];

export default function DashboardPreview() {
  return (
    <section id="product-demo" aria-labelledby="product-demo-title" className="relative z-20 -mt-28 scroll-mt-24 px-3 pb-14 sm:-mt-36 sm:px-6 sm:pb-20 lg:-mt-40 lg:px-8 lg:pb-24">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-white/90 bg-white shadow-[0_28px_90px_-32px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 sm:rounded-3xl dark:border-slate-800 dark:bg-slate-900 dark:ring-slate-700/70">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white px-4 py-3 sm:px-6 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex min-w-0 items-center gap-3">
            <BrandLogo markClassName="h-9 w-9" wordmarkClassName="text-base font-bold" />
            <span className="hidden rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800 sm:inline-flex dark:bg-teal-950/50 dark:text-teal-300">
              Dashboard
            </span>
          </div>
          <span className="shrink-0 rounded-full border border-teal-100 bg-teal-50 px-3 py-1.5 text-[11px] font-semibold text-teal-800 dark:border-teal-900/50 dark:bg-teal-950/50 dark:text-teal-300">
            Read-only preview
          </span>
        </header>

        <div className="flex min-w-0 bg-slate-50/70 dark:bg-slate-950/50">
          <aside className="hidden w-52 shrink-0 border-r border-slate-200 bg-white px-3 py-6 lg:block dark:border-slate-800 dark:bg-slate-900/40" aria-label="Preview workspace navigation">
            <p className="px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Workspace</p>
            <ul className="mt-3 space-y-1">
              {workspaceLinks.map((label, index) => (
                <li key={label} className={`rounded-xl px-3 py-2.5 text-xs font-semibold ${index === 0 ? "bg-teal-50 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200" : "text-slate-500 dark:text-slate-400"}`}>
                  {label}
                </li>
              ))}
            </ul>
            <div className="mt-10 rounded-2xl bg-teal-50 p-3 text-xs text-teal-900 dark:bg-teal-950/40 dark:text-teal-200">
              Your tracker data stays in your browser.
            </div>
          </aside>

          <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="product-demo-title" className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl dark:text-white">Your dashboard</h2>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">A calm overview of your medicine routine.</p>
              </div>
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">Illustrative layout</span>
            </div>

            <section aria-label="Preview overview cards" className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
              {overviewCards.map((card) => (
                <article key={card.label} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="truncate text-[11px] font-semibold text-slate-500 sm:text-xs dark:text-slate-400">{card.label}</p>
                  <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{card.value}</p>
                  <p className="mt-1 truncate text-[10px] text-slate-500 dark:text-slate-400">{card.note}</p>
                </article>
              ))}
            </section>

            <div className="grid min-w-0 gap-4 xl:grid-cols-[1.25fr_1fr]">
              <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900" aria-labelledby="preview-schedule-title">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 id="preview-schedule-title" className="text-sm font-bold text-slate-900 dark:text-white">Today&apos;s schedule</h3>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Scheduled doses appear here.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">Today</span>
                </div>
                <div className="mt-4 flex min-h-28 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                  Add a medicine to see its schedule in your dashboard.
                </div>
              </section>

              <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900" aria-labelledby="preview-adherence-title">
                  <h3 id="preview-adherence-title" className="text-sm font-bold text-slate-900 dark:text-white">Adherence this week</h3>
                  <div className="mt-4 flex h-20 items-center justify-center rounded-xl bg-slate-50 text-xs text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">No tracker data in this preview</div>
                </section>
                <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900" aria-labelledby="preview-activity-title">
                  <h3 id="preview-activity-title" className="text-sm font-bold text-slate-900 dark:text-white">Recent activity</h3>
                  <div className="mt-4 flex h-12 items-center rounded-xl bg-slate-50 px-3 text-xs text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">Activity from your profile would appear here.</div>
                </section>
              </div>
            </div>
          </main>
        </div>
      </div>
      <p className="mx-auto mt-4 max-w-3xl px-4 text-center text-xs text-slate-500 dark:text-slate-400">
        This preview is static and does not read or change your medicines, dose history, or inventory.
      </p>
    </section>
  );
}
