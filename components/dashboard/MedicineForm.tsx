"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Medicine, MedicineType } from "@/contexts/MedicineContext";
import { localDateString } from "@/lib/schedule";
import { availableVolumeFromContainers } from "@/lib/medicineLogic";

// ─── Per-type strength configuration ──────────────────────────────────────────

interface StrengthConfig {
  label: string;
  placeholder: string;
  helper: string;
  units: string[];
  defaultUnit: string;
}

const STRENGTH_CONFIG: Record<MedicineType, StrengthConfig> = {
  Tablet: {
    label: "Strength",
    placeholder: "e.g. 500",
    helper: "per tablet",
    units: ["mg", "g", "mcg"],
    defaultUnit: "mg",
  },
  Capsule: {
    label: "Strength",
    placeholder: "e.g. 500",
    helper: "per capsule",
    units: ["mg", "g", "mcg"],
    defaultUnit: "mg",
  },
  Syrup: {
    label: "Concentration",
    placeholder: "e.g. 250",
    helper: "liquid concentration per dose volume",
    units: ["mg/5 ml", "mg/ml", "g/5 ml", "mcg/ml"],
    defaultUnit: "mg/5 ml",
  },
  Sachet: {
    label: "Strength",
    placeholder: "e.g. 500",
    helper: "per sachet",
    units: ["mg", "g", "mcg"],
    defaultUnit: "mg",
  },
  Injection: {
    label: "Strength / Concentration",
    placeholder: "e.g. 500",
    helper: "per vial or ampoule",
    units: ["mg", "g", "mg/ml", "mg/2 ml", "mg/5 ml", "IU", "mcg"],
    defaultUnit: "mg",
  },
};

const FIXED_DAILY_COUNTS: Record<string, number> = {
  "Once daily": 1,
  "Twice daily": 2,
  "Three times daily": 3,
  "Four times daily": 4,
};

function normalizeFrequency(value?: string) {
  if (value === "Daily") return "Once daily";
  if (value === "Custom schedule") return "Custom";
  return value || "Once daily";
}

function defaultTimes(count: number) {
  return ["08:00", "20:00", "12:00", "18:00"].slice(0, count);
}

/**
 * Parse a stored "500 mg" or "250 mg/5 ml" string into { value, unit }.
 * Falls back to ("", defaultUnit) when unparseable.
 */
function parseStrength(
  raw: string | undefined,
  config: StrengthConfig
): { strengthValue: string; strengthUnit: string } {
  if (!raw || !raw.trim()) {
    return { strengthValue: "", strengthUnit: config.defaultUnit };
  }

  // Find where the numeric part ends (digits, dot, optional leading minus)
  const match = raw.trim().match(/^(\d+(?:\.\d+)?)\s*(.+)?$/);
  if (!match) {
    return { strengthValue: "", strengthUnit: config.defaultUnit };
  }

  const value = match[1] ?? "";
  const unit = match[2]?.trim() ?? "";

  // Only accept the parsed unit if it is actually in this type's unit list
  const validUnit = config.units.includes(unit) ? unit : config.defaultUnit;
  return { strengthValue: value, strengthUnit: validUnit };
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface MedicineFormProps {
  initialData?: Medicine | null;
  onSave: (data: Medicine) => void;
  onCancel: () => void;
}

// ─── Component ─────────────────────────────────────────────────────────────────

function createMedicineId() {
  return `med-${Date.now()}`;
}

export default function MedicineForm({ initialData, onSave, onCancel }: MedicineFormProps) {
  const initialType: MedicineType = initialData?.type ?? "Tablet";
  const initialConfig = STRENGTH_CONFIG[initialType];
  const { strengthValue: initSV, strengthUnit: initSU } = parseStrength(
    initialData?.strength,
    initialConfig
  );

  // ── Core form state (everything except strength, which is split below) ──
  const [formData, setFormData] = useState<Partial<Medicine>>({
    name: initialData?.name ?? "",
    type: initialType,
    doseAmount: initialData?.doseAmount ?? 1,
    frequency: normalizeFrequency(initialData?.frequency),
    intervalHours: initialData?.intervalHours ?? 8,
    scheduleTimes: normalizeFrequency(initialData?.frequency) === "As needed (PRN)" ? [] : initialData?.scheduleTimes ?? ["08:00"],
    startDate: initialData?.startDate ?? localDateString(),
    endDate: initialData?.endDate ?? "",
    instructions: initialData?.instructions ?? "",
    notes: initialData?.notes ?? "",
    inventoryAmount: initialData?.inventoryAmount ?? 0,
    inventoryCapacity: initialData?.inventoryCapacity ?? 0,
    inventoryContainerCapacity: initialData?.inventoryContainerCapacity ?? 0,
    lowStockThreshold: initialData?.lowStockThreshold ?? 5,
  });

  // ── Separate strength sub-fields ──
  const [strengthValue, setStrengthValue] = useState<string>(initSV);
  const [strengthUnit, setStrengthUnit] = useState<string>(initSU);
  const [syrupStockEntryUnit, setSyrupStockEntryUnit] = useState<"ml" | "bottles">("ml");

  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Derived config for the current type ──
  const currentType = (formData.type as MedicineType) ?? "Tablet";
  const strengthConfig = STRENGTH_CONFIG[currentType];

  // ── Handlers ──

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type: inputType } = e.target;
    let parsedValue: string | number = value;

    if (inputType === "number") {
      parsedValue = parseFloat(value) || 0;
    }

    setFormData((prev) => ({ ...prev, [name]: parsedValue }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  /**
   * Type change: update the type AND immediately reset both strength sub-fields
   * to empty value + new type's default unit.
   */
  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as MedicineType;
    setFormData((prev) => ({ ...prev, type: newType }));
    // Clear strength — the old value is incompatible with the new type
    setStrengthValue("");
    setStrengthUnit(STRENGTH_CONFIG[newType].defaultUnit);
    if (errors.strengthValue) setErrors((prev) => ({ ...prev, strengthValue: "" }));
  };

  const handleTimeChange = (index: number, val: string) => {
    const newTimes = [...(formData.scheduleTimes || [])];
    newTimes[index] = val;
    setFormData((prev) => ({ ...prev, scheduleTimes: newTimes }));
  };

  const handleFrequencyChange = (frequency: string) => {
    const fixedCount = FIXED_DAILY_COUNTS[frequency];
    setFormData((prev) => {
      let scheduleTimes = prev.scheduleTimes || [];
      if (frequency === "As needed (PRN)") scheduleTimes = [];
      else if (fixedCount) {
        const nextTimes = scheduleTimes.slice(0, fixedCount);
        for (const time of defaultTimes(fixedCount)) {
          if (nextTimes.length === fixedCount) break;
          if (!nextTimes.includes(time)) nextTimes.push(time);
        }
        scheduleTimes = nextTimes;
      }
      else if (frequency !== "Custom") scheduleTimes = [...scheduleTimes, "08:00"].slice(0, 1);
      else if (scheduleTimes.length === 0) scheduleTimes = ["08:00"];
      return { ...prev, frequency, scheduleTimes };
    });
  };

  const addTime = () => {
    setFormData((prev) => ({ ...prev, scheduleTimes: [...(prev.scheduleTimes || []), "12:00"] }));
  };

  const removeTime = (index: number) => {
    const newTimes = (formData.scheduleTimes || []).filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, scheduleTimes: newTimes }));
  };

  // ── Validation ──

  const validate = (scheduleTimes: string[]) => {
    const newErrors: Record<string, string> = {};
    if (!formData.name?.trim()) newErrors.name = "Name is required";
    if (!formData.doseAmount || formData.doseAmount <= 0) newErrors.doseAmount = "Valid dose amount required";
    const fixedCount = FIXED_DAILY_COUNTS[formData.frequency || "Once daily"];
    if (fixedCount && scheduleTimes.length !== fixedCount)
      newErrors.scheduleTimes = `Choose exactly ${fixedCount} scheduled time${fixedCount === 1 ? "" : "s"}`;
    else if (formData.frequency !== "As needed (PRN)" && !scheduleTimes.length)
      newErrors.scheduleTimes = "At least one scheduled time is required";
    else if (scheduleTimes.some((time) => !time) || new Set(scheduleTimes).size !== scheduleTimes.length)
      newErrors.scheduleTimes = "Choose a different time for each dose";
    if (formData.frequency === "Every X hours" && (!formData.intervalHours || formData.intervalHours < 1 || formData.intervalHours > 24))
      newErrors.intervalHours = "Enter an interval from 1 to 24 hours";
    if (initialData && currentType !== initialData.type && Number(formData.inventoryAmount) > 0)
      newErrors.type = "Set current stock to zero before changing medicine type so its saved inventory is not reinterpreted.";
    if (currentType === "Syrup" && syrupStockEntryUnit === "bottles" && Number(formData.inventoryAmount) > 0 && !(Number(formData.inventoryContainerCapacity) > 0))
      newErrors.inventoryContainerCapacity = "Enter the bottle capacity to calculate liquid stock";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ──

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const scheduleTimes = formData.frequency === "As needed (PRN)"
      ? []
      : new FormData(e.currentTarget as HTMLFormElement).getAll("scheduleTime").filter((time): time is string => typeof time === "string");
    if (!validate(scheduleTimes)) return;

    // Combine strength value + unit into a single stored string
    const combinedStrength =
      strengthValue.trim()
        ? `${strengthValue.trim()} ${strengthUnit}`.trim()
        : "";
    const doseUnit = getDoseUnit();
    const isSameSavedType = Boolean(initialData && currentType === initialData.type);
    const enteredInventoryAmount = Number(formData.inventoryAmount) || 0;
    const inventoryAmount = currentType === "Syrup" && syrupStockEntryUnit === "bottles"
      ? availableVolumeFromContainers(enteredInventoryAmount, Number(formData.inventoryContainerCapacity) || 0)
      : enteredInventoryAmount;
    const inventoryCapacity = currentType === "Syrup" && syrupStockEntryUnit === "bottles" && !isSameSavedType
      ? Number(formData.inventoryCapacity) || inventoryAmount
      : Number(formData.inventoryCapacity) || 0;
    const inventoryUnit = isSameSavedType ? initialData?.inventoryUnit ?? doseUnit : doseUnit;
    const lowStockThresholdUnit = isSameSavedType
      ? initialData?.lowStockThresholdUnit ?? initialData?.inventoryUnit ?? doseUnit
      : doseUnit;

    const med: Medicine = {
      id: initialData?.id || createMedicineId(),
      name: formData.name!.trim(),
      type: currentType,
      strength: combinedStrength,
      doseAmount: formData.doseAmount || 1,
      doseUnit,
      frequency: normalizeFrequency(formData.frequency),
      intervalHours: formData.frequency === "Every X hours" ? formData.intervalHours : undefined,
      scheduleTimes,
      startDate: formData.startDate || localDateString(),
      createdAt: initialData ? initialData.createdAt : new Date().toISOString(),
      endDate: formData.endDate || undefined,
      instructions: formData.instructions?.trim() || "",
      notes: formData.notes?.trim() || "",
      inventoryAmount,
      inventoryCapacity,
      inventoryContainerCapacity: currentType === "Syrup" ? Number(formData.inventoryContainerCapacity) || 0 : undefined,
      inventoryUnit,
      lowStockThreshold: formData.lowStockThreshold ?? 5,
      lowStockThresholdUnit,
    };

    onSave(med);
  };

  // ── Helpers ──

  const getDoseUnit = () => {
    switch (currentType) {
      case "Tablet": return "tablets";
      case "Capsule": return "capsules";
      case "Syrup": return "ml";
      case "Sachet": return "sachets";
      case "Injection": return "vials";
      default: return "units";
    }
  };

  // Shared input class
  const inputCls =
    "w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

  // ── Render ──

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left">

      {/* ── 1. Medicine Details ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
          1. Medicine Details
        </h3>

        {/* Name */}
        <div>
          <label htmlFor="medicineName" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            id="medicineName"
            name="name"
            value={formData.name || ""}
            onChange={handleChange}
            placeholder="e.g. Panadol"
            className={`w-full rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-white ${
              errors.name
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                : "border-slate-300 focus:border-teal-500 focus:ring-teal-500/20 dark:border-slate-700"
            }`}
          />
          {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name}</p>}
        </div>

        {/* Type (full-width to give strength its own row) */}
        <div>
          <label htmlFor="medicineType" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Type <span className="text-rose-500">*</span>
          </label>
          <select
            name="type"
            id="medicineType"
            value={formData.type || "Tablet"}
            onChange={handleTypeChange}
            className={inputCls}
          >
            <option value="Tablet">Tablet</option>
            <option value="Capsule">Capsule</option>
            <option value="Syrup">Syrup</option>
            <option value="Sachet">Sachet</option>
            <option value="Injection">Injection</option>
          </select>
          {errors.type && <p className="mt-1 text-xs text-rose-500">{errors.type}</p>}
        </div>

        {/* ── Strength / Concentration — type-aware ── */}
        <div>
          <label htmlFor="strengthValue" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {strengthConfig.label}{" "}
            <span className="font-normal text-slate-400 dark:text-slate-500">(optional)</span>
          </label>

          <div className="flex gap-2">
            {/* Numeric value */}
            <input
              type="number"
              id="strengthValue"
              name="strengthValue"
              min="0"
              step="any"
              value={strengthValue}
              onChange={(e) => {
                setStrengthValue(e.target.value);
                if (errors.strengthValue) setErrors((prev) => ({ ...prev, strengthValue: "" }));
              }}
              placeholder={strengthConfig.placeholder}
              className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />

            {/* Unit selector */}
            <select
              id="strengthUnit"
              value={strengthUnit}
              onChange={(e) => setStrengthUnit(e.target.value)}
              className="rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              aria-label="Strength unit"
            >
              {strengthConfig.units.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* Helper text + live preview */}
          <div className="mt-1.5 flex items-center justify-between">
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {currentType === "Syrup"
                ? "Liquid concentration — e.g. 250 mg/5 ml means 250 mg per 5 ml dose"
                : currentType === "Injection"
                ? "Per vial or ampoule — use mg/ml for concentration-based injections"
                : `${strengthConfig.helper}`}
            </p>
            {strengthValue && (
              <span className="ml-3 flex-shrink-0 rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                {strengthValue} {strengthUnit}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800" />

      {/* ── 2. Schedule & Dosage ────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
          2. Schedule &amp; Dosage
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="doseAmount" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Dose Amount <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="doseAmount"
                name="doseAmount"
                step="0.1"
                min="0.1"
                value={formData.doseAmount || ""}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <span className="text-sm text-slate-500 dark:text-slate-400">{getDoseUnit()}</span>
            </div>
            {errors.doseAmount && <p className="mt-1 text-xs text-rose-500">{errors.doseAmount}</p>}
          </div>
          <div>
            <label htmlFor="frequency" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Frequency
            </label>
            <select
              name="frequency"
              id="frequency"
              value={formData.frequency || "Once daily"}
              onChange={(e) => handleFrequencyChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <optgroup label="Fixed daily">
              <option value="Once daily">Once daily</option>
              <option value="Twice daily">Twice daily</option>
              <option value="Three times daily">Three times daily</option>
              <option value="Four times daily">Four times daily</option>
              </optgroup>
              <optgroup label="Recurring">
                <option value="Every other day">Every other day</option>
                <option value="Every X hours">Every X hours</option>
              </optgroup>
              <optgroup label="Longer recurrence">
                <option value="Once weekly">Once weekly</option>
                <option value="Every 2 weeks">Every 2 weeks</option>
                <option value="Once monthly">Once monthly</option>
              </optgroup>
              <optgroup label="As needed">
                <option value="As needed (PRN)">As needed (PRN)</option>
              </optgroup>
              <option value="Custom">Custom</option>
            </select>
          </div>
        </div>

        {formData.frequency === "Every X hours" && (
          <div>
            <label htmlFor="intervalHours" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Repeat every (hours)</label>
            <input id="intervalHours" name="intervalHours" type="number" min="1" max="24" step="1" value={formData.intervalHours ?? 8} onChange={handleChange} className={inputCls} />
            {errors.intervalHours && <p className="mt-1 text-xs text-rose-500">{errors.intervalHours}</p>}
          </div>
        )}

        {formData.frequency === "As needed (PRN)" ? (
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">As needed medicines do not create scheduled doses. You can mark a dose as taken from Today.</p>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {formData.frequency === "Every X hours" ? "First dose time" : formData.frequency === "Custom" ? "Times to take" : "Scheduled time"}
              <span className="text-rose-500"> *</span>
            </label>
            <div className="space-y-2">
              {formData.scheduleTimes?.map((time, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input type="time" name="scheduleTime" aria-label={`Dose time ${index + 1}`} value={time} onChange={(e) => handleTimeChange(index, e.target.value)} className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                  {formData.frequency === "Custom" && formData.scheduleTimes!.length > 1 && (
                    <button type="button" onClick={() => removeTime(index)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors" aria-label={`Remove dose time ${index + 1}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            {errors.scheduleTimes && <p className="mt-1 text-xs text-rose-500">{errors.scheduleTimes}</p>}
            {formData.frequency === "Custom" && <button type="button" onClick={addTime} className="mt-2 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline">+ Add another time</button>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={formData.startDate || ""}
              onChange={handleChange}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              End Date (Optional)
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={formData.endDate || ""}
              onChange={handleChange}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800" />

      {/* ── 3. Inventory ────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
          3. Inventory
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="currentStock" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {currentType === "Syrup" && syrupStockEntryUnit === "bottles" ? "Bottles on hand" : "Current Stock"}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="currentStock"
                name="inventoryAmount"
                min="0"
                step={currentType === "Syrup" && syrupStockEntryUnit === "ml" ? "any" : "1"}
                value={formData.inventoryAmount || ""}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              {currentType === "Syrup" && (!initialData || currentType !== initialData.type) ? (
                <select aria-label="Syrup stock entry unit" value={syrupStockEntryUnit} onChange={(event) => setSyrupStockEntryUnit(event.target.value as "ml" | "bottles")} className="rounded-xl border border-slate-300 px-2 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  <option value="ml">mL</option>
                  <option value="bottles">bottles</option>
                </select>
              ) : currentType === "Syrup" ? (
                <span className="text-sm text-slate-500 dark:text-slate-400">{initialData?.inventoryUnit ?? "mL"}</span>
              ) : (
                <span className="text-sm text-slate-500 dark:text-slate-400">{getDoseUnit()}</span>
              )}
            </div>
            {currentType === "Syrup" && syrupStockEntryUnit === "bottles" && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Bottle count is converted to available mL using its capacity.</p>}
          </div>
          <div>
            <label htmlFor="lowStockThreshold" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Low Stock Alert At ({initialData && currentType === initialData.type ? initialData.lowStockThresholdUnit ?? initialData.inventoryUnit ?? getDoseUnit() : getDoseUnit()})
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="lowStockThreshold"
                name="lowStockThreshold"
                min="0"
                step={currentType === "Syrup" ? "any" : "1"}
                value={formData.lowStockThreshold ?? ""}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label htmlFor="inventoryCapacity" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Total Stock Capacity (optional)</label>
            <div className="flex items-center gap-2">
              <input id="inventoryCapacity" type="number" name="inventoryCapacity" min="0" step={currentType === "Syrup" ? "any" : "1"} value={formData.inventoryCapacity || ""} onChange={handleChange} className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              <span className="text-sm text-slate-500 dark:text-slate-400">{getDoseUnit()}</span>
            </div>
          </div>
          {currentType === "Syrup" && <div>
            <label htmlFor="inventoryContainerCapacity" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Bottle Capacity</label>
            <div className="flex items-center gap-2">
              <input id="inventoryContainerCapacity" type="number" name="inventoryContainerCapacity" min="0" step="any" value={formData.inventoryContainerCapacity || ""} onChange={handleChange} aria-invalid={Boolean(errors.inventoryContainerCapacity)} className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              <span className="text-sm text-slate-500 dark:text-slate-400">mL</span>
            </div>
            {errors.inventoryContainerCapacity && <p className="mt-1 text-xs text-rose-500">{errors.inventoryContainerCapacity}</p>}
          </div>}
        </div>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800" />

      {/* ── 4. Notes ────────────────────────────────────────────────────────── */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400">
          4. Additional Notes
        </h3>
        <div>
          <label htmlFor="instructions" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Instructions (e.g. After food, With water)
          </label>
          <input
            type="text"
            id="instructions"
            name="instructions"
            value={formData.instructions || ""}
            onChange={handleChange}
            className={inputCls}
          />
        </div>
      </div>

      {/* ── Submit / Cancel ─────────────────────────────────────────────────── */}
      <div className="pt-4 flex flex-col min-[360px]:flex-row items-center justify-center gap-3 sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="min-h-11 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-500 active:scale-95"
        >
          {initialData ? "Save Changes" : "Add Medicine"}
        </button>
      </div>
    </form>
  );
}
