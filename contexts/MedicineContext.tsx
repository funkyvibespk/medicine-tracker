"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  ACTIVE_DEMO_EMAIL_KEY,
  ACTIVE_DEMO_SESSION_KEY,
  demoProfileStorageKey,
  loadDemoProfile,
  normalizeDemoEmail,
  serializeDemoProfile,
} from "@/lib/demoProfiles";

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
  endDate?: string;
  instructions?: string;
  notes?: string;
  
  // Inventory
  inventoryAmount: number;
  inventoryCapacity?: number; // total size for volume-based
  lowStockThreshold: number;
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
  recordDose: (record: DoseRecord) => void;
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

interface TrackerState {
  medicines: Medicine[];
  doseRecords: DoseRecord[];
  isHydrated: boolean;
  activeProfileEmail: string | null;
}

export function MedicineProvider({ children }: { children: ReactNode }) {
  const [tracker, setTracker] = useState<TrackerState>({
    medicines: [],
    doseRecords: [],
    isHydrated: false,
    activeProfileEmail: null,
  });
  const { medicines, doseRecords, isHydrated, activeProfileEmail } = tracker;

  const activateProfile = (emailInput: string, options?: { migrateLegacy?: boolean }) => {
    const email = normalizeDemoEmail(emailInput);
    const profile = loadDemoProfile(localStorage, email, options);
    // Swap identity and data in one state update so persistence can never pair
    // the previous profile's records with the newly selected email.
    setTracker({
      medicines: profile.medicines as Medicine[],
      doseRecords: profile.doseRecords as DoseRecord[],
      isHydrated: true,
      activeProfileEmail: email,
    });
  };

  const deactivateProfile = () => {
    setTracker({ medicines: [], doseRecords: [], isHydrated: true, activeProfileEmail: null });
  };

  useEffect(() => {
    try {
      const sessionActive = sessionStorage.getItem(ACTIVE_DEMO_SESSION_KEY) === "active";
      const email = sessionActive ? normalizeDemoEmail(sessionStorage.getItem(ACTIVE_DEMO_EMAIL_KEY) ?? "") : "";
      if (email) {
        const profile = loadDemoProfile(localStorage, email, {
          migrateLegacy: false,
        });
        // This effect restores browser-only state after the server render.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTracker((current) => current.activeProfileEmail ? current : ({
          medicines: profile.medicines as Medicine[],
          doseRecords: profile.doseRecords as DoseRecord[],
          isHydrated: true,
          activeProfileEmail: email,
        }));
      } else {
        setTracker((current) => current.activeProfileEmail ? current : ({ ...current, isHydrated: true }));
      }
    } catch (e) {
      console.error("Failed to load the local demo profile safely", e);
      setTracker((current) => current.activeProfileEmail ? current : ({ ...current, isHydrated: true }));
    }
  }, []);

  useEffect(() => {
    if (tracker.isHydrated && tracker.activeProfileEmail) {
      try {
        localStorage.setItem(
          demoProfileStorageKey(tracker.activeProfileEmail),
          serializeDemoProfile({ email: tracker.activeProfileEmail, medicines: tracker.medicines, doseRecords: tracker.doseRecords }),
        );
      } catch (e) {
        console.error("Failed to save the local demo profile", e);
      }
    }
  }, [tracker]);

  const addMedicine = (med: Medicine) => {
    setTracker((prev) => ({ ...prev, medicines: [...prev.medicines, med] }));
  };

  const updateMedicine = (id: string, updates: Partial<Medicine>) => {
    setTracker((prev) => ({
      ...prev,
      medicines: prev.medicines.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
  };

  const deleteMedicine = (id: string) => {
    setTracker((prev) => {
      const medicine = prev.medicines.find((item) => item.id === id);
      return {
        ...prev,
        medicines: prev.medicines.filter((medicineItem) => medicineItem.id !== id),
        doseRecords: medicine
          ? prev.doseRecords.map((record) => record.medicineId === id
            ? {
                ...record,
                medicineName: record.medicineName ?? medicine.name,
                medicineType: record.medicineType ?? medicine.type,
                medicineStrength: record.medicineStrength ?? medicine.strength,
              }
            : record)
          : prev.doseRecords,
      };
    });
  };

  const recordDose = (record: DoseRecord) => {
    setTracker((prev) => {
      // replace if existing for same scheduled date and time
      const medicine = prev.medicines.find((item) => item.id === record.medicineId);
      const filtered = record.isPrn
        ? prev.doseRecords
        : prev.doseRecords.filter((r) => !(r.medicineId === record.medicineId && r.scheduledDate === record.scheduledDate && r.scheduledTime === record.scheduledTime && !r.isPrn));
      return {
        ...prev,
        doseRecords: [...filtered, {
          ...record,
          medicineName: medicine?.name ?? record.medicineName,
          medicineType: medicine?.type ?? record.medicineType,
          medicineStrength: medicine?.strength ?? record.medicineStrength,
        }],
      };
    });
  };

  const updateDoseRecord = (id: string, updates: Partial<DoseRecord>) => {
    setTracker((prev) => ({
      ...prev,
      doseRecords: prev.doseRecords.map((d) => (d.id === id ? { ...d, ...updates } : d)),
    }));
  };

  const updateInventory = (medicineId: string, amount: number) => {
    setTracker((prev) => ({
      ...prev,
      medicines: prev.medicines.map((medicine) => medicine.id === medicineId
        ? { ...medicine, inventoryAmount: Math.max(0, amount) }
        : medicine),
    }));
  };

  const addStock = (medicineId: string, amountToAdd: number) => {
    setTracker((prev) => ({
      ...prev,
      medicines: prev.medicines.map((medicine) => medicine.id === medicineId
        ? { ...medicine, inventoryAmount: Math.max(0, medicine.inventoryAmount + amountToAdd) }
        : medicine),
    }));
  };

  const clearAll = () => {
    setTracker((prev) => ({ ...prev, medicines: [], doseRecords: [] }));
  };

  return (
    <MedicineContext.Provider
      value={{
        medicines,
        doseRecords,
        addMedicine,
        updateMedicine,
        deleteMedicine,
        recordDose,
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
