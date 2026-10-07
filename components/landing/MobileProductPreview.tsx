"use client";

import { useState } from "react";

interface DemoMedicine {
  id: string;
  name: string;
  dosage: string;
  time: string;
  taken: boolean;
  takenAt?: string;
  tag?: string;
  stockNote?: string;
  isLowStock?: boolean;
}

const initialMobileMeds: DemoMedicine[] = [
  {
    id: "m-1",
    name: "Calan",
    dosage: "40 mg • 1 tablet",
    time: "8:00 AM",
    taken: true,
    takenAt: "Taken 8:05 AM",
    tag: "Morning",
  },
  {
    id: "m-2",
    name: "Vitamin D",
    dosage: "1000 IU • 1 capsule",
    time: "2:00 PM",
    taken: false,
    tag: "Afternoon",
  },
  {
    id: "m-3",
    name: "Omeprazole",
    dosage: "20 mg • 1 capsule",
    time: "8:00 PM",
    taken: false,
    tag: "Evening",
    isLowStock: true,
    stockNote: "4 capsules left",
  },
];

export default function MobileProductPreview() {
  const [meds, setMeds] = useState<DemoMedicine[]>(initialMobileMeds);
  const [activeTab, setActiveTab] = useState<"today" | "meds" | "stock" | "profile">("today");

  const toggleMed = (id: string) => {
    setMeds((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              taken: !m.taken,
              takenAt: !m.taken ? "Taken just now" : undefined,
            }
          : m
      )
    );
  };

  const takenCount = meds.filter((m) => m.taken).length;
  const adherencePercent = Math.round((takenCount / meds.length) * 100);

  return (
    <div className="relative mx-auto w-full max-w-[340px] select-none">
      {/* Smartphone Outer Shell */}
      <div className="relative rounded-[3rem] bg-slate-900 p-3.5 shadow-2xl ring-1 ring-slate-800/80 shadow-teal-950/20">
        {/* Dynamic Island / Speaker Pill */}
        <div className="absolute top-6 left-1/2 z-30 h-4 w-28 -translate-x-1/2 rounded-full bg-slate-950 flex items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-slate-800 mr-2" />
          <div className="h-1.5 w-1.5 rounded-full bg-teal-500/80 animate-pulse" />
        </div>

        {/* Screen Bezel & Display */}
        <div className="relative overflow-hidden rounded-[2.4rem] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border border-slate-200/40 dark:border-slate-800">
          {/* iOS Top Bar */}
          <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[11px] font-semibold text-slate-800 dark:text-slate-200">
            <span>9:41</span>
            <div className="flex items-center gap-1.5">
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L12 22l7.03-4.39C20.26 16.07 21 14.12 21 12c0-4.97-4.03-9-9-9z" />
              </svg>
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98C20.93 5.9 16.69 4 12 4z" />
              </svg>
              <div className="h-2.5 w-5 rounded-sm border border-current p-0.5 flex items-center">
                <div className="h-full w-full bg-current rounded-2xs" />
              </div>
            </div>
          </div>

          {/* In-app Mobile Header */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                  Wednesday, Oct 7
                </p>
                <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Good morning, Sarah
                </h3>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-xs font-bold text-white shadow-xs">
                S
              </div>
            </div>

            {/* Today's Summary Card */}
            <div className="mt-3 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 p-3.5 text-white shadow-md shadow-teal-800/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-teal-100">Today&apos;s Adherence</p>
                  <p className="text-xl font-extrabold tracking-tight">
                    {adherencePercent}%{" "}
                    <span className="text-xs font-medium text-teal-200">
                      ({takenCount}/{meds.length} doses)
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium backdrop-blur-xs">
                  <span>🔥</span>
                  <span>7d streak</span>
                </div>
              </div>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-black/20">
                <div
                  className="h-full rounded-full bg-white transition-all duration-300"
                  style={{ width: `${adherencePercent}%` }}
                />
              </div>
            </div>

            {/* Low Stock Warning Banner */}
            <div className="mt-2.5 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <div className="flex items-center gap-2">
                <span className="text-sm">⚠️</span>
                <div>
                  <p className="font-semibold leading-tight">Stock Alert</p>
                  <p className="text-[10px] text-amber-700 dark:text-amber-300">
                    Omeprazole has 4 capsules remaining
                  </p>
                </div>
              </div>
              <span className="rounded-md bg-amber-200/70 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-900/80 dark:text-amber-100">
                Refill
              </span>
            </div>
          </div>

          {/* Medicine List */}
          <div className="px-4 pb-20 space-y-2.5 max-h-[290px] overflow-y-auto">
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Today&apos;s Doses
              </span>
              <span className="text-[11px] text-slate-500">Tap to toggle</span>
            </div>

            {meds.map((med) => (
              <div
                key={med.id}
                onClick={() => toggleMed(med.id)}
                className={`group flex items-center justify-between rounded-xl border p-3 transition-all cursor-pointer ${
                  med.taken
                    ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                    : "border-slate-200 bg-white shadow-xs hover:border-teal-300 dark:border-slate-800 dark:bg-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                      med.taken
                        ? "bg-emerald-600 text-white"
                        : "border-2 border-slate-300 text-transparent dark:border-slate-600"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p
                        className={`text-xs font-bold ${
                          med.taken
                            ? "text-emerald-900 line-through decoration-emerald-500/50 dark:text-emerald-300"
                            : "text-slate-900 dark:text-white"
                        }`}
                      >
                        {med.name}
                      </p>
                      {med.isLowStock && (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                          Low
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {med.dosage}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    {med.time}
                  </p>
                  <span
                    className={`inline-block text-[9px] font-semibold uppercase ${
                      med.taken
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-teal-600 dark:text-teal-400"
                    }`}
                  >
                    {med.taken ? "Taken" : "Upcoming"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom App Navigation */}
          <div className="absolute inset-x-0 bottom-0 border-t border-slate-200 bg-white/95 px-5 py-2.5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 flex items-center justify-around">
            <button
              onClick={() => setActiveTab("today")}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${
                activeTab === "today"
                  ? "text-teal-600 dark:text-teal-400"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>Today</span>
            </button>
            <button
              onClick={() => setActiveTab("meds")}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${
                activeTab === "meds"
                  ? "text-teal-600 dark:text-teal-400"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <span>Meds</span>
            </button>
            <button
              onClick={() => setActiveTab("stock")}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${
                activeTab === "stock"
                  ? "text-teal-600 dark:text-teal-400"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <span>Stock</span>
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold transition-colors ${
                activeTab === "profile"
                  ? "text-teal-600 dark:text-teal-400"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <span>Profile</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
