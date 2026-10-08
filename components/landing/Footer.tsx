import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand Column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-sm transition-transform group-hover:scale-105">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                  <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
                  <path d="m8.5 8.5 7 7" />
                </svg>
              </div>
              <span className="text-base font-bold text-slate-900 dark:text-white">ChillDose</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              A simple, private way to keep track of your daily medicines, doses, and schedules.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Product
            </h3>
            <ul className="mt-3 space-y-2">
              <li>
                <a href="#features" className="text-sm text-slate-600 hover:text-teal-600 transition-colors dark:text-slate-400 dark:hover:text-teal-400">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="text-sm text-slate-600 hover:text-teal-600 transition-colors dark:text-slate-400 dark:hover:text-teal-400">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#preview" className="text-sm text-slate-600 hover:text-teal-600 transition-colors dark:text-slate-400 dark:hover:text-teal-400">
                  Product Demo
                </a>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Legal
            </h3>
            <ul className="mt-3 space-y-2">
              <li>
                <a href="#privacy" className="text-sm text-slate-600 hover:text-teal-600 transition-colors dark:text-slate-400 dark:hover:text-teal-400">
                  Privacy
                </a>
              </li>
              <li>
                <span className="text-sm text-slate-400 dark:text-slate-500 cursor-default" title="Coming soon">
                  Terms of Service
                </span>
              </li>
            </ul>
          </div>

          {/* Account Links */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200">
              Account
            </h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link href="/dashboard" className="text-sm text-slate-600 hover:text-teal-600 transition-colors dark:text-slate-400 dark:hover:text-teal-400">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-sm text-slate-600 hover:text-teal-600 transition-colors dark:text-slate-400 dark:hover:text-teal-400">
                  Get Started
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 border-t border-slate-200 pt-6 dark:border-slate-800">
          <p className="text-center text-xs text-slate-500 dark:text-slate-500">
            © 2026 ChillDose. Built with care for your daily routine.
          </p>
        </div>
      </div>
    </footer>
  );
}
