"use client";

export default function DashboardPreview() {
  const adherenceData = [85, 100, 71, 100, 57, 85, 100];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <section id="preview" className="py-16 sm:py-20 lg:py-24 bg-slate-50/50 dark:bg-slate-950/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            See what your dashboard looks like
          </h2>
          <p className="mt-3 mx-auto max-w-2xl text-base text-slate-600 dark:text-slate-400">
            A clean overview of your medicines, doses, adherence and stock — everything at a glance.
          </p>
        </div>

        {/* Desktop Dashboard Preview Frame */}
        <div className="relative mx-auto max-w-5xl">
          {/* Demo Data Label */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-800 ring-1 ring-amber-200/80 shadow-sm dark:bg-amber-950/80 dark:text-amber-200 dark:ring-amber-800/60">
            <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500" />
            Demo Data
          </div>

          {/* Browser Chrome */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/30">
            {/* Title Bar */}
            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-850">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-400/80" />
                <div className="h-3 w-3 rounded-full bg-amber-400/80" />
                <div className="h-3 w-3 rounded-full bg-green-400/80" />
              </div>
              <div className="ml-3 flex-1 rounded-md bg-white/80 px-3 py-1 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                app.medicinetracker.com/dashboard
              </div>
            </div>

            {/* Dashboard Content */}
            <div className="p-4 sm:p-6 space-y-5">
              {/* App Header Bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
                      <path d="m8.5 8.5 7 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">Medicine Tracker</span>
                  <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-medium text-teal-700 dark:bg-teal-900/50 dark:text-teal-300">Dashboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
                      <path d="M5 12h14" />
                      <path d="M12 5v14" />
                    </svg>
                    Add Medicine
                  </div>
                </div>
              </div>

              {/* Hero Banner */}
              <div className="rounded-xl border border-teal-100 bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent p-4 sm:p-5 dark:border-teal-900/40 dark:from-teal-950/40">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Medicine Tracker</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300">Welcome back! Stay on schedule with your daily doses.</p>
                  </div>
                  <div className="rounded-lg bg-white px-3 py-2 shadow-xs ring-1 ring-slate-200/70 dark:bg-slate-800 dark:ring-slate-700">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Today&apos;s Adherence</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-extrabold text-teal-600 dark:text-teal-400">33%</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">(1/3 taken)</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400" style={{ width: "33%" }} />
                </div>
              </div>

              {/* Stats Row — responsive grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Today's Doses" value="3" sub="1 taken, 2 upcoming" color="teal" />
                <StatCard label="Active Medicines" value="3" sub="All on schedule" color="blue" />
                <StatCard label="Stock Alert" value="1" sub="Omeprazole low" color="amber" />
                <StatCard label="Weekly Adherence" value="85%" sub="Last 7 days" color="emerald" />
              </div>

              {/* Main Grid: Medicine List + Sidebar */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Medicine List — 2 columns on lg */}
                <div className="lg:col-span-2 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Today&apos;s Medicines
                    </h4>
                    <div className="flex gap-1">
                      <PillTab label="All" active />
                      <PillTab label="Pending" />
                      <PillTab label="Taken" />
                    </div>
                  </div>

                  <MedRow name="Calan" dosage="40 mg • 1 tablet" time="8:00 AM" freq="Twice daily" status="taken" />
                  <MedRow name="Vitamin D" dosage="1000 IU • 1 capsule" time="2:00 PM" freq="Once daily" status="upcoming" />
                  <MedRow name="Omeprazole" dosage="20 mg • 1 capsule" time="8:00 PM" freq="Daily" status="upcoming" stockWarning="4 capsules left" />
                </div>

                {/* Sidebar */}
                <div className="space-y-3">
                  {/* Weekly Adherence Chart */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3">
                      Weekly Adherence
                    </h4>
                    <div className="flex items-end justify-between gap-1 h-20">
                      {adherenceData.map((val, i) => (
                        <div key={i} className="flex flex-col items-center gap-1 flex-1">
                          <div
                            className={`w-full max-w-[24px] rounded-t-md transition-all ${
                              val === 100
                                ? "bg-teal-500"
                                : val >= 80
                                ? "bg-teal-400"
                                : val >= 60
                                ? "bg-amber-400"
                                : "bg-red-400"
                            }`}
                            style={{ height: `${val * 0.75}px` }}
                          />
                          <span className="text-[9px] text-slate-500 dark:text-slate-500">{days[i]}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Upcoming Doses */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2.5">
                      Upcoming Doses
                    </h4>
                    <div className="space-y-2">
                      <UpcomingDose name="Vitamin D" time="2:00 PM" dosage="1000 IU" />
                      <UpcomingDose name="Omeprazole" time="8:00 PM" dosage="20 mg" />
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2.5">
                      Recent Activity
                    </h4>
                    <div className="space-y-2">
                      <ActivityItem action="Calan marked as taken" time="8:05 AM" icon="check" />
                      <ActivityItem action="Omeprazole stock updated" time="Yesterday" icon="package" />
                      <ActivityItem action="Vitamin D added" time="Oct 5" icon="plus" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Sub-components ---------- */

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  const colorMap: Record<string, string> = {
    teal: "text-teal-600 dark:text-teal-400",
    blue: "text-blue-600 dark:text-blue-400",
    amber: "text-amber-600 dark:text-amber-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-lg font-extrabold ${colorMap[color] || "text-slate-900 dark:text-white"}`}>{value}</p>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{sub}</p>
    </div>
  );
}

function PillTab({ label, active }: { label: string; active?: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold cursor-default ${
        active
          ? "bg-teal-600 text-white"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
      }`}
    >
      {label}
    </span>
  );
}

function MedRow({
  name,
  dosage,
  time,
  freq,
  status,
  stockWarning,
}: {
  name: string;
  dosage: string;
  time: string;
  freq: string;
  status: "taken" | "upcoming";
  stockWarning?: string;
}) {
  const isTaken = status === "taken";
  return (
    <div
      className={`flex items-center justify-between rounded-xl border p-3 transition-colors ${
        isTaken
          ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/40 dark:bg-emerald-950/20"
          : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${
            isTaken
              ? "bg-emerald-600 text-white"
              : "border-2 border-slate-300 dark:border-slate-600"
          }`}
        >
          {isTaken && (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-bold ${isTaken ? "text-emerald-900 line-through dark:text-emerald-300" : "text-slate-900 dark:text-white"}`}>
              {name}
            </span>
            {stockWarning && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                Low Stock
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400">{dosage} • {freq}</span>
        </div>
      </div>
      <div className="text-right">
        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{time}</p>
        <span className={`text-[9px] font-semibold uppercase ${isTaken ? "text-emerald-600 dark:text-emerald-400" : "text-teal-600 dark:text-teal-400"}`}>
          {isTaken ? "Taken" : "Upcoming"}
        </span>
        {stockWarning && <p className="text-[9px] text-amber-600 dark:text-amber-400">{stockWarning}</p>}
      </div>
    </div>
  );
}

function UpcomingDose({ name, time, dosage }: { name: string; time: string; dosage: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
        <div>
          <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">{name}</p>
          <p className="text-[9px] text-slate-500 dark:text-slate-400">{dosage}</p>
        </div>
      </div>
      <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">{time}</span>
    </div>
  );
}

function ActivityItem({ action, time, icon }: { action: string; time: string; icon: "check" | "package" | "plus" }) {
  const icons: Record<string, React.ReactNode> = {
    check: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    package: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-amber-600 dark:text-amber-400" aria-hidden="true">
        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    plus: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-teal-600 dark:text-teal-400" aria-hidden="true">
        <path d="M5 12h14" />
        <path d="M12 5v14" />
      </svg>
    ),
  };
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 dark:bg-slate-800">
          {icons[icon]}
        </div>
        <span className="text-[11px] text-slate-700 dark:text-slate-300">{action}</span>
      </div>
      <span className="text-[9px] text-slate-500 dark:text-slate-400">{time}</span>
    </div>
  );
}
