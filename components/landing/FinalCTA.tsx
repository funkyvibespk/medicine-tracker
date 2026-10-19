import Link from "next/link";

export default function FinalCTA() {
  return (
    <section className="landing-cta-stage relative overflow-hidden px-4 py-14 sm:px-6 sm:py-18 lg:px-8 lg:py-24">
      {/* Ambient decorative blobs */}
      <div className="pointer-events-none absolute inset-0 -z-0" aria-hidden="true">
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-sky-300/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-violet-300/30 blur-3xl" />
      </div>

      <div className="landing-cta-card relative z-10 mx-auto max-w-4xl rounded-[2rem] px-6 py-12 text-center sm:px-12 sm:py-16 lg:px-16">
        <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
          Ready to take control of your medication routine?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
          Make your daily medication routine easier, clearer and more organized.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/auth?mode=login"
            className="cd-primary-button inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-semibold transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#789BB8] focus-visible:ring-offset-2 sm:w-auto"
          >
            <span>Get Started</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
