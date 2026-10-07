export default function HowItWorks() {
  const steps = [
    {
      number: "1",
      title: "Add your medicines",
      description: "Enter the name, dosage, and schedule — it only takes a minute.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </svg>
      ),
    },
    {
      number: "2",
      title: "Follow your schedule",
      description: "Check off doses as you take them throughout the day.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <line x1="16" x2="16" y1="2" y2="6" />
          <line x1="8" x2="8" y1="2" y2="6" />
          <line x1="3" x2="21" y1="10" y2="10" />
          <path d="m9 16 2 2 4-4" />
        </svg>
      ),
    },
    {
      number: "3",
      title: "Track your progress",
      description: "See your adherence over days and weeks — stay consistent.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      ),
    },
  ];

  return (
    <section id="how-it-works" className="py-16 sm:py-20 lg:py-24 bg-slate-50/50 dark:bg-slate-950/50">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            How it works
          </h2>
          <p className="mt-3 mx-auto max-w-lg text-base text-slate-600 dark:text-slate-400">
            Three simple steps to better medication management.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
          {steps.map((step, i) => (
            <div key={step.number} className="relative flex flex-col items-center text-center">
              {/* Connector line for desktop */}
              {i < steps.length - 1 && (
                <div className="hidden sm:block absolute top-8 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-slate-200 dark:bg-slate-800" aria-hidden="true" />
              )}

              {/* Step circle */}
              <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-md shadow-teal-700/20">
                {step.icon}
              </div>

              {/* Step number badge */}
              <div className="absolute top-0 right-[calc(50%-2.5rem)] flex h-6 w-6 items-center justify-center rounded-full bg-white text-[11px] font-extrabold text-teal-700 ring-2 ring-teal-200 shadow-xs dark:bg-slate-800 dark:text-teal-300 dark:ring-teal-800">
                {step.number}
              </div>

              <h3 className="mt-5 text-base font-bold text-slate-900 dark:text-white">
                {step.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400 max-w-[16rem]">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
