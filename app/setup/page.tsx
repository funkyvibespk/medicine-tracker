"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMedicine, Medicine } from "@/contexts/MedicineContext";
import MedicineForm from "@/components/dashboard/MedicineForm";

type SetupStep = "welcome" | "form";

export default function SetupPage() {
  const router = useRouter();
  const { addMedicine } = useMedicine();
  const [step, setStep] = useState<SetupStep>("welcome");

  const handleSave = (med: Medicine) => {
    addMedicine(med);
    router.push("/dashboard");
  };

  const handleSkip = () => {
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950 sm:px-6 lg:px-8">
      
      {step === "welcome" && (
        <div className="animate-in fade-in zoom-in-95 duration-500 max-w-md w-full text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Let's set up your medicines
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            Add your first medication and schedule it to start tracking your daily routine and inventory.
          </p>
          
          <div className="mt-10 flex flex-col gap-3">
            <button
              onClick={() => setStep("form")}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-500 active:scale-95"
            >
              Add your first medicine
            </button>
            <button
              onClick={handleSkip}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800 transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      {step === "form" && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-lg">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Add Medicine</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Fill out the details below to add your first medication.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <MedicineForm 
              onSave={handleSave} 
              onCancel={() => setStep("welcome")} 
            />
          </div>
        </div>
      )}
      
    </div>
  );
}
