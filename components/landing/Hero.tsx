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
  tone: "silver" | "blue" | "mist" | "slate";
}) {
  const tones = {
    silver: "text-[#008F80]",
    blue: "text-[#2563EB]",
    mist: "text-[#C77900]",
    slate: "text-[#E11D48]",
  };

  return (
    <div className={`landing-glass-pill absolute z-10 hidden items-center gap-3 rounded-2xl px-4 py-3 text-left shadow-lg 2xl:flex ${tones[tone]} ${className}`}>
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
    <section className="landing-hero-wash relative isolate overflow-hidden pb-24 pt-7 sm:pb-32 sm:pt-9 lg:pb-36 lg:pt-5">
      <div className="pointer-events-none absolute -left-44 top-40 -z-10 h-80 w-80 rounded-full bg-emerald-100/70 blur-3xl sm:h-96 sm:w-96" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-48 top-12 h-96 w-96 rounded-full bg-violet-100/60 blur-3xl sm:h-[30rem] sm:w-[30rem]" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <HeroNote
          className="left-3 top-16 xl:left-5 2xl:left-0"
          tone="silver"
          title="Taken"
          detail="8:00 AM · Today"
          icon={<span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#00A884]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg></span>}
        />
        <HeroNote
          className="left-10 top-56 xl:left-8 2xl:left-5"
          tone="mist"
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
          tone="slate"
          title="Stock check"
          detail="Know when it is time to refill"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7" aria-hidden="true"><path d="M12 3 2.8 19h18.4L12 3Z" /><path d="M12 9v4m0 3h.01" /></svg>}
        />

        <div className="mx-auto max-w-4xl">
          <div className="landing-glass-pill inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-[#007F73] shadow-lg sm:text-sm">
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-[#00A884]" aria-hidden="true"><path d="m12 2 1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Zm7 12 .9 3.1L23 18l-3.1.9L19 22l-.9-3.1L15 18l3.1-.9L19 14ZM5 15l.7 2.3L8 18l-2.3.7L5 21l-.7-2.3L2 18l2.3-.7L5 15Z" /></svg>
            A smarter way to manage your medicines
          </div>

          <h1 className="mx-auto mt-5 max-w-4xl text-[2.45rem] font-extrabold leading-[1.06] tracking-[-0.05em] text-[#142B2A] sm:text-6xl md:text-7xl lg:text-[4.5rem]">
            Your medication routine,
            <span className="mt-1 block bg-gradient-to-r from-[#008F80] via-[#00A884] to-[#62CEB5] bg-clip-text text-transparent">
              made simple.
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-7 text-slate-600 sm:text-lg sm:leading-8 md:text-xl dark:text-slate-300">
            Track medicines, follow your schedule, and keep stock in view — all in one calm place.
          </p>

          <div className="mt-6 flex justify-center">
            <Link
              href="/auth?mode=login"
              className="cd-primary-button inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-xl px-8 py-3 text-base font-bold text-white transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#60CDB4] focus-visible:ring-offset-2 sm:w-auto"
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
