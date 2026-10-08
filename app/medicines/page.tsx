"use client";

import { useState } from "react";
import { useMedicine, Medicine } from "@/contexts/MedicineContext";
import MedicineForm from "@/components/dashboard/MedicineForm";
import BottomNav from "@/components/dashboard/BottomNav";
import { estimatedDosesPerDay } from "@/lib/schedule";
import { keepDialogFocusInside, useDialogFocusRestore } from "@/lib/accessibility";

export default function MedicinesPage() {
  const { medicines, addMedicine, updateMedicine, deleteMedicine, isHydrated } = useMedicine();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [deletingMedicine, setDeletingMedicine] = useState<Medicine | null>(null);
  useDialogFocusRestore(Boolean(isAddModalOpen || editingMedicine || deletingMedicine));
  const [searchQuery, setSearchQuery] = useState("");

  if (!isHydrated) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950" />;

  const filtered = medicines.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getUnit = (type: string) => {
    switch (type) {
      case "Tablet": return "tablets";
      case "Capsule": return "capsules";
      case "Syrup": return "ml";
      case "Sachet": return "sachets";
      case "Injection": return "vials";
      default: return "units";
    }
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "Tablet": return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
      case "Capsule": return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300";
      case "Syrup": return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
      case "Sachet": return "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300";
      case "Injection": return "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300";
      default: return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-100 pb-24">

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">My Medicines</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{medicines.length} medication{medicines.length !== 1 ? "s" : ""} tracked</p>
          </div>
          <button
            aria-label="Add medicine"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-teal-600/20 transition-all hover:bg-teal-500 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M5 12h14" /><path d="M12 5v14" />
            </svg>
            <span className="hidden sm:inline">Add Medicine</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">

        {/* Search */}
        {medicines.length > 0 && (
          <div className="mb-6 relative">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="search"
              placeholder="Search medicines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>
        )}

        {/* Empty state */}
        {medicines.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 px-6 py-20 text-center dark:border-slate-800 dark:bg-slate-900/30">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
                <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
                <path d="m8.5 8.5 7 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">No medicines added yet</h2>
            <p className="mt-2 max-w-xs text-sm text-slate-500 dark:text-slate-400">
              Start by adding your first medication to track your schedule and inventory.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 transition-colors"
            >
              Add your first medicine
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-slate-500 dark:text-slate-400">No medicines match <strong>&quot;{searchQuery}&quot;</strong></p>
            <button onClick={() => setSearchQuery("")} className="mt-3 text-sm font-medium text-teal-600 hover:underline dark:text-teal-400">Clear search</button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((med) => {
              const isLow = med.inventoryAmount <= med.lowStockThreshold && med.inventoryAmount > 0;
              const isOut = med.inventoryAmount === 0;
              const dosesPerDay = estimatedDosesPerDay(med);
              const daysLeft = dosesPerDay !== null && dosesPerDay > 0 && med.doseAmount > 0
                ? Math.floor(med.inventoryAmount / (dosesPerDay * med.doseAmount))
                : null;
              const scheduleLabel = med.frequency === "As needed (PRN)"
                ? "As needed"
                : med.frequency === "Every X hours"
                ? `Every ${med.intervalHours || 8} hours, starting at ${med.scheduleTimes[0] || "—"}`
                : `${med.frequency}${med.scheduleTimes.length ? ` · ${med.scheduleTimes.map((time) => {
                  const [hourText, minute] = time.split(":");
                  const hour = Number(hourText);
                  return `${hour % 12 || 12}:${minute} ${hour >= 12 ? "PM" : "AM"}`;
                }).join(", ")}` : ""}`;

              return (
                <div
                  key={med.id}
                  className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900"
                >
                  {/* Icon */}
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/10 text-teal-600 dark:text-teal-400">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
                      <path d="m8.5 8.5 7 7" />
                    </svg>
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{med.name}</h3>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${typeColor(med.type)}`}>
                        {med.type}
                      </span>
                      {isOut && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                          Out of stock
                        </span>
                      )}
                      {isLow && !isOut && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          Low stock
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-teal-600 dark:text-teal-400 font-medium">
                      {med.strength || "—"} · {med.doseAmount} {getUnit(med.type)} per dose
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span><span className="font-medium text-slate-700 dark:text-slate-300">{scheduleLabel}</span></span>
                      <span>
                        Stock: <span className={`font-medium ${isOut ? "text-rose-600 dark:text-rose-400" : isLow ? "text-amber-600 dark:text-amber-400" : "text-slate-700 dark:text-slate-300"}`}>
                          {med.inventoryAmount} {getUnit(med.type)}
                        </span>
                        {daysLeft !== null && !isOut && (
                          <span className="ml-1 text-slate-400">≈ {daysLeft} day{daysLeft !== 1 ? "s" : ""} left</span>
                        )}
                      </span>
                      {med.instructions && <span>· {med.instructions}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-shrink-0 gap-1">
                    <button
                      onClick={() => setEditingMedicine(med)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      aria-label={`Edit ${med.name}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeletingMedicine(med)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                      aria-label={`Delete ${med.name}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                        <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      {(isAddModalOpen || editingMedicine) && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-xs">
          <div role="dialog" aria-modal="true" aria-labelledby="medicine-dialog-title" onKeyDown={keepDialogFocusInside} className="relative my-8 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h2 id="medicine-dialog-title" className="text-xl font-bold mb-4 text-slate-900 dark:text-white">
              {editingMedicine ? "Edit Medicine" : "Add Medicine"}
            </h2>
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
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-950/60">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-rose-600 dark:text-rose-400">
                <path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </div>
            <h3 id="delete-medicine-title" className="text-lg font-bold text-slate-900 dark:text-white">Delete &quot;{deletingMedicine.name}&quot;?</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              This removes the medicine from your list. Recorded doses remain in History.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                onClick={() => setDeletingMedicine(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => { deleteMedicine(deletingMedicine.id); setDeletingMedicine(null); }}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
