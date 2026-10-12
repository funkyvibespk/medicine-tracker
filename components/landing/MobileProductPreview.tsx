export default function MobileProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[340px] select-none" aria-label="Static mobile dashboard preview">
      <div className="relative rounded-[3rem] bg-slate-900 p-3.5 shadow-2xl ring-1 ring-slate-800/80 shadow-teal-950/20">
        <div className="absolute left-1/2 top-6 z-30 flex h-4 w-28 -translate-x-1/2 items-center justify-center rounded-full bg-slate-950" aria-hidden="true">
          <div className="mr-2 h-2 w-2 rounded-full bg-slate-800" />
          <div className="h-1.5 w-1.5 rounded-full bg-teal-500/80" />
        </div>

        <div className="relative overflow-hidden rounded-[2.4rem] border border-slate-200/40 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
          <div className="flex items-center justify-between px-6 pb-1 pt-3 text-[11px] font-semibold text-slate-800 dark:text-slate-200">
            <span>9:41</span>
            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[9px] font-semibold text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">Preview</span>
          </div>

          <div className="px-4 pb-20 pt-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-600 dark:text-teal-400">Your local tracker</p>
            <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Today&apos;s overview</h3>

            <div className="mt-3 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 p-3.5 text-white shadow-md shadow-teal-800/20">
              <p className="text-[11px] font-medium text-teal-100">Today&apos;s doses</p>
              <p className="mt-1 text-2xl font-extrabold tracking-tight">—</p>
              <p className="mt-1 text-[10px] text-teal-100">Your schedule appears here after setup.</p>
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Upcoming doses</h4>
              <span className="text-[9px] font-medium text-slate-400">Personal to your profile</span>
            </div>
            <div className="mt-2 flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-3 text-center text-[10px] leading-relaxed text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Add a medicine to see your dose schedule here.
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400">Active medicines</p>
                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">—</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400">Stock alerts</p>
                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">—</p>
              </div>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 flex items-center justify-around border-t border-slate-200 bg-white/95 px-3 py-2.5 text-[9px] font-semibold text-slate-400 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95" aria-hidden="true">
            <span className="text-teal-600 dark:text-teal-400">Today</span>
            <span>Medicines</span>
            <span>Inventory</span>
            <span>History</span>
          </div>
        </div>
      </div>
    </div>
  );
}
