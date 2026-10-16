"use client";

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import {
  demoProfileStorageKey,
  loadDemoProfile,
  normalizeDemoEmail,
  serializeDemoProfile,
} from "@/lib/demoProfiles";
import { readDemoSession } from "@/lib/demoSession";
import { applyTakenDose } from "@/lib/medicineLogic";

export type MedicineType = "Tablet" | "Capsule" | "Syrup" | "Sachet" | "Injection";

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

export type DoseStatus = "upcoming" | "due" | "overdue" | "taken_early" | "taken_on_time" | "taken_late";

export interface DoseRecord {
  id: string;
  medicineId: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
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
  addMedicine: (med: Medicine) => void;
  updateMedicine: (id: string, med: Partial<Medicine>) => void;
  deleteMedicine: (id: string) => void;
  recordTakenDose: (record: DoseRecord, doseAmount: number) => boolean;
  updateDoseRecord: (id: string, updates: Partial<DoseRecord>) => void;
  updateInventory: (medicineId: string, amount: number) => void;
  addStock: (medicineId: string, amount: number) => void;
  isHydrated: boolean;
  clearAll: () => void;
  activeProfileEmail: string | null;
  activateProfile: (email: string, options?: { migrateLegacy?: boolean }) => void;
  deactivateProfile: () => void;
}

const MedicineContext = createContext<MedicineContextType | undefined>(undefined);

export function MedicineProvider({ children }: { children: ReactNode }) {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [doseRecords, setDoseRecords] = useState<DoseRecord[]>([]);
  const medicinesRef = useRef<Medicine[]>([]);
  const doseRecordsRef = useRef<DoseRecord[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeProfileEmail, setActiveProfileEmail] = useState<string | null>(null);

  const activateProfile = (emailInput: string, options?: { migrateLegacy?: boolean }) => {
    const email = normalizeDemoEmail(emailInput);
    const profile = loadDemoProfile(localStorage, email, options);
    medicinesRef.current = profile.medicines as Medicine[];
    doseRecordsRef.current = profile.doseRecords as DoseRecord[];
    setIsHydrated(false);
    setMedicines(medicinesRef.current);
    setDoseRecords(doseRecordsRef.current);
    setActiveProfileEmail(email);
    setIsHydrated(true);
  };

  const deactivateProfile = () => {
    medicinesRef.current = [];
    doseRecordsRef.current = [];
    setIsHydrated(false);
    setMedicines([]);
    setDoseRecords([]);
    setActiveProfileEmail(null);
    setIsHydrated(true);
  };

  useEffect(() => {
    try {
      const session = readDemoSession();
      if (session) {
        const profile = loadDemoProfile(localStorage, session.email, {
          migrateLegacy: false,
        });
        // localStorage can only be read after hydration; restore saved client state here.
        medicinesRef.current = profile.medicines as Medicine[];
        doseRecordsRef.current = profile.doseRecords as DoseRecord[];
        setMedicines(medicinesRef.current);
        setDoseRecords(doseRecordsRef.current);
        setActiveProfileEmail(session.email);
      }
    } catch (e) {
      console.error("Failed to load the local demo profile safely", e);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated && activeProfileEmail) {
      localStorage.setItem(
        demoProfileStorageKey(activeProfileEmail),
        serializeDemoProfile({ email: activeProfileEmail, medicines, doseRecords }),
      );
    }
  }, [medicines, doseRecords, isHydrated, activeProfileEmail]);

  const addMedicine = (med: Medicine) => {
    medicinesRef.current = [...medicinesRef.current, med];
    setMedicines(medicinesRef.current);
  };

  const updateMedicine = (id: string, updates: Partial<Medicine>) => {
    medicinesRef.current = medicinesRef.current.map((m) => (m.id === id ? { ...m, ...updates } : m));
    setMedicines(medicinesRef.current);
  };

  const deleteMedicine = (id: string) => {
    const medicine = medicinesRef.current.find((item) => item.id === id);
    if (medicine) {
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

  const updateDoseRecord = (id: string, updates: Partial<DoseRecord>) => {
    doseRecordsRef.current = doseRecordsRef.current.map((d) => (d.id === id ? { ...d, ...updates } : d));
    setDoseRecords(doseRecordsRef.current);
  };

  const updateInventory = (medicineId: string, amount: number) => {
    medicinesRef.current = medicinesRef.current.map((m) => m.id === medicineId
      ? { ...m, inventoryAmount: Math.max(0, amount) }
      : m);
    setMedicines(medicinesRef.current);
  };

  const addStock = (medicineId: string, amountToAdd: number) => {
    medicinesRef.current = medicinesRef.current.map((m) => m.id === medicineId
      ? { ...m, inventoryAmount: Math.max(0, m.inventoryAmount + amountToAdd) }
      : m);
    setMedicines(medicinesRef.current);
  };

  const clearAll = () => {
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
        updateDoseRecord,
        updateInventory,
        addStock,
        isHydrated,
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

export function useMedicine() {
  const context = useContext(MedicineContext);
  if (context === undefined) {
    throw new Error("useMedicine must be used within a MedicineProvider");
  }
  return context;
}
