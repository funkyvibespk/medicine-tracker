"use client";

import { useState } from "react";
import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import DashboardPreview from "@/components/landing/DashboardPreview";
import MobileProductPreview from "@/components/landing/MobileProductPreview";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import Privacy from "@/components/landing/Privacy";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

export default function WelcomePage() {
  const [authPreviewProvider, setAuthPreviewProvider] = useState<string | null>(null);

  const handleOpenAuthPreview = (provider: string) => {
    setAuthPreviewProvider(provider);
  };

  return (
    <div className="flex min-h-full flex-col">
      <Header onOpenAuthPreview={handleOpenAuthPreview} />

      <main className="flex-1">
        <Hero onOpenAuthPreview={handleOpenAuthPreview} />
        <DashboardPreview />

        {/* Mobile Product Preview Section */}
        <section className="py-16 sm:py-20 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
              {/* Text Column */}
              <div className="order-2 lg:order-1 text-center lg:text-left">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                  Designed for your phone, too
                </h2>
                <p className="mt-3 max-w-lg mx-auto lg:mx-0 text-base leading-relaxed text-slate-600 dark:text-slate-400">
                  The same clean experience works beautifully on mobile. Check your
                  medicines, mark doses as taken, and track your stock — right from your pocket.
                </p>
                <ul className="mt-6 space-y-3 text-left max-w-sm mx-auto lg:mx-0">
                  {[
                    "Today's summary at a glance",
                    "Tap to mark doses as taken",
                    "Stock alerts when running low",
                    "Bottom navigation for quick access",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      <span className="text-sm text-slate-700 dark:text-slate-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Phone Preview Column */}
              <div className="order-1 lg:order-2 flex justify-center">
                <MobileProductPreview />
              </div>
            </div>
          </div>
        </section>

        <Features />
        <HowItWorks />
        <Privacy />
        <FinalCTA />
      </main>

      <Footer />

      {/* Auth Preview Modal — visual placeholder only */}
      {authPreviewProvider && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          onClick={() => setAuthPreviewProvider(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Continue with ${authPreviewProvider}`}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setAuthPreviewProvider(null)}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
                  <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
                  <path d="m8.5 8.5 7 7" />
                </svg>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Continue with {authPreviewProvider}
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Authentication is coming soon. For now, you can explore the dashboard preview.
              </p>

              <div className="mt-6 flex flex-col gap-2.5">
                <a
                  href="/dashboard"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:from-teal-500 hover:to-emerald-500 transition-all"
                >
                  Explore Dashboard Preview →
                </a>
                <button
                  type="button"
                  onClick={() => setAuthPreviewProvider(null)}
                  className="w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
