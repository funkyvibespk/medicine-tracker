import Link from "next/link";

export default function FinalCTA() {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 text-white relative overflow-hidden">
      {/* Ambient decorative blobs */}
      <div className="pointer-events-none absolute inset-0 -z-0" aria-hidden="true">
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-teal-400/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
          Ready to take control of your medication routine?
        </h2>
        <p className="mt-4 mx-auto max-w-xl text-base text-teal-100 sm:text-lg leading-relaxed">
          Make your daily medication routine easier, clearer and more organized.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-teal-700 shadow-lg shadow-teal-900/30 transition-all hover:bg-teal-50 hover:shadow-xl active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <span>Get Started</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-white/30 px-6 py-3.5 text-sm font-semibold text-white backdrop-blur-xs transition-all hover:bg-white/10 hover:border-white/50 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Sign In
          </Link>
        </div>
      </div>
    </section>
  );
}
