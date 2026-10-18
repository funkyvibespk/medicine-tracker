"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMedicine } from "@/contexts/MedicineContext";
import { BrandLogo } from "@/components/BrandLogo";
import { clearDemoSession } from "@/lib/demoSession";
import { changeDemoPassword, DEMO_PASSWORD_MIN_LENGTH } from "@/lib/demoAuth";
import { getDemoAvatarInitials } from "@/lib/demoAvatar";
import { keepDialogFocusInside, useDialogFocusRestore } from "@/lib/accessibility";

export default function WorkspaceHeader() {
  const router = useRouter();
  const { activeProfileEmail, deactivateProfile } = useMedicine();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; success: boolean } | null>(null);
  const [passwordToast, setPasswordToast] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useDialogFocusRestore(changePasswordOpen);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const closeWhenOutside = (event: PointerEvent | FocusEvent) => {
      if (event.target instanceof Node && !profileMenuRef.current?.contains(event.target)) setProfileMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeWhenOutside);
    document.addEventListener("focusin", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeWhenOutside);
      document.removeEventListener("focusin", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    if (!passwordToast) return;
    const timeout = window.setTimeout(() => setPasswordToast(false), 3000);
    return () => window.clearTimeout(timeout);
  }, [passwordToast]);

  useEffect(() => {
    if (!changePasswordOpen || isChangingPassword) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setChangePasswordOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [changePasswordOpen, isChangingPassword]);

  const handleLogout = () => {
    clearDemoSession();
    deactivateProfile();
    router.replace("/");
  };

  const handlePasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const newPassword = String(form.get("newPassword") ?? "");
    const confirmation = String(form.get("confirmPassword") ?? "");
    if (newPassword !== confirmation) {
      setPasswordMessage({ text: "The new password and confirmation do not match.", success: false });
      return;
    }
    if (!activeProfileEmail) {
      setPasswordMessage({ text: "No signed-in local demo account is available.", success: false });
      return;
    }

    setPasswordMessage(null);
    setIsChangingPassword(true);
    try {
      await changeDemoPassword(window.localStorage, activeProfileEmail, currentPassword, newPassword);
      formRef.current?.reset();
      setPasswordMessage(null);
      setChangePasswordOpen(false);
      setPasswordToast(true);
    } catch (error) {
      setPasswordMessage({
        text: error instanceof Error ? error.message : "The password could not be changed. Please try again.",
        success: false,
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-4 py-3.5 sm:px-6 lg:px-8">
          <BrandLogo href="/dashboard" ariaLabel="ChillDose dashboard" markClassName="h-9 w-9" />
          <div ref={profileMenuRef} className="relative z-20">
            <button
              type="button"
              onClick={() => setProfileMenuOpen((open) => !open)}
              aria-label={`Open profile menu for ${getDemoAvatarInitials(activeProfileEmail)}`}
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-800 ring-2 ring-white transition hover:bg-teal-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:bg-teal-900/60 dark:text-teal-200 dark:ring-slate-900 dark:hover:bg-teal-900"
            >
              {getDemoAvatarInitials(activeProfileEmail)}
            </button>
            {profileMenuOpen && <>
              <div role="menu" className="absolute right-0 top-12 z-20 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-100 px-3 py-3 dark:border-slate-800">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Local demo profile</p>
                  <p className="mt-1 break-all text-xs leading-relaxed text-slate-500 dark:text-slate-400">{activeProfileEmail ?? "No email profile selected"}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Tracker data stays in this browser and is not linked to an account.</p>
                </div>
                <button type="button" role="menuitem" onClick={() => { setProfileMenuOpen(false); setPasswordMessage(null); setPasswordToast(false); setChangePasswordOpen(true); }} className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-slate-200 dark:hover:bg-slate-800">
                  Change Password
                </button>
                <button type="button" role="menuitem" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-700 transition hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-rose-300 dark:hover:bg-rose-950/40">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></svg>
                  Log Out
                </button>
              </div>
            </>}
          </div>
        </div>
      </header>

      {passwordToast && !changePasswordOpen && <div role="status" aria-live="polite" aria-atomic="true" className="fixed left-1/2 top-4 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 shadow-lg sm:top-6 lg:top-20 dark:border-emerald-900/60 dark:bg-emerald-950 dark:text-emerald-200">
        Password changed successfully.
      </div>}

      {changePasswordOpen && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !isChangingPassword) setChangePasswordOpen(false); }}>
        <div role="dialog" aria-modal="true" aria-labelledby="change-password-title" onKeyDown={keepDialogFocusInside} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 id="change-password-title" className="text-xl font-bold text-slate-900 dark:text-white">Change Password</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Update the password for this local demo account.</p>
            </div>
            <button type="button" onClick={() => setChangePasswordOpen(false)} disabled={isChangingPassword} aria-label="Close change password" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50 dark:hover:bg-slate-800">✕</button>
          </div>
          <form ref={formRef} onSubmit={handlePasswordChange} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Current password
              <input name="currentPassword" type="password" autoComplete="current-password" required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">New password
              <input name="newPassword" type="password" autoComplete="new-password" minLength={DEMO_PASSWORD_MIN_LENGTH} required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
              <span className="mt-1 block text-xs font-normal text-slate-500 dark:text-slate-400">At least {DEMO_PASSWORD_MIN_LENGTH} characters.</span>
            </label>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Confirm new password
              <input name="confirmPassword" type="password" autoComplete="new-password" minLength={DEMO_PASSWORD_MIN_LENGTH} required className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            </label>
            {passwordMessage && <p role={passwordMessage.success ? "status" : "alert"} className={`rounded-xl px-3 py-2 text-sm ${passwordMessage.success ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300"}`}>{passwordMessage.text}</p>}
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setChangePasswordOpen(false)} disabled={isChangingPassword} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Cancel</button>
              <button type="submit" disabled={isChangingPassword} className="min-h-11 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white hover:bg-teal-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50">{isChangingPassword ? "Updating…" : "Update Password"}</button>
            </div>
          </form>
        </div>
      </div>}
    </>
  );
}
