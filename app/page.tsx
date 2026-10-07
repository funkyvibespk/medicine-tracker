"use client";

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
  return (
    <div className="flex min-h-full flex-col">
      <Header />

      <main className="flex-1">
        <Hero />
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
    </div>
  );
}
