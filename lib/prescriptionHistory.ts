export interface PrescribableMedicine {
  id: string;
  name: string;
  type: string;
  strength: string;
  doseAmount: number;
  doseUnit?: string;
  frequency: string;
  intervalHours?: number;
  scheduleTimes: string[];
  startDate: string;
  endDate?: string;
  instructions?: string;
  prescribingDoctor?: string;
  prescribingClinic?: string;
  prescriptionDate?: string;
  prescriptionNotes?: string;
}

export interface PrescriptionHistoryEntry {
  id: string;
  medicineId: string;
  recordedAt: string;
  prescriptionDate?: string;
  prescribingDoctor?: string;
  prescribingClinic?: string;
  prescriptionNotes?: string;
  medicineName: string;
  medicineType: string;
  strength: string;
  doseAmount: number;
  doseUnit?: string;
  frequency: string;
  intervalHours?: number;
  scheduleTimes: string[];
  startDate: string;
  endDate?: string;
  instructions?: string;
}

function normalizedText(value: string | undefined): string {
  return value?.trim() ?? "";
}

/** Canonical display/storage form for an optional doctor's name. */
export function normalizeDoctorName(value: string | undefined): string {
  const name = normalizedText(value)
    .replace(/\s+/g, " ")
    .replace(/^(?:dr\.\s*|dr\s+)+/i, "")
    .trim();
  return name ? `Dr. ${name}` : "";
}

function doctorIdentity(value: string | undefined): string {
  return normalizeDoctorName(value).replace(/^Dr\.\s*/i, "").toLowerCase();
}

/** Search key that treats the optional Dr. prefix, casing, and extra spaces uniformly. */
export function normalizeDoctorNameForSearch(value: string | undefined): string {
  return doctorIdentity(value).replace(/\s+/g, " ").trim();
}

export interface PrescriptionHistoryFilters {
  doctor?: string;
  prescriptionDateFrom?: string;
  prescriptionDateTo?: string;
  medicine?: string;
}

/** Filters historical snapshots, never current medicine metadata or dose events. */
export function filterPrescriptionHistory(
  entries: readonly PrescriptionHistoryEntry[],
  filters: PrescriptionHistoryFilters,
): PrescriptionHistoryEntry[] {
  const doctorQuery = normalizeDoctorNameForSearch(filters.doctor);
  const medicineQuery = normalizedText(filters.medicine).toLowerCase();
  return entries.filter((entry) => {
    if (doctorQuery && !normalizeDoctorNameForSearch(entry.prescribingDoctor).includes(doctorQuery)) return false;
    if (medicineQuery && !entry.medicineName.toLowerCase().includes(medicineQuery)) return false;
    if (filters.prescriptionDateFrom && (!entry.prescriptionDate || entry.prescriptionDate < filters.prescriptionDateFrom)) return false;
    if (filters.prescriptionDateTo && (!entry.prescriptionDate || entry.prescriptionDate > filters.prescriptionDateTo)) return false;
    return true;
  });
}

function scheduleTimesKey(times: string[] | undefined): string {
  return JSON.stringify([...(times ?? [])].sort());
}

/** Prescription-relevant fields only; stock and other inventory values are intentionally excluded. */
export function samePrescriptionDetails(a: PrescribableMedicine, b: PrescribableMedicine): boolean {
  return a.id === b.id &&
    normalizedText(a.name) === normalizedText(b.name) &&
    normalizedText(a.type) === normalizedText(b.type) &&
    normalizedText(a.strength) === normalizedText(b.strength) &&
    a.doseAmount === b.doseAmount &&
    normalizedText(a.doseUnit) === normalizedText(b.doseUnit) &&
    normalizedText(a.frequency) === normalizedText(b.frequency) &&
    a.intervalHours === b.intervalHours &&
    scheduleTimesKey(a.scheduleTimes) === scheduleTimesKey(b.scheduleTimes) &&
    normalizedText(a.startDate) === normalizedText(b.startDate) &&
    normalizedText(a.endDate) === normalizedText(b.endDate) &&
    normalizedText(a.instructions) === normalizedText(b.instructions) &&
    doctorIdentity(a.prescribingDoctor) === doctorIdentity(b.prescribingDoctor) &&
    normalizedText(a.prescribingClinic) === normalizedText(b.prescribingClinic) &&
    normalizedText(a.prescriptionDate) === normalizedText(b.prescriptionDate) &&
    normalizedText(a.prescriptionNotes) === normalizedText(b.prescriptionNotes);
}

export function createPrescriptionHistoryEntry(
  medicine: PrescribableMedicine,
  recordedAt: string,
  id: string,
): PrescriptionHistoryEntry {
  return {
    id,
    medicineId: medicine.id,
    recordedAt,
    prescriptionDate: normalizedText(medicine.prescriptionDate) || undefined,
    prescribingDoctor: normalizeDoctorName(medicine.prescribingDoctor) || undefined,
    prescribingClinic: normalizedText(medicine.prescribingClinic) || undefined,
    prescriptionNotes: normalizedText(medicine.prescriptionNotes) || undefined,
    medicineName: medicine.name,
    medicineType: medicine.type,
    strength: medicine.strength,
    doseAmount: medicine.doseAmount,
    doseUnit: medicine.doseUnit,
    frequency: medicine.frequency,
    intervalHours: medicine.intervalHours,
    scheduleTimes: [...medicine.scheduleTimes],
    startDate: medicine.startDate,
    endDate: medicine.endDate,
    instructions: medicine.instructions,
  };
}

function entryMatchesMedicine(entry: PrescriptionHistoryEntry, medicine: PrescribableMedicine): boolean {
  return samePrescriptionDetails({ ...entry, id: entry.medicineId, name: entry.medicineName, type: entry.medicineType }, medicine);
}

/**
 * Append snapshots only for prescription-relevant changes. For a legacy medicine
 * without history, capture its last known state before the changed state; both
 * entries are marked with the time the history was first recorded in ChillDose.
 */
export function appendPrescriptionChange(
  history: readonly PrescriptionHistoryEntry[],
  previous: PrescribableMedicine,
  updated: PrescribableMedicine,
  recordedAt: string,
  createId: () => string,
): PrescriptionHistoryEntry[] {
  if (samePrescriptionDetails(previous, updated)) return [...history];

  const medicineEntries = history.filter((entry) => entry.medicineId === previous.id);
  const latest = sortPrescriptionHistory(medicineEntries)[0];
  const next = [...history];
  if (!latest) next.push(createPrescriptionHistoryEntry(previous, recordedAt, createId()));
  else if (!entryMatchesMedicine(latest, previous)) next.push(createPrescriptionHistoryEntry(previous, recordedAt, createId()));
  next.push(createPrescriptionHistoryEntry(updated, recordedAt, createId()));
  return next;
}

export function sortPrescriptionHistory(entries: readonly PrescriptionHistoryEntry[]): PrescriptionHistoryEntry[] {
  return entries
    .map((entry, index) => ({ entry, index, timestamp: new Date(entry.recordedAt).getTime() }))
    .sort((a, b) => {
      const aValid = Number.isFinite(a.timestamp);
      const bValid = Number.isFinite(b.timestamp);
      if (aValid && bValid && a.timestamp !== b.timestamp) return b.timestamp - a.timestamp;
      if (aValid !== bValid) return aValid ? -1 : 1;
      return b.index - a.index || b.entry.id.localeCompare(a.entry.id);
    })
    .map(({ entry }) => entry);
}
