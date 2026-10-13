export const MEDICINES_STORAGE_KEY = "medTracker_medicines";
export const DOSES_STORAGE_KEY = "medTracker_doses";
export const PROFILE_MIGRATION_STORAGE_KEY = "chilldose_demo_profiles_v1_migration";
export const ACTIVE_DEMO_SESSION_KEY = "chilldose_demo_session";
export const ACTIVE_DEMO_EMAIL_KEY = "chilldose_demo_email";
export const GOOGLE_DEMO_EMAIL = "google-demo@chilldose.invalid";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export interface DemoProfileData {
  email: string;
  medicines: unknown[];
  doseRecords: unknown[];
}

interface StoredProfile extends DemoProfileData {
  version: 1;
}

interface MigrationAssignment {
  version: 1;
  ownerEmail: string;
}

export function normalizeDemoEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function demoProfileStorageKey(email: string): string {
  return `chilldose_demo_profile_v1_${encodeURIComponent(normalizeDemoEmail(email))}`;
}

function parseArray(raw: string | null, key: string): unknown[] {
  if (raw === null) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`Saved tracker data in ${key} is not a list. It was preserved without changes.`);
  }
  return parsed;
}

function parseProfile(raw: string, email: string): DemoProfileData {
  const parsed: unknown = JSON.parse(raw);
  if (
    typeof parsed !== "object" || parsed === null ||
    (parsed as Partial<StoredProfile>).version !== 1 ||
    normalizeDemoEmail(String((parsed as Partial<StoredProfile>).email ?? "")) !== email ||
    !Array.isArray((parsed as Partial<StoredProfile>).medicines) ||
    !Array.isArray((parsed as Partial<StoredProfile>).doseRecords)
  ) {
    throw new Error("This local demo profile could not be read safely. Its saved data was left unchanged.");
  }

  const profile = parsed as StoredProfile;
  return { email, medicines: profile.medicines, doseRecords: profile.doseRecords };
}

function parseAssignment(raw: string): MigrationAssignment {
  const parsed: unknown = JSON.parse(raw);
  if (
    typeof parsed !== "object" || parsed === null ||
    (parsed as Partial<MigrationAssignment>).version !== 1 ||
    typeof (parsed as Partial<MigrationAssignment>).ownerEmail !== "string"
  ) {
    throw new Error("The local data migration marker is invalid. Existing tracker data was left unchanged.");
  }
  return parsed as MigrationAssignment;
}

export function loadDemoProfile(
  storage: StorageLike,
  emailInput: string,
  options: { migrateLegacy?: boolean } = {},
): DemoProfileData {
  const email = normalizeDemoEmail(emailInput);
  if (!email) throw new Error("Enter an email address to open a local demo profile.");

  const profileKey = demoProfileStorageKey(email);
  const savedProfile = storage.getItem(profileKey);
  if (savedProfile !== null) return parseProfile(savedProfile, email);

  const migrationRaw = storage.getItem(PROFILE_MIGRATION_STORAGE_KEY);
  const assignment = migrationRaw === null ? null : parseAssignment(migrationRaw);
  // Unowned legacy data is imported only after an explicit ownership choice.
  // Previously recorded ownership can be resumed for that same profile only.
  const mayImportLegacy = assignment?.ownerEmail === email || (assignment === null && options.migrateLegacy === true);

  if (!mayImportLegacy) {
    return { email, medicines: [], doseRecords: [] };
  }

  // Validate both legacy values before making any storage changes.
  const medicines = parseArray(storage.getItem(MEDICINES_STORAGE_KEY), MEDICINES_STORAGE_KEY);
  const doseRecords = parseArray(storage.getItem(DOSES_STORAGE_KEY), DOSES_STORAGE_KEY);

  // Claim before copying so an interrupted copy cannot expose legacy data to a different profile.
  if (assignment === null) {
    storage.setItem(PROFILE_MIGRATION_STORAGE_KEY, JSON.stringify({ version: 1, ownerEmail: email }));
  }

  const profile: StoredProfile = { version: 1, email, medicines, doseRecords };
  storage.setItem(profileKey, JSON.stringify(profile));
  return { email, medicines, doseRecords };
}

export function serializeDemoProfile(profile: DemoProfileData): string {
  return JSON.stringify({
    version: 1,
    email: normalizeDemoEmail(profile.email),
    medicines: profile.medicines,
    doseRecords: profile.doseRecords,
  } satisfies StoredProfile);
}
