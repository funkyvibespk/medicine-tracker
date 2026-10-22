import { ACTIVE_DEMO_EMAIL_KEY, ACTIVE_DEMO_SESSION_KEY, normalizeDemoEmail } from "@/lib/demoProfiles";

export interface DemoSession {
  email: string;
}

export const DEMO_SESSION_CHANGE_EVENT = "chilldose:demo-session-change";

function notifySessionChange() {
  window.dispatchEvent(new Event(DEMO_SESSION_CHANGE_EVENT));
}

function readSession(storage: Storage): DemoSession | null {
  const active = storage.getItem(ACTIVE_DEMO_SESSION_KEY) === "active";
  const email = active ? normalizeDemoEmail(storage.getItem(ACTIVE_DEMO_EMAIL_KEY) ?? "") : "";
  return email ? { email } : null;
}

function removeSession(storage: Storage) {
  storage.removeItem(ACTIVE_DEMO_SESSION_KEY);
  storage.removeItem(ACTIVE_DEMO_EMAIL_KEY);
}

export function readDemoSession(): DemoSession | null {
  if (typeof window === "undefined") return null;

  const persistentSession = readSession(window.localStorage);
  if (persistentSession) {
    // Keep one authoritative session location after a successful legacy migration.
    removeSession(window.sessionStorage);
    return persistentSession;
  }

  const previousSession = readSession(window.sessionStorage);
  if (!previousSession) return null;

  try {
    window.localStorage.setItem(ACTIVE_DEMO_EMAIL_KEY, previousSession.email);
    window.localStorage.setItem(ACTIVE_DEMO_SESSION_KEY, "active");
    removeSession(window.sessionStorage);
  } catch {
    // Keep the existing tab session usable when persistent storage is unavailable.
  }
  return previousSession;
}

export function writeDemoSession(emailInput: string): DemoSession {
  if (typeof window === "undefined") throw new Error("Demo sessions are available in the browser only.");
  const email = normalizeDemoEmail(emailInput);
  if (!email) throw new Error("A valid local demo email is required to start a session.");

  window.localStorage.setItem(ACTIVE_DEMO_EMAIL_KEY, email);
  window.localStorage.setItem(ACTIVE_DEMO_SESSION_KEY, "active");
  removeSession(window.sessionStorage);
  notifySessionChange();
  return { email };
}

export function clearDemoSession(): void {
  if (typeof window === "undefined") return;
  removeSession(window.localStorage);
  removeSession(window.sessionStorage);
  notifySessionChange();
}
