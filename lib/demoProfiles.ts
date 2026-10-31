export const MEDICINES_STORAGE_KEY = "medTracker_medicines";
export const DOSES_STORAGE_KEY = "medTracker_doses";
export const PROFILE_MIGRATION_STORAGE_KEY = "chilldose_demo_profiles_v1_migration";
export const ACTIVE_DEMO_SESSION_KEY = "chilldose_demo_session";
export const ACTIVE_DEMO_EMAIL_KEY = "chilldose_demo_email";
export const GOOGLE_DEMO_EMAIL = "google-demo@chilldose.invalid";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

import type { PrescriptionHistoryEntry } from "./prescriptionHistory";
import type { VitalReading } from "./vitalTrack";

export interface DemoProfileData {
  email: string;
  medicines: unknown[];
  doseRecords: unknown[];
  prescriptionHistory?: PrescriptionHistoryEntry[];
  medicineEditHistory?: unknown[];
  inventoryTransactions?: unknown[];
  vitalReadings?: VitalReading[];
  vitalTrackDashboardEnabled?: boolean;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

function isClockTime(value: unknown): value is string {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasOptionalString(record: Record<string, unknown>, key: string): boolean {
  return record[key] === undefined || typeof record[key] === "string";
}

function hasOptionalNonNegativeNumber(record: Record<string, unknown>, key: string): boolean {
  return record[key] === undefined || (isFiniteNumber(record[key]) && record[key] >= 0);
}

function isProfileScheduleRevision(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return typeof value.effectiveAt === "string" && Number.isFinite(Date.parse(value.effectiveAt)) &&
    isNonEmptyString(value.frequency) && isCalendarDate(value.startDate) &&
    (value.endDate === undefined || isCalendarDate(value.endDate)) &&
    (value.intervalHours === undefined || isFiniteNumber(value.intervalHours)) &&
    (value.hydrationBaseline === undefined || value.hydrationBaseline === true) &&
    Array.isArray(value.scheduleTimes) && value.scheduleTimes.every(isClockTime);
}

/** Validate the fields downstream schedule, inventory, and history code reads directly. */
function isProfileMedicineEntry(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.id) && isNonEmptyString(value.name) &&
    isNonEmptyString(value.type) && typeof value.strength === "string" &&
    isFiniteNumber(value.doseAmount) && isNonEmptyString(value.frequency) &&
    isCalendarDate(value.startDate) && isFiniteNumber(value.inventoryAmount) && value.inventoryAmount >= 0 &&
    Array.isArray(value.scheduleTimes) && value.scheduleTimes.every(isClockTime) &&
    (value.intervalHours === undefined || isFiniteNumber(value.intervalHours)) &&
    (value.endDate === undefined || isCalendarDate(value.endDate)) &&
    (value.createdAt === undefined || typeof value.createdAt === "string") &&
    (value.updatedAt === undefined || typeof value.updatedAt === "string") &&
    (value.archivedAt === undefined || typeof value.archivedAt === "string") &&
    (value.scheduleRevisions === undefined ||
      (Array.isArray(value.scheduleRevisions) && value.scheduleRevisions.every(isProfileScheduleRevision))) &&
    (value.treatmentPeriods === undefined || (Array.isArray(value.treatmentPeriods) &&
      value.treatmentPeriods.every(isProfileTreatmentPeriod) &&
      new Set(value.treatmentPeriods.map((period) => (period as Record<string, unknown>).id)).size === value.treatmentPeriods.length &&
      value.treatmentPeriods.filter((period) => isRecord(period) && period.status === "active").length <= 1)) &&
    hasOptionalString(value, "prescribingDoctor") && hasOptionalString(value, "prescribingClinic") &&
    hasOptionalString(value, "prescriptionDate") && hasOptionalString(value, "prescriptionNotes") &&
    hasOptionalString(value, "composition") &&
    (value.expiryDate === undefined || value.expiryDate === "" || isCalendarDate(value.expiryDate)) &&
    hasOptionalString(value, "instructions") && hasOptionalString(value, "notes") &&
    hasOptionalString(value, "doseUnit") && hasOptionalString(value, "inventoryUnit") &&
    hasOptionalString(value, "lowStockThresholdUnit") &&
    hasOptionalNonNegativeNumber(value, "inventoryCapacity") &&
    hasOptionalNonNegativeNumber(value, "inventoryContainerCapacity") &&
    hasOptionalNonNegativeNumber(value, "lowStockThreshold");
}

function isProfileTreatmentPeriod(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.id) && (value.status === "active" || value.status === "discontinued" || value.status === "completed") &&
    isCalendarDate(value.startDate) && (value.endDate === undefined || isCalendarDate(value.endDate)) &&
    typeof value.startedAt === "string" && Number.isFinite(Date.parse(value.startedAt)) &&
    (value.endedAt === undefined || (typeof value.endedAt === "string" && Number.isFinite(Date.parse(value.endedAt)))) &&
    typeof value.createdAt === "string" && Number.isFinite(Date.parse(value.createdAt)) &&
    typeof value.updatedAt === "string" && Number.isFinite(Date.parse(value.updatedAt)) &&
    isNonEmptyString(value.medicineName) && isNonEmptyString(value.medicineType) && typeof value.medicineStrength === "string" &&
    isFiniteNumber(value.doseAmount) && isNonEmptyString(value.frequency) && Array.isArray(value.scheduleTimes) && value.scheduleTimes.every(isClockTime) &&
    (value.intervalHours === undefined || isFiniteNumber(value.intervalHours)) &&
    Array.isArray(value.scheduleRevisions) && value.scheduleRevisions.every(isProfileScheduleRevision) &&
    hasOptionalString(value, "doseUnit") && hasOptionalString(value, "prescribingDoctor") && hasOptionalString(value, "prescribingClinic") &&
    hasOptionalString(value, "prescriptionDate") && hasOptionalString(value, "prescriptionNotes") && hasOptionalString(value, "instructions");
}

function isProfileDoseRecord(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return isNonEmptyString(value.id) && isNonEmptyString(value.medicineId) &&
    isCalendarDate(value.scheduledDate) && isClockTime(value.scheduledTime) &&
    isNonEmptyString(value.status) &&
    (value.scheduledInstant === undefined || typeof value.scheduledInstant === "string") &&
    (value.actualTakenTime === undefined || typeof value.actualTakenTime === "string") &&
    (value.isPrn === undefined || typeof value.isPrn === "boolean") &&
    hasOptionalString(value, "treatmentPeriodId") &&
    hasOptionalString(value, "medicineName") && hasOptionalString(value, "medicineType") &&
    hasOptionalString(value, "medicineStrength") &&
    hasOptionalNonNegativeNumber(value, "medicineDoseAmount") &&
    hasOptionalString(value, "medicineDoseUnit") &&
    hasOptionalString(value, "medicinePrescribingDoctor") &&
    hasOptionalNonNegativeNumber(value, "inventoryRemainingAfterDose") &&
    hasOptionalString(value, "inventoryRemainingUnit");
}

function isProfileVitalReading(value: unknown): value is VitalReading {
  if (!isRecord(value) || !isNonEmptyString(value.id) || !isCalendarDate(value.date) || !isClockTime(value.time) || !hasOptionalString(value, "notes")) return false;
  const positive = (candidate: unknown) => isFiniteNumber(candidate) && candidate > 0;
  switch (value.type) {
    case "blood-pressure": return positive(value.systolic) && positive(value.diastolic);
    case "heart-rate": return positive(value.bpm);
    case "oxygen-saturation": return isFiniteNumber(value.percent) && value.percent >= 0 && value.percent <= 100;
    case "blood-sugar": return positive(value.value) &&
      (value.unit === "mg/dL" || value.unit === "mmol/L") &&
      (value.context === "Fasting" || value.context === "Before Meal" || value.context === "After Meal" || value.context === "Random");
    default: return false;
  }
}

function parseArray(raw: string | null, key: string, isValidEntry: (value: unknown) => boolean): unknown[] {
  if (raw === null) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every(isValidEntry)) {
    throw new Error(`Saved tracker data in ${key} contains records that could not be read safely. It was preserved without changes.`);
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
    !(parsed as Partial<StoredProfile>).medicines!.every(isProfileMedicineEntry) ||
    !Array.isArray((parsed as Partial<StoredProfile>).doseRecords) ||
    !(parsed as Partial<StoredProfile>).doseRecords!.every(isProfileDoseRecord) ||
    ((parsed as Partial<StoredProfile>).prescriptionHistory !== undefined &&
      (!Array.isArray((parsed as Partial<StoredProfile>).prescriptionHistory) ||
        !(parsed as Partial<StoredProfile>).prescriptionHistory!.every(isProfilePrescriptionEntry))) ||
    ((parsed as Partial<StoredProfile>).medicineEditHistory !== undefined &&
      (!Array.isArray((parsed as Partial<StoredProfile>).medicineEditHistory) ||
        !(parsed as Partial<StoredProfile>).medicineEditHistory!.every(isProfileMedicineEditEntry))) ||
    ((parsed as Partial<StoredProfile>).inventoryTransactions !== undefined &&
      (!Array.isArray((parsed as Partial<StoredProfile>).inventoryTransactions) ||
        !(parsed as Partial<StoredProfile>).inventoryTransactions!.every(isProfileInventoryTransaction))) ||
    ((parsed as Partial<StoredProfile>).vitalReadings !== undefined &&
      (!Array.isArray((parsed as Partial<StoredProfile>).vitalReadings) ||
        !(parsed as Partial<StoredProfile>).vitalReadings!.every(isProfileVitalReading))) ||
    ((parsed as Partial<StoredProfile>).vitalTrackDashboardEnabled !== undefined &&
      typeof (parsed as Partial<StoredProfile>).vitalTrackDashboardEnabled !== "boolean")
  ) {
    throw new Error("This local demo profile could not be read safely. Its saved data was left unchanged.");
  }

  const profile = parsed as StoredProfile;
  return {
    email,
    medicines: profile.medicines,
    doseRecords: profile.doseRecords,
    prescriptionHistory: profile.prescriptionHistory ?? [],
    medicineEditHistory: profile.medicineEditHistory ?? [],
    inventoryTransactions: profile.inventoryTransactions ?? [],
    vitalReadings: profile.vitalReadings ?? [],
    vitalTrackDashboardEnabled: profile.vitalTrackDashboardEnabled ?? false,
  };
}

function isProfilePrescriptionEntry(value: unknown): value is PrescriptionHistoryEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Partial<PrescriptionHistoryEntry>;
  const requiredStrings = [entry.id, entry.medicineId, entry.recordedAt, entry.medicineName, entry.medicineType, entry.strength, entry.frequency, entry.startDate];
  const optionalStrings = [entry.prescriptionDate, entry.prescribingDoctor, entry.prescribingClinic, entry.prescriptionNotes, entry.doseUnit, entry.endDate, entry.instructions, entry.composition];
  return requiredStrings.every((field) => typeof field === "string") &&
    optionalStrings.every((field) => field === undefined || typeof field === "string") &&
    (entry.treatmentPeriodId === undefined || typeof entry.treatmentPeriodId === "string") &&
    typeof entry.doseAmount === "number" && Number.isFinite(entry.doseAmount) &&
    (entry.intervalHours === undefined || (typeof entry.intervalHours === "number" && Number.isFinite(entry.intervalHours))) &&
    Array.isArray(entry.scheduleTimes) && entry.scheduleTimes.every((time) => typeof time === "string");
}

function isProfileMedicineEditEntry(value: unknown): boolean {
  return isRecord(value) && isNonEmptyString(value.id) && isNonEmptyString(value.medicineId) &&
    (value.treatmentPeriodId === undefined || typeof value.treatmentPeriodId === "string") &&
    typeof value.recordedAt === "string" && Number.isFinite(Date.parse(value.recordedAt)) &&
    Array.isArray(value.changedFields) && value.changedFields.every((field) => typeof field === "string") &&
    isRecord(value.previous) && isRecord(value.updated);
}

function isProfileInventoryTransaction(value: unknown): boolean {
  return isRecord(value) && isNonEmptyString(value.id) && isNonEmptyString(value.medicineId) &&
    hasOptionalString(value, "medicineName") &&
    (value.treatmentPeriodId === undefined || typeof value.treatmentPeriodId === "string") &&
    typeof value.recordedAt === "string" && Number.isFinite(Date.parse(value.recordedAt)) &&
    (value.kind === "refill" || value.kind === "adjustment" || value.kind === "dose") &&
    isFiniteNumber(value.quantityChange) && isNonEmptyString(value.unit) &&
    isFiniteNumber(value.balanceAfter) && value.balanceAfter >= 0 &&
    hasOptionalNonNegativeNumber(value, "previousBalance") && hasOptionalString(value, "previousUnit");
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
    return { email, medicines: [], doseRecords: [], prescriptionHistory: [], vitalReadings: [], vitalTrackDashboardEnabled: false };
  }

  // Validate both legacy values before making any storage changes.
  const medicines = parseArray(storage.getItem(MEDICINES_STORAGE_KEY), MEDICINES_STORAGE_KEY, isProfileMedicineEntry);
  const doseRecords = parseArray(storage.getItem(DOSES_STORAGE_KEY), DOSES_STORAGE_KEY, isProfileDoseRecord);

  // Claim before copying so an interrupted copy cannot expose legacy data to a different profile.
  if (assignment === null) {
    storage.setItem(PROFILE_MIGRATION_STORAGE_KEY, JSON.stringify({ version: 1, ownerEmail: email }));
  }

  const profile: StoredProfile = { version: 1, email, medicines, doseRecords, prescriptionHistory: [], vitalReadings: [], vitalTrackDashboardEnabled: false };
  storage.setItem(profileKey, JSON.stringify(profile));
  return { email, medicines, doseRecords, prescriptionHistory: [], vitalReadings: [], vitalTrackDashboardEnabled: false };
}

export function serializeDemoProfile(profile: DemoProfileData): string {
  return JSON.stringify({
    version: 1,
    email: normalizeDemoEmail(profile.email),
    medicines: profile.medicines,
    doseRecords: profile.doseRecords,
    prescriptionHistory: profile.prescriptionHistory ?? [],
    medicineEditHistory: profile.medicineEditHistory ?? [],
    inventoryTransactions: profile.inventoryTransactions ?? [],
    vitalReadings: profile.vitalReadings ?? [],
    vitalTrackDashboardEnabled: profile.vitalTrackDashboardEnabled ?? false,
  } satisfies StoredProfile);
}

/** Persist only when the browser's current session still owns this profile. */
export function saveDemoProfileForActiveSession(storage: StorageLike, profile: DemoProfileData): boolean {
  const email = normalizeDemoEmail(profile.email);
  const sessionActive = storage.getItem(ACTIVE_DEMO_SESSION_KEY) === "active";
  const sessionEmail = sessionActive ? normalizeDemoEmail(storage.getItem(ACTIVE_DEMO_EMAIL_KEY) ?? "") : "";
  if (!email || sessionEmail !== email) return false;

  storage.setItem(demoProfileStorageKey(email), serializeDemoProfile({ ...profile, email }));
  return true;
}
