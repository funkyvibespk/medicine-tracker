import Image from "next/image";

const previewImage = "/dashboard-hero-preview.png";
const mobileUpcomingDoses = [
  { time: "8:00 AM", name: "Gullet", dose: "1 tablet" },
  { time: "10:00 AM", name: "Calan", dose: "1 capsule" },
  { time: "8:00 PM", name: "Ulsanic", dose: "1 tablet" },
  { time: "9:00 PM", name: "Panadol", dose: "1 tablet" },
];

export default function DashboardPreview() {
  return (
    <section id="product-demo" aria-label="ChillDose dashboard preview" className="relative z-20 -mt-16 scroll-mt-24 px-3 pb-14 sm:-mt-24 sm:px-6 sm:pb-20 lg:-mt-28 lg:px-8 lg:pb-24">
      <div className="relative mx-auto w-full max-w-6xl">
        <div className="hidden md:block">
          <Image
            src={previewImage}
            alt="ChillDose dashboard preview"
            width={1476}
            height={910}
            priority
            className="mx-auto block h-auto w-full rounded-2xl border border-slate-200/80 shadow-[0_24px_72px_-30px_rgba(15,23,42,0.24)] sm:rounded-3xl"
          />
        </div>

        <div className="relative mx-auto aspect-[443/653] w-full max-w-[380px] md:hidden">
          <Image src="/mobile-phone-frame.png" alt="" fill sizes="(max-width: 768px) 96vw, 380px" className="object-contain" />
          <div className="absolute left-[14.4%] top-[10.3%] flex h-[78.1%] w-[70.4%] flex-col overflow-hidden rounded-[2rem] bg-slate-50 text-slate-950">
            <div className="relative flex h-9 shrink-0 items-center justify-between bg-white px-3 text-[9px] font-semibold">
              <span>9:41</span>
              <span className="text-teal-700">Preview</span>
              <span aria-hidden="true" className="absolute left-1/2 top-2 h-4 w-[30%] -translate-x-1/2 rounded-full bg-slate-950" />
            </div>

            <main className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2.5 py-2">
              <div className="pb-0.5">
                <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-teal-700">Your local tracker</p>
                <h2 className="mt-0.5 text-sm font-bold tracking-tight">My Dashboard</h2>
                <p className="mt-0.5 text-[9px] leading-tight text-slate-500">Your medicine routine at a glance.</p>
              </div>

              <section aria-label="Dashboard summary" className="grid grid-cols-2 gap-1.5">
                {[
                  { label: "Today’s doses", value: "1 / 6", note: "Taken / scheduled", tone: "teal" },
                  { label: "Active medicines", value: "5", note: "Active today", tone: "blue" },
                  { label: "Stock alerts", value: "3", note: "Need attention", tone: "amber" },
                  { label: "Adherence", value: "75%", note: "This week", tone: "violet" },
                ].map((card) => (
                  <article key={card.label} className="min-w-0 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                    <p className="truncate text-[8px] font-semibold text-slate-500">{card.label}</p>
                    <p className="mt-0.5 text-lg font-extrabold leading-none tracking-tight">{card.value}</p>
                    <p className="mt-1 truncate text-[7px] text-slate-500">{card.note}</p>
                    <span aria-hidden="true" className={`mt-1.5 block h-1 w-6 rounded-full ${card.tone === "teal" ? "bg-teal-500" : card.tone === "blue" ? "bg-blue-500" : card.tone === "amber" ? "bg-amber-500" : "bg-violet-500"}`} />
                  </article>
                ))}
              </section>

              <section aria-labelledby="mobile-preview-schedule-title" className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
                <div className="flex items-center justify-between gap-1">
                  <div className="min-w-0">
                    <h3 id="mobile-preview-schedule-title" className="truncate text-[10px] font-bold">Upcoming doses</h3>
                    <p className="mt-0.5 text-[8px] text-slate-500">Your schedule for today</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-teal-50 px-1.5 py-1 text-[7px] font-semibold text-teal-800">4 scheduled</span>
                </div>
                <ul className="mt-1.5 divide-y divide-slate-100">
                  {mobileUpcomingDoses.map((dose) => (
                    <li key={`${dose.time}-${dose.name}`} className="flex min-w-0 items-center gap-1.5 py-2 first:pt-1 last:pb-0">
                      <span className="shrink-0 rounded-md bg-teal-50 px-1.5 py-1 text-[7px] font-bold text-teal-800">{dose.time}</span>
                      <span className="min-w-0 flex-1 truncate text-[9px] font-semibold">{dose.name}</span>
                      <span className="shrink-0 text-[7px] text-slate-500">{dose.dose}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <div className="flex items-center justify-between rounded-lg border border-teal-100 bg-teal-50 px-2.5 py-2">
                <div>
                  <p className="text-[9px] font-semibold">Adherence this week</p>
                  <p className="mt-0.5 text-[7px] text-slate-600">3 of 4 scheduled doses</p>
                </div>
                <span className="text-xs font-extrabold text-teal-800">75%</span>
              </div>
            </main>

            <nav aria-label="Preview mobile navigation" className="flex h-9 shrink-0 items-center justify-around border-t border-slate-200 bg-white px-1 text-[7px] font-semibold text-slate-400">
              <span className="text-teal-700">Today</span>
              <span>Medicines</span>
              <span>Inventory</span>
              <span>History</span>
            </nav>
          </div>
        </div>
      </div>
      <p className="mx-auto mt-4 max-w-3xl px-4 text-center text-xs text-slate-500">
        This preview is static and does not read or change your medicines, dose history, or inventory.
      </p>
    </section>
  );
}
