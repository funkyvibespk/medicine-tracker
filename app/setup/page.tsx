"use client";

import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="animate-in fade-in zoom-in-95 duration-500 max-w-md w-full text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Welcome to ChillDose!
        </h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
          Your daily routine, made calmer. Take your dose with chill.
        </p>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="mt-10 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-500 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
        >
          Enter to Your Dashboard
        </button>
      </div>
    </div>
  );
}
