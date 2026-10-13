export function getDemoAvatarInitials(email: string | null | undefined): string {
  const localPart = (email ?? "").trim().split("@", 1)[0] ?? "";
  const parts = localPart.split(/[._+-]+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}
