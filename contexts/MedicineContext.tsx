"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type MedicineType = "Tablet" | "Capsule" | "Syrup" | "Sachet" | "Injection";

export interface Medicine {
  id: string;
  name: string;
  type: MedicineType;
  strength: string;
  doseAmount: number;
  frequency: string;
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
}

const MedicineContext = createContext<MedicineContextType | undefined>(undefined);

export function MedicineProvider({ children }: { children: ReactNode }) {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [doseRecords, setDoseRecords] = useState<DoseRecord[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const storedMeds = localStorage.getItem("medTracker_medicines");
      const storedDoses = localStorage.getItem("medTracker_doses");
      if (storedMeds) setMedicines(JSON.parse(storedMeds));
      if (storedDoses) setDoseRecords(JSON.parse(storedDoses));
    } catch (e) {
      console.error("Failed to parse local storage", e);
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem("medTracker_medicines", JSON.stringify(medicines));
      localStorage.setItem("medTracker_doses", JSON.stringify(doseRecords));
    }
  }, [medicines, doseRecords, isHydrated]);

  const addMedicine = (med: Medicine) => {
    setMedicines((prev) => [...prev, med]);
  };

  const updateMedicine = (id: string, updates: Partial<Medicine>) => {
    setMedicines((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  const deleteMedicine = (id: string) => {
    setMedicines((prev) => prev.filter((m) => m.id !== id));
    setDoseRecords((prev) => prev.filter((d) => d.medicineId !== id));
  };

  const recordDose = (record: DoseRecord) => {
    setDoseRecords((prev) => {
      // replace if existing for same scheduled date and time
      const filtered = prev.filter(
        (r) =>
          !(
            r.medicineId === record.medicineId &&
            r.scheduledDate === record.scheduledDate &&
            r.scheduledTime === record.scheduledTime
          )
      );
      return [...filtered, record];
    });
  };

  const updateDoseRecord = (id: string, updates: Partial<DoseRecord>) => {
    setDoseRecords((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
  };

  const updateInventory = (medicineId: string, amount: number) => {
    setMedicines((prev) =>
      prev.map((m) => {
        if (m.id !== medicineId) return m;
        return { ...m, inventoryAmount: Math.max(0, amount) };
      })
    );
  };

  const addStock = (medicineId: string, amountToAdd: number) => {
    setMedicines((prev) =>
      prev.map((m) => {
        if (m.id !== medicineId) return m;
        return { ...m, inventoryAmount: m.inventoryAmount + amountToAdd };
      })
    );
  };

  const clearAll = () => {
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
        recordDose,
        updateDoseRecord,
        updateInventory,
        addStock,
        isHydrated,
        clearAll,
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
