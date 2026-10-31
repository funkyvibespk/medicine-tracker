"use client";

import { useMemo, useState, type FormEvent } from "react";
import BottomNav from "@/components/dashboard/BottomNav";
import WorkspaceHeader from "@/components/dashboard/WorkspaceHeader";
import WorkspaceNav from "@/components/dashboard/WorkspaceNav";
import WorkspacePageHeading from "@/components/dashboard/WorkspacePageHeading";
import { VitalReadingIconBadge, VITAL_READING_TEXT_CLASSES } from "@/components/dashboard/VitalReadingIcon";
import BrandedLoadingScreen from "@/components/BrandedLoadingScreen";
import { useMedicine } from "@/contexts/MedicineContext";
import { localDateString } from "@/lib/schedule";
import {
  filterVitalReadings,
  latestVitalReading,
  sortVitalReadingsNewestFirst,
  validateVitalReading,
  vitalReadingLabel,
  vitalReadingTypeLabel,
  type BloodSugarContext,
  type BloodSugarReading,
  type BloodSugarUnit,
  type VitalReading,
  type VitalReadingType,
} from "@/lib/vitalTrack";

const readingTypes: VitalReadingType[] = ["blood-pressure", "heart-rate", "oxygen-saturation", "blood-sugar"];
const sugarContexts: BloodSugarContext[] = ["Fasting", "Before Meal", "After Meal", "Random"];

function createReadingId(): string {
  const id = globalThis.crypto?.randomUUID?.();
  return id ? `vital-${id}` : `vital-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function localTimeValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function readingDateTime(reading: VitalReading): string {
  const [year, month, day] = reading.date.split("-").map(Number);
  const [hour, minute] = reading.time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

const controlClass = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white";
const labelClass = "mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300";

export default function VitalTrackPage() {
  const { vitalReadings, saveVitalReading, deleteVitalReading, vitalTrackDashboardEnabled, setVitalTrackDashboardEnabled, isHydrated } = useMedicine();
  const [readingType, setReadingType] = useState<VitalReadingType>("blood-pressure");
  const [date, setDate] = useState(() => localDateString(new Date()));
  const [time, setTime] = useState(() => localTimeValue(new Date()));
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [bpm, setBpm] = useState("");
  const [percent, setPercent] = useState("");
  const [sugarValue, setSugarValue] = useState("");
  const [sugarUnit, setSugarUnit] = useState<BloodSugarUnit>("mg/dL");
  const [sugarContext, setSugarContext] = useState<BloodSugarContext>("Fasting");
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState<VitalReading | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [historyType, setHistoryType] = useState<VitalReadingType | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedDay, setSelectedDay] = useState(() => localDateString(new Date()));

  const latestReadings = useMemo(() => sortVitalReadingsNewestFirst(vitalReadings), [vitalReadings]);
  const filteredReadings = useMemo(() => filterVitalReadings(vitalReadings, { type: historyType, dateFrom, dateTo }), [vitalReadings, historyType, dateFrom, dateTo]);
  const dailyReadings = useMemo(() => filterVitalReadings(vitalReadings, { dateFrom: selectedDay, dateTo: selectedDay }), [vitalReadings, selectedDay]);

  if (!isHydrated) return <BrandedLoadingScreen />;

  const resetForm = () => {
    setEditing(null);
    setSystolic(""); setDiastolic(""); setBpm(""); setPercent(""); setSugarValue(""); setNotes("");
    setDate(localDateString(new Date())); setTime(localTimeValue(new Date()));
    setError(null);
  };

  const beginEdit = (reading: VitalReading) => {
    setEditing(reading);
    setReadingType(reading.type);
    setDate(reading.date); setTime(reading.time); setNotes(reading.notes ?? ""); setError(null); setNotice(null);
    if (reading.type === "blood-pressure") { setSystolic(String(reading.systolic)); setDiastolic(String(reading.diastolic)); }
    if (reading.type === "heart-rate") setBpm(String(reading.bpm));
    if (reading.type === "oxygen-saturation") setPercent(String(reading.percent));
    if (reading.type === "blood-sugar") { setSugarValue(String(reading.value)); setSugarUnit(reading.unit); setSugarContext(reading.context); }
    document.getElementById("vital-reading-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(null); setNotice(null);
    const base = { id: editing?.id ?? createReadingId(), type: readingType, date, time, notes: notes.trim() || undefined };
    let reading: VitalReading;
    if (readingType === "blood-pressure") reading = { ...base, type: readingType, systolic: Number(systolic), diastolic: Number(diastolic) };
    else if (readingType === "heart-rate") reading = { ...base, type: readingType, bpm: Number(bpm) };
    else if (readingType === "oxygen-saturation") reading = { ...base, type: readingType, percent: Number(percent) };
    else reading = { ...base, type: readingType, value: Number(sugarValue), unit: sugarUnit, context: sugarContext } satisfies BloodSugarReading;

    const validation = validateVitalReading(reading);
    if (validation) { setError(validation); return; }
    if (!saveVitalReading(reading)) { setError("This reading could not be saved. Confirm the active profile is ready and try again."); return; }
    resetForm(); setNotice(editing ? "Reading updated." : "Reading saved.");
  };

  const handleDelete = (reading: VitalReading) => {
    if (!window.confirm(`Delete this ${vitalReadingTypeLabel(reading.type).toLowerCase()} reading? This cannot be undone.`)) return;
    if (deleteVitalReading(reading.id)) setNotice("Reading deleted.");
  };

  return (
    <div className="workspace-app min-h-screen bg-slate-50 pb-24 text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-100 lg:pb-20">
      <WorkspaceHeader />
      <div className="mx-auto flex w-full max-w-[1440px]">
        <WorkspaceNav />
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <WorkspacePageHeading title="VitalTrack" description="Your local health measurements, organized by date." />

          <section className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            <div className="min-w-0"><h2 className="font-semibold text-slate-900 dark:text-white">Dashboard snapshot</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Show today&apos;s real readings on My Dashboard.</p></div>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 dark:border-slate-700">
              <span className="text-sm font-semibold">Show on Dashboard</span>
              <input type="checkbox" checked={vitalTrackDashboardEnabled} onChange={(event) => setVitalTrackDashboardEnabled(event.target.checked)} className="h-5 w-5 accent-teal-600" aria-label="Show VitalTrack snapshot on Dashboard" />
            </label>
          </section>

          <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Latest VitalTrack measurements">
            {readingTypes.map((type) => {
              const latest = latestVitalReading(latestReadings, type);
              return <article key={type} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
                <div className="flex min-w-0 items-center gap-2.5"><VitalReadingIconBadge type={type} /><h2 className={`min-w-0 text-xs font-semibold sm:text-sm ${VITAL_READING_TEXT_CLASSES[type]}`}>{vitalReadingTypeLabel(type)}</h2></div>
                <p className="mt-2 break-words text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">{latest ? vitalReadingLabel(latest) : "—"}</p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{latest ? readingDateTime(latest) : "No readings yet"}</p>
              </article>;
            })}
          </section>

          <section id="add-reading" className="mt-5 scroll-mt-24 rounded-2xl border border-teal-100 bg-white p-4 shadow-sm dark:border-teal-900/50 dark:bg-slate-900 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-bold text-slate-900 dark:text-white">{editing ? "Edit Reading" : "Add Reading"}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Enter a measurement exactly as recorded. VitalTrack does not interpret readings.</p></div>{editing && <button type="button" onClick={resetForm} className="min-h-10 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-slate-300 dark:hover:bg-slate-800">Cancel edit</button>}</div>
            <form id="vital-reading-form" onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div><label htmlFor="vital-type" className={`${labelClass} flex items-center gap-2`}><VitalReadingIconBadge type={readingType} className="h-7 w-7" /><span className={VITAL_READING_TEXT_CLASSES[readingType]}>Measurement</span></label><select id="vital-type" value={readingType} disabled={Boolean(editing)} onChange={(event) => setReadingType(event.target.value as VitalReadingType)} className={controlClass}>{readingTypes.map((type) => <option key={type} value={type}>{vitalReadingTypeLabel(type)}</option>)}</select></div>
              <div><label htmlFor="vital-date" className={labelClass}>Measurement date</label><input id="vital-date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} className={controlClass} /></div>
              <div><label htmlFor="vital-time" className={labelClass}>Measurement time</label><input id="vital-time" type="time" required value={time} onChange={(event) => setTime(event.target.value)} className={controlClass} /></div>
              {readingType === "blood-pressure" && <><div><label htmlFor="vital-systolic" className={labelClass}>Systolic (mmHg)</label><input id="vital-systolic" type="number" min="0.001" step="any" required value={systolic} onChange={(event) => setSystolic(event.target.value)} className={controlClass} /></div><div><label htmlFor="vital-diastolic" className={labelClass}>Diastolic (mmHg)</label><input id="vital-diastolic" type="number" min="0.001" step="any" required value={diastolic} onChange={(event) => setDiastolic(event.target.value)} className={controlClass} /></div></>}
              {readingType === "heart-rate" && <div><label htmlFor="vital-bpm" className={labelClass}>Heart rate (BPM)</label><input id="vital-bpm" type="number" min="0.001" step="any" required value={bpm} onChange={(event) => setBpm(event.target.value)} className={controlClass} /></div>}
              {readingType === "oxygen-saturation" && <div><label htmlFor="vital-spo2" className={labelClass}>Oxygen Saturation (%)</label><input id="vital-spo2" type="number" min="0" max="100" step="any" required value={percent} onChange={(event) => setPercent(event.target.value)} className={controlClass} /></div>}
              {readingType === "blood-sugar" && <><div><label htmlFor="vital-sugar" className={labelClass}>Blood Sugar</label><input id="vital-sugar" type="number" min="0.001" step="any" required value={sugarValue} onChange={(event) => setSugarValue(event.target.value)} className={controlClass} /></div><div><label htmlFor="vital-sugar-unit" className={labelClass}>Unit</label><select id="vital-sugar-unit" value={sugarUnit} onChange={(event) => setSugarUnit(event.target.value as BloodSugarUnit)} className={controlClass}><option>mg/dL</option><option>mmol/L</option></select></div><div><label htmlFor="vital-sugar-context" className={labelClass}>Context</label><select id="vital-sugar-context" value={sugarContext} onChange={(event) => setSugarContext(event.target.value as BloodSugarContext)} className={controlClass}>{sugarContexts.map((context) => <option key={context}>{context}</option>)}</select></div></>}
              <div className="sm:col-span-2 xl:col-span-4"><label htmlFor="vital-notes" className={labelClass}>Notes <span className="font-normal text-slate-500">(optional)</span></label><textarea id="vital-notes" rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} className={`${controlClass} min-h-20 resize-y`} /></div>
              {error && <p className="sm:col-span-2 xl:col-span-4 text-sm font-medium text-rose-700 dark:text-rose-300" role="alert">{error}</p>}
              {notice && <p className="sm:col-span-2 xl:col-span-4 text-sm font-medium text-emerald-700 dark:text-emerald-300" role="status">{notice}</p>}
              <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-4"><button type="submit" className="workspace-primary-button min-h-11 rounded-xl px-5 text-sm font-semibold text-white">{editing ? "Save Changes" : "Save Reading"}</button>{!editing && <button type="button" onClick={resetForm} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Clear</button>}</div>
            </form>
          </section>

          <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-900 dark:text-white">Daily View</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">All measurements recorded on the selected day.</p></div><div><label htmlFor="vital-selected-day" className={labelClass}>Date</label><input id="vital-selected-day" type="date" value={selectedDay} onChange={(event) => setSelectedDay(event.target.value)} className={`${controlClass} sm:w-52`} /></div></div>
            {dailyReadings.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">No measurements recorded on this date.</p> : <div className="mt-4 grid gap-3 sm:grid-cols-2">{dailyReadings.map((reading) => <article key={reading.id} className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className={`flex items-center gap-2 text-sm font-semibold ${VITAL_READING_TEXT_CLASSES[reading.type]}`}><VitalReadingIconBadge type={reading.type} className="h-8 w-8" />{vitalReadingTypeLabel(reading.type)}</h3><p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{vitalReadingLabel(reading)}</p></div><time className="text-xs text-slate-500 dark:text-slate-400">{reading.time}</time></div>{reading.notes && <p className="mt-2 break-words text-sm text-slate-600 dark:text-slate-300">{reading.notes}</p>}</article>)}</div>}
          </section>

          <section id="vital-history" className="mt-5 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            <div><h2 className="text-lg font-bold text-slate-900 dark:text-white">Measurement History</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">A dated log of your saved readings. No diagnoses or treatment recommendations are generated.</p></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div><label htmlFor="vital-history-type" className={labelClass}>Measurement</label><select id="vital-history-type" value={historyType} onChange={(event) => setHistoryType(event.target.value as VitalReadingType | "all")} className={controlClass}><option value="all">All measurements</option>{readingTypes.map((type) => <option key={type} value={type}>{vitalReadingTypeLabel(type)}</option>)}</select></div>
              <div><label htmlFor="vital-date-from" className={labelClass}>From date</label><input id="vital-date-from" type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} className={controlClass} /></div>
              <div><label htmlFor="vital-date-to" className={labelClass}>To date</label><input id="vital-date-to" type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} className={controlClass} /></div>
              {(historyType !== "all" || dateFrom || dateTo) && <div className="flex items-end"><button type="button" onClick={() => { setHistoryType("all"); setDateFrom(""); setDateTo(""); }} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-slate-300 dark:hover:bg-slate-800">Clear filters</button></div>}
            </div>
            {filteredReadings.length === 0 ? <p className="mt-4 rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">{vitalReadings.length ? "No readings match these filters." : "Your saved readings will appear here."}</p> : <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">{filteredReadings.map((reading) => <li key={reading.id} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className={`flex items-center gap-2 text-xs font-semibold ${VITAL_READING_TEXT_CLASSES[reading.type]}`}><VitalReadingIconBadge type={reading.type} className="h-7 w-7" />{vitalReadingTypeLabel(reading.type)}</p><p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{vitalReadingLabel(reading)}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{readingDateTime(reading)}</p>{reading.notes && <p className="mt-2 break-words text-sm text-slate-600 dark:text-slate-300">{reading.notes}</p>}</div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => beginEdit(reading)} className="min-h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Edit</button><button type="button" onClick={() => handleDelete(reading)} className="min-h-10 rounded-lg border border-rose-200 px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/40">Delete</button></div></li>)}</ul>}
          </section>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
