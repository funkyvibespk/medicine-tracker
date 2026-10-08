"use client";

import { useEffect, useMemo, useState } from "react";
import { useMedicine } from "@/contexts/MedicineContext";
import BottomNav from "@/components/dashboard/BottomNav";
import { getScheduledTimesForDate, localDateString } from "@/lib/schedule";

const pad = (n: number) => n.toString().padStart(2, "0");

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" });
}

function format12Hour(timeStr: string) {
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

function formatIso12(isoStr: string) {
  const d = new Date(isoStr);
  return format12Hour(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
}

export default function HistoryPage() {
  const { medicines, doseRecords, isHydrated } = useMedicine();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Defer reading the local clock until after prerendering.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = useMemo(() => {
    return now ? localDateString(now) : "";
  }, [now]);

  // Build historical log: group taken doses by date (exclude today for clarity, show today too)
  const grouped = useMemo(() => {
    const takenRecords = doseRecords.filter((r) => r.actualTakenTime);
    const byDate: Record<string, typeof takenRecords> = {};

    for (const record of takenRecords) {
      if (!byDate[record.scheduledDate]) byDate[record.scheduledDate] = [];
      byDate[record.scheduledDate].push(record);
    }

    // Sort dates descending
    return Object.entries(byDate).sort(([a], [b]) => b.localeCompare(a));
  }, [doseRecords]);

  // Overall adherence stats (last 7 days)
  const stats = useMemo(() => {
    if (!now) return { totalScheduled: 0, totalTaken: 0, pct: null };
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      days.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    }

    let totalScheduled = 0;
    let totalTaken = 0;

    for (const dayStr of days) {
      for (const med of medicines) {
        let timesToCount = getScheduledTimesForDate(med, dayStr);
        if (dayStr === todayStr) {
            timesToCount = timesToCount.filter((t) => {
            const [h, m] = t.split(":").map(Number);
              const sched = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
              return sched <= now;
          });
        }

        for (const time of timesToCount) {
          totalScheduled++;
          const taken = doseRecords.find(
            (r) => r.medicineId === med.id && r.scheduledDate === dayStr && r.scheduledTime === time && r.actualTakenTime
          );
          if (taken) totalTaken++;
        }
      }
    }

    return { totalScheduled, totalTaken, pct: totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : null };
  }, [medicines, doseRecords, todayStr, now]);

  if (!isHydrated || !now) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950" />;

  const getMed = (id: string) => medicines.find((m) => m.id === id);

  const statusLabel = (status: string) => {
    switch (status) {
      case "taken_on_time": return { text: "On time", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" };
      case "taken_early": return { text: "Early", cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" };
      case "taken_late": return { text: "Late", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" };
      default: return { text: "Taken", cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-100 pb-24">

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto max-w-5xl px-4 py-3.5 sm:px-6">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">History</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Dose adherence log</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-6">

        {/* 7-day Adherence Summary */}
        <section className="rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent p-5 shadow-sm dark:border-teal-900/40 dark:from-teal-950/40 dark:via-emerald-950/20">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400 mb-3">Last 7 Days</h2>
          {stats.pct !== null ? (
            <div className="flex items-center gap-4">
              <div>
                <span className="text-4xl font-extrabold text-teal-600 dark:text-teal-400">{stats.pct}%</span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {stats.totalTaken} of {stats.totalScheduled} doses taken
                </p>
              </div>
              <div className="flex-1">
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-700"
                    style={{ width: `${stats.pct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {stats.pct >= 90 ? "🎉 Excellent adherence!" : stats.pct >= 70 ? "Keep it up!" : "Try to stay on schedule."}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">No dose history yet. Start taking your medications to track adherence.</p>
          )}
        </section>

        {/* Dose Log */}
        {grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900/30">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">No dose history yet</h2>
            <p className="mt-2 max-w-xs text-sm text-slate-500 dark:text-slate-400">
              Mark doses as taken from the Today tab — your history will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([date, records]) => (
              <section key={date}>
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {date === todayStr ? "Today" : formatDate(date)}
                  </h2>
                  <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                    {records.length} dose{records.length !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="space-y-2">
                  {records
                    .slice()
                    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
                    .map((record) => {
                      const med = getMed(record.medicineId);
                      const medicineName = record.medicineName ?? med?.name ?? "Deleted medicine";
                      const { text, cls } = statusLabel(record.status);

                      return (
                        <div
                          key={record.id}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
                        >
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/60">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-emerald-600 dark:text-emerald-400">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-slate-900 dark:text-white text-sm">{medicineName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {record.isPrn ? "As needed" : `Scheduled ${format12Hour(record.scheduledTime)}`}
                              {record.actualTakenTime && (
                                <> · Taken {formatIso12(record.actualTakenTime)}</>
                              )}
                            </p>
                          </div>
                          <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
                            {text}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
