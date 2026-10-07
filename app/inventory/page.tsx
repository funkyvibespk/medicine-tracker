"use client";

import { useState } from "react";
import { useMedicine } from "@/contexts/MedicineContext";
import BottomNav from "@/components/dashboard/BottomNav";

export default function InventoryPage() {
  const { medicines, addStock, isHydrated } = useMedicine();
  const [addingStockMedId, setAddingStockMedId] = useState<string | null>(null);
  const [stockToAdd, setStockToAdd] = useState<number>(0);

  if (!isHydrated) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950" />;

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

  const addingMed = medicines.find((m) => m.id === addingStockMedId) ?? null;

  // Compute stock status for each medicine
  const withStatus = medicines.map((med) => {
    const dosesPerDay = med.scheduleTimes.length;
    const daysLeft =
      dosesPerDay > 0 && med.doseAmount > 0
        ? Math.floor(med.inventoryAmount / (dosesPerDay * med.doseAmount))
        : null;
    const isOut = med.inventoryAmount === 0;
    const isLow = !isOut && med.inventoryAmount <= med.lowStockThreshold;
    const isOk = !isOut && !isLow;

    return { med, daysLeft, isOut, isLow, isOk };
  });

  const outCount = withStatus.filter((s) => s.isOut).length;
  const lowCount = withStatus.filter((s) => s.isLow).length;

  // Sort: Out first, then Low, then Ok
  const sorted = [...withStatus].sort((a, b) => {
    const order = (s: typeof a) => (s.isOut ? 0 : s.isLow ? 1 : 2);
    return order(a) - order(b);
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased dark:bg-slate-950 dark:text-slate-100 pb-24">

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Inventory</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {medicines.length} medicine{medicines.length !== 1 ? "s" : ""}
              {outCount > 0 && <span className="ml-1.5 text-rose-600 dark:text-rose-400 font-medium">· {outCount} out of stock</span>}
              {lowCount > 0 && <span className="ml-1.5 text-amber-600 dark:text-amber-400 font-medium">· {lowCount} low</span>}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">

        {/* Alert banner */}
        {(outCount > 0 || lowCount > 0) && (
          <div className={`mb-6 flex items-start gap-3 rounded-xl border p-4 ${
            outCount > 0
              ? "border-rose-200 bg-rose-50/60 dark:border-rose-900/50 dark:bg-rose-950/20"
              : "border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20"
          }`}>
            <span className={`mt-0.5 flex h-2 w-2 flex-shrink-0 rounded-full animate-pulse ${outCount > 0 ? "bg-rose-500" : "bg-amber-500"}`} />
            <div>
              <p className={`text-sm font-semibold ${outCount > 0 ? "text-rose-800 dark:text-rose-300" : "text-amber-800 dark:text-amber-300"}`}>
                {outCount > 0
                  ? `${outCount} medicine${outCount > 1 ? "s" : ""} out of stock — refill needed`
                  : `${lowCount} medicine${lowCount > 1 ? "s" : ""} running low`}
              </p>
              <p className={`mt-0.5 text-xs ${outCount > 0 ? "text-rose-700 dark:text-rose-400" : "text-amber-700 dark:text-amber-400"}`}>
                Tap "Add Stock" on any medicine to update the quantity.
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {medicines.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 px-6 py-20 text-center dark:border-slate-800 dark:bg-slate-900/30">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8">
                <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                <path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">No inventory to track</h2>
            <p className="mt-2 max-w-xs text-sm text-slate-500 dark:text-slate-400">
              Add medicines from the Medicines tab to start tracking stock levels.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map(({ med, daysLeft, isOut, isLow }) => {
              const pct = med.inventoryCapacity && med.inventoryCapacity > 0
                ? Math.min(100, Math.round((med.inventoryAmount / med.inventoryCapacity) * 100))
                : null;

              return (
                <div
                  key={med.id}
                  className={`flex flex-col justify-between rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                    isOut
                      ? "border-rose-300 bg-rose-50/30 dark:border-rose-900/40 dark:bg-rose-950/10"
                      : isLow
                      ? "border-amber-300 bg-amber-50/30 dark:border-amber-900/40 dark:bg-amber-950/10"
                      : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                  }`}
                >
                  {/* Top */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">{med.name}</h3>
                        <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">{med.type} {med.strength ? `· ${med.strength}` : ""}</p>
                      </div>
                      {isOut ? (
                        <span className="flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                          Out
                        </span>
                      ) : isLow ? (
                        <span className="flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                          Low
                        </span>
                      ) : (
                        <span className="flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          OK
                        </span>
                      )}
                    </div>

                    {/* Stock amount */}
                    <div className="mt-4">
                      <div className="flex items-baseline justify-between">
                        <span className={`text-2xl font-extrabold ${isOut ? "text-rose-600 dark:text-rose-400" : isLow ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"}`}>
                          {med.inventoryAmount}
                        </span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{getUnit(med.type)}</span>
                      </div>

                      {/* Progress bar (only if capacity set) */}
                      {pct !== null && (
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isOut ? "bg-rose-500" : isLow ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <div>Dose: {med.doseAmount} {getUnit(med.type)} × {med.scheduleTimes.length}/day</div>
                      {daysLeft !== null && !isOut && (
                        <div>
                          Estimated: <span className={`font-semibold ${isLow ? "text-amber-600 dark:text-amber-400" : "text-slate-700 dark:text-slate-300"}`}>
                            ~{daysLeft} day{daysLeft !== 1 ? "s" : ""} left
                          </span>
                        </div>
                      )}
                      <div>Alert below: {med.lowStockThreshold} {getUnit(med.type)}</div>
                    </div>
                  </div>

                  {/* Add Stock Button */}
                  <button
                    onClick={() => { setAddingStockMedId(med.id); setStockToAdd(0); }}
                    className={`mt-5 w-full rounded-xl py-2.5 px-4 text-sm font-semibold transition-all active:scale-95 ${
                      isOut
                        ? "bg-rose-600 text-white hover:bg-rose-500"
                        : isLow
                        ? "bg-amber-500 text-white hover:bg-amber-400"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {isOut ? "Refill Now" : "Add Stock"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Add Stock Modal */}
      {addingMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Add Stock</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              {addingMed.name} · Current: {addingMed.inventoryAmount} {getUnit(addingMed.type)}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (stockToAdd > 0) {
                  addStock(addingMed.id, stockToAdd);
                  setAddingStockMedId(null);
                  setStockToAdd(0);
                }
              }}
            >
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Quantity to add ({getUnit(addingMed.type)})
              </label>
              <input
                type="number"
                step={addingMed.type === "Syrup" ? "5" : "1"}
                min="1"
                value={stockToAdd || ""}
                onChange={(e) => setStockToAdd(parseFloat(e.target.value) || 0)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm mb-3 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                autoFocus
              />

              {/* Quick amounts */}
              <div className="flex gap-2 mb-5">
                {(addingMed.type === "Syrup" ? [50, 100, 200] : [7, 14, 30]).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setStockToAdd(val)}
                    className="flex-1 rounded-lg bg-slate-100 py-1.5 text-xs font-semibold text-slate-700 hover:bg-teal-50 hover:text-teal-700 transition-colors dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-teal-950/40 dark:hover:text-teal-300"
                  >
                    +{val}
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setAddingStockMedId(null); setStockToAdd(0); }}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!stockToAdd || stockToAdd <= 0}
                  className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
