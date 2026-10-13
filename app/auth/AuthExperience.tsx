"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/BrandLogo";
import { useMedicine } from "@/contexts/MedicineContext";
import { ACTIVE_DEMO_EMAIL_KEY, ACTIVE_DEMO_SESSION_KEY, GOOGLE_DEMO_EMAIL, normalizeDemoEmail } from "@/lib/demoProfiles";
import { DemoAccountAlreadyExistsError, DemoAccountNotFoundError, registerDemoAccount, verifyDemoAccount } from "@/lib/demoAuth";

type AuthMode = "login" | "signup";
type AuthExperienceProps = { initialMode: AuthMode };

function GoogleMark() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
    </svg>
  );
}

export default function AuthExperience({ initialMode }: AuthExperienceProps) {
  const router = useRouter();
  const { activateProfile } = useMedicine();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupForm, setShowSignupForm] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [suggestedMode, setSuggestedMode] = useState<AuthMode | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const goToMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setShowPassword(false);
    setShowSignupForm(false);
    setFeedback("");
    setSuggestedMode(null);
    window.history.replaceState(null, "", `/auth?mode=${nextMode}`);
  };

  const continueToLocalTracker = (destination: "/dashboard" | "/setup", email: string, delayMs = 0) => {
    // Legacy data with no known owner remains untouched unless a user explicitly chooses an owner.
    const migrateLegacy = false;
    activateProfile(email, { migrateLegacy });
    sessionStorage.setItem(ACTIVE_DEMO_EMAIL_KEY, normalizeDemoEmail(email));
    sessionStorage.setItem(ACTIVE_DEMO_SESSION_KEY, "active");
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

  const handleGoogleDemo = () => {
    setFeedback("Google is not connected. This opens the shared local Google demo profile; no Google account is used.");
    try {
      continueToLocalTracker(mode === "signup" ? "/setup" : "/dashboard", GOOGLE_DEMO_EMAIL, 900);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not open the local demo profile safely.");
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

      <main className="flex flex-1 flex-col justify-center px-5 py-10 sm:px-10 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 lg:hidden dark:hover:text-white">
            <span aria-hidden="true">←</span> Back to ChillDose
          </Link>
          <div className="mb-8 lg:hidden">
            <BrandLogo markClassName="h-10 w-10" wordmarkClassName="sr-only" />
          </div>

          <div className="mb-7 inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-900" aria-label="Account flow">
            <button type="button" onClick={() => goToMode("login")} aria-pressed={mode === "login"} className={`rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${mode === "login" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"}`}>
              Log In
            </button>
            <button type="button" onClick={() => goToMode("signup")} aria-pressed={mode === "signup"} className={`rounded-lg px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${mode === "signup" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"}`}>
              Get Started
            </button>
          </div>

          <h2 className="text-3xl font-bold tracking-tight">{mode === "login" ? "Welcome back" : "Start with ChillDose"}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {mode === "login" ? "Continue to your local medicine tracker." : "Choose how you’d like to enter the local prototype."}
          </p>

          {mode === "login" && <button type="button" onClick={handleGoogleDemo} className="mt-7 inline-flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
            <GoogleMark /> Continue with Google
          </button>}
          {mode === "login" && <div className="relative mt-6 flex items-center justify-center" aria-hidden="true"><span className="w-full border-t border-slate-200 dark:border-slate-800" /><span className="absolute bg-white px-3 text-xs text-slate-500 dark:bg-slate-950">or log in with email</span></div>}

          {mode === "signup" && !showSignupForm && (
            <div className="mt-7 space-y-4">
              <button type="button" onClick={handleGoogleDemo} className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
                <GoogleMark /> Continue with Google
              </button>
              <div className="relative flex items-center justify-center" aria-hidden="true">
                <span className="w-full border-t border-slate-200 dark:border-slate-800" />
                <span className="absolute bg-white px-3 text-xs text-slate-500 dark:bg-slate-950">or</span>
              </div>
              <button type="button" onClick={() => { setShowSignupForm(true); setFeedback(""); }} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-700 to-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-teal-600 hover:to-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2">
                Continue with Email
              </button>
            </div>
          )}

          {(mode === "login" || (mode === "signup" && showSignupForm)) && (
            <form key={mode} onSubmit={handleEmailSubmit} className={`${mode === "login" ? "mt-7" : "mt-5"} space-y-4`}>
              <div>
                <label htmlFor="auth-email" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Email address</label>
                <input id="auth-email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
              </div>
              <div>
                <label htmlFor="auth-password" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Password</label>
                <div className="relative">
                  <input id="auth-password" name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} required minLength={mode === "signup" ? 8 : undefined} placeholder={mode === "signup" ? "At least 8 characters" : "Enter your password"} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-20 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white" />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} className="absolute inset-y-0 right-3 my-auto rounded px-2 text-xs font-semibold text-slate-500 hover:text-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:hover:text-teal-300">
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-teal-700 to-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:from-teal-600 hover:to-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70">
                {isSubmitting ? "Checking locally…" : mode === "login" ? "Log In" : "Create local account"}
              </button>
            </form>
          )}

          {feedback && <div className="mt-4 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm leading-relaxed text-teal-900 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-200">
            <p role="alert">{feedback}</p>
            {suggestedMode && <button type="button" onClick={() => goToMode(suggestedMode)} className="mt-2 font-semibold underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500">
              {suggestedMode === "login" ? "Go to Log In" : "Go to Get Started"}
            </button>}
          </div>}

          <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            This is a local demo only, not secure authentication. Email and a salted PBKDF2 password hash are stored in this browser; passwords are never stored in plain text or sent to a server. Tracker data without an assigned profile remains unassigned.
          </p>

          <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
            {mode === "login" ? "New to ChillDose? " : "Already using ChillDose? "}
            <button type="button" onClick={() => goToMode(mode === "login" ? "signup" : "login")} className="font-semibold text-teal-700 hover:text-teal-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-teal-300">
              {mode === "login" ? "Get started" : "Log in"}
            </button>
          </p>
          <Link href="/" className="mx-auto mt-6 block w-fit rounded px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:hover:text-white">Back to home</Link>
        </div>
      </main>
    </div>
  );
}
