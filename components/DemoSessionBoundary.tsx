"use client";

import { type ReactNode, useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { readDemoSession } from "@/lib/demoSession";

const PROTECTED_PATHS = new Set(["/setup", "/dashboard", "/medicines", "/inventory", "/history"]);

export default function DemoSessionBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorizedPath, setAuthorizedPath] = useState<string | null>(null);
  const requiresSession = PROTECTED_PATHS.has(pathname);

  const validateSession = useCallback(() => {
    const hasSession = readDemoSession() !== null;
    setAuthorizedPath(hasSession ? pathname : null);

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

  if (requiresSession && authorizedPath !== pathname) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-sm font-medium text-slate-500 dark:bg-slate-950 dark:text-slate-400" aria-busy="true" role="status">
        Checking your local session…
      </main>
    );
  }

  return children;
}
