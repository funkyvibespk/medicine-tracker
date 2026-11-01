"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from "react";
import {
  ACTIVE_DEMO_EMAIL_KEY,
  ACTIVE_DEMO_SESSION_KEY,
  loadDemoProfile,
  normalizeDemoEmail,
  saveDemoProfileForActiveSession,
} from "@/lib/demoProfiles";
import { DEMO_SESSION_CHANGE_EVENT, readDemoSession } from "@/lib/demoSession";
import { applySkippedDose, applyTakenDose, hasDependentMedicineHistory, inventoryUnitFor, sameDoseOccurrenceIdentity, validateInventoryThreshold, validateMedicineStrength, withDoseDetailsSnapshot } from "@/lib/medicineLogic";
import { findBlockingMedicineIdentityMatch } from "@/lib/medicineIdentity";
import { reconcileHistoricalMissedOccurrences } from "@/lib/missedDoses";
import { addScheduleBaseline, localDateString, medicineForTreatmentPeriod } from "@/lib/schedule";
import { applyMedicineUpdatePreservingCreationDate } from "@/lib/medicineList";
import { archiveMedicineForDeletion, createTreatmentPeriod, ensureCurrentTreatmentPeriod, treatmentPeriodForInstant } from "@/lib/treatmentPeriods";
import {
  appendPrescriptionChange,
  createPrescriptionHistoryEntry,
  type PrescriptionHistoryEntry,
} from "@/lib/prescriptionHistory";
import { deleteVitalReading as removeVitalReading, upsertVitalReading, validateVitalReading, type VitalReading } from "@/lib/vitalTrack";

export type MedicineType = "Tablet" | "Capsule" | "Syrup" | "Sachet" | "Injection";

export interface MedicineScheduleRevision {
  effectiveAt: string;
  /** Marks a hydration-only baseline whose earlier schedule history is unknown. */
  hydrationBaseline?: true;
  frequency: string;
  intervalHours?: number;
  scheduleTimes: string[];
  startDate: string;
  endDate?: string;
}

export type TreatmentPeriodStatus = "active" | "discontinued" | "completed";

export interface MedicineTreatmentPeriod {
  id: string;
  status: TreatmentPeriodStatus;
  startDate: string;
  endDate?: string;
  startedAt: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
  medicineName: string;
  medicineType: MedicineType;
  medicineStrength: string;
  doseAmount: number;
  doseUnit?: string;
  frequency: string;
  intervalHours?: number;
  scheduleTimes: string[];
  prescribingDoctor?: string;
  prescribingClinic?: string;
  prescriptionDate?: string;
  prescriptionNotes?: string;
  instructions?: string;
  scheduleRevisions: MedicineScheduleRevision[];
}

export interface MedicineEditHistoryEntry {
  id: string;
  medicineId: string;
  treatmentPeriodId?: string;
  recordedAt: string;
  changedFields: string[];
  previous: Partial<Medicine>;
  updated: Partial<Medicine>;
}

export interface InventoryTransaction {
  id: string;
  medicineId: string;
  medicineName?: string;
  treatmentPeriodId?: string;
  recordedAt: string;
  kind: "refill" | "adjustment" | "dose";
  quantityChange: number;
  unit: string;
  balanceAfter: number;
  previousBalance?: number;
  previousUnit?: string;
}

export interface Medicine {
  id: string;
  name: string;
  type: MedicineType;
  strength: string;
  doseAmount: number;
  frequency: string;
  intervalHours?: number;
  scheduleTimes: string[]; // ["08:00", "20:00"]
  startDate: string; // YYYY-MM-DD
  createdAt?: string; // creation timestamp for suppressing same-day doses before the medicine existed
  endDate?: string;
  updatedAt?: string;
  archivedAt?: string;
  /** Optional additive history. Missing history means the earlier schedule is unknown. */
  scheduleRevisions?: MedicineScheduleRevision[];
  treatmentPeriods?: MedicineTreatmentPeriod[];
  prescribingDoctor?: string;
  prescribingClinic?: string;
  prescriptionDate?: string;
  prescriptionNotes?: string;
  expiryDate?: string;
  composition?: string;
  instructions?: string;
  notes?: string;
  doseUnit?: string;
  
  // Inventory
  inventoryAmount: number;
  inventoryCapacity?: number; // total size for volume-based
  inventoryContainerCapacity?: number; // volume per container for new liquid stock
  inventoryUnit?: string;
  lowStockThreshold: number;
  lowStockThresholdUnit?: string;
}

export type DoseStatus = "upcoming" | "due" | "overdue" | "missed" | "skipped" | "taken_early" | "taken_on_time" | "taken_late";

export interface DoseRecord {
  id: string;
  medicineId: string;
  treatmentPeriodId?: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  /** Absolute instant for elapsed-interval schedules; absent on legacy and fixed-time records. */
  scheduledInstant?: string;
  actualTakenTime?: string; // ISO
  status: DoseStatus; // mostly used if taken, otherwise calculated dynamically
  isPrn?: boolean;
  medicineName?: string;
  medicineType?: MedicineType;
  medicineStrength?: string;
  medicineDoseAmount?: number;
  medicineDoseUnit?: string;
  medicinePrescribingDoctor?: string;
  inventoryRemainingAfterDose?: number;
  inventoryRemainingUnit?: string;
}

function sameDoseOccurrence(saved: DoseRecord, record: DoseRecord): boolean {
  return sameDoseOccurrenceIdentity(saved, record);
}

interface MedicineContextType {
  medicines: Medicine[];
  doseRecords: DoseRecord[];
  prescriptionHistory: PrescriptionHistoryEntry[];
  medicineEditHistory: MedicineEditHistoryEntry[];
  inventoryTransactions: InventoryTransaction[];
  vitalReadings: VitalReading[];
  vitalTrackDashboardEnabled: boolean;
  addMedicine: (med: Medicine, options?: { allowLikelyDuplicate?: boolean }) => AddMedicineResult;
  updateMedicine: (id: string, med: Partial<Medicine>) => MedicineUpdateResult;
  deleteMedicine: (id: string) => void;
  discontinueTreatment: (id: string) => boolean;
  restartTreatment: (id: string, med: Partial<Medicine>) => MedicineUpdateResult;
  recordTakenDose: (record: DoseRecord, doseAmount: number) => boolean;
  skipDoseOccurrence: (record: DoseRecord) => boolean;
  updateDoseRecord: (id: string, updates: Partial<DoseRecord>) => void;
  updateInventory: (medicineId: string, amount: number) => void;
  addStock: (medicineId: string, amount: number) => void;
  saveVitalReading: (reading: VitalReading) => boolean;
  deleteVitalReading: (id: string) => boolean;
  setVitalTrackDashboardEnabled: (enabled: boolean) => boolean;
  isHydrated: boolean;
  profileStatus: "loading" | "ready" | "error";
  profileError: string | null;
  retryProfileLoad: () => void;
  clearAll: () => void;
  activeProfileEmail: string | null;
  activateProfile: (email: string, options?: { migrateLegacy?: boolean }) => void;
  deactivateProfile: () => void;
}

export interface AddMedicineResult {
  added: boolean;
  duplicateMatch?: { medicine: Medicine; kind: "exact" | "likely" };
  validationError?: string;
}

export interface MedicineUpdateResult {
  saved: boolean;
  validationError?: string;
  duplicateMatch?: { medicine: Medicine; kind: "exact" | "likely" };
}

function createHistoryId(prefix: string) {
  const uuid = typeof globalThis.crypto?.randomUUID === "function" ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${uuid}`;
}

function updateTreatmentPeriodFromMedicine(period: MedicineTreatmentPeriod, medicine: Medicine, now: string): MedicineTreatmentPeriod {
  const scheduleWasChanged = period.frequency !== medicine.frequency || period.intervalHours !== medicine.intervalHours ||
    JSON.stringify(period.scheduleTimes) !== JSON.stringify(medicine.scheduleTimes) || period.startDate !== medicine.startDate || period.endDate !== medicine.endDate;
  const revisions = [...period.scheduleRevisions];
  if (scheduleWasChanged) revisions.push({
    effectiveAt: now,
    frequency: medicine.frequency,
    intervalHours: medicine.intervalHours,
    scheduleTimes: [...medicine.scheduleTimes],
    startDate: medicine.startDate,
    endDate: medicine.endDate,
  });
  return {
    ...period,
    medicineName: medicine.name,
    medicineType: medicine.type,
    medicineStrength: medicine.strength,
    doseAmount: medicine.doseAmount,
    doseUnit: medicine.doseUnit,
    frequency: medicine.frequency,
    intervalHours: medicine.intervalHours,
    scheduleTimes: [...medicine.scheduleTimes],
    prescribingDoctor: medicine.prescribingDoctor,
    prescribingClinic: medicine.prescribingClinic,
    prescriptionDate: medicine.prescriptionDate,
    prescriptionNotes: medicine.prescriptionNotes,
    instructions: medicine.instructions,
    startDate: medicine.startDate,
    endDate: medicine.endDate,
    scheduleRevisions: revisions,
    updatedAt: now,
  };
}

const MedicineContext = createContext<MedicineContextType | undefined>(undefined);

export function MedicineProvider({ children }: { children: ReactNode }) {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [doseRecords, setDoseRecords] = useState<DoseRecord[]>([]);
  const [prescriptionHistory, setPrescriptionHistory] = useState<PrescriptionHistoryEntry[]>([]);
  const [medicineEditHistory, setMedicineEditHistory] = useState<MedicineEditHistoryEntry[]>([]);
  const [inventoryTransactions, setInventoryTransactions] = useState<InventoryTransaction[]>([]);
  const [vitalReadings, setVitalReadings] = useState<VitalReading[]>([]);
  const [vitalTrackDashboardEnabled, setVitalTrackDashboardEnabledState] = useState(false);
  const vitalReadingsRef = useRef<VitalReading[]>([]);
  const medicinesRef = useRef<Medicine[]>([]);
  const doseRecordsRef = useRef<DoseRecord[]>([]);
  const prescriptionHistoryRef = useRef<PrescriptionHistoryEntry[]>([]);
  const medicineEditHistoryRef = useRef<MedicineEditHistoryEntry[]>([]);
  const inventoryTransactionsRef = useRef<InventoryTransaction[]>([]);
  const [profileStatus, setProfileStatus] = useState<"loading" | "ready" | "error">("loading");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [activeProfileEmail, setActiveProfileEmail] = useState<string | null>(null);
  const activeProfileEmailRef = useRef<string | null>(null);
  const profileStatusRef = useRef<"loading" | "ready" | "error">("loading");
  const loadGenerationRef = useRef(0);

  const setProfileState = useCallback((status: "loading" | "ready" | "error", error: string | null = null) => {
    profileStatusRef.current = status;
    setProfileStatus(status);
    setProfileError(error);
  }, []);

  const clearProfileState = useCallback((status: "loading" | "ready" | "error") => {
    medicinesRef.current = [];
    doseRecordsRef.current = [];
    prescriptionHistoryRef.current = [];
    medicineEditHistoryRef.current = [];
    inventoryTransactionsRef.current = [];
    vitalReadingsRef.current = [];
    activeProfileEmailRef.current = null;
    setMedicines([]);
    setDoseRecords([]);
    setPrescriptionHistory([]);
    setMedicineEditHistory([]);
    setInventoryTransactions([]);
    setVitalReadings([]);
    setVitalTrackDashboardEnabledState(false);
    setActiveProfileEmail(null);
    setProfileState(status);
  }, [setProfileState]);

  const loadSessionProfile = useCallback(() => {
    const generation = ++loadGenerationRef.current;
    const session = readDemoSession();
    if (!session) {
      clearProfileState("ready");
      return;
    }

    if (session.email === activeProfileEmailRef.current && profileStatusRef.current === "ready") return;
    clearProfileState("loading");
    try {
      const profile = loadDemoProfile(localStorage, session.email, { migrateLegacy: false });
      if (generation !== loadGenerationRef.current || readDemoSession()?.email !== session.email) return;
      medicinesRef.current = addScheduleBaseline((profile.medicines as Medicine[]).map((medicine) => ensureCurrentTreatmentPeriod(medicine)));
      doseRecordsRef.current = profile.doseRecords as DoseRecord[];
      prescriptionHistoryRef.current = profile.prescriptionHistory ?? [];
      medicineEditHistoryRef.current = (profile.medicineEditHistory ?? []) as MedicineEditHistoryEntry[];
      inventoryTransactionsRef.current = (profile.inventoryTransactions ?? []) as InventoryTransaction[];
      vitalReadingsRef.current = profile.vitalReadings ?? [];
      activeProfileEmailRef.current = session.email;
      setMedicines(medicinesRef.current);
      setDoseRecords(doseRecordsRef.current);
      setPrescriptionHistory(prescriptionHistoryRef.current);
      setMedicineEditHistory(medicineEditHistoryRef.current);
      setInventoryTransactions(inventoryTransactionsRef.current);
      setVitalReadings(vitalReadingsRef.current);
      setVitalTrackDashboardEnabledState(profile.vitalTrackDashboardEnabled ?? false);
      setActiveProfileEmail(session.email);
      setProfileState("ready");
    } catch (error) {
      if (generation !== loadGenerationRef.current) return;
      clearProfileState("error");
      activeProfileEmailRef.current = session.email;
      setActiveProfileEmail(session.email);
      setProfileError(error instanceof Error ? error.message : "This local profile could not be loaded safely.");
    }
  }, [clearProfileState, setProfileState]);

  const canMutateActiveProfile = () => {
    const email = activeProfileEmailRef.current;
    return profileStatusRef.current === "ready" && Boolean(email) && readDemoSession()?.email === email;
  };

  const activateProfile = (emailInput: string, options?: { migrateLegacy?: boolean }) => {
    const email = normalizeDemoEmail(emailInput);
    const generation = ++loadGenerationRef.current;
    clearProfileState("loading");
    try {
      const profile = loadDemoProfile(localStorage, email, options);
      if (generation !== loadGenerationRef.current) return;
      medicinesRef.current = addScheduleBaseline((profile.medicines as Medicine[]).map((medicine) => ensureCurrentTreatmentPeriod(medicine)));
      doseRecordsRef.current = profile.doseRecords as DoseRecord[];
      prescriptionHistoryRef.current = profile.prescriptionHistory ?? [];
      medicineEditHistoryRef.current = (profile.medicineEditHistory ?? []) as MedicineEditHistoryEntry[];
      inventoryTransactionsRef.current = (profile.inventoryTransactions ?? []) as InventoryTransaction[];
      vitalReadingsRef.current = profile.vitalReadings ?? [];
      activeProfileEmailRef.current = email;
      setMedicines(medicinesRef.current);
      setDoseRecords(doseRecordsRef.current);
      setPrescriptionHistory(prescriptionHistoryRef.current);
      setMedicineEditHistory(medicineEditHistoryRef.current);
      setInventoryTransactions(inventoryTransactionsRef.current);
      setVitalReadings(vitalReadingsRef.current);
      setVitalTrackDashboardEnabledState(profile.vitalTrackDashboardEnabled ?? false);
      setActiveProfileEmail(email);
      setProfileState("ready");
    } catch (error) {
      if (generation === loadGenerationRef.current) {
        clearProfileState("error");
        activeProfileEmailRef.current = email;
        setActiveProfileEmail(email);
        setProfileError(error instanceof Error ? error.message : "This local profile could not be loaded safely.");
      }
      throw error;
    }
  };

  const deactivateProfile = () => {
    loadGenerationRef.current += 1;
    clearProfileState("ready");
  };

  useEffect(() => {
    queueMicrotask(loadSessionProfile);
    const onSessionStorage = (event: StorageEvent) => {
      if (event.key === ACTIVE_DEMO_SESSION_KEY || event.key === ACTIVE_DEMO_EMAIL_KEY || event.key === null) loadSessionProfile();
    };
    window.addEventListener(DEMO_SESSION_CHANGE_EVENT, loadSessionProfile);
    window.addEventListener("storage", onSessionStorage);
    window.addEventListener("pageshow", loadSessionProfile);
    return () => {
      window.removeEventListener(DEMO_SESSION_CHANGE_EVENT, loadSessionProfile);
      window.removeEventListener("storage", onSessionStorage);
      window.removeEventListener("pageshow", loadSessionProfile);
    };
  }, [loadSessionProfile]);

  useEffect(() => {
    if (profileStatus !== "ready" || !activeProfileEmail) return;
    try {
      saveDemoProfileForActiveSession(localStorage, { email: activeProfileEmail, medicines, doseRecords, prescriptionHistory, medicineEditHistory, inventoryTransactions, vitalReadings, vitalTrackDashboardEnabled });
    } catch (error) {
      // This state update reports a failed write to the external storage system.
      const message = error instanceof Error ? error.message : "Changes could not be saved to this local profile.";
      queueMicrotask(() => setProfileState("error", message));
    }
  }, [medicines, doseRecords, prescriptionHistory, medicineEditHistory, inventoryTransactions, vitalReadings, vitalTrackDashboardEnabled, profileStatus, activeProfileEmail, setProfileState]);

  useEffect(() => {
    if (profileStatus !== "ready" || !activeProfileEmail) return;

    let scannedLocalDate: string | null = null;
    const reconcileMissed = () => {
      const now = new Date();
      const today = localDateString(now);
      const fromDate = scannedLocalDate === today
        ? (() => {
            const previousDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            return localDateString(previousDay);
          })()
        : undefined;
      const reconciled = reconcileHistoricalMissedOccurrences(
        medicinesRef.current,
        doseRecordsRef.current,
        now,
        fromDate,
      );
      scannedLocalDate = today;
      if (reconciled !== doseRecordsRef.current) {
        doseRecordsRef.current = reconciled;
        setDoseRecords(reconciled);
      }
    };

    reconcileMissed();
    const timer = setInterval(reconcileMissed, 60000);
    return () => clearInterval(timer);
  }, [profileStatus, activeProfileEmail]);

  const addMedicine = (med: Medicine, options?: { allowLikelyDuplicate?: boolean }): AddMedicineResult => {
    if (!canMutateActiveProfile()) return { added: false, validationError: "The active local profile is not ready. Reload it before making changes." };
    const strengthError = validateMedicineStrength(med.strength);
    if (strengthError) return { added: false, validationError: strengthError };
    const quantityValidation = validateInventoryThreshold(med.inventoryAmount, med.lowStockThreshold);
    if (!quantityValidation.valid) {
      return { added: false, validationError: quantityValidation.inventoryAmountError ?? quantityValidation.lowStockThresholdError };
    }
    const duplicateMatch = findBlockingMedicineIdentityMatch(med, medicinesRef.current, options?.allowLikelyDuplicate);
    if (duplicateMatch) return { added: false, duplicateMatch };
    const createdAt = med.createdAt ?? new Date().toISOString();
    const period = createTreatmentPeriod({ ...med, createdAt }, new Date(createdAt));
    const medicine = {
      ...med,
      createdAt,
      updatedAt: med.updatedAt ?? createdAt,
      treatmentPeriods: med.treatmentPeriods?.length ? med.treatmentPeriods : [period],
      scheduleRevisions: med.scheduleRevisions?.length ? med.scheduleRevisions : [{
        effectiveAt: createdAt,
        frequency: med.frequency,
        intervalHours: med.intervalHours,
        scheduleTimes: [...med.scheduleTimes],
        startDate: med.startDate,
        endDate: med.endDate,
      }],
    };
    const prescriptionEntry = createPrescriptionHistoryEntry(medicine, new Date().toISOString(), createPrescriptionHistoryId(), medicine.treatmentPeriods.find((item) => item.status === "active")?.id ?? period.id, "added");
    prescriptionHistoryRef.current = [...prescriptionHistoryRef.current, prescriptionEntry];
    setPrescriptionHistory(prescriptionHistoryRef.current);
    medicinesRef.current = [...medicinesRef.current, medicine];
    setMedicines(medicinesRef.current);
    return { added: true };
  };

  const updateMedicine = (id: string, updates: Partial<Medicine>) => {
    if (!canMutateActiveProfile()) return { saved: false, validationError: "The active local profile is not ready. Reload it before making changes." };
    const existing = medicinesRef.current.find((medicine) => medicine.id === id);
    if (!existing) return { saved: false, validationError: "This medicine could not be found." };
    const now = new Date();
    const recordedAt = now.toISOString();
    const safeUpdates: Partial<Medicine> = { ...updates, id: existing.id, createdAt: existing.createdAt, updatedAt: recordedAt };
    const strengthError = validateMedicineStrength(safeUpdates.strength ?? existing.strength);
    if (strengthError) return { saved: false, validationError: strengthError };
    const quantityValidation = validateInventoryThreshold(
      safeUpdates.inventoryAmount ?? existing.inventoryAmount,
      safeUpdates.lowStockThreshold ?? existing.lowStockThreshold,
    );
    if (!quantityValidation.valid) {
      return { saved: false, validationError: quantityValidation.inventoryAmountError ?? quantityValidation.lowStockThresholdError };
    }
    const duplicateMatch = findBlockingMedicineIdentityMatch({ ...existing, ...safeUpdates }, medicinesRef.current);
    if (duplicateMatch) return { saved: false, duplicateMatch };
    const updatedPrescription = { ...existing, ...safeUpdates };
    const activePeriod = existing.treatmentPeriods?.find((period) => period.status === "active" && (!period.endDate || period.endDate >= localDateString(now)));
    const updatedPrescriptionHistory = appendPrescriptionChange(
      prescriptionHistoryRef.current,
      existing,
      updatedPrescription,
      recordedAt,
      createPrescriptionHistoryId,
      activePeriod?.id,
    );
    const changedFields = Object.keys(updates).filter((key) => !["id", "createdAt", "updatedAt"].includes(key) && JSON.stringify((existing as unknown as Record<string, unknown>)[key]) !== JSON.stringify((updatedPrescription as unknown as Record<string, unknown>)[key]));
    if (changedFields.length) {
      medicineEditHistoryRef.current = [...medicineEditHistoryRef.current, {
        id: createHistoryId("medicine-edit"), medicineId: existing.id, treatmentPeriodId: activePeriod?.id,
        recordedAt, changedFields, previous: { ...existing }, updated: { ...updatedPrescription },
      }];
      setMedicineEditHistory(medicineEditHistoryRef.current);
    }
    if (updatedPrescriptionHistory.length !== prescriptionHistoryRef.current.length) {
      prescriptionHistoryRef.current = updatedPrescriptionHistory;
      setPrescriptionHistory(updatedPrescriptionHistory);
    }
    if ((safeUpdates.inventoryAmount !== undefined && safeUpdates.inventoryAmount !== existing.inventoryAmount) ||
      (safeUpdates.inventoryUnit !== undefined && safeUpdates.inventoryUnit !== existing.inventoryUnit)) {
      const inventoryAmountAfter = safeUpdates.inventoryAmount ?? existing.inventoryAmount;
      const sameUnit = (existing.inventoryUnit ?? inventoryUnitFor(existing)).toLowerCase() === (safeUpdates.inventoryUnit ?? existing.inventoryUnit ?? inventoryUnitFor(existing)).toLowerCase();
      inventoryTransactionsRef.current = [...inventoryTransactionsRef.current, {
        id: createHistoryId("inventory-adjustment"), medicineId: id, medicineName: existing.name, treatmentPeriodId: activePeriod?.id,
        recordedAt, kind: "adjustment",
        quantityChange: sameUnit ? inventoryAmountAfter - existing.inventoryAmount : inventoryAmountAfter,
        unit: safeUpdates.inventoryUnit ?? existing.inventoryUnit ?? inventoryUnitFor(existing),
        balanceAfter: inventoryAmountAfter,
        previousBalance: existing.inventoryAmount,
        previousUnit: existing.inventoryUnit ?? inventoryUnitFor(existing),
      }];
      setInventoryTransactions(inventoryTransactionsRef.current);
    }
    if (scheduleChanged(existing, safeUpdates)) {
      const reconciled = reconcileHistoricalMissedOccurrences(medicinesRef.current, doseRecordsRef.current, now);
      if (reconciled !== doseRecordsRef.current) {
        doseRecordsRef.current = reconciled;
        setDoseRecords(reconciled);
      }
    }
    medicinesRef.current = medicinesRef.current.map((medicine) => {
      if (medicine.id !== id) return medicine;
      const updated = applyMedicineUpdatePreservingCreationDate(medicine, safeUpdates);
      const withPeriod = activePeriod
        ? { ...updated, treatmentPeriods: (updated.treatmentPeriods ?? []).map((period) => period.id === activePeriod.id ? updateTreatmentPeriodFromMedicine(period, updated, recordedAt) : period) }
        : updated;
      if (!scheduleChanged(existing, safeUpdates)) return withPeriod;
      return {
        ...withPeriod,
        scheduleRevisions: [...(existing.scheduleRevisions ?? []), {
          effectiveAt: recordedAt,
          frequency: withPeriod.frequency,
          intervalHours: withPeriod.intervalHours,
          scheduleTimes: [...withPeriod.scheduleTimes],
          startDate: withPeriod.startDate,
          endDate: withPeriod.endDate,
        }],
      };
    });
    setMedicines(medicinesRef.current);
    return { saved: true };
  };

  const deleteMedicine = (id: string) => {
    if (!canMutateActiveProfile()) return;
    const medicine = medicinesRef.current.find((item) => item.id === id);
    if (!medicine || medicine.archivedAt) return;
    const hasHistory = hasDependentMedicineHistory(medicine, {
      doseRecords: doseRecordsRef.current,
      prescriptionHistory: prescriptionHistoryRef.current,
      medicineEditHistory: medicineEditHistoryRef.current,
      inventoryTransactions: inventoryTransactionsRef.current,
    });
    if (hasHistory) {
      const now = new Date();
      const recordedAt = now.toISOString();
      const archived = archiveMedicineForDeletion(medicine, recordedAt, localDateString(now));
      prescriptionHistoryRef.current = [...prescriptionHistoryRef.current, createPrescriptionHistoryEntry(
        archived,
        recordedAt,
        createPrescriptionHistoryId(),
        medicine.treatmentPeriods?.find((period) => period.status === "active")?.id,
        "archived",
      )];
      setPrescriptionHistory(prescriptionHistoryRef.current);
      medicineEditHistoryRef.current = [...medicineEditHistoryRef.current, {
        id: createHistoryId("medicine-edit"), medicineId: id,
        treatmentPeriodId: medicine.treatmentPeriods?.find((period) => period.status === "active")?.id,
        recordedAt, changedFields: ["archivedAt", "treatmentStatus"],
        previous: { ...medicine }, updated: { ...archived },
      }];
      setMedicineEditHistory(medicineEditHistoryRef.current);
      medicinesRef.current = medicinesRef.current.map((item) => item.id === id ? archived : item);
    } else {
      const recordedAt = new Date().toISOString();
      prescriptionHistoryRef.current = [...prescriptionHistoryRef.current, createPrescriptionHistoryEntry(
        medicine,
        recordedAt,
        createPrescriptionHistoryId(),
        undefined,
        "deleted",
      )];
      setPrescriptionHistory(prescriptionHistoryRef.current);
      medicinesRef.current = medicinesRef.current.filter((item) => item.id !== id);
    }
    setMedicines(medicinesRef.current);
  };

  const discontinueTreatment = (id: string) => {
    if (!canMutateActiveProfile()) return false;
    const existing = medicinesRef.current.find((medicine) => medicine.id === id);
    if (!existing) return false;
    const now = new Date();
    const recordedAt = now.toISOString();
    const activePeriod = existing.treatmentPeriods?.find((period) => period.status === "active" && (!period.endDate || period.endDate >= localDateString()));
    if (!activePeriod) return false;
    const nextMedicine: Medicine = {
      ...existing,
      endDate: localDateString(now),
      updatedAt: recordedAt,
      treatmentPeriods: existing.treatmentPeriods!.map((period) => period.id === activePeriod.id
        ? { ...period, status: "discontinued", endDate: localDateString(now), endedAt: recordedAt, updatedAt: recordedAt }
        : period),
    };
    const history = appendPrescriptionChange(prescriptionHistoryRef.current, existing, nextMedicine, recordedAt, createPrescriptionHistoryId, activePeriod.id, "discontinued");
    if (history.length !== prescriptionHistoryRef.current.length) {
      prescriptionHistoryRef.current = history;
      setPrescriptionHistory(history);
    }
    medicineEditHistoryRef.current = [...medicineEditHistoryRef.current, {
      id: createHistoryId("medicine-edit"), medicineId: id, treatmentPeriodId: activePeriod.id, recordedAt,
      changedFields: ["treatmentStatus", "endDate"], previous: { ...existing }, updated: { ...nextMedicine },
    }];
    setMedicineEditHistory(medicineEditHistoryRef.current);
    medicinesRef.current = medicinesRef.current.map((medicine) => medicine.id === id ? nextMedicine : medicine);
    setMedicines(medicinesRef.current);
    return true;
  };

  const restartTreatment = (id: string, updates: Partial<Medicine>) => {
    if (!canMutateActiveProfile()) return { saved: false, validationError: "The active local profile is not ready. Reload it before making changes." };
    const existing = medicinesRef.current.find((medicine) => medicine.id === id);
    if (!existing) return { saved: false, validationError: "This medicine could not be found. No changes were saved." };
    const today = localDateString();
    if (existing.treatmentPeriods?.some((period) => period.status === "active" && (!period.endDate || period.endDate >= today))) return { saved: false, validationError: "This medicine already has an active treatment period." };
    const candidate = { ...existing, ...updates, id: existing.id };
    const strengthError = validateMedicineStrength(candidate.strength);
    if (strengthError) return { saved: false, validationError: strengthError };
    const duplicateMatch = findBlockingMedicineIdentityMatch(candidate, medicinesRef.current);
    if (duplicateMatch) return { saved: false, duplicateMatch };
    if (candidate.name !== existing.name || candidate.type !== existing.type || candidate.strength !== existing.strength) {
      return { saved: false, validationError: "Restarting must use this medicine identity. Correct its name, form, or strength separately before restarting." };
    }
    const quantityValidation = validateInventoryThreshold(candidate.inventoryAmount, candidate.lowStockThreshold);
    if (!quantityValidation.valid) return { saved: false, validationError: quantityValidation.inventoryAmountError ?? quantityValidation.lowStockThresholdError };
    const now = new Date();
    const recordedAt = now.toISOString();
    const medicineForPeriod: Medicine = { ...candidate, endDate: updates.endDate, updatedAt: recordedAt, archivedAt: undefined };
    const period = createTreatmentPeriod(medicineForPeriod, now);
    const nextMedicine: Medicine = {
      ...medicineForPeriod,
      startDate: period.startDate,
      endDate: period.endDate,
      treatmentPeriods: [
        ...(existing.treatmentPeriods ?? []).map((previousPeriod) => previousPeriod.status === "active" && previousPeriod.endDate && previousPeriod.endDate < today
          ? { ...previousPeriod, status: "completed" as const, endedAt: `${previousPeriod.endDate}T23:59:59.999`, updatedAt: recordedAt }
          : previousPeriod),
        period,
      ],
    };
    if (candidate.inventoryAmount !== existing.inventoryAmount || candidate.inventoryUnit !== existing.inventoryUnit) {
      const sameUnit = inventoryUnitFor(existing).trim().toLowerCase() === inventoryUnitFor(candidate).trim().toLowerCase();
      inventoryTransactionsRef.current = [...inventoryTransactionsRef.current, {
        id: createHistoryId("inventory-adjustment"), medicineId: id, medicineName: existing.name, treatmentPeriodId: period.id,
        recordedAt, kind: "adjustment", quantityChange: sameUnit ? candidate.inventoryAmount - existing.inventoryAmount : candidate.inventoryAmount,
        unit: inventoryUnitFor(candidate), balanceAfter: candidate.inventoryAmount,
        previousBalance: existing.inventoryAmount, previousUnit: inventoryUnitFor(existing),
      }];
      setInventoryTransactions(inventoryTransactionsRef.current);
    }
    const history = [...prescriptionHistoryRef.current, createPrescriptionHistoryEntry(nextMedicine, recordedAt, createPrescriptionHistoryId(), period.id, "restarted")];
    prescriptionHistoryRef.current = history;
    setPrescriptionHistory(history);
    medicineEditHistoryRef.current = [...medicineEditHistoryRef.current, {
      id: createHistoryId("medicine-edit"), medicineId: id, treatmentPeriodId: period.id, recordedAt,
      changedFields: ["treatmentPeriod"], previous: { ...existing }, updated: { ...nextMedicine },
    }];
    setMedicineEditHistory(medicineEditHistoryRef.current);
    medicinesRef.current = medicinesRef.current.map((medicine) => medicine.id === id ? nextMedicine : medicine);
    setMedicines(medicinesRef.current);
    return { saved: true };
  };

  const recordTakenDose = (record: DoseRecord, doseAmount: number) => {
    if (!canMutateActiveProfile()) return false;
    const medicine = medicinesRef.current.find((item) => item.id === record.medicineId);
    if (!medicine || medicine.archivedAt) return false;
    const existingRecord = doseRecordsRef.current.find((saved) => sameDoseOccurrence(saved, record));
    const occurrenceAt = record.scheduledInstant ? new Date(record.scheduledInstant) : new Date(`${record.scheduledDate}T${record.scheduledTime}`);
    const period = record.treatmentPeriodId
      ? medicine.treatmentPeriods?.find((item) => item.id === record.treatmentPeriodId)
      : existingRecord?.treatmentPeriodId
        ? medicine.treatmentPeriods?.find((item) => item.id === existingRecord.treatmentPeriodId)
        : existingRecord ? undefined : treatmentPeriodForInstant(medicine, occurrenceAt);
    const periodMedicine = period ? medicineForTreatmentPeriod(medicine, period) : medicine;
    const periodId = record.treatmentPeriodId ?? existingRecord?.treatmentPeriodId ?? (existingRecord ? undefined : period?.id);
    const recordWithPeriod = { ...record, treatmentPeriodId: periodId };
    const recordWithSnapshot = period
      ? withDoseDetailsSnapshot(recordWithPeriod, { ...periodMedicine, doseAmount }, existingRecord, { snapshotCurrentDoctor: true })
      : existingRecord ? recordWithPeriod : recordWithPeriod;
    const enrichedRecord: DoseRecord = {
      ...recordWithSnapshot,
      medicineName: record.medicineName ?? existingRecord?.medicineName ?? (period ? periodMedicine.name : undefined),
      medicineType: record.medicineType ?? existingRecord?.medicineType ?? (period ? periodMedicine.type : undefined),
      medicineStrength: record.medicineStrength ?? existingRecord?.medicineStrength ?? (period ? periodMedicine.strength : undefined),
    };
    const result = applyTakenDose(medicinesRef.current, doseRecordsRef.current, enrichedRecord, doseAmount);
    if (!result.accepted) return false;
    medicinesRef.current = result.medicines;
    doseRecordsRef.current = result.doseRecords;
    const savedRecord = doseRecordsRef.current.find((item) => sameDoseOccurrence(item, enrichedRecord));
    if (savedRecord?.inventoryRemainingAfterDose !== undefined) {
      inventoryTransactionsRef.current = [...inventoryTransactionsRef.current, {
        id: createHistoryId("inventory-dose"), medicineId: medicine.id, medicineName: savedRecord.medicineName ?? medicine.name, treatmentPeriodId: savedRecord.treatmentPeriodId,
        recordedAt: savedRecord.actualTakenTime ?? new Date().toISOString(), kind: "dose", quantityChange: -doseAmount,
        unit: savedRecord.inventoryRemainingUnit ?? inventoryUnitFor(medicine), balanceAfter: savedRecord.inventoryRemainingAfterDose,
        previousBalance: medicine.inventoryAmount,
        previousUnit: savedRecord.inventoryRemainingUnit ?? inventoryUnitFor(medicine),
      }];
      setInventoryTransactions(inventoryTransactionsRef.current);
    }
    setMedicines(medicinesRef.current);
    setDoseRecords(doseRecordsRef.current);
    return true;
  };

  const skipDoseOccurrence = (record: DoseRecord) => {
    if (!canMutateActiveProfile()) return false;
    if (record.status !== "overdue" && record.status !== "missed") return false;
    const medicine = medicinesRef.current.find((item) => item.id === record.medicineId);
    if (!medicine || medicine.archivedAt) return false;
    const existingRecord = doseRecordsRef.current.find((saved) => sameDoseOccurrence(saved, record));
    const period = medicine && record.treatmentPeriodId ? medicine.treatmentPeriods?.find((item) => item.id === record.treatmentPeriodId) : undefined;
    const periodMedicine = medicine && period ? medicineForTreatmentPeriod(medicine, period) : medicine;
    const recordWithSnapshot = period ? withDoseDetailsSnapshot(record, periodMedicine!, existingRecord) : record;
    const enrichedRecord: DoseRecord = {
      ...recordWithSnapshot,
      medicineName: record.medicineName ?? existingRecord?.medicineName ?? (period ? periodMedicine?.name : undefined),
      medicineType: record.medicineType ?? existingRecord?.medicineType ?? (period ? periodMedicine?.type : undefined),
      medicineStrength: record.medicineStrength ?? existingRecord?.medicineStrength ?? (period ? periodMedicine?.strength : undefined),
      status: "skipped",
    };
    const nextRecords = applySkippedDose(doseRecordsRef.current, enrichedRecord);
    if (!nextRecords.accepted) return false;
    doseRecordsRef.current = nextRecords.doseRecords;
    setDoseRecords(doseRecordsRef.current);
    return true;
  };

  const updateDoseRecord = (id: string, updates: Partial<DoseRecord>) => {
    if (!canMutateActiveProfile()) return;
    doseRecordsRef.current = doseRecordsRef.current.map((d) => (d.id === id ? { ...d, ...updates } : d));
    setDoseRecords(doseRecordsRef.current);
  };

  const updateInventory = (medicineId: string, amount: number) => {
    if (!canMutateActiveProfile() || !Number.isFinite(amount) || amount < 0) return;
    const existing = medicinesRef.current.find((medicine) => medicine.id === medicineId);
    if (!existing || existing.archivedAt) return;
    const nextAmount = amount;
    const activePeriod = existing.treatmentPeriods?.find((period) => period.status === "active" && (!period.endDate || period.endDate >= localDateString()));
    medicinesRef.current = medicinesRef.current.map((m) => m.id === medicineId
      ? { ...m, inventoryAmount: nextAmount }
      : m);
    inventoryTransactionsRef.current = [...inventoryTransactionsRef.current, {
      id: createHistoryId("inventory-adjustment"), medicineId, medicineName: existing.name, treatmentPeriodId: activePeriod?.id,
      recordedAt: new Date().toISOString(), kind: "adjustment", quantityChange: nextAmount - existing.inventoryAmount,
      unit: inventoryUnitFor(existing), balanceAfter: nextAmount,
      previousBalance: existing.inventoryAmount, previousUnit: inventoryUnitFor(existing),
    }];
    setInventoryTransactions(inventoryTransactionsRef.current);
    setMedicines(medicinesRef.current);
  };

  const addStock = (medicineId: string, amountToAdd: number) => {
    if (!canMutateActiveProfile() || !Number.isFinite(amountToAdd) || amountToAdd <= 0) return;
    const existing = medicinesRef.current.find((medicine) => medicine.id === medicineId);
    if (!existing || existing.archivedAt) return;
    const balanceAfter = existing.inventoryAmount + amountToAdd;
    const activePeriod = existing.treatmentPeriods?.find((period) => period.status === "active");
    medicinesRef.current = medicinesRef.current.map((m) => m.id === medicineId
      ? { ...m, inventoryAmount: balanceAfter }
      : m);
    inventoryTransactionsRef.current = [...inventoryTransactionsRef.current, {
      id: createHistoryId("inventory-refill"), medicineId, medicineName: existing.name, treatmentPeriodId: activePeriod?.id,
      recordedAt: new Date().toISOString(), kind: "refill", quantityChange: amountToAdd,
      unit: inventoryUnitFor(existing), balanceAfter,
      previousBalance: existing.inventoryAmount, previousUnit: inventoryUnitFor(existing),
    }];
    setInventoryTransactions(inventoryTransactionsRef.current);
    setMedicines(medicinesRef.current);
  };

  const saveVitalReading = (reading: VitalReading) => {
    if (!canMutateActiveProfile() || validateVitalReading(reading)) return false;
    vitalReadingsRef.current = upsertVitalReading(vitalReadingsRef.current, reading);
    setVitalReadings(vitalReadingsRef.current);
    return true;
  };

  const deleteVitalReading = (id: string) => {
    if (!canMutateActiveProfile() || !vitalReadingsRef.current.some((reading) => reading.id === id)) return false;
    vitalReadingsRef.current = removeVitalReading(vitalReadingsRef.current, id);
    setVitalReadings(vitalReadingsRef.current);
    return true;
  };

  const setVitalTrackDashboardEnabled = (enabled: boolean) => {
    if (!canMutateActiveProfile()) return false;
    setVitalTrackDashboardEnabledState(enabled);
    return true;
  };

  const clearAll = () => {
    if (!canMutateActiveProfile()) return;
    medicinesRef.current = [];
    doseRecordsRef.current = [];
    prescriptionHistoryRef.current = [];
    medicineEditHistoryRef.current = [];
    inventoryTransactionsRef.current = [];
    vitalReadingsRef.current = [];
    setMedicines([]);
    setDoseRecords([]);
    setPrescriptionHistory([]);
    setMedicineEditHistory([]);
    setInventoryTransactions([]);
    setVitalReadings(vitalReadingsRef.current);
    setVitalTrackDashboardEnabledState(false);
  };

  return (
    <MedicineContext.Provider
      value={{
        medicines,
        doseRecords,
        prescriptionHistory,
        medicineEditHistory,
        inventoryTransactions,
        vitalReadings,
        vitalTrackDashboardEnabled,
        addMedicine,
        updateMedicine,
        deleteMedicine,
        recordTakenDose,
        skipDoseOccurrence,
        updateDoseRecord,
        updateInventory,
        addStock,
        discontinueTreatment,
        restartTreatment,
        saveVitalReading,
        deleteVitalReading,
        setVitalTrackDashboardEnabled,
        isHydrated: profileStatus === "ready",
        profileStatus,
        profileError,
        retryProfileLoad: loadSessionProfile,
        clearAll,
        activeProfileEmail,
        activateProfile,
        deactivateProfile,
      }}
    >
      {children}
    </MedicineContext.Provider>
  );
}

function createPrescriptionHistoryId() {
  const uuid = typeof globalThis.crypto?.randomUUID === "function" ? globalThis.crypto.randomUUID() : null;
  if (uuid) return `prescription-${uuid}`;
  return `prescription-${Date.now()}-${++prescriptionIdFallbackCounter}`;
}

let prescriptionIdFallbackCounter = 0;

function scheduleChanged(medicine: Medicine, updates: Partial<Medicine>) {
  return (updates.frequency !== undefined && updates.frequency !== medicine.frequency) ||
    (updates.intervalHours !== undefined && updates.intervalHours !== medicine.intervalHours) ||
    (updates.scheduleTimes !== undefined && JSON.stringify(updates.scheduleTimes) !== JSON.stringify(medicine.scheduleTimes)) ||
    (updates.startDate !== undefined && updates.startDate !== medicine.startDate) ||
    (Object.prototype.hasOwnProperty.call(updates, "endDate") && updates.endDate !== medicine.endDate);
}

export function useMedicine() {
  const context = useContext(MedicineContext);
  if (context === undefined) {
    throw new Error("useMedicine must be used within a MedicineProvider");
  }
  return context;
}
