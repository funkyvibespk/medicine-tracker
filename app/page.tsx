"use client";

import { useState, useEffect } from "react";

interface Medicine {
  id: string;
  name: string;
  dosage: string;
  time: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  instructions?: string;
  taken: boolean;
}

const initialMedicines: Medicine[] = [
  {
    id: "med-1",
    name: "Amoxicillin",
    dosage: "500 mg • 1 capsule",
    time: "08:00 AM",
    frequency: "Twice daily",
    startDate: "2026-10-01",
    endDate: "2026-10-14",
    instructions: "Take with food & full glass of water",
    taken: true,
  },
  {
    id: "med-2",
    name: "Vitamin D3",
    dosage: "2000 IU • 1 softgel",
    time: "01:00 PM",
    frequency: "Once daily",
    startDate: "2026-09-01",
    instructions: "Take after lunch with healthy fats",
    taken: false,
  },
  {
    id: "med-3",
    name: "Atorvastatin",
    dosage: "20 mg • 1 tablet",
    time: "09:30 PM",
    frequency: "Daily at bedtime",
    startDate: "2026-08-15",
    instructions: "Take before bedtime",
    taken: false,
  },
];

function timeTo24Hour(timeStr: string): string {
  if (!timeStr) return "08:00";
  const trimmed = timeStr.trim();
  if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;

  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return "08:00";

  let hour = parseInt(match[1], 10);
  const minute = match[2];
  const ampm = match[3]?.toUpperCase();

  if (ampm === "PM" && hour < 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;

  return `${hour.toString().padStart(2, "0")}:${minute}`;
}

function formatTimeDisplay(timeStr: string): string {
  if (!timeStr) return "";
  if (timeStr.includes("AM") || timeStr.includes("PM")) return timeStr;
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  const hour = parseInt(parts[0], 10);
  const minute = parts[1];
  if (isNaN(hour)) return timeStr;
  const ampm = hour >= 12 ? "PM" : "AM";
  const formattedHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${formattedHour.toString().padStart(2, "0")}:${minute} ${ampm}`;
}

function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIndex = Number(parts[1]) - 1;
    const day = Number(parts[2]);
    const year = parts[0];
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${months[monthIndex]} ${day}, ${year}`;
    }
  }
  return dateStr;
}

export default function Home() {
  const [medicines, setMedicines] = useState<Medicine[]>(initialMedicines);
  const [filter, setFilter] = useState<"all" | "pending" | "taken">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedicineId, setEditingMedicineId] = useState<string | null>(null);
  const [deletingMedicine, setDeletingMedicine] = useState<Medicine | null>(null);
  const [openMenuMedId, setOpenMenuMedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [todayDate, setTodayDate] = useState("");

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setTodayDate(today || "");
  }, []);

  // Close open dropdown menu on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenuMedId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Form Fields State
  const [formData, setFormData] = useState({
    name: "",
    dosage: "",
    time: "08:00",
    frequency: "Daily",
    startDate: "",
    endDate: "",
    instructions: "",
  });

  // Client-side Validation Errors
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    dosage?: string;
    time?: string;
    frequency?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  const toggleStatus = (id: string) => {
    setMedicines((prev) =>
      prev.map((med) => (med.id === id ? { ...med, taken: !med.taken } : med))
    );
  };

  const resetForm = () => {
    const defaultDate = todayDate || (typeof window !== "undefined" ? new Date().toISOString().split("T")[0] : "");
    setFormData({
      name: "",
      dosage: "",
      time: "08:00",
      frequency: "Daily",
      startDate: defaultDate || "",
      endDate: "",
      instructions: "",
    });
    setFormErrors({});
  };

  const handleOpenAddModal = () => {
    setOpenMenuMedId(null);
    setEditingMedicineId(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (med: Medicine) => {
    setOpenMenuMedId(null);
    setEditingMedicineId(med.id);
    setFormData({
      name: med.name,
      dosage: med.dosage,
      time: timeTo24Hour(med.time),
      frequency: med.frequency || "Daily",
      startDate: med.startDate || todayDate,
      endDate: med.endDate || "",
      instructions: med.instructions || "",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingMedicineId(null);
    resetForm();
    setIsModalOpen(false);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear specific error on field edit
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const errors: typeof formErrors = {};

    if (!formData.name.trim()) {
      errors.name = "Medicine name is required.";
    }

    if (!formData.dosage.trim()) {
      errors.dosage = "Dosage is required (e.g., 500 mg, 1 tablet).";
    }

    if (!formData.time.trim()) {
      errors.time = "Scheduled time is required.";
    }

    if (!formData.frequency.trim()) {
      errors.frequency = "Frequency is required.";
    }

    if (!formData.startDate.trim()) {
      errors.startDate = "Start date is required.";
    }

    if (formData.endDate && formData.startDate && formData.endDate < formData.startDate) {
      errors.endDate = "End date cannot be earlier than start date.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveMedicine = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (editingMedicineId) {
      // Edit existing medicine
      setMedicines((prev) =>
        prev.map((med) => {
          if (med.id !== editingMedicineId) return med;
          return {
            ...med,
            name: formData.name.trim(),
            dosage: formData.dosage.trim(),
            time: formatTimeDisplay(formData.time),
            frequency: formData.frequency,
            startDate: formData.startDate,
            endDate: formData.endDate ? formData.endDate : undefined,
            instructions: formData.instructions.trim() || undefined,
          };
        })
      );
      setToastMessage(`"${formData.name.trim()}" was updated successfully.`);
    } else {
      // Add new medicine
      const newMed: Medicine = {
        id: `med-${Date.now()}`,
        name: formData.name.trim(),
        dosage: formData.dosage.trim(),
        time: formatTimeDisplay(formData.time),
        frequency: formData.frequency,
        startDate: formData.startDate,
        endDate: formData.endDate ? formData.endDate : undefined,
        instructions: formData.instructions.trim() || undefined,
        taken: false,
      };

      setMedicines((prev) => [newMed, ...prev]);
      setToastMessage(`"${newMed.name}" was added to today's schedule.`);
    }

    setIsModalOpen(false);
    setEditingMedicineId(null);
    resetForm();

    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Delete flow handlers
  const handleRequestDelete = (med: Medicine) => {
    setOpenMenuMedId(null);
    setDeletingMedicine(med);
  };

  const handleCancelDelete = () => {
    setDeletingMedicine(null);
  };

  const handleConfirmDelete = () => {
    if (!deletingMedicine) return;
    const name = deletingMedicine.name;
    setMedicines((prev) => prev.filter((m) => m.id !== deletingMedicine.id));
    setDeletingMedicine(null);
    setToastMessage(`"${name}" was deleted from your schedule.`);

    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
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
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 shadow-lg shadow-emerald-500/10 transition-all dark:border-emerald-900/60 dark:bg-slate-900">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
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
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {toastMessage}
          </p>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

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
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-teal-600/20 transition-all hover:bg-teal-500 hover:shadow-lg hover:shadow-teal-500/25 active:scale-95 cursor-pointer"
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
              Manage your schedule, track doses, or edit details anytime.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter buttons */}
            <div className="inline-flex rounded-lg bg-slate-200/70 p-1 dark:bg-slate-800">
              <button
                onClick={() => setFilter("all")}
                className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  filter === "all"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                All ({medicines.length})
              </button>
              <button
                onClick={() => setFilter("pending")}
                className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                  filter === "pending"
                    ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                Pending ({medicines.filter((m) => !m.taken).length})
              </button>
              <button
                onClick={() => setFilter("taken")}
                className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
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
                className="cursor-pointer rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                title="Preview empty state"
              >
                Clear (Demo Empty)
              </button>
            ) : (
              <button
                onClick={resetSampleData}
                className="cursor-pointer rounded-lg border border-teal-300 bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/60 dark:text-teal-300 dark:hover:bg-teal-900/60"
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
                onClick={handleOpenAddModal}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-500"
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
                Add Medicine
              </button>
              {medicines.length === 0 && (
                <button
                  onClick={resetSampleData}
                  className="cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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
                  {/* Card Top Row: Timing / Frequency Badge + Three-dot More Menu (⋯) */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
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
                        {med.time}
                      </span>
                      {med.frequency && (
                        <span className="rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 ring-1 ring-teal-600/10 dark:bg-teal-950/60 dark:text-teal-300 dark:ring-teal-500/20">
                          {med.frequency}
                        </span>
                      )}
                    </div>

                    {/* Three-dot "More" Menu Button (⋯) */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuMedId((prev) => (prev === med.id ? null : med.id));
                        }}
                        aria-label={`Options for ${med.name}`}
                        className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
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
                          <circle cx="12" cy="12" r="1" fill="currentColor" />
                          <circle cx="19" cy="12" r="1" fill="currentColor" />
                          <circle cx="5" cy="12" r="1" fill="currentColor" />
                        </svg>
                      </button>

                      {/* Dropdown Menu Popup */}
                      {openMenuMedId === med.id && (
                        <>
                          <div
                            className="fixed inset-0 z-30"
                            onClick={() => setOpenMenuMedId(null)}
                          />
                          <div className="absolute right-0 top-full mt-1.5 z-40 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/50">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(med)}
                              className="w-full cursor-pointer flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition-colors"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-3.5 w-3.5 text-slate-400"
                              >
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                              </svg>
                              Edit Medicine
                            </button>
                            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                            <button
                              type="button"
                              onClick={() => handleRequestDelete(med)}
                              className="w-full cursor-pointer flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition-colors"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-3.5 w-3.5 text-rose-500"
                              >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                              </svg>
                              Delete Medicine
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Medicine Name and Dosage */}
                  <div className="mt-3.5">
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

                    {/* Schedule Dates */}
                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3.5 w-3.5 text-slate-400"
                      >
                        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                        <line x1="16" x2="16" y1="2" y2="6" />
                        <line x1="8" x2="8" y1="2" y2="6" />
                        <line x1="3" x2="21" y1="10" y2="10" />
                      </svg>
                      <span>
                        Starts {formatDateDisplay(med.startDate)}
                        {med.endDate ? ` • Ends ${formatDateDisplay(med.endDate)}` : " • Ongoing"}
                      </span>
                    </div>

                    {med.instructions && (
                      <p className="mt-2 text-xs text-slate-600 bg-slate-50 rounded-lg p-2 dark:bg-slate-800/60 dark:text-slate-300">
                        💬 {med.instructions}
                      </p>
                    )}
                  </div>
                </div>

                {/* Primary Dose Action: "Mark as Taken" or "Dose Taken (Undo)" */}
                <div className="mt-5 border-t border-slate-100 pt-3 dark:border-slate-800/80">
                  {med.taken ? (
                    <div className="flex items-center justify-between rounded-xl bg-emerald-100/70 dark:bg-emerald-950/60 px-3.5 py-2.5 border border-emerald-200/80 dark:border-emerald-900/50">
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-xs sm:text-sm">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Dose Taken</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleStatus(med.id)}
                        className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 underline underline-offset-2 transition-colors"
                        title="Mark back as not taken if clicked by mistake"
                      >
                        Undo
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleStatus(med.id)}
                      className="w-full cursor-pointer flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs sm:text-sm font-semibold text-white bg-teal-600 hover:bg-teal-500 shadow-sm shadow-teal-600/20 active:scale-98 transition-all"
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
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Mark as Taken</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add / Edit Medicine Modal Dialog */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs overflow-y-auto"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300">
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
                    <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
                    <path d="m8.5 8.5 7 7" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {editingMedicineId ? "Edit Medicine" : "Add Medicine"}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {editingMedicineId
                      ? "Update your medication schedule, dosage, or instructions."
                      : "Schedule and track your daily prescription or vitamin doses."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseModal}
                className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Close dialog"
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

            {/* Modal Form */}
            <form onSubmit={handleSaveMedicine} noValidate className="mt-5 space-y-4">
              {/* Medicine Name */}
              <div>
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>
                    Medicine Name <span className="text-rose-500">*</span>
                  </span>
                  {formErrors.name && (
                    <span className="text-xs font-normal text-rose-500">
                      {formErrors.name}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. Lisinopril, Metformin, Amoxicillin"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-white ${
                    formErrors.name
                      ? "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-800"
                      : "border-slate-300 focus:border-teal-500 focus:ring-teal-500/20 dark:border-slate-700"
                  }`}
                />
              </div>

              {/* Dosage */}
              <div>
                <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>
                    Dosage <span className="text-rose-500">*</span>
                  </span>
                  {formErrors.dosage && (
                    <span className="text-xs font-normal text-rose-500">
                      {formErrors.dosage}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  name="dosage"
                  placeholder="e.g. 500 mg, 1 tablet, 2 puffs"
                  value={formData.dosage}
                  onChange={handleInputChange}
                  className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-white ${
                    formErrors.dosage
                      ? "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-800"
                      : "border-slate-300 focus:border-teal-500 focus:ring-teal-500/20 dark:border-slate-700"
                  }`}
                />
              </div>

              {/* Time & Frequency */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>
                      Time <span className="text-rose-500">*</span>
                    </span>
                    {formErrors.time && (
                      <span className="text-xs font-normal text-rose-500">
                        {formErrors.time}
                      </span>
                    )}
                  </label>
                  <input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-white ${
                      formErrors.time
                        ? "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-800"
                        : "border-slate-300 focus:border-teal-500 focus:ring-teal-500/20 dark:border-slate-700"
                    }`}
                  />
                </div>

                <div>
                  <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>
                      Frequency <span className="text-rose-500">*</span>
                    </span>
                    {formErrors.frequency && (
                      <span className="text-xs font-normal text-rose-500">
                        {formErrors.frequency}
                      </span>
                    )}
                  </label>
                  <select
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleInputChange}
                    className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-white ${
                      formErrors.frequency
                        ? "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-800"
                        : "border-slate-300 focus:border-teal-500 focus:ring-teal-500/20 dark:border-slate-700"
                    }`}
                  >
                    <option value="Daily">Daily</option>
                    <option value="Once daily">Once daily</option>
                    <option value="Twice daily">Twice daily</option>
                    <option value="Three times daily">Three times daily</option>
                    <option value="Every 8 hours">Every 8 hours</option>
                    <option value="Every other day">Every other day</option>
                    <option value="Weekly">Weekly</option>
                    <option value="As needed (PRN)">As needed (PRN)</option>
                  </select>
                </div>
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>
                      Start Date <span className="text-rose-500">*</span>
                    </span>
                    {formErrors.startDate && (
                      <span className="text-xs font-normal text-rose-500">
                        {formErrors.startDate}
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-white ${
                      formErrors.startDate
                        ? "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-800"
                        : "border-slate-300 focus:border-teal-500 focus:ring-teal-500/20 dark:border-slate-700"
                    }`}
                  />
                </div>

                <div>
                  <label className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>End Date (Optional)</span>
                    {formErrors.endDate && (
                      <span className="text-xs font-normal text-rose-500">
                        {formErrors.endDate}
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-white ${
                      formErrors.endDate
                        ? "border-rose-400 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-800"
                        : "border-slate-300 focus:border-teal-500 focus:ring-teal-500/20 dark:border-slate-700"
                    }`}
                  />
                </div>
              </div>

              {/* Instructions */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Instructions / Notes (Optional)
                </label>
                <textarea
                  name="instructions"
                  rows={2}
                  placeholder="e.g. Take with a full glass of water after meals, do not crush tablet"
                  value={formData.instructions}
                  onChange={handleInputChange}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white resize-none"
                />
              </div>

              {/* Action Buttons: Cancel and Save / Update Medicine */}
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-teal-600/20 transition-all hover:bg-teal-500 hover:shadow-lg hover:shadow-teal-500/25 active:scale-98"
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
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>{editingMedicineId ? "Update Medicine" : "Save Medicine"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingMedicine && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900">
            {/* Header / Warning icon */}
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-6 w-6"
                >
                  <path d="M3 6h18" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  <line x1="10" x2="10" y1="11" y2="17" />
                  <line x1="14" x2="14" y1="11" y2="17" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Delete this medicine?
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Are you sure you want to remove this medicine from your schedule?
                </p>
              </div>
            </div>

            {/* Medicine details preview card */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  {deletingMedicine.name}
                </span>
                <span className="rounded-md bg-teal-100/70 px-2 py-0.5 font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  {deletingMedicine.dosage}
                </span>
              </div>
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                Scheduled at {deletingMedicine.time} • {deletingMedicine.frequency}
              </p>
            </div>

            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              This action is destructive and cannot be undone.
            </p>

            {/* Confirmation actions: Cancel & Delete */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={handleCancelDelete}
                className="cursor-pointer rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-rose-600/20 transition-all hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-500/25 active:scale-98"
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
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                </svg>
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
