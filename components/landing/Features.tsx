export default function Features() {
  const features = [
    {
      title: "Dose Schedules",
      description: "Set daily or recurring dose times and track each dose independently.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
          <rect width="18" height="18" x="3" y="4" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
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
      title: "Dose History",
      description: "Review logged doses with their scheduled and actual taken times.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6" aria-hidden="true">
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
      ),
      color: "blue" as const,
    },
    {
      title: "Local by design",
      description: "Your medicine and dose records are saved in this browser on this device.",
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
    <section id="features" className="flex min-h-[calc(100svh-4.5rem)] scroll-mt-20 flex-col justify-center bg-[radial-gradient(ellipse_at_10%_45%,rgba(186,230,253,0.52),transparent_42%),radial-gradient(ellipse_at_90%_55%,rgba(221,214,254,0.40),transparent_44%),linear-gradient(135deg,rgba(248,250,252,0.58),rgba(239,246,255,0.46))] py-16 sm:scroll-mt-24 sm:py-20 lg:py-24 dark:bg-[radial-gradient(ellipse_at_10%_45%,rgba(13,148,136,0.18),transparent_42%),radial-gradient(ellipse_at_90%_55%,rgba(109,40,217,0.12),transparent_44%)]">
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
                className="group rounded-2xl border border-white/85 bg-white/90 supports-[backdrop-filter:blur(1px)]:bg-white/58 p-6 shadow-[0_14px_38px_rgba(15,23,42,0.09),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-[24px] transition-all hover:shadow-[0_18px_44px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,0.95)] hover:border-white dark:border-slate-700/75 dark:bg-slate-900/90 dark:supports-[backdrop-filter:blur(1px)]:bg-slate-900/72 dark:hover:border-slate-700"
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
