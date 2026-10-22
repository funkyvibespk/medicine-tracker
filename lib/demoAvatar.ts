const AVATAR_COLORS = [
  "bg-teal-100 text-teal-900 dark:bg-teal-900 dark:text-teal-100 hover:bg-teal-200 dark:hover:bg-teal-800",
  "bg-sky-100 text-sky-900 dark:bg-sky-900 dark:text-sky-100 hover:bg-sky-200 dark:hover:bg-sky-800",
  "bg-violet-100 text-violet-900 dark:bg-violet-900 dark:text-violet-100 hover:bg-violet-200 dark:hover:bg-violet-800",
  "bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100 hover:bg-amber-200 dark:hover:bg-amber-800",
  "bg-rose-100 text-rose-900 dark:bg-rose-900 dark:text-rose-100 hover:bg-rose-200 dark:hover:bg-rose-800",
  "bg-cyan-100 text-cyan-900 dark:bg-cyan-900 dark:text-cyan-100 hover:bg-cyan-200 dark:hover:bg-cyan-800",
] as const;

function normalizedEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function getDemoAvatarInitials(email: string | null | undefined): string {
  const normalized = normalizedEmail(email);
  if (!isValidEmail(normalized)) return "?";

  const localPart = normalized.slice(0, normalized.indexOf("@"));
  const firstCharacter = localPart.match(/[a-z0-9]/)?.[0];
  if (!firstCharacter) return "?";
  if (!localPart.includes(".")) return firstCharacter.toUpperCase();

  // Include a character from the account-specific portion of longer usernames,
  // so similar names such as kamran and kamrankhan don't both render as KD.
  const distinguishingCharacter = localPart.slice(6).match(/[a-z0-9]/)?.[0];
  return `${firstCharacter}${distinguishingCharacter ?? localPart.slice(1).match(/[a-z0-9]/)?.[0] ?? firstCharacter}`.toUpperCase();
}

export function getDemoAvatarColor(email: string | null | undefined): string {
  const normalized = normalizedEmail(email);
  if (!isValidEmail(normalized)) return AVATAR_COLORS[0];

  // FNV-1a gives each normalized email a stable palette index across sessions.
  let hash = 0x811c9dc5;
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return AVATAR_COLORS[(hash >>> 0) % AVATAR_COLORS.length];
}
