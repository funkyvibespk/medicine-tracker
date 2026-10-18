"use client";

import type { ReactNode } from "react";
import Link from "next/link";

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function HeroNote({
  className,
  icon,
  title,
  detail,
  tone,
}: {
  className: string;
  icon: ReactNode;
  title: string;
  detail: string;
  tone: "mint" | "blue" | "amber" | "rose";
}) {
  const tones = {
    mint: "border-emerald-100 bg-white/95 text-emerald-600 shadow-emerald-950/5",
    blue: "border-blue-100 bg-white/95 text-blue-600 shadow-blue-950/5",
    amber: "border-amber-100 bg-white/95 text-amber-600 shadow-amber-950/5",
    rose: "border-rose-100 bg-white/95 text-rose-600 shadow-rose-950/5",
  };

  return (
    <div className={`absolute z-10 hidden items-center gap-3 rounded-2xl border px-4 py-3 text-left shadow-lg backdrop-blur 2xl:flex ${tones[tone]} ${className}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50">{icon}</span>
      <span>
        <span className="block text-sm font-bold text-slate-900">{title}</span>
        <span className="mt-0.5 block whitespace-nowrap text-xs text-slate-500">{detail}</span>
      </span>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-[radial-gradient(ellipse_at_50%_42%,rgba(20,184,166,0.09),transparent_60%)] pb-24 pt-7 sm:pb-32 sm:pt-9 lg:pb-36 lg:pt-5">
      <div className="pointer-events-none absolute -left-44 top-40 -z-10 h-80 w-80 rounded-full bg-teal-100/35 blur-3xl dark:bg-teal-900/20 sm:h-96 sm:w-96" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-48 top-12 -z-10 h-96 w-96 rounded-full bg-emerald-100/35 blur-3xl dark:bg-emerald-900/15 sm:h-[30rem] sm:w-[30rem]" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <HeroNote
          className="left-3 top-16 xl:left-5 2xl:left-0"
          tone="mint"
          title="Taken"
          detail="8:00 AM · Today"
          icon={<span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-emerald-500"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg></span>}
        />
        <HeroNote
          className="left-10 top-56 xl:left-8 2xl:left-5"
          tone="amber"
          title="Upcoming"
          detail="2:00 PM · Today"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>}
        />
        <HeroNote
          className="right-3 top-16 xl:right-5 2xl:right-0"
          tone="blue"
          title="Adherence"
          detail="Your week at a glance"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7" aria-hidden="true"><path d="M3 3v18h18" /><path d="m7 14 4-4 4 3 5-7" /></svg>}
        />
        <HeroNote
          className="right-10 top-56 xl:right-8 2xl:right-5"
          tone="rose"
          title="Stock check"
          detail="Know when it is time to refill"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7" aria-hidden="true"><path d="M12 3 2.8 19h18.4L12 3Z" /><path d="M12 9v4m0 3h.01" /></svg>}
        />

        <div className="mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-100/90 bg-white/90 px-4 py-2 text-xs font-semibold text-teal-800 shadow-sm shadow-teal-950/[0.04] backdrop-blur sm:text-sm dark:border-teal-900/70 dark:bg-slate-900/85 dark:text-teal-200">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-teal-500" aria-hidden="true"><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Zm7 12 .9 3.1L23 18l-3.1.9L19 22l-.9-3.1L15 18l3.1-.9L19 14ZM5 15l.7 2.3L8 18l-2.3.7L5 21l-.7-2.3L2 18l2.3-.7L5 15Z" /></svg>
            A smarter way to manage your medicines
          </div>

          <h1 className="mx-auto mt-5 max-w-4xl text-[2.45rem] font-extrabold leading-[1.06] tracking-[-0.05em] text-slate-950 sm:text-6xl md:text-7xl lg:text-[4.5rem] dark:text-white">
            Your medication routine,
            <span className="mt-1 block bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-500 bg-clip-text text-transparent dark:from-teal-300 dark:via-teal-400 dark:to-emerald-300">
              made simple.
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-slate-600 sm:text-lg sm:leading-8 md:text-xl dark:text-slate-300">
            Track medicines, follow your schedule, and keep stock in view — all in one calm place.
          </p>

          <div className="mt-6 flex justify-center">
            <Link
              href="/auth?mode=signup"
              className="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-teal-700 to-emerald-600 px-8 py-3 text-base font-bold text-white shadow-md shadow-teal-700/20 transition hover:-translate-y-0.5 hover:from-teal-600 hover:to-emerald-500 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 sm:w-auto"
            >
              Get Started <Arrow />
            </Link>
          </div>

          <div className="mx-auto mt-5 flex max-w-2xl flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-medium text-slate-500 sm:gap-x-5 sm:text-sm dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></svg>Free to use</span>
            <span className="hidden text-slate-300 sm:inline dark:text-slate-700">•</span>
            <span className="inline-flex items-center gap-1.5"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true"><path d="m13 2-3 8h7l-6 12 1-9H5l8-11Z" /></svg>Easy setup</span>
            <span className="hidden text-slate-300 sm:inline dark:text-slate-700">•</span>
            <span className="inline-flex items-center gap-1.5"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true"><rect width="14" height="18" x="5" y="3" rx="2" /><path d="M8 7h8m-8 4h8m-8 4h5" /></svg>Your data stays on your device</span>
          </div>
        </div>
      </div>
    </section>
  );
}
