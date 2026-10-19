import Image from "next/image";
import { BrandLogo } from "@/components/BrandLogo";

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

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-[0_18px_48px_-28px_rgba(15,23,42,0.3)] md:hidden">
          <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-3">
            <BrandLogo markClassName="h-8 w-8" wordmarkClassName="text-sm font-bold" />
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800">Local prototype</span>
          </header>

          <main className="space-y-3 p-3">
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-950">My Dashboard</h2>
              <p className="mt-0.5 text-xs text-slate-500">Your medicine routine at a glance.</p>
            </div>

            <section aria-label="Dashboard summary" className="grid grid-cols-2 gap-2">
              {[
                { label: "Today’s doses", value: "1 / 6", note: "Taken / scheduled", tone: "teal" },
                { label: "Active medicines", value: "5", note: "Active today", tone: "blue" },
                { label: "Stock alerts", value: "3", note: "Need attention", tone: "amber" },
                { label: "Adherence", value: "75%", note: "This week", tone: "violet" },
              ].map((card) => (
                <article key={card.label} className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="truncate text-[11px] font-semibold text-slate-500">{card.label}</p>
                  <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">{card.value}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">{card.note}</p>
                  <span aria-hidden="true" className={`mt-2 block h-1 w-8 rounded-full ${card.tone === "teal" ? "bg-teal-500" : card.tone === "blue" ? "bg-blue-500" : card.tone === "amber" ? "bg-amber-500" : "bg-violet-500"}`} />
                </article>
              ))}
            </section>

            <section aria-labelledby="mobile-preview-schedule-title" className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 id="mobile-preview-schedule-title" className="text-sm font-bold text-slate-900">Upcoming doses</h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">Your schedule for today</p>
                </div>
                <span className="shrink-0 rounded-full bg-teal-50 px-2 py-1 text-[10px] font-semibold text-teal-800">4 scheduled</span>
              </div>
              <ul className="mt-2 divide-y divide-slate-100">
                {mobileUpcomingDoses.map((dose) => (
                  <li key={`${dose.time}-${dose.name}`} className="flex min-w-0 items-center gap-2 py-2.5 first:pt-1.5 last:pb-0">
                    <span className="shrink-0 rounded-lg bg-teal-50 px-2 py-1 text-[10px] font-bold text-teal-800">{dose.time}</span>
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-900">{dose.name}</span>
                    <span className="shrink-0 text-[10px] text-slate-500">{dose.dose}</span>
                  </li>
                ))}
              </ul>
            </section>

            <div className="flex items-center justify-between rounded-xl border border-teal-100 bg-teal-50 px-3 py-2.5">
              <div>
                <p className="text-xs font-semibold text-slate-900">Adherence this week</p>
                <p className="mt-0.5 text-[10px] text-slate-600">3 of 4 scheduled doses</p>
              </div>
              <span className="text-sm font-extrabold text-teal-800">75%</span>
            </div>
          </main>
        </div>
      </div>
      <p className="mx-auto mt-4 max-w-3xl px-4 text-center text-xs text-slate-500">
        This preview is static and does not read or change your medicines, dose history, or inventory.
      </p>
    </section>
  );
}
