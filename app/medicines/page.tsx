"use client";

import { useState } from "react";
import { useMedicine, Medicine } from "@/contexts/MedicineContext";
import MedicineForm from "@/components/dashboard/MedicineForm";
import BottomNav from "@/components/dashboard/BottomNav";
import WorkspaceNav from "@/components/dashboard/WorkspaceNav";
import WorkspaceHeader from "@/components/dashboard/WorkspaceHeader";
import WorkspacePageHeading from "@/components/dashboard/WorkspacePageHeading";
import { estimatedDosesPerDay } from "@/lib/schedule";
import { keepDialogFocusInside, useDialogFocusRestore } from "@/lib/accessibility";
import { doseUnitFor, getStockStatus, inventoryUnitFor, inventoryUnitsCompatible } from "@/lib/medicineLogic";
import { findPotentialMedicineIdentityPairs } from "@/lib/medicineIdentity";

export default function MedicinesPage() {
  const { medicines, doseRecords, addMedicine, updateMedicine, deleteMedicine, addStock, isHydrated } = useMedicine();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [deletingMedicine, setDeletingMedicine] = useState<Medicine | null>(null);
  const [addingStockMed, setAddingStockMed] = useState<Medicine | null>(null);
  const [stockToAdd, setStockToAdd] = useState(0);
  useDialogFocusRestore(Boolean(isAddModalOpen || editingMedicine || deletingMedicine || addingStockMed));
  const [searchQuery, setSearchQuery] = useState("");

  if (!isHydrated) return <div className="workspace-app min-h-screen bg-slate-50 dark:bg-slate-950" />;

  const filtered = medicines.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.type.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const possibleDuplicatePairs = findPotentialMedicineIdentityPairs(medicines);

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
    <div className="workspace-app min-h-screen bg-slate-50 text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-100 pb-24">

      <WorkspaceHeader />

      <div className="mx-auto flex w-full max-w-[1440px]">
      <WorkspaceNav />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">

        <WorkspacePageHeading
          title="My Medicines"
          description={`${medicines.length} medication${medicines.length !== 1 ? "s" : ""} tracked`}
          action={<button aria-label="Add medicine" onClick={() => setIsAddModalOpen(true)} className="workspace-primary-button inline-flex min-h-10 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all active:scale-95">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
            <span>Add Medicine</span>
          </button>}
        />

        {possibleDuplicatePairs.length > 0 && (
          <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/20" aria-labelledby="possible-duplicates-title">
            <h2 id="possible-duplicates-title" className="text-sm font-semibold text-amber-950 dark:text-amber-200">Review Duplicate Medicines ({possibleDuplicatePairs.length})</h2>
            <div className="mt-3 rounded-xl border border-amber-300 bg-amber-100/80 p-3 dark:border-amber-800 dark:bg-amber-950/50">
              <p className="text-sm font-bold text-amber-950 dark:text-amber-100">Choose the Correct Medicine</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-950/85 dark:text-amber-200">Compare strength, dosage form, schedule, stock quantity, and dose history before resolving these entries. Similar names are a review prompt, not proof that medicines are equivalent.</p>
            </div>
            <p className="mt-2 text-xs text-amber-900/80 dark:text-amber-300">No inventory or dose history is combined automatically. Review each record individually below.</p>
            <div className="mt-3 space-y-3">
              {possibleDuplicatePairs.map(({ first, second, kind }) => (
                <div key={`${first.id}:${second.id}`} className="grid gap-3 rounded-xl border border-amber-200/80 bg-white p-3 sm:grid-cols-2 dark:border-amber-900/50 dark:bg-slate-900">
                  {[first, second].map((medicine) => (
                    <div key={medicine.id} className="min-w-0 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/70">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{medicine.name} <span className="text-xs font-medium text-amber-700 dark:text-amber-300">{kind === "exact" ? "Exact formatting match" : "Possible spelling match"}</span></p>
                      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                        <dt>Strength / form</dt><dd>{medicine.strength || "—"} · {medicine.type}</dd>
                        <dt>Route</dt><dd>Not stored by this version</dd>
                        <dt>Schedule</dt><dd>{medicine.frequency}{medicine.frequency === "Every X hours" ? ` · every ${medicine.intervalHours || 8}h from ${medicine.scheduleTimes[0] || "—"}` : medicine.scheduleTimes.length ? ` · ${medicine.scheduleTimes.join(", ")}` : ""}</dd>
                        <dt>Stock</dt><dd>{medicine.inventoryAmount} {inventoryUnitFor(medicine)}</dd>
                        <dt>Low-stock threshold</dt><dd>{medicine.lowStockThreshold} {medicine.lowStockThresholdUnit ?? inventoryUnitFor(medicine)}</dd>
                        <dt>Dose history</dt><dd>{doseRecords.filter((record) => record.medicineId === medicine.id).length} records</dd>
                      </dl>
                      <button type="button" onClick={() => setEditingMedicine(medicine)} className="mt-3 inline-flex min-h-10 items-center justify-center rounded-lg border border-teal-300 bg-white px-3.5 text-xs font-semibold text-teal-800 shadow-sm transition-colors hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-teal-700 dark:bg-slate-900 dark:text-teal-200 dark:hover:bg-slate-800">Review / edit this medicine</button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-amber-900/80 dark:text-amber-300">Use the review action to inspect or edit a record. Deletion and merging are not offered here because this version cannot safely combine inventory and dose history.</p>
          </section>
        )}

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
              const stockStatus = getStockStatus(med);
              const isLow = stockStatus === "low";
              const isOut = stockStatus === "out";
              const isUnknown = stockStatus === "unknown";
              const dosesPerDay = estimatedDosesPerDay(med);
              const daysLeft = inventoryUnitsCompatible(med) && dosesPerDay !== null && dosesPerDay > 0 && med.doseAmount > 0
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
                      {isUnknown && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Review units</span>}
                    </div>
                    <p className="mt-0.5 text-sm text-teal-600 dark:text-teal-400 font-medium">
                      {med.strength || "—"} · {med.doseAmount} {med.doseUnit ?? doseUnitFor(med)} per dose
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span><span className="font-medium text-slate-700 dark:text-slate-300">{scheduleLabel}</span></span>
                      <span>
                        Stock: <span className={`font-medium ${isOut ? "text-rose-600 dark:text-rose-400" : isLow ? "text-amber-600 dark:text-amber-400" : "text-slate-700 dark:text-slate-300"}`}>
                          {med.inventoryAmount} {inventoryUnitFor(med)}
                        </span>
                        {daysLeft !== null && !isOut && (
                          <span className="ml-1 text-slate-400">≈ {daysLeft} day{daysLeft !== 1 ? "s" : ""} left</span>
                        )}
                      </span>
                      {isUnknown && <span className="text-amber-700 dark:text-amber-300">Dose and inventory units are incompatible; stock was preserved.</span>}
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
      </div>

      {/* Add/Edit Modal */}
      {(isAddModalOpen || editingMedicine) && (
        <div className="workspace-modal-backdrop fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-xs">
          <div role="dialog" aria-modal="true" aria-labelledby="medicine-dialog-title" onKeyDown={keepDialogFocusInside} className="workspace-glass-panel relative my-8 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h2 id="medicine-dialog-title" className="text-xl font-bold mb-4 text-slate-900 dark:text-white">
              {editingMedicine ? "Edit Medicine" : "Add Medicine"}
            </h2>
            <MedicineForm
              key={editingMedicine?.id ?? "new-medicine"}
              initialData={editingMedicine}
              existingMedicines={medicines}
              doseRecords={doseRecords}
              onSave={(med, options) => {
                if (editingMedicine) {
                  const result = updateMedicine(med.id, med);
                  if (!result.saved) return { added: false, validationError: result.validationError };
                } else {
                  const result = addMedicine(med, options);
                  if (!result.added) return result;
                }
                setIsAddModalOpen(false);
                setEditingMedicine(null);
                return { added: true };
              }}
              onOpenExisting={(med) => { setIsAddModalOpen(false); setEditingMedicine(med); }}
              onAddStock={(med, quantity) => { setIsAddModalOpen(false); setAddingStockMed(med); setStockToAdd(quantity); }}
              onCancel={() => { setIsAddModalOpen(false); setEditingMedicine(null); }}
            />
          </div>
        </div>
      )}

      {addingStockMed && (
        <div className="workspace-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div role="dialog" aria-modal="true" aria-labelledby="medicines-add-stock-title" onKeyDown={keepDialogFocusInside} className="workspace-glass-panel relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <h3 id="medicines-add-stock-title" className="text-lg font-bold text-slate-900 dark:text-white">Add stock to existing inventory</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{addingStockMed.name} · current balance {addingStockMed.inventoryAmount} {inventoryUnitFor(addingStockMed)}</p>
            <form onSubmit={(event) => { event.preventDefault(); if (stockToAdd > 0 && inventoryUnitsCompatible(addingStockMed)) { addStock(addingStockMed.id, stockToAdd); setAddingStockMed(null); setStockToAdd(0); } }}>
              <label htmlFor="medicines-stock-quantity" className="mt-4 block text-xs font-semibold text-slate-700 dark:text-slate-300">Confirmed quantity to add ({inventoryUnitFor(addingStockMed)})</label>
              <input id="medicines-stock-quantity" type="number" min="0" step={addingStockMed.type === "Syrup" ? "any" : "1"} value={stockToAdd || ""} onChange={(event) => setStockToAdd(Number(event.target.value) || 0)} className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              <div className="mt-5 flex justify-end gap-3">
                <button type="button" onClick={() => { setAddingStockMed(null); setStockToAdd(0); }} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-300">Cancel</button>
                <button type="submit" disabled={!stockToAdd || stockToAdd <= 0 || !inventoryUnitsCompatible(addingStockMed)} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Add Stock</button>
              </div>
            </form>
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
