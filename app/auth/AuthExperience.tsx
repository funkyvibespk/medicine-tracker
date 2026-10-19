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
    <div className="auth-page flex min-h-screen text-slate-900 dark:text-slate-100">
      <aside className="auth-aside-wash relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-slate-200 p-12 lg:flex dark:border-slate-800">
        <div className="pointer-events-none absolute inset-0 opacity-40 dark:opacity-20" aria-hidden="true">
          <div className="absolute -left-20 top-8 h-80 w-80 rounded-full bg-emerald-300/45 blur-3xl" />
          <div className="absolute -right-12 bottom-10 h-96 w-96 rounded-full bg-violet-300/55 blur-3xl" />
        </div>
        <Link href="/" aria-label="ChillDose home" className="relative z-10 w-fit rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#60CDB4]">
          <BrandLogo markClassName="h-10 w-10" wordmarkClassName="text-xl font-bold tracking-tight" />
        </Link>
        <div className="relative z-10 max-w-lg">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-[#007F73]">Your routine, made calmer</p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Your medication routine, <span className="bg-gradient-to-r from-[#007F73] via-[#009B85] to-[#60CDB4] bg-clip-text text-transparent">made simple.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-slate-600 dark:text-slate-400">
            Keep your schedule, doses, and medicine stock together in one clear place on this device.
          </p>
        </div>
        <p className="relative z-10 text-xs text-slate-500">ChillDose local prototype · Data stays in this browser</p>
      </aside>

      <main className="auth-main-wash flex flex-1 flex-col justify-center px-5 py-10 sm:px-10 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-[#5D7774] transition hover:text-[#142B2A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#60CDB4] lg:hidden">
            <span aria-hidden="true">←</span> Back to ChillDose
          </Link>
          <div className="mb-8 lg:hidden">
            <BrandLogo markClassName="h-10 w-10" wordmarkClassName="sr-only" />
          </div>

          <section className="auth-glass rounded-[2rem] p-6 sm:p-8">
            <h2 className="text-3xl font-bold tracking-tight">{mode === "login" ? "Welcome back" : "Create your account"}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {mode === "login" ? "Sign in to your account" : "Create a local demo account with your email."}
            </p>

            <form key={mode} onSubmit={handleEmailSubmit} className="mt-7 space-y-4">
              <div>
                <label htmlFor="auth-email" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Email address</label>
                <input id="auth-email" name="email" type="email" autoComplete="email" required placeholder="Email" className="w-full rounded-xl border border-[#60CDB4]/45 bg-white/75 px-4 py-3 text-sm text-[#142B2A] shadow-sm outline-none transition placeholder:text-[#829994] focus:border-[#60CDB4] focus:ring-4 focus:ring-[#60CDB4]/20" />
              </div>
              <div>
                <label htmlFor="auth-password" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Password</label>
                <div className="relative">
                  <input id="auth-password" name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "signup" ? 8 : undefined} placeholder="Password" className="w-full rounded-xl border border-[#60CDB4]/45 bg-white/75 px-4 py-3 pr-20 text-sm text-[#142B2A] shadow-sm outline-none transition placeholder:text-[#829994] focus:border-[#60CDB4] focus:ring-4 focus:ring-[#60CDB4]/20" />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute inset-y-0 right-3 my-auto rounded px-2 text-xs font-semibold text-[#5D7774] hover:text-[#007F73] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#60CDB4]">
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="cd-primary-button inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-white shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#60CDB4] focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70">
                {isSubmitting ? "Checking locally…" : mode === "login" ? "Sign In" : "Create local account"}
              </button>
            </form>

            {mode === "login" && (
              <button
                type="button"
                onClick={() => setIsPasswordRecoveryOpen(true)}
              className="mt-4 block ml-auto rounded text-sm font-semibold text-[#007F73] hover:text-[#142B2A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#60CDB4]"
              >
                Forgot password?
              </button>
            )}

            {feedback && <div className="mt-4 rounded-xl border border-[#60CDB4]/35 bg-[#E9F8F4] px-4 py-3 text-sm leading-relaxed text-[#007F73]">
              <p role="alert">{feedback}</p>
              {suggestedMode && <button type="button" onClick={() => goToMode(suggestedMode)} className="mt-2 font-semibold underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#60CDB4]">
                {suggestedMode === "login" ? "Go to Login" : "Go to Sign Up"}
              </button>}
            </div>}

            <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
              {mode === "login" ? "Don’t have an account? " : "Already have an account? "}
              <button type="button" onClick={() => goToMode(mode === "login" ? "signup" : "login")} className="rounded font-semibold text-[#007F73] hover:text-[#142B2A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#60CDB4]">
                {mode === "login" ? "Sign Up" : "Sign In"}
              </button>
            </p>
          </section>

          <p className="auth-glass-pill mt-5 rounded-xl px-4 py-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            This is a local demo only, not secure authentication. Email and a salted PBKDF2 password hash are stored in this browser; passwords are never stored in plain text or sent to a server. Your local session stays active on this device until you log out. Tracker data without an assigned profile remains unassigned.
          </p>
          <Link href="/" className="mx-auto mt-6 block w-fit rounded px-2 py-1 text-xs font-medium text-[#5D7774] hover:text-[#142B2A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#60CDB4]">Back to home</Link>
        </div>
      </main>

      {isPasswordRecoveryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-recovery-title"
            aria-describedby="password-recovery-message"
            onKeyDown={handlePasswordRecoveryKeyDown}
            className="auth-glass-dialog max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[1.75rem] p-6 sm:p-7"
          >
            <p className="text-sm font-semibold text-[#007F73]">Password recovery</p>
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
              className="cd-primary-button mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-bold text-white shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#60CDB4] focus-visible:ring-offset-2"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
