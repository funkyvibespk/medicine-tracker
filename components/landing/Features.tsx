export default function Features() {
  const features = [
    {
      title: "Smart Reminders",
      description: "Get notified when it's time for your next dose.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      ),
      color: "teal" as const,
    },
    {
      title: "Stock Management",
      description: "Keep track of your medicine inventory and know when it's running low.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
          <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      color: "amber" as const,
    },
    {
      title: "Easy Reports",
      description: "See your medication progress with simple daily, weekly and monthly reports.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      ),
      color: "blue" as const,
    },
    {
      title: "Private & Secure",
      description: "Your personal medication data stays protected.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
      color: "emerald" as const,
    },
  ];

  const colorStyles: Record<string, { bg: string; icon: string; ring: string }> = {
    teal: {
      bg: "bg-teal-50 dark:bg-teal-950/40",
      icon: "text-teal-600 dark:text-teal-400",
      ring: "ring-teal-200/60 dark:ring-teal-800/60",
    },
    amber: {
      bg: "bg-amber-50 dark:bg-amber-950/40",
      icon: "text-amber-600 dark:text-amber-400",
      ring: "ring-amber-200/60 dark:ring-amber-800/60",
    },
    blue: {
      bg: "bg-blue-50 dark:bg-blue-950/40",
      icon: "text-blue-600 dark:text-blue-400",
      ring: "ring-blue-200/60 dark:ring-blue-800/60",
    },
    emerald: {
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      icon: "text-emerald-600 dark:text-emerald-400",
      ring: "ring-emerald-200/60 dark:ring-emerald-800/60",
    },
  };

  return (
    <section id="features" className="py-16 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-14">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Everything you need to stay on track
          </h2>
          <p className="mt-3 mx-auto max-w-xl text-base text-slate-600 dark:text-slate-400">
            Simple tools designed to make managing your medications easier every day.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const styles = colorStyles[feature.color];
            return (
              <div
                key={feature.title}
                className="group rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs transition-all hover:shadow-md hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
              >
                <div
                  className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${styles.bg} ${styles.icon} ring-1 ${styles.ring} transition-transform group-hover:scale-105`}
                >
                  {feature.icon}
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
