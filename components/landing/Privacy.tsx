export default function Privacy() {
  return (
    <section id="privacy" className="bg-[radial-gradient(ellipse_at_18%_55%,rgba(186,230,253,0.50),transparent_48%),radial-gradient(ellipse_at_82%_48%,rgba(221,214,254,0.38),transparent_52%)] py-16 sm:py-20 lg:py-24 dark:bg-[radial-gradient(ellipse_at_18%_55%,rgba(13,148,136,0.18),transparent_48%),radial-gradient(ellipse_at_82%_48%,rgba(109,40,217,0.12),transparent_52%)]">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        {/* Shield icon */}
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-800/60">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          Your medicine data stays on this device
        </h2>

        <p className="mt-4 mx-auto max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-400">
          This local tracker saves medicine and dose records in your browser. It does not sync your data to a server, so your information stays with this device and browser.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/85 bg-white/90 supports-[backdrop-filter:blur(1px)]:bg-white/58 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.09),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-[24px] dark:border-slate-700/75 dark:bg-slate-900/90 dark:supports-[backdrop-filter:blur(1px)]:bg-slate-900/72">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Saved in this browser</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Your medicine list and dose history use this browser&apos;s local storage.
            </p>
          </div>

          <div className="rounded-xl border border-white/85 bg-white/90 supports-[backdrop-filter:blur(1px)]:bg-white/58 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.09),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-[24px] dark:border-slate-700/75 dark:bg-slate-900/90 dark:supports-[backdrop-filter:blur(1px)]:bg-slate-900/72">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">No cloud sync</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              This version has no backend or shared account database.
            </p>
          </div>

          <div className="rounded-xl border border-white/85 bg-white/90 supports-[backdrop-filter:blur(1px)]:bg-white/58 p-5 shadow-[0_14px_38px_rgba(15,23,42,0.09),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-[24px] dark:border-slate-700/75 dark:bg-slate-900/90 dark:supports-[backdrop-filter:blur(1px)]:bg-slate-900/72">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">You stay in control</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Clearing this browser&apos;s site data can remove locally saved tracker records.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
