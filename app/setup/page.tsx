export default function SetupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950 sm:px-6 lg:px-8 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
        Setup Placeholder
      </h1>
      <p className="mt-4 max-w-md text-lg text-slate-600 dark:text-slate-400">
        This is a temporary destination for new users. The actual medicine setup flow will be built in the next milestone.
      </p>
      
      <div className="mt-10">
        <a
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800 transition-colors"
        >
          Skip to Dashboard (Prototype)
        </a>
      </div>
    </div>
  );
}
