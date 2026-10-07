"use client";

import { useState } from "react";

interface Medicine {
  id: string;
  name: string;
  dosage: string;
  time: string;
  period: "Morning" | "Afternoon" | "Evening" | "Night";
  instructions: string;
  taken: boolean;
}

const initialMedicines: Medicine[] = [
  {
    id: "med-1",
    name: "Amoxicillin",
    dosage: "500 mg • 1 capsule",
    time: "08:00 AM",
    period: "Morning",
    instructions: "Take with food & full glass of water",
    taken: true,
  },
  {
    id: "med-2",
    name: "Vitamin D3",
    dosage: "2000 IU • 1 softgel",
    time: "01:00 PM",
    period: "Afternoon",
    instructions: "Take after lunch",
    taken: false,
  },
  {
    id: "med-3",
    name: "Atorvastatin",
    dosage: "20 mg • 1 tablet",
    time: "09:30 PM",
    period: "Night",
    instructions: "Take before bedtime",
    taken: false,
  },
];

export default function Home() {
  const [medicines, setMedicines] = useState<Medicine[]>(initialMedicines);
  const [filter, setFilter] = useState<"all" | "pending" | "taken">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newMedName, setNewMedName] = useState("");
  const [newMedDosage, setNewMedDosage] = useState("");
  const [newMedTime, setNewMedTime] = useState("08:00 AM");
  const [newMedPeriod, setNewMedPeriod] = useState<Medicine["period"]>("Morning");
  const [newMedInstructions, setNewMedInstructions] = useState("");

  const toggleStatus = (id: string) => {
    setMedicines((prev) =>
      prev.map((med) => (med.id === id ? { ...med, taken: !med.taken } : med))
    );
  };

  const handleAddMedicine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName.trim() || !newMedDosage.trim()) return;

    const newMed: Medicine = {
      id: `med-${Date.now()}`,
      name: newMedName.trim(),
      dosage: newMedDosage.trim(),
      time: newMedTime || "09:00 AM",
      period: newMedPeriod,
      instructions: newMedInstructions.trim() || "Take as prescribed",
      taken: false,
    };

    setMedicines((prev) => [...prev, newMed]);
    setNewMedName("");
    setNewMedDosage("");
    setNewMedInstructions("");
    setIsModalOpen(false);
  };

  const clearAllForDemo = () => {
    setMedicines([]);
  };

  const resetSampleData = () => {
    setMedicines(initialMedicines);
  };

  const filteredMedicines = medicines.filter((med) => {
    if (filter === "taken") return med.taken;
    if (filter === "pending") return !med.taken;
    return true;
  });

  const takenCount = medicines.filter((m) => m.taken).length;
  const totalCount = medicines.length;
  const progressPercent = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-teal-500 selection:text-white dark:bg-slate-950 dark:text-slate-100">
      {/* Top Navigation */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-sm shadow-teal-500/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
                <path d="m8.5 8.5 7 7" />
              </svg>
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Medicine Tracker
              </span>
              <span className="ml-2 inline-flex items-center rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-900/50 dark:text-teal-300">
                Dashboard
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-teal-600/20 transition-all hover:bg-teal-500 hover:shadow-lg hover:shadow-teal-500/25 active:scale-95"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              <span>Add Medicine</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Welcome Hero Banner */}
        <section className="mb-8 rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent p-6 shadow-sm dark:border-teal-900/40 dark:from-teal-950/40 dark:via-emerald-950/20 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                Medicine Tracker
              </h1>
              <p className="text-sm text-slate-600 sm:text-base dark:text-slate-300">
                Welcome back! Stay on schedule with your daily doses and track your health routine.
              </p>
            </div>
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <div className="rounded-xl bg-white px-4 py-3 shadow-xs ring-1 ring-slate-200/70 dark:bg-slate-900 dark:ring-slate-800">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Today's Adherence
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-teal-600 dark:text-teal-400">
                    {progressPercent}%
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    ({takenCount}/{totalCount} taken)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Progress Bar */}
          <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </section>

        {/* Section Header & Controls */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Today's Medicines
            </h2>
            <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-400">
              Click any medication card to toggle between Taken and Not Taken.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter buttons */}
            <div className="inline-flex rounded-lg bg-slate-200/70 p-1 dark:bg-slate-800">
              <button
                onClick={() => setFilter("all")}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  filter === "all"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                All ({medicines.length})
              </button>
              <button
                onClick={() => setFilter("pending")}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  filter === "pending"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                Pending ({medicines.filter((m) => !m.taken).length})
              </button>
              <button
                onClick={() => setFilter("taken")}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  filter === "taken"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                Taken ({takenCount})
              </button>
            </div>

            {/* Test State Helpers */}
            {medicines.length > 0 ? (
              <button
                onClick={clearAllForDemo}
                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                title="Preview empty state"
              >
                Clear (Demo Empty)
              </button>
            ) : (
              <button
                onClick={resetSampleData}
                className="rounded-lg border border-teal-300 bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/60 dark:text-teal-300 dark:hover:bg-teal-900/60"
              >
                Restore Samples
              </button>
            )}
          </div>
        </div>

        {/* Medicines List or Empty State */}
        {filteredMedicines.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 px-6 py-16 text-center dark:border-slate-800 dark:bg-slate-900/30">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-7 w-7"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M8 12h8" />
                <path d="M12 8v8" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
              No medicines scheduled
            </h3>
            <p className="mt-1.5 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              {medicines.length === 0
                ? "You have not added any medications yet. Click the button below to add your first medicine."
                : "No medications match the selected filter."}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
                Add Medicine
              </button>
              {medicines.length === 0 && (
                <button
                  onClick={resetSampleData}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Load Sample Medicines
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredMedicines.map((med) => (
              <div
                key={med.id}
                className={`group relative flex flex-col justify-between rounded-2xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                  med.taken
                    ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                }`}
              >
                <div>
                  {/* Card Header: Timing and Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      {med.time} ({med.period})
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        med.taken
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300"
                      }`}
                    >
                      {med.taken ? (
                        <>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-3 w-3"
                          >
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Taken
                        </>
                      ) : (
                        <>
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          Not Taken
                        </>
                      )}
                    </span>
                  </div>

                  {/* Medicine Name and Dosage */}
                  <div className="mt-4">
                    <h3
                      className={`text-lg font-bold tracking-tight ${
                        med.taken
                          ? "text-slate-700 line-through decoration-slate-400/80 dark:text-slate-300"
                          : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {med.name}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-teal-600 dark:text-teal-400">
                      {med.dosage}
                    </p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      {med.instructions}
                    </p>
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <button
                    onClick={() => toggleStatus(med.id)}
                    className={`w-full flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition-all ${
                      med.taken
                        ? "bg-slate-200/70 text-slate-700 hover:bg-slate-300/70 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                        : "bg-teal-600 text-white shadow-xs hover:bg-teal-500 active:scale-98"
                    }`}
                  >
                    {med.taken ? (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-3.5 w-3.5"
                        >
                          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                          <path d="M3 3v5h5" />
                        </svg>
                        Mark as Not Taken
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-3.5 w-3.5"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Mark as Taken
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Medicine Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Add New Medicine
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddMedicine} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Medicine Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paracetamol, Metformin"
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Dosage
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 500 mg, 1 tablet"
                    value={newMedDosage}
                    onChange={(e) => setNewMedDosage(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Scheduled Time
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 08:00 AM"
                    value={newMedTime}
                    onChange={(e) => setNewMedTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Time of Day
                </label>
                <select
                  value={newMedPeriod}
                  onChange={(e) => setNewMedPeriod(e.target.value as Medicine["period"])}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                  <option value="Night">Night</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Instructions / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Take with water after breakfast"
                  value={newMedInstructions}
                  onChange={(e) => setNewMedInstructions(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500"
                >
                  Save Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
