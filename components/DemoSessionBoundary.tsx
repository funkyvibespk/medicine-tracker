"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { readDemoSession } from "@/lib/demoSession";
import { clearDemoSession } from "@/lib/demoSession";
import { useMedicine } from "@/contexts/MedicineContext";

const PROTECTED_PATHS = new Set(["/setup", "/dashboard", "/doses", "/medicines", "/inventory", "/history"]);

export default function DemoSessionBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { activeProfileEmail, profileStatus, profileError, retryProfileLoad } = useMedicine();
  const [authorizedSession, setAuthorizedSession] = useState<{ path: string; email: string } | null>(null);
  const requiresSession = PROTECTED_PATHS.has(pathname);

  const validateSession = useCallback(() => {
    const session = readDemoSession();
    const hasSession = session !== null;
    setAuthorizedSession(session ? { path: pathname, email: session.email } : null);

    if (requiresSession && !hasSession) {
      router.replace("/auth?mode=login");
    } else if (hasSession && (pathname === "/" || pathname === "/auth")) {
      router.replace("/dashboard");
    }
  }, [pathname, requiresSession, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    validateSession();
    window.addEventListener("pageshow", validateSession);
    window.addEventListener("storage", validateSession);
    return () => {
      window.removeEventListener("pageshow", validateSession);
      window.removeEventListener("storage", validateSession);
    };
  }, [validateSession]);

  if (requiresSession && authorizedSession?.path === pathname && authorizedSession.email === activeProfileEmail && profileStatus === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 dark:bg-slate-950">
        <section role="alert" className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-6 shadow-lg dark:border-rose-900/60 dark:bg-slate-900 sm:p-8">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Your local profile couldn’t be loaded</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{profileError ?? "The saved profile could not be read safely."}</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">Your saved data has not been changed. You can retry loading the profile or sign out and try again.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={retryProfileLoad} className="min-h-11 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">Retry</button>
            <button type="button" onClick={() => { clearDemoSession(); router.replace("/"); }} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Sign out and return home</button>
          </div>
        </section>
      </main>
    );
  }

  if (requiresSession && (authorizedSession?.path !== pathname || authorizedSession.email !== activeProfileEmail || profileStatus !== "ready")) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-sm font-medium text-slate-500 dark:bg-slate-950 dark:text-slate-400" aria-busy="true" role="status">
        Checking your local session…
      </main>
    );
  }

  return children;
}
