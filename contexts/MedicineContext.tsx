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
import { applySkippedDose, applyTakenDose, validateInventoryThreshold } from "@/lib/medicineLogic";
import { findBlockingMedicineIdentityMatch } from "@/lib/medicineIdentity";
import { reconcileHistoricalMissedOccurrences } from "@/lib/missedDoses";
import { addScheduleBaseline, localDateString } from "@/lib/schedule";

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
  /** Optional additive history. Missing history means the earlier schedule is unknown. */
  scheduleRevisions?: MedicineScheduleRevision[];
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
}

interface MedicineContextType {
  medicines: Medicine[];
  doseRecords: DoseRecord[];
  addMedicine: (med: Medicine, options?: { allowLikelyDuplicate?: boolean }) => AddMedicineResult;
  updateMedicine: (id: string, med: Partial<Medicine>) => MedicineUpdateResult;
  deleteMedicine: (id: string) => void;
  recordTakenDose: (record: DoseRecord, doseAmount: number) => boolean;
  skipDoseOccurrence: (record: DoseRecord) => boolean;
  updateDoseRecord: (id: string, updates: Partial<DoseRecord>) => void;
  updateInventory: (medicineId: string, amount: number) => void;
  addStock: (medicineId: string, amount: number) => void;
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
}

const MedicineContext = createContext<MedicineContextType | undefined>(undefined);

export function MedicineProvider({ children }: { children: ReactNode }) {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [doseRecords, setDoseRecords] = useState<DoseRecord[]>([]);
  const medicinesRef = useRef<Medicine[]>([]);
  const doseRecordsRef = useRef<DoseRecord[]>([]);
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
    activeProfileEmailRef.current = null;
    setMedicines([]);
    setDoseRecords([]);
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
      medicinesRef.current = addScheduleBaseline(profile.medicines as Medicine[]);
      doseRecordsRef.current = profile.doseRecords as DoseRecord[];
      activeProfileEmailRef.current = session.email;
      setMedicines(medicinesRef.current);
      setDoseRecords(doseRecordsRef.current);
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
      medicinesRef.current = addScheduleBaseline(profile.medicines as Medicine[]);
      doseRecordsRef.current = profile.doseRecords as DoseRecord[];
      activeProfileEmailRef.current = email;
      setMedicines(medicinesRef.current);
      setDoseRecords(doseRecordsRef.current);
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
      saveDemoProfileForActiveSession(localStorage, { email: activeProfileEmail, medicines, doseRecords });
    } catch (error) {
      // This state update reports a failed write to the external storage system.
      const message = error instanceof Error ? error.message : "Changes could not be saved to this local profile.";
      queueMicrotask(() => setProfileState("error", message));
    }
  }, [medicines, doseRecords, profileStatus, activeProfileEmail, setProfileState]);

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
    const quantityValidation = validateInventoryThreshold(med.inventoryAmount, med.lowStockThreshold);
    if (!quantityValidation.valid) {
      return { added: false, validationError: quantityValidation.inventoryAmountError ?? quantityValidation.lowStockThresholdError };
    }
    const duplicateMatch = findBlockingMedicineIdentityMatch(med, medicinesRef.current, options?.allowLikelyDuplicate);
    if (duplicateMatch) return { added: false, duplicateMatch };
    const createdAt = med.createdAt ?? new Date().toISOString();
    const medicine = {
      ...med,
      createdAt,
      scheduleRevisions: med.scheduleRevisions?.length ? med.scheduleRevisions : [{
        effectiveAt: createdAt,
        frequency: med.frequency,
        intervalHours: med.intervalHours,
        scheduleTimes: [...med.scheduleTimes],
        startDate: med.startDate,
        endDate: med.endDate,
      }],
    };
    medicinesRef.current = [...medicinesRef.current, medicine];
    setMedicines(medicinesRef.current);
    return { added: true };
  };

  const updateMedicine = (id: string, updates: Partial<Medicine>) => {
    if (!canMutateActiveProfile()) return { saved: false, validationError: "The active local profile is not ready. Reload it before making changes." };
    const existing = medicinesRef.current.find((medicine) => medicine.id === id);
    if (!existing) return { saved: false, validationError: "This medicine could not be found." };
    const quantityValidation = validateInventoryThreshold(
      updates.inventoryAmount ?? existing.inventoryAmount,
      updates.lowStockThreshold ?? existing.lowStockThreshold,
    );
    if (!quantityValidation.valid) {
      return { saved: false, validationError: quantityValidation.inventoryAmountError ?? quantityValidation.lowStockThresholdError };
    }
    const now = new Date();
    if (existing && scheduleChanged(existing, updates)) {
      const reconciled = reconcileHistoricalMissedOccurrences(medicinesRef.current, doseRecordsRef.current, now);
      if (reconciled !== doseRecordsRef.current) {
        doseRecordsRef.current = reconciled;
        setDoseRecords(reconciled);
      }
    }
    medicinesRef.current = medicinesRef.current.map((medicine) => {
      if (medicine.id !== id) return medicine;
      const updated = { ...medicine, ...updates };
      if (!existing || !scheduleChanged(existing, updates)) return updated;
      return {
        ...updated,
        scheduleRevisions: [...(existing.scheduleRevisions ?? []), {
          effectiveAt: now.toISOString(),
          frequency: updated.frequency,
          intervalHours: updated.intervalHours,
          scheduleTimes: [...updated.scheduleTimes],
          startDate: updated.startDate,
          endDate: updated.endDate,
        }],
      };
    });
    setMedicines(medicinesRef.current);
    return { saved: true };
  };

  const deleteMedicine = (id: string) => {
    if (!canMutateActiveProfile()) return;
    const medicine = medicinesRef.current.find((item) => item.id === id);
    if (medicine) {
      const reconciled = reconcileHistoricalMissedOccurrences(medicinesRef.current, doseRecordsRef.current, new Date());
      doseRecordsRef.current = reconciled;
      doseRecordsRef.current = doseRecordsRef.current.map((record) => record.medicineId === id
        ? {
            ...record,
            medicineName: record.medicineName ?? medicine.name,
            medicineType: record.medicineType ?? medicine.type,
            medicineStrength: record.medicineStrength ?? medicine.strength,
          }
        : record);
      setDoseRecords(doseRecordsRef.current);
    }
    medicinesRef.current = medicinesRef.current.filter((m) => m.id !== id);
    setMedicines(medicinesRef.current);
  };

  const recordTakenDose = (record: DoseRecord, doseAmount: number) => {
    if (!canMutateActiveProfile()) return false;
    const medicine = medicinesRef.current.find((item) => item.id === record.medicineId);
    if (!medicine) return false;
    const enrichedRecord: DoseRecord = {
      ...record,
      medicineName: medicine.name ?? record.medicineName,
      medicineType: medicine.type ?? record.medicineType,
      medicineStrength: medicine.strength ?? record.medicineStrength,
    };
    const result = applyTakenDose(medicinesRef.current, doseRecordsRef.current, enrichedRecord, doseAmount);
    if (!result.accepted) return false;
    medicinesRef.current = result.medicines;
    doseRecordsRef.current = result.doseRecords;
    setMedicines(medicinesRef.current);
    setDoseRecords(doseRecordsRef.current);
    return true;
  };

  const skipDoseOccurrence = (record: DoseRecord) => {
    if (!canMutateActiveProfile()) return false;
    if (record.status !== "overdue" && record.status !== "missed") return false;
    const medicine = medicinesRef.current.find((item) => item.id === record.medicineId);
    const enrichedRecord: DoseRecord = {
      ...record,
      medicineName: record.medicineName ?? medicine?.name,
      medicineType: record.medicineType ?? medicine?.type,
      medicineStrength: record.medicineStrength ?? medicine?.strength,
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
    if (!canMutateActiveProfile()) return;
    medicinesRef.current = medicinesRef.current.map((m) => m.id === medicineId
      ? { ...m, inventoryAmount: Math.max(0, amount) }
      : m);
    setMedicines(medicinesRef.current);
  };

  const addStock = (medicineId: string, amountToAdd: number) => {
    if (!canMutateActiveProfile()) return;
    medicinesRef.current = medicinesRef.current.map((m) => m.id === medicineId
      ? { ...m, inventoryAmount: Math.max(0, m.inventoryAmount + amountToAdd) }
      : m);
    setMedicines(medicinesRef.current);
  };

  const clearAll = () => {
    if (!canMutateActiveProfile()) return;
    medicinesRef.current = [];
    doseRecordsRef.current = [];
    setMedicines([]);
    setDoseRecords([]);
  };

  return (
    <MedicineContext.Provider
      value={{
        medicines,
        doseRecords,
        addMedicine,
        updateMedicine,
        deleteMedicine,
        recordTakenDose,
        skipDoseOccurrence,
        updateDoseRecord,
        updateInventory,
        addStock,
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
