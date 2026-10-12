import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";

const chartPoints = "0,65 55,53 110,37 165,40 220,28 275,18 330,29 385,36 440,20 495,26 550,17";

function Icon({ kind, className = "h-5 w-5" }: { kind: "grid" | "pill" | "box" | "clock" | "bell" | "check" | "stock" | "chart"; className?: string }) {
  const paths: Record<typeof kind, ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    pill: <><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" /><path d="m8.5 8.5 7 7" /></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="M3 8v9l9 5 9-5V8M12 13v9" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    stock: <><path d="M12 3 2.8 19h18.4L12 3Z" /><path d="M12 9v4m0 3h.01" /></>,
    chart: <><path d="M3 3v18h18" /><path d="m7 14 4-4 4 3 5-7" /></>,
  };

  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">{paths[kind]}</svg>;
}

function StatCard({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: "pill" | "bell" | "box" | "chart"; tone: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm shadow-slate-900/[0.02] sm:p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${tone}`}><Icon kind={icon} /></span>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-semibold text-slate-500 sm:text-xs dark:text-slate-400">{label}</p>
          <p className="mt-0.5 text-xl font-bold tracking-tight text-slate-950 sm:text-2xl dark:text-white">{value}</p>
          <p className="mt-0.5 truncate text-[10px] text-slate-500 sm:text-[11px] dark:text-slate-400">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function ScheduleRow({ time, name, dose, status, color }: { time: string; name: string; dose: string; status: string; color: string }) {
  return (
    <div className="grid grid-cols-[4.2rem_minmax(0,1fr)_auto] items-center gap-2 border-b border-slate-100 px-3 py-3 last:border-0 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:gap-3 sm:px-4 dark:border-slate-800">
      <div><p className="text-[11px] font-bold text-slate-800 sm:text-xs dark:text-slate-200">{time}</p><p className="mt-0.5 text-[10px] text-slate-400">Today</p></div>
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`h-7 w-1 shrink-0 rounded-full ${color}`} />
        <div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-900 sm:text-sm dark:text-white">{name}</p><p className="truncate text-[10px] text-slate-500 sm:text-xs dark:text-slate-400">{dose}</p></div>
      </div>
      <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-semibold sm:px-2.5 sm:text-[10px] ${status === "Taken" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"}`}>
        {status === "Taken" && <Icon kind="check" className="h-3 w-3" />}{status}
      </span>
    </div>
  );
}

export default function DashboardPreview() {
  return (
    <section id="preview" className="relative z-20 -mt-1 scroll-mt-24 px-3 pb-14 sm:-mt-1 sm:px-6 sm:pb-20 lg:-mt-1 lg:px-8 lg:pb-24">
      <div className="mx-auto max-w-[1400px] overflow-hidden rounded-[1.4rem] border border-white bg-white/95 shadow-[0_28px_90px_-32px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/70 backdrop-blur sm:rounded-[1.8rem] dark:border-slate-800 dark:bg-slate-900 dark:ring-slate-700/70">
        <div className="flex min-h-[520px]">
          <aside className="hidden w-[210px] shrink-0 flex-col border-r border-slate-100 bg-white p-4 lg:flex dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-8 px-1"><BrandLogo markClassName="h-9 w-9" wordmarkClassName="text-lg font-bold tracking-tight" /></div>
            <nav className="space-y-1" aria-label="Dashboard preview navigation">
              {[
                ["grid", "Dashboard", true], ["pill", "Medicines", false], ["box", "Inventory", false], ["clock", "History", false], ["bell", "Reminders", false],
              ].map(([icon, label, active]) => (
                <div key={label as string} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-semibold ${active ? "bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300" : "text-slate-600 dark:text-slate-400"}`}>
                  <Icon kind={icon as "grid" | "pill" | "box" | "clock" | "bell"} className="h-4 w-4" />{label as string}
                </div>
              ))}
            </nav>
            <div className="mt-auto rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 p-3 dark:from-teal-950/50 dark:to-emerald-950/30">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Stay on track</p>
              <p className="mt-1 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">Your routine, organized in one calm place.</p>
            </div>
          </aside>

          <div className="min-w-0 flex-1 bg-slate-50/60 p-3 sm:p-5 lg:p-7 dark:bg-slate-950/50">
            <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
              <div><p className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl dark:text-white">Your dashboard</p><p className="mt-0.5 text-[10px] text-slate-500 sm:text-xs dark:text-slate-400">A preview of your daily overview</p></div>
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="hidden rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800 sm:inline-flex dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">Sample preview</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-800 dark:bg-teal-950 dark:text-teal-300">CD</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 xl:grid-cols-4">
              <StatCard label="Today’s doses" value="3 / 5" detail="Completed" icon="pill" tone="bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-300" />
              <StatCard label="Active medicines" value="8" detail="In your schedule" icon="bell" tone="bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300" />
              <StatCard label="Stock alerts" value="3" detail="Need attention" icon="box" tone="bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300" />
              <StatCard label="Adherence" value="92%" detail="This week" icon="chart" tone="bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300" />
            </div>

            <div className="mt-3.5 grid gap-3.5 xl:grid-cols-[1.18fr_0.82fr]">
              <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.02] dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-3 sm:px-4 dark:border-slate-800">
                  <div><h2 className="text-xs font-bold text-slate-900 sm:text-sm dark:text-white">Today’s schedule</h2><p className="mt-0.5 hidden text-[10px] text-slate-500 sm:block dark:text-slate-400">A quick look at today’s doses</p></div>
                  <div className="flex rounded-full bg-slate-100 p-0.5 text-[9px] font-semibold sm:text-[10px] dark:bg-slate-800"><span className="rounded-full bg-white px-2 py-1 text-teal-700 shadow-sm sm:px-2.5 dark:bg-slate-700 dark:text-teal-300">All</span><span className="px-2 py-1 text-slate-500 sm:px-2.5 dark:text-slate-400">Pending</span><span className="px-2 py-1 text-slate-500 sm:px-2.5 dark:text-slate-400">Taken</span></div>
                </div>
                <ScheduleRow time="8:00 AM" name="Calan 40 mg" dose="1 tablet" status="Taken" color="bg-teal-500" />
                <ScheduleRow time="2:00 PM" name="Vitamin D3" dose="1 capsule" status="Pending" color="bg-amber-400" />
                <ScheduleRow time="8:00 PM" name="Omeprazole 20 mg" dose="1 capsule" status="Pending" color="bg-blue-500" />
                <div className="px-4 py-3"><span className="inline-flex items-center gap-2 text-xs font-semibold text-teal-700 dark:text-teal-300">View full schedule <Icon kind="chart" className="h-3.5 w-3.5" /></span></div>
              </section>

              <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-1">
                <section className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm shadow-slate-900/[0.02] sm:p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between"><div><h2 className="text-xs font-bold text-slate-900 sm:text-sm dark:text-white">Adherence this week</h2><p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">A sample weekly trend</p></div><span className="rounded-lg bg-teal-50 px-2 py-1 text-xs font-bold text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">92%</span></div>
                  <div className="mt-3">
                    <svg viewBox="0 0 550 100" className="h-24 w-full overflow-visible" role="img" aria-label="Illustrative sample weekly adherence trend">
                      <defs><linearGradient id="adherence-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#14b8a6" stopOpacity=".28" /><stop offset="100%" stopColor="#14b8a6" stopOpacity="0" /></linearGradient></defs>
                      {[25, 50, 75].map((line) => <line key={line} x1="0" x2="550" y1={line} y2={line} stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeDasharray="4 5" />)}
                      <polygon points={`0,100 ${chartPoints} 550,100`} fill="url(#adherence-fill)" />
                      <polyline points={chartPoints} fill="none" stroke="#0d9488" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                      {chartPoints.split(" ").map((point) => { const [cx, cy] = point.split(","); return <circle key={point} cx={cx} cy={cy} r="3.5" fill="#0d9488" stroke="white" strokeWidth="2" />; })}
                    </svg>
                    <div className="mt-0.5 flex justify-between text-[9px] font-medium text-slate-400"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm shadow-slate-900/[0.02] sm:p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div className="mb-2.5 flex items-center justify-between"><div><h2 className="text-xs font-bold text-slate-900 sm:text-sm dark:text-white">Recent activity</h2><p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">Example entries</p></div><span className="text-[10px] font-semibold text-teal-700 dark:text-teal-300">View all</span></div>
                  <div className="space-y-3">
                    <ActivityRow icon="check" title="Calan 40 mg marked as taken" time="Today, 8:02 AM" />
                    <ActivityRow icon="box" title="Stock updated for Vitamin D3" time="Yesterday, 6:15 PM" />
                    <ActivityRow icon="pill" title="Omeprazole 20 mg added" time="Yesterday, 6:10 PM" />
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="mx-auto mt-3 max-w-5xl px-4 text-center text-[10px] text-slate-400 sm:text-xs">Dashboard preview shown for illustration. Your tracker uses your own saved medicine and dose data.</p>
    </section>
  );
}

function ActivityRow({ icon, title, time }: { icon: "check" | "box" | "pill"; title: string; time: string }) {
  const style = icon === "check" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300" : icon === "box" ? "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300" : "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300";
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${style}`}><Icon kind={icon} className="h-3.5 w-3.5" /></span>
      <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-slate-700 sm:text-xs dark:text-slate-300">{title}</span>
      <span className="hidden whitespace-nowrap text-[9px] text-slate-400 sm:block">{time}</span>
    </div>
  );
}
