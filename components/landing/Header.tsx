"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-200 ${
        scrolled
          ? "bg-white/90 dark:bg-slate-900/90 shadow-sm backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800"
          : "bg-white/75 dark:bg-slate-900/75 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800/60"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-xl"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-md shadow-teal-600/20 transition-transform group-hover:scale-105">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
              <path d="m8.5 8.5 7 7" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
              ChillDose
            </span>
            <span className="hidden sm:inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 ring-1 ring-inset ring-teal-600/20 dark:bg-teal-950/60 dark:text-teal-300 dark:ring-teal-500/30">
              Public Preview
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300"
          aria-label="Main Navigation"
        >
          <a
            href="#features"
            className="transition-colors hover:text-teal-600 dark:hover:text-teal-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
          >
            Features
          </a>
          <a
            href="#preview"
            className="transition-colors hover:text-teal-600 dark:hover:text-teal-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
          >
            Product Demo
          </a>
          <a
            href="#how-it-works"
            className="transition-colors hover:text-teal-600 dark:hover:text-teal-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
          >
            How It Works
          </a>
          <a
            href="#privacy"
            className="transition-colors hover:text-teal-600 dark:hover:text-teal-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
          >
            Privacy
          </a>
        </nav>

        {/* Desktop CTA actions */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/auth"
            className="text-sm font-medium text-slate-700 hover:text-teal-600 dark:text-slate-300 dark:hover:text-teal-400 px-3 py-2 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            Sign In
          </Link>
          <Link
            href="/auth"
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-teal-700/20 hover:from-teal-500 hover:to-emerald-500 hover:shadow-md hover:shadow-teal-600/30 active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          >
            <span>Get Started</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Mobile controls (Compact Get Started + Hamburger Menu) */}
        <div className="flex sm:hidden items-center gap-2">
          <Link
            href="/auth"
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-teal-500 active:scale-95 transition-all"
          >
            Get Started
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <line x1="4" x2="20" y1="12" y2="12" />
                <line x1="4" x2="20" y1="6" y2="6" />
                <line x1="4" x2="20" y1="18" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white/95 px-4 pt-2 pb-5 shadow-lg backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-3 pt-2" aria-label="Mobile Navigation">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 hover:text-teal-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Features
            </a>
            <a
              href="#preview"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 hover:text-teal-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Product Demo
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 hover:text-teal-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              How It Works
            </a>
            <a
              href="#privacy"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-base font-medium text-slate-700 hover:bg-slate-100 hover:text-teal-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Privacy
            </a>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
              <Link
                href="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Sign In
              </Link>
              <Link
                href="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-teal-500 hover:to-emerald-500"
              >
                Get Started →
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
