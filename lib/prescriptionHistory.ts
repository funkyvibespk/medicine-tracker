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
  composition?: string;
}

export interface PrescriptionHistoryEntry {
  id: string;
  medicineId: string;
  recordedAt: string;
  prescriptionDate?: string;
  prescribingDoctor?: string;
  prescribingClinic?: string;
  prescriptionNotes?: string;
  composition?: string;
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
  doctorIdentity?: string;
  prescriptionDateFrom?: string;
  prescriptionDateTo?: string;
  medicine?: string;
  medicineId?: string;
  medicineEntryId?: string;
  medicineEntryIndex?: number;
}

export interface PrescriptionHistoryFilterOption {
  value: string;
  label: string;
  doctor?: string;
  doctorIdentity?: string;
  medicineId?: string;
  medicineEntryId?: string;
  medicineEntryIndex?: number;
}

export interface PrescriptionHistoryFilterOptions {
  doctors: PrescriptionHistoryFilterOption[];
  medicines: PrescriptionHistoryFilterOption[];
}

export interface PrescriptionHistoryGroup {
  /** Stable grouping key. Entries without a usable medicine ID get a unique key. */
  key: string;
  medicineId?: string;
  entries: PrescriptionHistoryEntry[];
}

export function createEmptyPrescriptionHistoryFilters(): PrescriptionHistoryFilters {
  return { doctor: "", doctorIdentity: undefined, prescriptionDateFrom: "", prescriptionDateTo: "", medicine: "", medicineId: undefined, medicineEntryId: undefined, medicineEntryIndex: undefined };
}

export function hasActivePrescriptionHistoryFilters(filters: PrescriptionHistoryFilters): boolean {
  return Boolean(filters.doctor?.trim() || filters.doctorIdentity || filters.prescriptionDateFrom || filters.prescriptionDateTo || filters.medicine?.trim() || filters.medicineId || filters.medicineEntryId || filters.medicineEntryIndex !== undefined);
}

export function validatePrescriptionHistoryFilters(filters: PrescriptionHistoryFilters): string | null {
  if (!hasActivePrescriptionHistoryFilters(filters)) {
    return "Choose a doctor, medicine, or prescription date before applying filters.";
  }
  const isValidDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  };
  if (filters.prescriptionDateFrom && !isValidDate(filters.prescriptionDateFrom)) return "Enter a valid start date.";
  if (filters.prescriptionDateTo && !isValidDate(filters.prescriptionDateTo)) return "Enter a valid end date.";
  if (filters.prescriptionDateFrom && filters.prescriptionDateTo && filters.prescriptionDateFrom > filters.prescriptionDateTo) {
    return "The start date must be on or before the end date.";
  }
  return null;
}

/** Builds account-local filter options from the full saved snapshot collection. */
export function buildPrescriptionHistoryFilterOptions(
  entries: readonly PrescriptionHistoryEntry[],
): PrescriptionHistoryFilterOptions {
  const orderedEntries = sortPrescriptionHistory(entries);
  const doctors = new Map<string, PrescriptionHistoryFilterOption>();
  const medicines = new Map<string, PrescriptionHistoryFilterOption>();

  orderedEntries.forEach((entry, index) => {
    const doctor = normalizeDoctorNameForSearch(entry.prescribingDoctor);
    if (doctor && !doctors.has(doctor)) {
      doctors.set(doctor, { value: doctor, label: normalizeDoctorName(entry.prescribingDoctor), doctor, doctorIdentity: doctor });
    }

    const medicineId = typeof entry.medicineId === "string" && entry.medicineId.trim()
      ? entry.medicineId
      : undefined;
    const value = medicineId ? `medicine:${medicineId}` : `snapshot:${index}:${entry.id}`;
    if (!medicines.has(value)) {
      const details = `${entry.medicineName} · ${entry.medicineType}${entry.strength ? ` · ${entry.strength}` : ""}`;
      medicines.set(value, medicineId
        ? { value, label: details, medicineId }
        : { value, label: `${details} · unlinked snapshot ${index + 1}`, medicineEntryId: entry.id, medicineEntryIndex: index });
    }
  });

  const medicineOptions = [...medicines.values()];
  const labelCounts = new Map<string, number>();
  for (const option of medicineOptions) labelCounts.set(option.label, (labelCounts.get(option.label) ?? 0) + 1);
  const duplicateLabelIndices = new Map<string, number>();
  for (const option of medicineOptions) {
    if ((labelCounts.get(option.label) ?? 0) > 1) {
      const index = (duplicateLabelIndices.get(option.label) ?? 0) + 1;
      duplicateLabelIndices.set(option.label, index);
      option.label = `${option.label} · record ${index}`;
    }
  }

  return {
    doctors: [...doctors.values()].sort((a, b) => a.label.localeCompare(b.label)),
    medicines: medicineOptions,
  };
}

export interface PrescriptionHistoryViewState {
  draftFilters: PrescriptionHistoryFilters;
  appliedFilters: PrescriptionHistoryFilters | null;
  showAll: boolean;
  validationMessage: string | null;
}

export type PrescriptionHistoryViewAction =
  | { type: "edit-filters"; updates: Partial<PrescriptionHistoryFilters> }
  | { type: "apply-filters" }
  | { type: "show-all" }
  | { type: "clear" };

export function createInitialPrescriptionHistoryViewState(): PrescriptionHistoryViewState {
  return { draftFilters: createEmptyPrescriptionHistoryFilters(), appliedFilters: null, showAll: false, validationMessage: null };
}

/** Pure UI-state transitions keep unapplied edits from presenting stale results. */
export function prescriptionHistoryViewReducer(
  state: PrescriptionHistoryViewState,
  action: PrescriptionHistoryViewAction,
): PrescriptionHistoryViewState {
  if (action.type === "edit-filters") {
    return {
      ...state,
      draftFilters: { ...state.draftFilters, ...action.updates },
      appliedFilters: null,
      showAll: false,
      validationMessage: null,
    };
  }
  if (action.type === "apply-filters") {
    const validationMessage = validatePrescriptionHistoryFilters(state.draftFilters);
    return validationMessage
      ? { ...state, appliedFilters: null, showAll: false, validationMessage }
      : { ...state, appliedFilters: { ...state.draftFilters }, showAll: false, validationMessage: null };
  }
  if (action.type === "show-all") {
    return { draftFilters: createEmptyPrescriptionHistoryFilters(), appliedFilters: null, showAll: true, validationMessage: null };
  }
  return createInitialPrescriptionHistoryViewState();
}

export type PrescriptionHistoryResultsMode = "hidden" | "filtered" | "all";

export interface PrescriptionHistoryResults {
  mode: PrescriptionHistoryResultsMode;
  entries: PrescriptionHistoryEntry[];
  totalCount: number;
  resultCount: number;
  countLabel: string;
}

export function getPrescriptionHistoryResults(
  entries: readonly PrescriptionHistoryEntry[],
  state: PrescriptionHistoryViewState,
): PrescriptionHistoryResults {
  const mode: PrescriptionHistoryResultsMode = state.showAll ? "all" : state.appliedFilters ? "filtered" : "hidden";
  const results = mode === "all"
    ? [...entries]
    : mode === "filtered"
      ? filterPrescriptionHistory(entries, state.appliedFilters!)
      : [];
  const countLabel = mode === "all"
    ? `Showing all ${entries.length} snapshot${entries.length === 1 ? "" : "s"}`
    : mode === "filtered"
      ? `${results.length} matching snapshot${results.length === 1 ? "" : "s"} of ${entries.length} total`
      : "Results hidden";
  return { mode, entries: results, totalCount: entries.length, resultCount: results.length, countLabel };
}

/** Groups snapshots only by their stored medicine ID; unlinked entries stay separate. */
export function groupPrescriptionHistoryByMedicine(
  entries: readonly PrescriptionHistoryEntry[],
): PrescriptionHistoryGroup[] {
  const groups = new Map<string, PrescriptionHistoryGroup>();
  entries.forEach((entry, index) => {
    const medicineId = typeof entry.medicineId === "string" && entry.medicineId.trim()
      ? entry.medicineId
      : undefined;
    const key = medicineId ? `medicine:${medicineId}` : `entry:${index}:${entry.id}`;
    const group = groups.get(key);
    if (group) group.entries.push(entry);
    else groups.set(key, { key, medicineId, entries: [entry] });
  });
  return [...groups.values()].map((group) => ({
    ...group,
    entries: sortPrescriptionHistory(group.entries),
  }));
}

/** Filters historical snapshots, never current medicine metadata or dose events. */
export function filterPrescriptionHistory(
  entries: readonly PrescriptionHistoryEntry[],
  filters: PrescriptionHistoryFilters,
): PrescriptionHistoryEntry[] {
  const doctorQuery = normalizeDoctorNameForSearch(filters.doctor);
  const medicineQuery = normalizedText(filters.medicine).toLowerCase();
  return entries.filter((entry, index) => {
    if (filters.doctorIdentity && normalizeDoctorNameForSearch(entry.prescribingDoctor) !== filters.doctorIdentity) return false;
    if (doctorQuery && !normalizeDoctorNameForSearch(entry.prescribingDoctor).includes(doctorQuery)) return false;
    if (medicineQuery && !entry.medicineName.toLowerCase().includes(medicineQuery)) return false;
    if (filters.medicineId && entry.medicineId !== filters.medicineId) return false;
    if (filters.medicineEntryId && entry.id !== filters.medicineEntryId) return false;
    if (filters.medicineEntryIndex !== undefined && index !== filters.medicineEntryIndex) return false;
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
    normalizedText(a.prescriptionNotes) === normalizedText(b.prescriptionNotes) &&
    normalizedText(a.composition) === normalizedText(b.composition);
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
    composition: normalizedText(medicine.composition) || undefined,
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
