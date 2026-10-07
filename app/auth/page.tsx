"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type AuthStep =
  | "initial"
  | "google-loading"
  | "google-success"
  | "email-loading"
  | "email-verification"
  | "verifying"
  | "success-new"
  | "success-existing";

export default function AuthPage() {
  const router = useRouter();
  const [step, setStep] = useState<AuthStep>("initial");
  
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState("");

  // Countdown timer for resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const validateEmail = (val: string) => {
    if (!val) return "Please enter your email address.";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) return "Please enter a valid email address.";
    return "";
  };

  const handleEmailSubmit = (e: FormEvent) => {
    e.preventDefault();
    const error = validateEmail(email);
    if (error) {
      setEmailError(error);
      return;
    }
    
    // Valid email
    setEmailError("");
    setStep("email-loading");
    
    // Mock sending code
    setTimeout(() => {
      setStep("email-verification");
      setResendCooldown(28);
    }, 1200);
  };

  const handleGoogleAuth = () => {
    setStep("google-loading");
    
    // Mock connecting
    setTimeout(() => {
      setStep("google-success");
      // Simulate new user vs existing user
      // For this mock, Google goes to existing, Email goes to new
      setTimeout(() => {
        setStep("success-existing");
      }, 1500);
    }, 1500);
  };

  const handleVerifySubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!code || code.length < 6) {
      setCodeError("Enter the 6-digit verification code.");
      return;
    }
    
    // Mock verify
    // 123456 is a "valid" mock code
    if (code !== "123456" && code !== "000000") {
      setCodeError("That code isn't correct. Please try again. (Hint: 123456)");
      return;
    }

    setCodeError("");
    setStep("verifying");

    setTimeout(() => {
      // For email, we mock a "new user" flow
      setStep("success-new");
    }, 1500);
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;
    setResendCooldown(28);
    setResendMessage("A new code has been sent.");
    setTimeout(() => setResendMessage(""), 3000);
  };

  const resetToInitial = () => {
    setStep("initial");
    setCode("");
    setCodeError("");
    setResendMessage("");
  };

  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* LEFT COLUMN - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-12 relative overflow-hidden">
        {/* Subtle decorative mesh */}
        <div className="absolute inset-0 z-0 opacity-40 dark:opacity-20 pointer-events-none">
           <div className="absolute top-0 left-1/4 w-96 h-96 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
           <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30"></div>
        </div>
        
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-xl">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-md shadow-teal-600/20">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
                <path d="m8.5 8.5 7 7" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Medicine Tracker
            </span>
          </Link>
        </div>
        
        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-5xl">
            Your medication routine, <br />
            <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-500 bg-clip-text text-transparent">
              made simple.
            </span>
          </h1>
          <p className="mt-6 text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
            Stay organized, follow your schedule, and keep your medication routine on track. A calm and secure place for your health.
          </p>
        </div>
        
        <div className="relative z-10 text-sm text-slate-500 dark:text-slate-500 font-medium">
          &copy; {new Date().getFullYear()} Medicine Tracker
        </div>
      </div>

      {/* RIGHT COLUMN - Auth Card */}
      <div className="flex flex-1 flex-col justify-center px-6 py-12 sm:px-12 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
          
          {/* Mobile Back Button */}
          <Link href="/" className="lg:hidden inline-flex items-center gap-1.5 mb-8 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Back to Medicine Tracker
          </Link>

          {/* Initial / Google Loading / Google Success states */}
          {(step === "initial" || step === "google-loading" || step === "google-success" || step === "email-loading") && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="lg:hidden mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-md">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                  <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
                  <path d="m8.5 8.5 7 7" />
                </svg>
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {step === "google-success" ? "Signed in successfully" : "Welcome to Medicine Tracker"}
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {step === "google-success" ? "Taking you to your dashboard..." : "Sign in to manage your medication routine."}
              </p>

              <div className="mt-8 space-y-4">
                {/* Google Auth Button */}
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={step !== "initial"}
                  className="w-full inline-flex items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                >
                  {step === "google-loading" ? (
                    <>
                      <svg className="h-5 w-5 animate-spin text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Connecting to Google...</span>
                    </>
                  ) : step === "google-success" ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-emerald-500">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Signed in</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                  </div>
                  <div className="relative flex justify-center text-xs font-medium">
                    <span className="bg-white px-3 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                      or continue with email
                    </span>
                  </div>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="sr-only">
                      Email address
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (emailError) setEmailError("");
                      }}
                      disabled={step !== "initial"}
                      className={`block w-full rounded-xl border ${
                        emailError 
                          ? "border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500/50 dark:text-rose-200" 
                          : "border-slate-300 text-slate-900 focus:border-teal-500 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-teal-500"
                      } px-4 py-3 text-sm shadow-sm transition-colors focus:outline-none focus:ring-4 placeholder:text-slate-400`}
                    />
                    {emailError && (
                      <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400" role="alert">
                        {emailError}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={step !== "initial"}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-500 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                  >
                    {step === "email-loading" ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Sending code...</span>
                      </>
                    ) : (
                      "Continue with Email"
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Email Verification State */}
          {(step === "email-verification" || step === "verifying") && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Check your email
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Enter the 6-digit verification code we sent to <br/>
                <span className="font-medium text-slate-900 dark:text-slate-200">{email}</span>
              </p>

              <form onSubmit={handleVerifySubmit} className="mt-8 space-y-4">
                <div>
                  <label htmlFor="code" className="sr-only">
                    Verification Code
                  </label>
                  <input
                    id="code"
                    name="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    value={code}
                    onChange={(e) => {
                      // Allow only numbers
                      const val = e.target.value.replace(/\D/g, "");
                      setCode(val);
                      if (codeError) setCodeError("");
                    }}
                    disabled={step === "verifying"}
                    className={`block w-full rounded-xl border text-center tracking-[0.5em] text-2xl font-medium ${
                      codeError 
                        ? "border-rose-300 text-rose-900 focus:border-rose-500 focus:ring-rose-500/20 dark:border-rose-500/50 dark:text-rose-200" 
                        : "border-slate-300 text-slate-900 focus:border-teal-500 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:border-teal-500"
                    } px-4 py-3 shadow-sm transition-colors focus:outline-none focus:ring-4 placeholder:text-slate-300 dark:placeholder:text-slate-700`}
                  />
                  {codeError && (
                    <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400" role="alert">
                      {codeError}
                    </p>
                  )}
                  {resendMessage && !codeError && (
                    <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400" role="status">
                      {resendMessage}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={step === "verifying"}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-500 disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                >
                  {step === "verifying" ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    "Verify"
                  )}
                </button>
              </form>

              <div className="mt-6 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || step === "verifying"}
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:hover:text-slate-600 dark:text-slate-400 dark:hover:text-white dark:disabled:hover:text-slate-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded px-2 py-0.5 cursor-pointer"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                </button>
                <button
                  type="button"
                  onClick={resetToInitial}
                  disabled={step === "verifying"}
                  className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-500 dark:hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded px-2 py-0.5 cursor-pointer"
                >
                  Change email
                </button>
              </div>
            </div>
          )}

          {/* New User Transition */}
          {step === "success-new" && (
            <div className="animate-in zoom-in-95 duration-500 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-lg shadow-teal-600/20">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                You're all set.
              </h2>
              <p className="mt-2 text-base text-slate-600 dark:text-slate-400">
                Welcome to Medicine Tracker. Let's get your medication routine set up.
              </p>
              
              <div className="mt-8">
                <Link
                  href="/setup"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-500 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                >
                  Set Up My Medicines
                </Link>
              </div>
            </div>
          )}

          {/* Existing User Transition */}
          {step === "success-existing" && (
            <div className="animate-in zoom-in-95 duration-500 text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8" aria-hidden="true">
                  <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
                  <path d="m8.5 8.5 7 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Welcome back
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Taking you to your dashboard...
              </p>
              
              <div className="mt-8">
                <Link
                  href="/dashboard"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 dark:bg-white px-5 py-3 text-sm font-semibold text-white dark:text-slate-900 shadow-sm transition-all hover:opacity-90 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
