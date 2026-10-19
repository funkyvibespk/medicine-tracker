"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { useMedicine } from "@/contexts/MedicineContext";
import { normalizeDemoEmail } from "@/lib/demoProfiles";
import { DemoAccountAlreadyExistsError, DemoAccountNotFoundError, registerDemoAccount, verifyDemoAccount } from "@/lib/demoAuth";
import { writeDemoSession } from "@/lib/demoSession";
import { keepDialogFocusInside, useDialogFocusRestore } from "@/lib/accessibility";

type AuthMode = "login" | "signup";
type AuthExperienceProps = { initialMode: AuthMode };

export default function AuthExperience({ initialMode }: AuthExperienceProps) {
  const router = useRouter();
  const { activateProfile } = useMedicine();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [suggestedMode, setSuggestedMode] = useState<AuthMode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordRecoveryOpen, setIsPasswordRecoveryOpen] = useState(false);
  const gotItButtonRef = useRef<HTMLButtonElement>(null);

  useDialogFocusRestore(isPasswordRecoveryOpen);

  useEffect(() => {
    if (isPasswordRecoveryOpen) gotItButtonRef.current?.focus();
  }, [isPasswordRecoveryOpen]);

  const handlePasswordRecoveryKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setIsPasswordRecoveryOpen(false);
      return;
    }

    keepDialogFocusInside(event);
  };

  const goToMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setShowPassword(false);
    setFeedback("");
    setSuggestedMode(null);
    window.history.replaceState(null, "", `/auth?mode=${nextMode}`);
  };

  const continueToLocalTracker = (destination: "/dashboard" | "/setup", email: string, delayMs = 0) => {
    // Legacy data with no known owner remains untouched unless a user explicitly chooses an owner.
    const migrateLegacy = false;
    activateProfile(email, { migrateLegacy });
    writeDemoSession(email);
    if (delayMs > 0) window.setTimeout(() => router.push(destination), delayMs);
    else router.push(destination);
  };

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = normalizeDemoEmail(String(formData.get("email") ?? ""));
    const password = String(formData.get("password") ?? "");
    if (!email || !password) {
      setFeedback("Enter your email and password to continue.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFeedback("Enter a valid email address.");
      return;
    }
    setIsSubmitting(true);
    setFeedback("");
    setSuggestedMode(null);
    try {
      const authenticatedEmail = mode === "signup"
        ? await registerDemoAccount(localStorage, email, password)
        : await verifyDemoAccount(localStorage, email, password);
      continueToLocalTracker(mode === "signup" ? "/setup" : "/dashboard", authenticatedEmail);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not open this local demo profile safely.");
      if (error instanceof DemoAccountAlreadyExistsError) setSuggestedMode("login");
      if (error instanceof DemoAccountNotFoundError) setSuggestedMode("signup");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-slate-200 bg-slate-50 p-12 lg:flex dark:border-slate-800 dark:bg-slate-900">
        <div className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-20" aria-hidden="true">
          <div className="absolute -left-20 top-8 h-80 w-80 rounded-full bg-teal-300/60 blur-3xl" />
          <div className="absolute -right-12 bottom-10 h-96 w-96 rounded-full bg-emerald-300/50 blur-3xl" />
        </div>
        <Link href="/" aria-label="ChillDose home" className="relative z-10 w-fit rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
          <BrandLogo markClassName="h-10 w-10" wordmarkClassName="text-xl font-bold tracking-tight" />
        </Link>
        <div className="relative z-10 max-w-lg">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-300">Your routine, made calmer</p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Your medication routine, <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-500 bg-clip-text text-transparent">made simple.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-600 dark:text-slate-400">
            Keep your schedule, doses, and medicine stock together in one clear place on this device.
          </p>
        </div>
        <p className="relative z-10 text-xs text-slate-500">ChillDose local prototype · Data stays in this browser</p>
      </aside>

      <main className="flex flex-1 flex-col justify-center bg-[radial-gradient(ellipse_at_12%_20%,rgba(186,230,253,0.60),transparent_48%),radial-gradient(ellipse_at_88%_78%,rgba(221,214,254,0.48),transparent_48%),linear-gradient(135deg,rgba(248,250,252,0.72),rgba(239,246,255,0.55))] px-5 py-10 sm:px-10 lg:px-16 xl:px-24 dark:bg-[radial-gradient(ellipse_at_12%_20%,rgba(13,148,136,0.18),transparent_48%),radial-gradient(ellipse_at_88%_78%,rgba(109,40,217,0.12),transparent_48%)]">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 lg:hidden dark:hover:text-white">
            <span aria-hidden="true">←</span> Back to ChillDose
          </Link>
          <div className="mb-8 lg:hidden">
            <BrandLogo markClassName="h-10 w-10" wordmarkClassName="sr-only" />
          </div>

          <section className="rounded-3xl border border-white/85 bg-white/62 p-6 shadow-[0_22px_64px_rgba(15,23,42,0.13),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-[24px] dark:border-slate-700/75 dark:bg-slate-900/72 sm:p-8">
            <h2 className="text-3xl font-bold tracking-tight">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {mode === "login" ? "Sign in to your account" : "Create a local demo account with your email."}
            </p>

            <form key={mode} onSubmit={handleEmailSubmit} className="mt-7 space-y-4">
              <div>
                <label htmlFor="auth-email" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Email address</label>
                <input id="auth-email" name="email" type="email" autoComplete="email" required placeholder="Email" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
              </div>
              <div>
                <label htmlFor="auth-password" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Password</label>
                <div className="relative">
                  <input id="auth-password" name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "signup" ? 8 : undefined} placeholder="Password" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-20 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute inset-y-0 right-3 my-auto rounded px-2 text-xs font-semibold text-slate-500 hover:text-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:hover:text-teal-300">
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-teal-700 to-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:from-teal-600 hover:to-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70">
                {isSubmitting ? "Checking locally…" : mode === "login" ? "Sign In" : "Create local account"}
              </button>
            </form>

            {mode === "login" && (
              <button
                type="button"
                onClick={() => setIsPasswordRecoveryOpen(true)}
                className="mt-4 block ml-auto rounded text-sm font-semibold text-teal-700 hover:text-teal-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-300"
              >
                Forgot password?
              </button>
            )}

            {feedback && <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm leading-relaxed text-teal-900 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-200">
              <p role="alert">{feedback}</p>
              {suggestedMode && <button type="button" onClick={() => goToMode(suggestedMode)} className="mt-2 font-semibold underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
                {suggestedMode === "login" ? "Go to Login" : "Go to Sign Up"}
              </button>}
            </div>}

            <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
              {mode === "login" ? "Don’t have an account? " : "Already have an account? "}
              <button type="button" onClick={() => goToMode(mode === "login" ? "signup" : "login")} className="rounded font-semibold text-teal-700 hover:text-teal-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-300">
                {mode === "login" ? "Sign Up" : "Sign In"}
              </button>
            </p>
          </section>

          <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            This is a local demo only, not secure authentication. Email and a salted PBKDF2 password hash are stored in this browser; passwords are never stored in plain text or sent to a server. Your local session stays active on this device until you log out. Tracker data without an assigned profile remains unassigned.
          </p>
          <Link href="/" className="mx-auto mt-6 block w-fit rounded px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:hover:text-white">Back to home</Link>
        </div>
      </main>

      {isPasswordRecoveryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-recovery-title"
            aria-describedby="password-recovery-message"
            onKeyDown={handlePasswordRecoveryKeyDown}
            className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-white/85 bg-white/76 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.24),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-[24px] dark:border-slate-700/75 dark:bg-slate-900/80 sm:p-7"
          >
            <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">Password recovery</p>
            <h2 id="password-recovery-title" className="mt-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Password reset isn&apos;t available yet
            </h2>
            <p id="password-recovery-message" className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
              For now, ChillDose doesn&apos;t support password recovery. Email-based password resets will be available in a future update.
            </p>
            <button
              ref={gotItButtonRef}
              type="button"
              onClick={() => setIsPasswordRecoveryOpen(false)}
              className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-teal-700 to-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:from-teal-600 hover:to-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
