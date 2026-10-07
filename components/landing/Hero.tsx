"use client";

import Link from "next/link";

interface HeroProps {
  onOpenAuthPreview: (provider: string) => void;
}

export default function Hero({ onOpenAuthPreview }: HeroProps) {
  return (
    <section className="relative overflow-hidden pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
      {/* Subtle ambient gradient mesh background */}
      <div
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        aria-hidden="true"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-teal-400/20 to-emerald-400/20 opacity-60 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        {/* Trust / Product Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-teal-200/80 bg-teal-50/80 px-3.5 py-1.5 text-xs font-semibold text-teal-800 backdrop-blur-xs transition-all hover:border-teal-300 dark:border-teal-800/80 dark:bg-teal-950/40 dark:text-teal-200">
          <span className="flex h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
          <span>A smarter way to manage your medicines</span>
        </div>

        {/* Primary Headline */}
        <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-6xl dark:text-white">
          Your medication routine,{" "}
          <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-500 bg-clip-text text-transparent">
            made simple.
          </span>
        </h1>

        {/* Supporting Copy */}
        <p className="mx-auto mt-5 max-w-2xl text-base text-slate-600 sm:text-lg md:text-xl dark:text-slate-300 leading-relaxed">
          Keep track of your medicines, doses, schedules, reminders and stock — all in one place.
        </p>

        {/* Actions / CTA Area */}
        <div className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row sm:flex-wrap">
          {/* Primary CTA */}
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-3.5 text-base font-semibold text-white shadow-md shadow-teal-700/25 transition-all hover:from-teal-500 hover:to-emerald-500 hover:shadow-lg hover:shadow-teal-600/35 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <span>Get Started</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>

          {/* Secondary Auth Preview: Continue with Google */}
          <button
            type="button"
            onClick={() => onOpenAuthPreview("Google")}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl border border-slate-300/80 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 shadow-xs transition-all hover:bg-slate-50 hover:border-slate-400 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Secondary Auth Preview: Continue with Email */}
          <button
            type="button"
            onClick={() => onOpenAuthPreview("Email")}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300/80 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 shadow-xs transition-all hover:bg-slate-50 hover:border-slate-400 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4 text-slate-500 dark:text-slate-400"
              aria-hidden="true"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <span>Continue with Email</span>
          </button>
        </div>

        {/* Concise trust line */}
        <div className="mt-5 flex items-center justify-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>Free to use</span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span>Easy setup</span>
          <span className="text-slate-300 dark:text-slate-600">•</span>
          <span>Your data is secure</span>
        </div>
      </div>
    </section>
  );
}
