"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useMedicine, Medicine, DoseRecord, DoseStatus } from "@/contexts/MedicineContext";
import MedicineForm from "@/components/dashboard/MedicineForm";
import BottomNav from "@/components/dashboard/BottomNav";
import WorkspaceNav from "@/components/dashboard/WorkspaceNav";
import WorkspaceHeader from "@/components/dashboard/WorkspaceHeader";
import WorkspacePageHeading from "@/components/dashboard/WorkspacePageHeading";
import { formatDuration, getMedicineOccurrencesForDate, isPrnMedicine, localDateString } from "@/lib/schedule";
import { keepDialogFocusInside, useDialogFocusRestore } from "@/lib/accessibility";
import { canonicalizeOccurrenceRecords, doseUnitFor, getOccurrenceTimeStatus, getOutstandingMissedOccurrences, getStockStatus, getUnscheduledSameDayMissedOccurrences, inventoryUnitFor, inventoryUnitsCompatible, minutesFromScheduledOccurrence, scheduledOccurrenceId, scheduledOccurrenceKey } from "@/lib/medicineLogic";

// Helper to pad numbers
const pad = (n: number) => n.toString().padStart(2, "0");

type ScheduledDose = {
  id: string;
  med: Medicine;
  scheduledDate: string;
  time: string;
  scheduledInstant?: string;
  identityAmbiguous?: boolean;
  record?: DoseRecord;
  status: DoseStatus;
  minutesDiff: number;
  diffText: string;
  almostDue: boolean;
  scheduledDateObj: Date;
};

type DoseFilter = "all" | "pending" | "taken";
export default function DashboardPage() {
  const {
    medicines,
    doseRecords,
    addMedicine,
    updateMedicine,
    updateDoseRecord,
    recordTakenDose,
    deleteMedicine,
    addStock,
    isHydrated,
  } = useMedicine();

  const [now, setNow] = useState<Date>(new Date(0));
  
  // Modals & Dialogs
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [deletingMedicine, setDeletingMedicine] = useState<Medicine | null>(null);
  const [changingDose, setChangingDose] = useState<ScheduledDose | null>(null);
  const [takingEarly, setTakingEarly] = useState<(ScheduledDose & { earlyBy: number }) | null>(null);
  const [addingStockMed, setAddingStockMed] = useState<Medicine | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [doseFilter, setDoseFilter] = useState<DoseFilter>("all");
  useDialogFocusRestore(Boolean(isAddModalOpen || editingMedicine || deletingMedicine || changingDose || takingEarly || addingStockMed));
  
  // Form states for dialogs
  const [newTime, setNewTime] = useState("");
  const [timeError, setTimeError] = useState("");
  const [stockToAdd, setStockToAdd] = useState<number>(0);
  
  // Timer for accurate status
  useEffect(() => {
    // Defer the local clock read until after prerendering.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Close menus on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenuId(null);
        setIsAddModalOpen(false);
        setEditingMedicine(null);
        setDeletingMedicine(null);
        setChangingDose(null);
        setTakingEarly(null);
        setAddingStockMed(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const todayStr = useMemo(() => localDateString(now), [now]);
  const canonicalDoseRecords = useMemo(() => canonicalizeOccurrenceRecords(doseRecords), [doseRecords]);

  // Compute doses for today
  const todaysDoses = useMemo(() => {
    const doses: ScheduledDose[] = [];
    
    medicines.forEach((med) => {
      const occurrences = getMedicineOccurrencesForDate(med, todayStr);
      const wallTimeCounts = new Map<string, number>();
      for (const occurrence of occurrences) wallTimeCounts.set(occurrence.scheduledTime, (wallTimeCounts.get(occurrence.scheduledTime) ?? 0) + 1);
      occurrences.forEach((occurrence) => {
        const { scheduledTime: time, scheduledAt: scheduledTimeDate, scheduledInstant } = occurrence;
        const id = scheduledOccurrenceId(med.id, todayStr, time, scheduledInstant);
        const occurrenceKey = scheduledOccurrenceKey(med.id, todayStr, time, scheduledInstant);
        const identityAmbiguous = Boolean(scheduledInstant && (wallTimeCounts.get(time) ?? 0) > 1 && canonicalDoseRecords.some(
          (item) => !item.isPrn && item.medicineId === med.id && item.scheduledDate === todayStr && item.scheduledTime === time && !item.scheduledInstant,
        ));
        const record = canonicalDoseRecords.find(
          (item) => !item.isPrn && item.medicineId === med.id && item.scheduledDate === todayStr && (
            scheduledOccurrenceKey(item.medicineId, item.scheduledDate, item.scheduledTime, item.scheduledInstant) === occurrenceKey ||
            (!item.scheduledInstant && wallTimeCounts.get(time) === 1 && item.scheduledTime === time)
          )
        );

        // Calculate dynamic status
        let status: DoseStatus = "upcoming";
        let minutesDiff = 0;
        let diffText = "";
        let almostDue = false;
        
        if (record && record.actualTakenTime) {
          minutesDiff = minutesFromScheduledOccurrence(todayStr, time, record.actualTakenTime, scheduledInstant);
          
          if (minutesDiff < -5) {
            status = "taken_early";
            diffText = `${formatDuration(minutesDiff)} early`;
          } else if (minutesDiff > 5) {
            status = "taken_late";
            diffText = `${formatDuration(minutesDiff)} late`;
          } else {
            status = "taken_on_time";
          }
        } else if (record?.status === "missed") {
          status = "missed";
          minutesDiff = (now.getTime() - scheduledTimeDate.getTime()) / 60000;
          diffText = "Missed";
        } else {
          const diffMs = now.getTime() - scheduledTimeDate.getTime();
          minutesDiff = diffMs / 60000;
          const timeStatus = getOccurrenceTimeStatus(scheduledTimeDate, now);
          if (timeStatus === "overdue") {
            status = "overdue";
            diffText = `Overdue by ${formatDuration(minutesDiff)}`;
          } else if (timeStatus === "due") {
            status = "due";
          } else {
            status = "upcoming";
            almostDue = diffMs < 0 && diffMs >= -5 * 60_000;
            diffText = diffMs > -60_000 ? "In less than 1 min" : `In ${formatDuration(minutesDiff)}`;
          }
        }

        doses.push({
          id,
          med,
          scheduledDate: todayStr,
          time,
          scheduledInstant,
          identityAmbiguous,
          record,
          status,
          minutesDiff,
          diffText,
          almostDue,
          scheduledDateObj: scheduledTimeDate,
        });
      });
    });

    const representedOccurrenceKeys = new Set<string>();
    for (const dose of doses) {
      representedOccurrenceKeys.add(scheduledOccurrenceKey(dose.med.id, dose.scheduledDate, dose.time, dose.scheduledInstant));
      if (dose.record) {
        representedOccurrenceKeys.add(scheduledOccurrenceKey(dose.record.medicineId, dose.record.scheduledDate, dose.record.scheduledTime, dose.record.scheduledInstant));
      }
    }
    for (const record of getUnscheduledSameDayMissedOccurrences(canonicalDoseRecords, todayStr, representedOccurrenceKeys)) {
      const med = medicines.find((medicine) => medicine.id === record.medicineId);
      if (!med) continue;
      const sameWallTimeOccurrences = doses.filter((dose) => dose.med.id === med.id && dose.scheduledDate === record.scheduledDate && dose.time === record.scheduledTime);
      // A legacy record with no instant cannot safely be attached to repeated wall-clock occurrences.
      if (!record.scheduledInstant && sameWallTimeOccurrences.length > 0) continue;

      const [year, month, day] = record.scheduledDate.split("-").map(Number);
      const [hour, minute] = record.scheduledTime.split(":").map(Number);
      const scheduledDateObj = record.scheduledInstant
        ? new Date(record.scheduledInstant)
        : new Date(year, month - 1, day, hour, minute);
      if (Number.isNaN(scheduledDateObj.getTime())) continue;

      doses.push({
        id: record.id,
        med,
        scheduledDate: record.scheduledDate,
        time: record.scheduledTime,
        scheduledInstant: record.scheduledInstant,
        record,
        status: "missed",
        minutesDiff: (now.getTime() - scheduledDateObj.getTime()) / 60000,
        diffText: "Missed",
        almostDue: false,
        scheduledDateObj,
      });
    }

    // Sort: Overdue -> Due -> Upcoming -> Taken
    return doses.sort((a, b) => {
      const order = { overdue: 1, missed: 1, due: 2, upcoming: 3, taken_early: 4, taken_on_time: 4, taken_late: 4 };
      if (order[a.status as keyof typeof order] !== order[b.status as keyof typeof order]) {
        return order[a.status as keyof typeof order] - order[b.status as keyof typeof order];
      }
      return a.scheduledDateObj.getTime() - b.scheduledDateObj.getTime();
    });
  }, [medicines, canonicalDoseRecords, now, todayStr]);

  const overdueCount = todaysDoses.filter((d) => d.status === "overdue").length;
  const takenCount = todaysDoses.filter((d) => d.status.startsWith("taken")).length;
  const outstandingMisses = getOutstandingMissedOccurrences(doseRecords, todayStr);
  const prnMedicines = medicines.filter((med) => isPrnMedicine(med) && med.startDate <= todayStr && (!med.endDate || med.endDate >= todayStr));

  const activeMedicines = medicines.filter((medicine) => medicine.startDate <= todayStr && (!medicine.endDate || medicine.endDate >= todayStr));
  const stockAlerts = medicines.filter((medicine) => {
    const status = getStockStatus(medicine);
    return status !== "available";
  });
  const stockNeedsReview = stockAlerts.some((medicine) => getStockStatus(medicine) === "unknown");
  const filteredDoses = todaysDoses.filter((dose) => {
    if (doseFilter === "taken") return dose.status.startsWith("taken");
    if (doseFilter === "pending") return !dose.status.startsWith("taken");
    return true;
  });

  const weeklyAdherence = useMemo(() => {
    if (now.getTime() === 0) return [];
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - index));
      const date = localDateString(day);
      let expected = 0;
      let taken = 0;
      const countedOccurrences = new Set<string>();
      const countedWallTimes = new Set<string>();
      for (const medicine of medicines) {
        const allOccurrences = getMedicineOccurrencesForDate(medicine, date);
        const wallTimeCounts = new Map<string, number>();
        for (const occurrence of allOccurrences) wallTimeCounts.set(occurrence.scheduledTime, (wallTimeCounts.get(occurrence.scheduledTime) ?? 0) + 1);
        const occurrences = allOccurrences.filter((occurrence) => {
          if (date !== todayStr) return true;
          return occurrence.scheduledAt <= now;
        });
        for (const occurrence of occurrences) {
          const key = scheduledOccurrenceKey(medicine.id, date, occurrence.scheduledTime, occurrence.scheduledInstant);
          if (countedOccurrences.has(key)) continue;
          countedOccurrences.add(key);
          countedWallTimes.add(JSON.stringify([medicine.id, date, occurrence.scheduledTime]));
          expected++;
          const wallTimeCount = wallTimeCounts.get(occurrence.scheduledTime) ?? 0;
          if (canonicalDoseRecords.some((record) => record.medicineId === medicine.id && record.scheduledDate === date && record.scheduledTime === occurrence.scheduledTime && Boolean(record.actualTakenTime) && !record.isPrn && (record.scheduledInstant === occurrence.scheduledInstant || (!record.scheduledInstant && wallTimeCount === 1)))) taken++;
        }
      }
      for (const record of canonicalDoseRecords) {
        if (record.isPrn || record.scheduledDate !== date || (record.status !== "missed" && !record.actualTakenTime)) continue;
        const key = scheduledOccurrenceKey(record.medicineId, date, record.scheduledTime, record.scheduledInstant);
        if (countedOccurrences.has(key)) continue;
        if (countedWallTimes.has(JSON.stringify([record.medicineId, date, record.scheduledTime]))) continue;
        if (date === todayStr) {
          const scheduledAt = record.scheduledInstant ? new Date(record.scheduledInstant) : new Date(`${date}T${record.scheduledTime}`);
          if (scheduledAt > now) continue;
        }
        countedOccurrences.add(key);
        expected++;
        if (record.actualTakenTime) taken++;
      }
      return { date, label: day.toLocaleDateString(undefined, { weekday: "short" }), expected, taken, percent: expected ? Math.round((taken / expected) * 100) : null };
    });
  }, [medicines, canonicalDoseRecords, now, todayStr]);

  const recentActivity = useMemo(() => canonicalDoseRecords
    .filter((record) => Boolean(record.actualTakenTime))
    .slice()
    .sort((a, b) => new Date(b.actualTakenTime!).getTime() - new Date(a.actualTakenTime!).getTime())
    .slice(0, 5), [canonicalDoseRecords]);

  const weeklyExpected = weeklyAdherence.reduce((total, day) => total + day.expected, 0);
  const weeklyTaken = weeklyAdherence.reduce((total, day) => total + day.taken, 0);
  const weeklyPercent = weeklyExpected ? Math.round((weeklyTaken / weeklyExpected) * 100) : null;
  const upcomingDoses = todaysDoses.filter((dose) => dose.status === "upcoming").sort((a, b) => a.scheduledDateObj.getTime() - b.scheduledDateObj.getTime()).slice(0, 4);

  // Handlers

  const handleTakeDose = (dose: ScheduledDose) => {
    // If attempting to take >5 minutes early, show confirmation
    const diffMs = now.getTime() - dose.scheduledDateObj.getTime();

    if (diffMs < -5 * 60_000) {
      setTakingEarly({ ...dose, earlyBy: Math.floor(Math.abs(diffMs) / 60_000) });
      return;
    }
    
    confirmTakeDose(dose, now);
  };

  const confirmTakeDose = (dose: ScheduledDose, takenTime: Date) => {
    // Determine status
    let status: DoseStatus = "taken_on_time";
    const scheduledAt = dose.scheduledInstant ? new Date(dose.scheduledInstant) : dose.scheduledDateObj;
    const elapsedMs = takenTime.getTime() - scheduledAt.getTime();

    if (elapsedMs < -5 * 60_000) status = "taken_early";
    else if (elapsedMs > 5 * 60_000) status = "taken_late";
    
    recordTakenDose({
      id: dose.record?.id ?? dose.id,
      medicineId: dose.med.id,
      scheduledDate: dose.scheduledDate,
      scheduledTime: dose.time,
      scheduledInstant: dose.record ? dose.record.scheduledInstant : dose.scheduledInstant,
      actualTakenTime: takenTime.toISOString(),
      status
    }, dose.med.doseAmount);
    
    setTakingEarly(null);
  };

  const recordPrnDose = (med: Medicine) => {
    if (
      med.inventoryAmount < med.doseAmount ||
      doseRecords.some((record) => record.isPrn && record.medicineId === med.id && record.scheduledDate === todayStr && Boolean(record.actualTakenTime))
    ) return;
    const takenTime = new Date();
    const time = `${pad(takenTime.getHours())}:${pad(takenTime.getMinutes())}`;
    recordTakenDose({
      id: `prn-${med.id}-${todayStr}`,
      medicineId: med.id,
      scheduledDate: todayStr,
      scheduledTime: time,
      actualTakenTime: takenTime.toISOString(),
      status: "taken_on_time",
      isPrn: true,
    }, med.doseAmount);
  };

  const handleChangeTimeSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submittedTime = new FormData(e.currentTarget).get("newTime");
    if (!changingDose || typeof submittedTime !== "string" || !submittedTime) return;
    
    const [hh, mm] = submittedTime.split(":").map(Number);
    const currentTakenDate = changingDose.record?.actualTakenTime
      ? new Date(changingDose.record.actualTakenTime)
      : changingDose.scheduledDateObj;
    const newTakenDate = new Date(currentTakenDate.getFullYear(), currentTakenDate.getMonth(), currentTakenDate.getDate(), hh, mm);
    
    // Cannot be in future
    if (newTakenDate > now) {
      setTimeError("Taken time cannot be in the future.");
      return;
    }
    setTimeError("");
    
    let status: DoseStatus = "taken_on_time";
    const minutesDiff = minutesFromScheduledOccurrence(changingDose.scheduledDate, changingDose.time, newTakenDate.toISOString());
    
    if (minutesDiff < -5) status = "taken_early";
    else if (minutesDiff > 5) status = "taken_late";

    if (changingDose.record) {
      updateDoseRecord(changingDose.record.id, {
        actualTakenTime: newTakenDate.toISOString(),
        status
      });
    } else {
      recordTakenDose({
        id: changingDose.id,
        medicineId: changingDose.med.id,
        scheduledDate: changingDose.scheduledDate,
        scheduledTime: changingDose.time,
        actualTakenTime: newTakenDate.toISOString(),
        status
      }, changingDose.med.doseAmount);
    }
    
    setChangingDose(null);
  };

  const format12Hour = (timeStr: string) => {
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hr12 = hour % 12 || 12;
    return `${hr12}:${m} ${ampm}`;
  };

  const formatDoseTime = (dose: ScheduledDose) => {
    const sameWallTime = todaysDoses.filter((candidate) => candidate.time === dose.time && candidate.scheduledInstant).length > 1;
    if (!sameWallTime || !dose.scheduledInstant) return format12Hour(dose.time);
    const offset = -new Date(dose.scheduledInstant).getTimezoneOffset();
    const sign = offset >= 0 ? "+" : "−";
    const absolute = Math.abs(offset);
    return `${format12Hour(dose.time)} (UTC${sign}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")})`;
  };

  const formatMissedTime = (record: DoseRecord) => {
    const repeated = outstandingMisses.filter((item) => item.medicineId === record.medicineId && item.scheduledDate === record.scheduledDate && item.scheduledTime === record.scheduledTime && item.scheduledInstant).length > 1;
    if (!record.scheduledInstant || !repeated) return format12Hour(record.scheduledTime);
    const offset = -new Date(record.scheduledInstant).getTimezoneOffset();
    const sign = offset >= 0 ? "+" : "−";
    const absolute = Math.abs(offset);
    return `${format12Hour(record.scheduledTime)} (UTC${sign}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")})`;
  };
  
  const formatIsoTo12Hour = (isoStr: string) => {
    const d = new Date(isoStr);
    return format12Hour(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
  };

  if (!isHydrated || now.getTime() === 0) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950" />;

  return (
      <div className="min-h-screen bg-slate-50 text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-100 pb-20">
      
      <WorkspaceHeader />

      <div className="mx-auto flex w-full max-w-[1440px]">
        <WorkspaceNav />

      <main className="flex min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
        <WorkspacePageHeading
          title="Your Dashboard"
          description={`A clear overview of your medicine routine for ${now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}.`}
          action={<>
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"><span className="h-1.5 w-1.5 rounded-full bg-amber-500"/>Local prototype</span>
            <button aria-label="Add medicine" onClick={() => setIsAddModalOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-teal-600/20 transition-all hover:bg-teal-500 active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
              <span className="hidden sm:inline">Add Medicine</span>
            </button>
          </>}
        />
        
        {/* Overdue Alert */}
        {overdueCount > 0 && (
          <div role="status" aria-live="polite" className="order-1 mb-6 flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50/50 p-4 shadow-sm dark:border-violet-900/50 dark:bg-violet-950/20">
            <span className="flex h-3 w-3 rounded-full bg-violet-500" />
            <p className="font-semibold text-violet-800 dark:text-violet-300 text-sm">
              {overdueCount} scheduled dose{overdueCount !== 1 ? "s" : ""} overdue
            </p>
          </div>
        )}

        {outstandingMisses.length > 0 && (
          <section aria-labelledby="missed-doses-title" className="order-1 mb-6 rounded-2xl border border-rose-200 bg-rose-50/60 p-4 shadow-sm dark:border-rose-900/50 dark:bg-rose-950/20">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 id="missed-doses-title" className="font-semibold text-rose-900 dark:text-rose-200">Missed doses from previous days</h2>
                <p className="mt-1 text-xs text-rose-800/80 dark:text-rose-300/80">{outstandingMisses.length} scheduled occurrence{outstandingMisses.length !== 1 ? "s" : ""} recorded as missed</p>
              </div>
              <Link href="/history" className="text-sm font-semibold text-rose-800 underline-offset-4 hover:underline dark:text-rose-200">View history</Link>
            </div>
            <ul className="mt-3 divide-y divide-rose-200/70 dark:divide-rose-900/50">
              {outstandingMisses.slice(0, 3).map((record) => {
                const medicine = medicines.find((item) => item.id === record.medicineId);
                const [year, month, date] = record.scheduledDate.split("-").map(Number);
                const scheduledDate = new Date(year, month - 1, date);
                return <li key={record.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-sm">
                  <span className="font-medium text-slate-800 dark:text-slate-100">{record.medicineName ?? medicine?.name ?? "Deleted medicine"}</span>
                  <span className="text-xs text-slate-600 dark:text-slate-300">{scheduledDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {formatMissedTime(record)}</span>
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">Missed</span>
                </li>;
              })}
            </ul>
            {outstandingMisses.length > 3 && <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">And {outstandingMisses.length - 3} more in History.</p>}
          </section>
        )}

        <section aria-label="Medicine overview" className="order-3 mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Today’s doses", value: `${takenCount} / ${todaysDoses.length}`, note: "Taken today / scheduled today", destination: "View schedule", href: "#todays-schedule", tone: "teal" },
            { label: "Active medicines", value: activeMedicines.length, note: "Active on today’s date", destination: "View medicines", href: "/medicines", tone: "blue" },
            { label: "Stock alerts", value: stockAlerts.length, note: stockNeedsReview ? "Low/out stock or unit mismatch" : stockAlerts.length ? "Low or out of stock" : "No low, empty, or unit issues", destination: "Review inventory", href: "/inventory", tone: "amber" },
            { label: "Adherence", value: weeklyPercent === null ? "—" : `${weeklyPercent}%`, note: weeklyExpected ? `${weeklyTaken} of ${weeklyExpected} scheduled doses this week` : "No scheduled doses due this week", destination: "View history", href: "/history", tone: "violet" },
          ].map((card) => <Link key={card.label} href={card.href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-800">
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{card.label}</p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{card.value}</p>
            <p className="mt-1 min-h-5 text-xs text-slate-500 dark:text-slate-400">{card.note}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 group-hover:text-teal-800 dark:text-teal-300 dark:group-hover:text-teal-200">{card.destination}<span aria-hidden="true">→</span></span>
          </Link>)}
        </section>

        <section className="order-5 mb-6 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div><h2 className="font-bold text-slate-900 dark:text-white">Adherence this week</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Based on scheduled doses in your current medicine list.</p></div>
              {weeklyPercent !== null && <span className="rounded-lg bg-teal-50 px-2.5 py-1 text-sm font-bold text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">{weeklyPercent}%</span>}
            </div>
            {weeklyExpected === 0 ? <div className="mt-6 flex min-h-32 items-center justify-center rounded-xl bg-slate-50 px-4 text-center text-sm text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">No scheduled doses to chart for the last 7 days.</div> : <div className="mt-6 grid h-36 grid-cols-7 items-end gap-2" aria-label={`Weekly adherence ${weeklyPercent} percent`}>
              {weeklyAdherence.map((day) => <div key={day.date} className="flex h-full flex-col items-center justify-end gap-2" title={`${day.date}: ${day.taken} of ${day.expected} scheduled doses taken`}>
                <span className="text-[10px] font-medium text-slate-500">{day.percent === null ? "—" : `${day.percent}%`}</span>
                <div className="flex h-24 w-full items-end overflow-hidden rounded-t-lg bg-slate-100 dark:bg-slate-800"><div className="w-full rounded-t-lg bg-gradient-to-t from-teal-600 to-emerald-400 transition-all" style={{ height: `${day.percent ?? 0}%`, minHeight: day.percent === 0 ? 3 : undefined }} /></div>
                <span className="text-[10px] font-medium text-slate-500">{day.label}</span>
              </div>)}
            </div>}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-2"><div><h2 className="font-bold text-slate-900 dark:text-white">Recent activity</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Recorded dose events</p></div><Link href="/history" className="rounded text-xs font-semibold text-teal-700 hover:text-teal-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-300">View history</Link></div>
            {recentActivity.length === 0 ? <p className="mt-5 rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">Taken doses will appear here.</p> : <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {recentActivity.map((record) => {
                const medicineName = record.medicineName ?? medicines.find((medicine) => medicine.id === record.medicineId)?.name ?? "Deleted medicine";
                const takenAt = record.actualTakenTime ? new Date(record.actualTakenTime) : null;
                return <li key={record.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="flex min-w-0 items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" aria-hidden="true">✓</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{medicineName} taken</p><p className="text-xs text-slate-500 dark:text-slate-400">{record.isPrn ? "As needed" : `Scheduled ${format12Hour(record.scheduledTime)}`}</p></div></div><span className="shrink-0 text-[11px] text-slate-500 dark:text-slate-400">{takenAt && !Number.isNaN(takenAt.getTime()) ? takenAt.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }) : "Recorded"}</span></li>;
              })}
            </ul>}
          </div>
        </section>

        <section className="order-4 mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900 dark:text-white">Upcoming doses</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">The next scheduled doses today</p></div><Link href="#todays-schedule" className="text-xs font-semibold text-teal-700 hover:text-teal-600 dark:text-teal-300">Open today&apos;s schedule →</Link></div>
          {upcomingDoses.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">No upcoming scheduled doses today.</p> : <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{upcomingDoses.map((dose) => <div key={dose.id} className="flex min-w-0 items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50"><span className="shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-bold text-teal-700 shadow-sm dark:bg-slate-800 dark:text-teal-300">{formatDoseTime(dose)}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{dose.med.name}</span><span className="block text-xs text-slate-500 dark:text-slate-400">{dose.med.doseAmount} {dose.med.doseUnit ?? doseUnitFor(dose.med)}</span></span></div>)}</div>}
        </section>

        <section id="todays-schedule" className="order-2 mb-4 flex scroll-mt-24 flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-xl font-bold text-slate-900 dark:text-white">Today&apos;s schedule</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">See each dose time, prescribed amount, status, and action.</p></div>
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900" role="group" aria-label="Filter today's doses">
            {(["all", "pending", "taken"] as DoseFilter[]).map((filter) => <button key={filter} type="button" onClick={() => setDoseFilter(filter)} aria-pressed={doseFilter === filter} className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${doseFilter === filter ? "bg-white text-teal-800 shadow-sm dark:bg-slate-800 dark:text-teal-200" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"}`}>{filter === "all" ? `All ${todaysDoses.length}` : filter === "pending" ? `Pending ${todaysDoses.length - takenCount}` : `Taken ${takenCount}`}</button>)}
          </div>
        </section>

        {/* Medicines List or Empty State */}
        <div className="order-2 mb-6">
        {medicines.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900/30">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M8 12h8" /><path d="M12 8v8" /></svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">No medicines yet</h3>
            <p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Add your first medicine to start tracking your schedule and inventory.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500"
              >
                Add medicine
              </button>
            </div>
          </div>
        ) : filteredDoses.length === 0 && prnMedicines.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">{doseFilter === "taken" ? "No doses marked as taken today." : doseFilter === "pending" ? "All scheduled doses are marked as taken." : "No doses scheduled for today."}</div>
        ) : (
          <div className="space-y-5">
          {filteredDoses.length > 0 && <div className="space-y-2.5">
            {filteredDoses.map((dose) => {
              const stockStatus = getStockStatus(dose.med);
              const unitsCompatible = inventoryUnitsCompatible(dose.med);
              return (
              <div
                key={dose.id}
                className={`group relative flex flex-col gap-4 rounded-2xl border p-4 transition-shadow hover:shadow-md sm:flex-row sm:items-center sm:justify-between ${
                  dose.status.startsWith("taken")
                    ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                    : dose.status === "missed"
                    ? "border-rose-300 bg-rose-50/30 dark:border-rose-900/40 dark:bg-rose-950/10 shadow-sm"
                    : dose.status === "overdue"
                    ? "border-violet-300 bg-violet-50/30 dark:border-violet-900/40 dark:bg-violet-950/10 shadow-sm"
                    : dose.status === "due"
                    ? "border-red-300 bg-red-50/30 dark:border-red-900/40 dark:bg-red-950/10 shadow-sm"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold ${
                        dose.status.startsWith("taken") ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" :
                        dose.status === "missed" ? "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300" :
                        dose.status === "overdue" ? "bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-300" :
                        dose.status === "due" ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300" :
                        dose.almostDue ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" :
                        "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                      }`}>
                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        {formatDoseTime(dose)}
                      </span>
                      
                      {!dose.status.startsWith("taken") && (
                        <span className={`text-xs font-semibold ${
                          dose.status === "overdue" ? "text-violet-700 dark:text-violet-300 flex items-center gap-1" :
                          dose.status === "missed" ? "text-rose-700 dark:text-rose-300 flex items-center gap-1" :
                          dose.status === "due" ? "text-red-700 dark:text-red-300 flex items-center gap-1" :
                          dose.almostDue ? "text-amber-700 dark:text-amber-300 flex items-center gap-1" :
                          "text-blue-700 dark:text-blue-300"
                        }`}>
                          {dose.status === "due" && <span aria-hidden="true" className="flex h-2 w-2 shrink-0 rounded-full bg-red-600" />}
                          {dose.status === "overdue" && <span aria-hidden="true" className="flex h-2 w-2 shrink-0 rounded-full bg-violet-600" />}
                          {dose.status === "missed" && <span aria-hidden="true" className="flex h-2 w-2 shrink-0 rounded-full bg-rose-600" />}
                          {dose.almostDue && <span aria-hidden="true" className="flex h-2 w-2 shrink-0 rounded-full bg-amber-500" />}
                          {dose.status === "due" ? "Due now" : dose.almostDue ? `Almost due · ${dose.diffText}` : dose.status === "missed" ? "Missed" : dose.status === "overdue" ? dose.diffText : `Upcoming · ${dose.diffText}`}
                        </span>
                      )}
                    </div>

                    {/* Menu */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === dose.id ? null : dose.id); }}
                        aria-label={`Medicine actions for ${dose.med.name} at ${formatDoseTime(dose)}`}
                        aria-expanded={openMenuId === dose.id}
                        className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                      </button>
                      
                      {openMenuId === dose.id && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setOpenMenuId(null)} />
                          <div className="absolute right-0 top-full mt-1.5 z-40 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                            <button onClick={() => { setEditingMedicine(dose.med); setOpenMenuId(null); }} className="w-full cursor-pointer flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                              Edit Medicine
                            </button>
                            <button onClick={() => { setAddingStockMed(dose.med); setOpenMenuId(null); }} className="w-full cursor-pointer flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800">
                              Add Stock
                            </button>
                            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                            <button onClick={() => { setDeletingMedicine(dose.med); setOpenMenuId(null); }} className="w-full cursor-pointer flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40">
                              Delete Medicine
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <h3 className={`text-base font-bold tracking-tight ${dose.status.startsWith("taken") ? "text-slate-700 dark:text-slate-300" : "text-slate-900 dark:text-white"}`}>
                      {dose.med.name}
                    </h3>
                    <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">Prescribed dose: {dose.med.doseAmount} {dose.med.doseUnit ?? doseUnitFor(dose.med)}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{dose.med.type}{dose.med.strength ? ` · ${dose.med.strength}` : ""}{dose.med.frequency ? ` · ${dose.med.frequency}${dose.med.frequency === "Every X hours" ? ` (every ${dose.med.intervalHours || 8}h)` : ""}` : ""}</p>
                    {dose.med.instructions && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Instructions: {dose.med.instructions}</p>}

                    {/* Inventory Status */}
                    <div className="mt-2.5">
                      {stockStatus === "out" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Out of stock
                        </span>
                      ) : stockStatus === "low" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {dose.med.inventoryAmount} {inventoryUnitFor(dose.med)} remaining (Low stock)
                        </span>
                      ) : stockStatus === "unknown" ? (
                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">Inventory units do not match dose units; review stock before recording.</span>
                      ) : (
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {dose.med.inventoryAmount} {inventoryUnitFor(dose.med)} remaining
                          {dose.med.type === "Syrup" && ` (≈ ${Math.floor(dose.med.inventoryAmount / dose.med.doseAmount)} doses)`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2 border-t border-slate-100 pt-3 dark:border-slate-800/80 sm:min-w-44 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                  {dose.status.startsWith("taken") ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between rounded-xl bg-emerald-100/70 dark:bg-emerald-950/60 px-3.5 py-2.5 border border-emerald-200/80 dark:border-emerald-900/50">
                        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-xs sm:text-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-emerald-600 dark:text-emerald-400"><polyline points="20 6 9 17 4 12" /></svg>
                          <span>Taken</span>
                          <span className="font-medium">Taken at {formatIsoTo12Hour(dose.record!.actualTakenTime!)}{dose.diffText ? ` · ${dose.diffText}` : ""}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[11px] text-slate-500">{dose.status === "taken_early" ? "Taken early" : dose.status === "taken_late" ? "Taken late" : "Taken on time"}</span>
                        <button
                          onClick={() => {
                            const d = new Date(dose.record!.actualTakenTime!);
                            setNewTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
                            setTimeError("");
                            setChangingDose(dose);
                          }}
                          className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white underline underline-offset-2 transition-colors"
                        >
                          Change time
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                    <button
                      type="button"
                      disabled={!unitsCompatible || dose.med.inventoryAmount < dose.med.doseAmount || dose.identityAmbiguous}
                      title={dose.identityAmbiguous ? "An older dose at this repeated local time cannot be safely assigned to either occurrence." : undefined}
                      onClick={() => handleTakeDose(dose)}
                      className="w-full cursor-pointer flex min-h-11 items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-500 shadow-sm active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><polyline points="20 6 9 17 4 12" /></svg>
                      <span>Mark as Taken</span>
                    </button>
                    {dose.identityAmbiguous && <p role="status" className="mt-2 text-xs text-amber-700 dark:text-amber-300">An older dose at this repeated local time cannot be assigned safely.</p>}
                    </>
                  )}
                </div>
              </div>
              );
            })}
          </div>}
          {filteredDoses.length === 0 && prnMedicines.length > 0 && <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:bg-slate-900">No scheduled doses match this filter.</p>}
          {prnMedicines.length > 0 && <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">As needed</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {prnMedicines.map((med) => {
                const prnTakenToday = doseRecords.some((record) => record.isPrn && record.medicineId === med.id && record.scheduledDate === todayStr && Boolean(record.actualTakenTime));
                return <div key={med.id} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{med.name}</h3>
                    <p className="mt-1 text-sm font-medium text-teal-600 dark:text-teal-400">{med.type}{med.strength ? ` · ${med.strength}` : ""}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">As needed · Dose: {med.doseAmount} {med.doseUnit ?? doseUnitFor(med)}</p>
                    {med.instructions && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{med.instructions}</p>}
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{med.inventoryAmount} {inventoryUnitFor(med)} remaining</p>
                    {doseRecords.filter((record) => record.isPrn && record.medicineId === med.id && record.scheduledDate === todayStr).map((record) => (
                      <p key={record.id} className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">Taken at {record.actualTakenTime ? formatIsoTo12Hour(record.actualTakenTime) : "—"}</p>
                    ))}
                  </div>
                  <button type="button" disabled={prnTakenToday || !inventoryUnitsCompatible(med) || med.inventoryAmount < med.doseAmount} onClick={() => recordPrnDose(med)} className="mt-5 w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50">{prnTakenToday ? "Taken ✓" : "Mark as Taken"}</button>
                </div>;
              })}
            </div>
          </section>}
          </div>
        )}
        </div>
      </main>
      </div>

      {/* Modals */}
      
      {/* Add/Edit Modal */}
      {(isAddModalOpen || editingMedicine) && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-slate-950/60 p-4 backdrop-blur-xs sm:items-center">
          <div role="dialog" aria-modal="true" aria-labelledby="medicine-dialog-title" onKeyDown={keepDialogFocusInside} className="relative my-0 max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:my-8">
            <h2 id="medicine-dialog-title" className="text-xl font-bold mb-4">{editingMedicine ? "Edit Medicine" : "Add Medicine"}</h2>
            <MedicineForm
              key={editingMedicine?.id ?? "new-medicine"}
              initialData={editingMedicine}
              onSave={(med) => {
                if (editingMedicine) {
                  updateMedicine(med.id, med);
                } else {
                  addMedicine(med);
                }
                setIsAddModalOpen(false);
                setEditingMedicine(null);
              }}
              onCancel={() => { setIsAddModalOpen(false); setEditingMedicine(null); }}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingMedicine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div role="dialog" aria-modal="true" aria-labelledby="delete-medicine-title" onKeyDown={keepDialogFocusInside} className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 text-center">
            <h3 id="delete-medicine-title" className="text-lg font-bold text-slate-900 dark:text-white">Delete this medicine?</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">This removes the medicine from your list. Recorded doses remain in History.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setDeletingMedicine(null)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
              <button onClick={() => { deleteMedicine(deletingMedicine.id); setDeletingMedicine(null); }} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Take Early Confirmation */}
      {takingEarly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div role="dialog" aria-modal="true" aria-labelledby="early-dose-title" onKeyDown={keepDialogFocusInside} className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900">
            <h3 id="early-dose-title" className="text-lg font-bold text-slate-900 dark:text-white">Take Dose Early?</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              This dose is scheduled for {formatDoseTime(takingEarly)}. You&apos;re recording it {formatDuration(takingEarly.earlyBy)} early.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setTakingEarly(null)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Cancel</button>
              <button onClick={() => confirmTakeDose(takingEarly, now)} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white">Take early</button>
            </div>
          </div>
        </div>
      )}

      {/* Change Time Dialog */}
      {changingDose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div role="dialog" aria-modal="true" aria-labelledby="time-correction-title" onKeyDown={keepDialogFocusInside} className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 id="time-correction-title" className="text-lg font-bold text-slate-900 dark:text-white mb-4">Correct recorded time</h3>
            <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              <p>Scheduled: {formatDoseTime(changingDose)}</p>
              <p>Recorded: {formatIsoTo12Hour(changingDose.record?.actualTakenTime ?? "")}</p>
            </div>
            <form onSubmit={handleChangeTimeSubmit}>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">New time</label>
              <input
                type="time"
                name="newTime"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                aria-invalid={Boolean(timeError)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm mb-6 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
              {timeError && <p className="mb-4 text-sm text-rose-600 dark:text-rose-400" role="alert">{timeError}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setChangingDose(null)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Cancel</button>
                <button type="submit" className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white">Save correction</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Stock Dialog */}
      {addingStockMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div role="dialog" aria-modal="true" aria-labelledby="dashboard-add-stock-title" onKeyDown={keepDialogFocusInside} className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 id="dashboard-add-stock-title" className="text-lg font-bold text-slate-900 dark:text-white mb-4">Add Stock</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Current stock: {addingStockMed.inventoryAmount} {inventoryUnitFor(addingStockMed)}</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (stockToAdd > 0) {
                addStock(addingStockMed.id, stockToAdd);
                setAddingStockMed(null);
                setStockToAdd(0);
              }
            }}>
              <label htmlFor="dashboard-stock-quantity" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Quantity to add ({inventoryUnitFor(addingStockMed)})</label>
              <input
                id="dashboard-stock-quantity"
                type="number"
                step={addingStockMed.type === "Syrup" ? "any" : "1"}
                min={addingStockMed.type === "Syrup" ? "0.01" : "0"}
                value={stockToAdd || ""}
                onChange={(e) => setStockToAdd(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm mb-4 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              />
              
              <div className="flex gap-2 mb-6">
                {[1, 5, 10].map((num) => {
                  const val = addingStockMed.type === "Syrup" ? num * 10 : num;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setStockToAdd(val)}
                      className="flex-1 rounded-lg bg-slate-100 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    >
                      +{val}
                    </button>
                  )
                })}
              </div>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setAddingStockMed(null); setStockToAdd(0); }} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300">Cancel</button>
                <button type="submit" disabled={!stockToAdd || stockToAdd <= 0} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Add Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav desktopHidden />
    </div>
  );
}
