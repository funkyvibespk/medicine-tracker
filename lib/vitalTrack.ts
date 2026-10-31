export type VitalReadingType = "blood-pressure" | "heart-rate" | "oxygen-saturation" | "blood-sugar";
export type BloodSugarUnit = "mg/dL" | "mmol/L";
export type BloodSugarContext = "Fasting" | "Before Meal" | "After Meal" | "Random";

interface VitalReadingBase {
  id: string;
  type: VitalReadingType;
  date: string;
  time: string;
  notes?: string;
}

export interface BloodPressureReading extends VitalReadingBase {
  type: "blood-pressure";
  systolic: number;
  diastolic: number;
}

export interface HeartRateReading extends VitalReadingBase {
  type: "heart-rate";
  bpm: number;
}

export interface OxygenSaturationReading extends VitalReadingBase {
  type: "oxygen-saturation";
  percent: number;
}

export interface BloodSugarReading extends VitalReadingBase {
  type: "blood-sugar";
  value: number;
  unit: BloodSugarUnit;
  context: BloodSugarContext;
}

export type VitalReading = BloodPressureReading | HeartRateReading | OxygenSaturationReading | BloodSugarReading;

export const VITAL_READING_TYPES: readonly VitalReadingType[] = [
  "blood-pressure", "heart-rate", "oxygen-saturation", "blood-sugar",
];

export function isVitalReading(value: unknown): value is VitalReading {
  if (!value || typeof value !== "object") return false;
  const reading = value as Record<string, unknown>;
  if (typeof reading.id !== "string" || !reading.id.trim() || typeof reading.date !== "string" || !isDate(reading.date) ||
      typeof reading.time !== "string" || !isTime(reading.time) ||
      (reading.notes !== undefined && typeof reading.notes !== "string")) return false;
  switch (reading.type) {
    case "blood-pressure":
      return isPositive(reading.systolic) && isPositive(reading.diastolic);
    case "heart-rate":
      return isPositive(reading.bpm);
    case "oxygen-saturation":
      return typeof reading.percent === "number" && Number.isFinite(reading.percent) && reading.percent >= 0 && reading.percent <= 100;
    case "blood-sugar":
      return isPositive(reading.value) && (reading.unit === "mg/dL" || reading.unit === "mmol/L") &&
        (reading.context === "Fasting" || reading.context === "Before Meal" || reading.context === "After Meal" || reading.context === "Random");
    default:
      return false;
  }
}

function isPositive(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

function isTime(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function validateVitalReading(reading: unknown): string | null {
  if (!reading || typeof reading !== "object") return "Enter a valid reading.";
  const candidate = reading as Record<string, unknown>;
  if (typeof candidate.id !== "string" || !candidate.id.trim()) return "A reading ID is required.";
  if (typeof candidate.date !== "string" || !isDate(candidate.date)) return "Enter a valid measurement date.";
  if (typeof candidate.time !== "string" || !isTime(candidate.time)) return "Enter a valid measurement time.";
  if (candidate.notes !== undefined && typeof candidate.notes !== "string") return "Notes must be text.";
  if (candidate.type === "blood-pressure") {
    if (!isPositive(candidate.systolic) || !isPositive(candidate.diastolic)) return "Enter positive systolic and diastolic values.";
  } else if (candidate.type === "heart-rate") {
    if (!isPositive(candidate.bpm)) return "Enter a positive heart-rate value.";
  } else if (candidate.type === "oxygen-saturation") {
    if (typeof candidate.percent !== "number" || !Number.isFinite(candidate.percent) || candidate.percent < 0 || candidate.percent > 100) return "Enter an oxygen saturation from 0 to 100%.";
  } else if (candidate.type === "blood-sugar") {
    if (!isPositive(candidate.value)) return "Enter a positive blood-sugar value.";
    if (candidate.unit !== "mg/dL" && candidate.unit !== "mmol/L") return "Choose mg/dL or mmol/L.";
    if (!["Fasting", "Before Meal", "After Meal", "Random"].includes(String(candidate.context))) return "Choose a blood-sugar context.";
  } else return "Choose a measurement category.";
  return null;
}

export function sortVitalReadingsNewestFirst(readings: readonly VitalReading[]): VitalReading[] {
  return readings.map((reading, index) => ({ reading, index }))
    .sort((a, b) => b.reading.date.localeCompare(a.reading.date) || b.reading.time.localeCompare(a.reading.time) ||
      b.reading.id.localeCompare(a.reading.id) || b.index - a.index)
    .map(({ reading }) => reading);
}

export function filterVitalReadings(
  readings: readonly VitalReading[],
  filters: { type?: VitalReadingType | "all"; dateFrom?: string; dateTo?: string } = {},
): VitalReading[] {
  return sortVitalReadingsNewestFirst(readings.filter((reading) =>
    (!filters.type || filters.type === "all" || reading.type === filters.type) &&
    (!filters.dateFrom || reading.date >= filters.dateFrom) &&
    (!filters.dateTo || reading.date <= filters.dateTo)
  ));
}

export function upsertVitalReading(readings: readonly VitalReading[], reading: VitalReading): VitalReading[] {
  const validationError = validateVitalReading(reading);
  if (validationError) throw new Error(validationError);
  const existingIndex = readings.findIndex((item) => item.id === reading.id);
  return existingIndex < 0
    ? [...readings, reading]
    : readings.map((item, index) => index === existingIndex ? reading : item);
}

export function deleteVitalReading(readings: readonly VitalReading[], id: string): VitalReading[] {
  return readings.filter((reading) => reading.id !== id);
}

export function vitalReadingLabel(reading: VitalReading): string {
  switch (reading.type) {
    case "blood-pressure": return `${reading.systolic}/${reading.diastolic} mmHg`;
    case "heart-rate": return `${reading.bpm} BPM`;
    case "oxygen-saturation": return `${reading.percent}%`;
    case "blood-sugar": return `${reading.value} ${reading.unit} · ${reading.context}`;
  }
}

export function vitalReadingTypeLabel(type: VitalReadingType): string {
  switch (type) {
    case "blood-pressure": return "Blood Pressure";
    case "heart-rate": return "Heart Rate";
    case "oxygen-saturation": return "Oxygen Saturation";
    case "blood-sugar": return "Blood Sugar";
  }
}

export function latestVitalReading(readings: readonly VitalReading[], type: VitalReadingType): VitalReading | undefined {
  return sortVitalReadingsNewestFirst(readings.filter((reading) => reading.type === type))[0];
}

export function latestVitalReadingOnDate(readings: readonly VitalReading[], type: VitalReadingType, date: string): VitalReading | undefined {
  return sortVitalReadingsNewestFirst(readings.filter((reading) => reading.type === type && reading.date === date))[0];
}
