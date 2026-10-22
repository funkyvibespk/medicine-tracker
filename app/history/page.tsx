"use client";

import { useEffect, useMemo, useState } from "react";
import { useMedicine } from "@/contexts/MedicineContext";
import BottomNav from "@/components/dashboard/BottomNav";
import WorkspaceNav from "@/components/dashboard/WorkspaceNav";
import WorkspaceHeader from "@/components/dashboard/WorkspaceHeader";
import WorkspacePageHeading from "@/components/dashboard/WorkspacePageHeading";
import { getMedicineOccurrencesForDate, localDateString } from "@/lib/schedule";
import { canonicalizeOccurrenceRecords, inventoryUnitsCompatible, scheduledOccurrenceKey } from "@/lib/medicineLogic";
import BrandedLoadingScreen from "@/components/BrandedLoadingScreen";

const pad = (n: number) => n.toString().padStart(2, "0");
type ScheduledRecordLabel = { medicineId: string; scheduledDate: string; scheduledTime: string; scheduledInstant?: string };

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

function formatScheduledRecordTime(record: ScheduledRecordLabel, records: ScheduledRecordLabel[]) {
  const sameTime = records.filter((item) => item.medicineId === record.medicineId && item.scheduledDate === record.scheduledDate && item.scheduledTime === record.scheduledTime && item.scheduledInstant);
  if (!record.scheduledInstant || sameTime.length < 2) return format12Hour(record.scheduledTime);
  const offset = -new Date(record.scheduledInstant).getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "−";
  const absolute = Math.abs(offset);
  return `${format12Hour(record.scheduledTime)} (UTC${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)})`;
}

export default function HistoryPage() {
  const { medicines, doseRecords, isHydrated, recordTakenDose, skipDoseOccurrence } = useMedicine();
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

  const canonicalDoseRecords = useMemo(() => canonicalizeOccurrenceRecords(doseRecords), [doseRecords]);

  // Include unresolved overdue occurrences so they remain actionable until the next scheduled dose is due.
  const grouped = useMemo(() => {
    const historyRecords = canonicalDoseRecords.filter((record) => Boolean(record.actualTakenTime) || record.status === "missed" || record.status === "overdue" || record.status === "skipped");
    const byDate: Record<string, typeof historyRecords> = {};

    for (const record of historyRecords) {
      if (!byDate[record.scheduledDate]) byDate[record.scheduledDate] = [];
      byDate[record.scheduledDate].push(record);
    }

    // Sort dates descending
    return Object.entries(byDate).sort(([a], [b]) => b.localeCompare(a));
  }, [canonicalDoseRecords]);

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
    const countedOccurrences = new Set<string>();
    const countedWallTimes = new Set<string>();

    for (const dayStr of days) {
      for (const med of medicines) {
        const allOccurrences = getMedicineOccurrencesForDate(med, dayStr);
        const wallTimeCounts = new Map<string, number>();
        for (const occurrence of allOccurrences) wallTimeCounts.set(occurrence.scheduledTime, (wallTimeCounts.get(occurrence.scheduledTime) ?? 0) + 1);
        const occurrences = allOccurrences.filter((occurrence) =>
          dayStr !== todayStr || occurrence.scheduledAt <= now
        );

        for (const occurrence of occurrences) {
          const key = scheduledOccurrenceKey(med.id, dayStr, occurrence.scheduledTime, occurrence.scheduledInstant);
          if (countedOccurrences.has(key)) continue;
          countedOccurrences.add(key);
          countedWallTimes.add(JSON.stringify([med.id, dayStr, occurrence.scheduledTime]));
          totalScheduled++;
          const taken = canonicalDoseRecords.find(
            (record) => record.medicineId === med.id && record.scheduledDate === dayStr && record.scheduledTime === occurrence.scheduledTime && record.actualTakenTime && (record.scheduledInstant === occurrence.scheduledInstant || (!record.scheduledInstant && wallTimeCounts.get(occurrence.scheduledTime) === 1))
          );
          if (taken) totalTaken++;
        }
      }
    }

    for (const record of canonicalDoseRecords) {
      if (record.isPrn || !days.includes(record.scheduledDate) || (record.status !== "missed" && record.status !== "overdue" && !record.actualTakenTime)) continue;
      const key = scheduledOccurrenceKey(record.medicineId, record.scheduledDate, record.scheduledTime, record.scheduledInstant);
      if (countedOccurrences.has(key)) continue;
      if (countedWallTimes.has(JSON.stringify([record.medicineId, record.scheduledDate, record.scheduledTime]))) continue;
      if (record.scheduledDate === todayStr) {
        const scheduledAt = record.scheduledInstant ? new Date(record.scheduledInstant) : new Date(`${record.scheduledDate}T${record.scheduledTime}`);
        if (scheduledAt > now) continue;
      }
      countedOccurrences.add(key);
      totalScheduled++;
      if (record.actualTakenTime) totalTaken++;
    }

    return { totalScheduled, totalTaken, pct: totalScheduled > 0 ? Math.round((totalTaken / totalScheduled) * 100) : null };
  }, [medicines, canonicalDoseRecords, todayStr, now]);

  if (!isHydrated || !now) return <BrandedLoadingScreen />;

  const getMed = (id: string) => medicines.find((m) => m.id === id);

  const statusLabel = (status: string) => {
    switch (status) {
      case "taken_on_time": return { text: "On time", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" };
      case "taken_early": return { text: "Early", cls: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" };
      case "taken_late": return { text: "Late", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" };
      case "missed": return { text: "Missed", cls: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" };
      case "overdue": return { text: "Overdue", cls: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" };
      case "skipped": return { text: "Skipped", cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" };
      default: return { text: "Taken", cls: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" };
    }
  };

  return (
    <div className="workspace-app min-h-screen bg-slate-50 text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-100 pb-24">

      <WorkspaceHeader />

      <div className="mx-auto flex w-full max-w-[1440px]">
      <WorkspaceNav />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 space-y-6">

        <WorkspacePageHeading title="History" description="Dose adherence log" />

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
                      const ambiguousLegacyOccurrence = Boolean(med && !record.scheduledInstant && getMedicineOccurrencesForDate(med, record.scheduledDate).filter((occurrence) => occurrence.scheduledTime === record.scheduledTime).length > 1);
                      const { text, cls } = statusLabel(record.status);

                      return (
                        <div
                          key={record.id}
                          className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
                        >
                          <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${record.status === "missed" ? "bg-rose-100 dark:bg-rose-950/60" : record.status === "skipped" ? "bg-slate-100 dark:bg-slate-800" : "bg-emerald-100 dark:bg-emerald-950/60"}`}>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 ${record.status === "missed" ? "text-rose-600 dark:text-rose-400" : record.status === "skipped" ? "text-slate-600 dark:text-slate-300" : "text-emerald-600 dark:text-emerald-400"}`}>
                              {record.status === "missed" ? <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></> : record.status === "skipped" ? <line x1="5" y1="12" x2="19" y2="12" /> : <polyline points="20 6 9 17 4 12" />}
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold text-slate-900 dark:text-white text-sm">{medicineName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {record.isPrn ? "As needed" : `Scheduled ${formatScheduledRecordTime(record, records)}`}
                              {record.actualTakenTime && (
                                <> · Taken {formatIso12(record.actualTakenTime)}</>
                              )}
                            </p>
                            {(record.status === "missed" || record.status === "overdue") && !record.actualTakenTime && ambiguousLegacyOccurrence && (
                              <p role="status" className="mt-1 text-xs text-amber-700 dark:text-amber-300">This older dose falls in a repeated local time and cannot be assigned safely.</p>
                            )}
                            {(record.status === "missed" || record.status === "overdue") && !record.actualTakenTime && med && !ambiguousLegacyOccurrence && (
                              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                                <button
                                  type="button"
                                  disabled={!inventoryUnitsCompatible(med) || med.inventoryAmount < med.doseAmount}
                                  onClick={() => recordTakenDose({
                                    ...record,
                                    scheduledInstant: record.scheduledInstant,
                                    actualTakenTime: new Date().toISOString(),
                                    status: "taken_late",
                                  }, med.doseAmount)}
                                  className="text-xs font-semibold text-teal-700 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-slate-400 dark:text-teal-300 dark:disabled:text-slate-500"
                                  title={!inventoryUnitsCompatible(med) || med.inventoryAmount < med.doseAmount ? "Review available stock before recording this dose." : undefined}
                                >
                                  Record as taken
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Skip the ${format12Hour(record.scheduledTime)} dose of ${medicineName}? It will remain in History as Skipped.`)) {
                                      skipDoseOccurrence(record);
                                    }
                                  }}
                                  className="text-xs font-semibold text-slate-600 underline-offset-2 hover:underline dark:text-slate-300"
                                >
                                  Skip Dose
                                </button>
                              </div>
                            )}
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
      </div>

      <BottomNav />
    </div>
  );
}
