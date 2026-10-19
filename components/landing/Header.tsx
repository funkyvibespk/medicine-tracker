"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Dismiss the open mobile menu on outside pointer or Escape, cleaning up per open cycle.
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (mobileMenuRef.current?.contains(event.target) || mobileMenuButtonRef.current?.contains(event.target)) return;
      setMobileMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileMenuOpen]);

  return (
    <header
      className={`landing-header-glass sticky top-0 z-50 border-b border-white/80 transition-all duration-200 ${scrolled ? "landing-header-scrolled" : ""}`}
    >
      <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <Link
          href="/"
          className="group flex items-center gap-2.5 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#60CDB4]"
        >
          <BrandLogo markClassName="h-10 w-10 sm:h-11 sm:w-11 transition-transform group-hover:scale-105" wordmarkClassName="text-xl font-bold tracking-tight sm:text-2xl" />
        </Link>

        {/* Desktop Navigation Links */}
        <nav
          className="hidden md:flex items-center gap-7 text-sm font-semibold text-[#007F73] lg:gap-10"
          aria-label="Main Navigation"
        >
          <a
            href="#features"
            className="rounded transition-colors hover:text-[#142B2A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#60CDB4]"
          >
            Features
          </a>
          <Link
            href="/#product-demo"
            className="rounded transition-colors hover:text-[#142B2A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#60CDB4]"
          >
            Product Demo
          </Link>
          <a
            href="#how-it-works"
            className="rounded transition-colors hover:text-[#142B2A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#60CDB4]"
          >
            How It Works
          </a>
          <a
            href="#privacy"
            className="rounded transition-colors hover:text-[#142B2A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#60CDB4]"
          >
            Privacy
          </a>
        </nav>

        {/* Desktop primary action */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/auth?mode=login"
            className="cd-primary-button inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white active:scale-[0.98] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#60CDB4] focus-visible:ring-offset-2"
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

        {/* Mobile menu control */}
        <div className="flex sm:hidden items-center">
          <button
            type="button"
            ref={mobileMenuButtonRef}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#60CDB4]/40 text-[#5D7774] transition-colors hover:bg-[#DFF6EF]/60 hover:text-[#142B2A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#60CDB4]"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="landing-mobile-menu"
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
        <div ref={mobileMenuRef} id="landing-mobile-menu" className="landing-glass md:hidden border-b border-white/80 px-4 pt-2 pb-5 animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col space-y-3 pt-2" aria-label="Mobile Navigation">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-base font-medium text-[#007F73] transition-colors hover:bg-[#DFF6EF]/60 hover:text-[#142B2A]"
            >
              Features
            </a>
            <Link
              href="/#product-demo"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-base font-medium text-[#007F73] transition-colors hover:bg-[#DFF6EF]/60 hover:text-[#142B2A]"
            >
              Product Demo
            </Link>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-base font-medium text-[#007F73] transition-colors hover:bg-[#DFF6EF]/60 hover:text-[#142B2A]"
            >
              How It Works
            </a>
            <a
              href="#privacy"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-lg px-3 py-2 text-base font-medium text-[#007F73] transition-colors hover:bg-[#DFF6EF]/60 hover:text-[#142B2A]"
            >
              Privacy
            </a>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
              <Link
                href="/auth?mode=login"
                onClick={() => setMobileMenuOpen(false)}
                className="cd-primary-button w-full rounded-xl py-2.5 text-center text-sm font-semibold text-white transition-all hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#60CDB4] focus-visible:ring-offset-2"
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
