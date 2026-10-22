import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { sortDoseHistoryRecords } from "../lib/doseHistory.ts";
import { appendPrescriptionChange, createEmptyPrescriptionHistoryFilters, createPrescriptionHistoryEntry, filterPrescriptionHistory, groupPrescriptionHistoryByMedicine, hasActivePrescriptionHistoryFilters, normalizeDoctorName, sortPrescriptionHistory } from "../lib/prescriptionHistory.ts";
import { applyMedicineUpdatePreservingCreationDate, formatMedicineAddedAt, sortMedicinesNewestFirst } from "../lib/medicineList.ts";
import { addScheduleBaseline, getMedicineOccurrencesForDate, getScheduledTimesForDate } from "../lib/schedule.ts";
import { ACTIVE_DEMO_EMAIL_KEY, ACTIVE_DEMO_SESSION_KEY, demoProfileStorageKey, loadDemoProfile, saveDemoProfileForActiveSession, serializeDemoProfile } from "../lib/demoProfiles.ts";
import { findBlockingMedicineIdentityMatch, findMedicineIdentityMatches, findPotentialMedicineIdentityPairs } from "../lib/medicineIdentity.ts";
import {
  availableVolumeFromContainers,
  applySkippedDose,
  applyTakenDose,
  doseUnitFor,
  canonicalizeOccurrenceRecords,
  comparePhysicalStock,
  findCloseDoseConflict,
  filterDoseRecords,
  getOccurrenceTimeStatus,
  getOutstandingMissedOccurrences,
  getStockStatus,
  getUnscheduledSameDayMissedOccurrences,
  inventoryUnitFor,
  isOccurrenceOverdue,
  minutesFromScheduledOccurrence,
  scheduledOccurrenceId,
  scheduledOccurrenceKey,
  upsertMissedOccurrenceRecords,
  validateInventoryThreshold,
} from "../lib/medicineLogic.ts";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith("@/")) return nextResolve(specifier, context);
    const basePath = resolve(process.cwd(), specifier.slice(2));
    const candidate = [basePath, `${basePath}.ts`, `${basePath}.tsx`, resolve(basePath, "index.ts")].find(existsSync);
    if (!candidate) throw new Error(`Unable to resolve the project's @/ alias for a test module: ${specifier}`);
    return nextResolve(pathToFileURL(candidate).href, context);
  },
});

const { reconcileHistoricalMissedOccurrences } = await import("../lib/missedDoses.ts");
const { clearDemoSession, DEMO_SESSION_CHANGE_EVENT, readDemoSession, writeDemoSession } = await import("../lib/demoSession.ts");
const { registerDemoAccount, verifyDemoAccount, DemoAccountAlreadyExistsError, DemoPasswordMismatchError } = await import("../lib/demoAuth.ts");

function syrup(overrides = {}) {
  return {
    id: "synthetic-syrup",
    name: "Synthetic syrup",
    type: "Syrup",
    strength: "250 mg/5 ml",
    doseAmount: 0.5,
    doseUnit: "ml",
    frequency: "Every X hours",
    intervalHours: 12,
    scheduleTimes: ["10:00"],
    startDate: "2026-10-14",
    inventoryAmount: 60,
    inventoryCapacity: 60,
    inventoryContainerCapacity: 60,
    inventoryUnit: "ml",
    lowStockThreshold: 5,
    lowStockThresholdUnit: "ml",
    ...overrides,
  };
}

function takenRecord(date, time, actualTakenTime, id = scheduledOccurrenceId("synthetic-syrup", date, time)) {
  return {
    id,
    medicineId: "synthetic-syrup",
    scheduledDate: date,
    scheduledTime: time,
    actualTakenTime,
    status: "taken_late",
  };
}

function localIso(date, time = "00:00") {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute).toISOString();
}

function revision(effectiveAt, overrides = {}) {
  return {
    effectiveAt,
    frequency: "Once daily",
    intervalHours: undefined,
    scheduleTimes: ["08:00"],
    startDate: "2026-10-14",
    endDate: undefined,
    ...overrides,
  };
}

function identityMedicine(overrides = {}) {
  return {
    id: "synthetic-identity-a",
    name: "Calan 40 mg",
    type: "Tablet",
    strength: "40 mg",
    doseAmount: 1,
    doseUnit: "tablets",
    frequency: "Once daily",
    scheduleTimes: ["08:00"],
    startDate: "2026-10-14",
    inventoryAmount: 30,
    inventoryCapacity: 30,
    inventoryUnit: "tablets",
    lowStockThreshold: 5,
    ...overrides,
  };
}

test("12-hour schedules retain distinct 10 AM and 10 PM occurrences across midnight", () => {
  const medicine = syrup();
  assert.deepEqual(getScheduledTimesForDate(medicine, "2026-10-16"), ["10:00", "22:00"]);
  assert.deepEqual(getScheduledTimesForDate(medicine, "2026-10-17"), ["10:00", "22:00"]);
  assert.notEqual(
    scheduledOccurrenceId(medicine.id, "2026-10-16", "10:00"),
    scheduledOccurrenceId(medicine.id, "2026-10-16", "22:00"),
  );
});

test("new medicines omit pre-creation occurrences without changing their configured schedule", () => {
  const medicine = syrup({
    startDate: "2026-10-14",
    createdAt: new Date(2026, 9, 16, 22, 30).toISOString(),
    frequency: "Every day",
    scheduleTimes: ["10:00", "22:00", "23:30"],
  });
  assert.deepEqual(getScheduledTimesForDate(medicine, "2026-10-15"), []);
  assert.deepEqual(getScheduledTimesForDate(medicine, "2026-10-16"), ["23:30"]);
  assert.deepEqual(getScheduledTimesForDate(medicine, "2026-10-17"), ["10:00", "22:00", "23:30"]);
  assert.deepEqual(medicine.scheduleTimes, ["10:00", "22:00", "23:30"]);
});

test("every-12-hours schedule filters pre-creation instances and continues across midnight", () => {
  const medicine = syrup({ createdAt: new Date(2026, 9, 16, 22, 30).toISOString() });
  assert.deepEqual(getScheduledTimesForDate(medicine, "2026-10-15"), []);
  assert.deepEqual(getScheduledTimesForDate(medicine, "2026-10-16"), []);
  assert.deepEqual(getScheduledTimesForDate(medicine, "2026-10-17"), ["10:00", "22:00"]);
});

test("a late 10 AM record does not mark the 10 PM occurrence taken", () => {
  const actual = new Date(2026, 9, 16, 22, 32).toISOString();
  assert.equal(minutesFromScheduledOccurrence("2026-10-16", "10:00", actual), 752);
  assert.equal(minutesFromScheduledOccurrence("2026-10-16", "22:00", actual), 32);
  const result = applyTakenDose([syrup()], [], takenRecord("2026-10-16", "10:00", actual), 0.5);
  assert.equal(result.accepted, true);
  assert.equal(result.doseRecords[0].scheduledTime, "10:00");
  assert.equal(result.doseRecords[0].actualTakenTime, actual);
  assert.equal(result.medicines[0].inventoryAmount, 59.5);
});

test("taking 10 PM records its own occurrence and actual timestamp", () => {
  const actual = new Date(2026, 9, 16, 22, 32).toISOString();
  const morning = applyTakenDose([syrup()], [], takenRecord("2026-10-16", "10:00", actual), 0.5);
  const eveningTime = new Date(2026, 9, 16, 22, 35).toISOString();
  const evening = applyTakenDose(morning.medicines, morning.doseRecords, takenRecord("2026-10-16", "22:00", eveningTime), 0.5);
  assert.equal(evening.accepted, true);
  assert.equal(evening.doseRecords.length, 2);
  assert.equal(evening.doseRecords[1].scheduledTime, "22:00");
  assert.equal(evening.doseRecords[1].actualTakenTime, eveningTime);
  assert.equal(evening.medicines[0].inventoryAmount, 59);
});

test("duplicate action and reload cannot deduct a scheduled occurrence twice", () => {
  const record = takenRecord("2026-10-16", "10:00", new Date(2026, 9, 16, 10, 2).toISOString());
  const first = applyTakenDose([syrup()], [], record, 0.5);
  const duplicate = applyTakenDose(structuredClone(first.medicines), structuredClone(first.doseRecords), record, 0.5);
  assert.equal(first.medicines[0].inventoryAmount, 59.5);
  assert.equal(duplicate.accepted, false);
  assert.equal(duplicate.reason, "duplicate");
  assert.equal(duplicate.medicines[0].inventoryAmount, 59.5);
  assert.equal(duplicate.doseRecords.length, 1);
});

test("a taken legacy occurrence is not duplicated when a pending record appears first", () => {
  const pending = { id: "legacy-pending", medicineId: "synthetic-syrup", scheduledDate: "2026-10-16", scheduledTime: "10:00", status: "overdue" };
  const taken = takenRecord("2026-10-16", "10:00", new Date(2026, 9, 16, 10, 2).toISOString(), "legacy-taken");
  const replacement = takenRecord("2026-10-16", "10:00", new Date(2026, 9, 16, 10, 3).toISOString());
  const result = applyTakenDose([syrup()], [pending, taken], replacement, 0.5);
  assert.equal(result.accepted, false);
  assert.equal(result.reason, "duplicate");
  assert.equal(result.medicines[0].inventoryAmount, 60);
  assert.equal(result.doseRecords.length, 2);
  assert.equal(result.doseRecords[0].id, "legacy-pending");
  assert.equal(result.doseRecords[1].id, "legacy-taken");
});

test("pending doses do not deduct inventory", () => {
  const pending = { id: "pending", medicineId: "synthetic-syrup", scheduledDate: "2026-10-16", scheduledTime: "10:00" };
  const result = applyTakenDose([syrup()], [], pending, 0.5);
  assert.equal(result.accepted, false);
  assert.equal(result.reason, "pending");
  assert.equal(result.medicines[0].inventoryAmount, 60);
});

test("stock units, capacity, and decimal liquid deduction remain separate", () => {
  const startingVolume = availableVolumeFromContainers(1, 60);
  assert.equal(startingVolume, 60);
  const result = applyTakenDose([syrup({ inventoryAmount: startingVolume })], [], takenRecord("2026-10-16", "10:00", new Date(2026, 9, 16, 10, 1).toISOString()), 0.5);
  assert.equal(result.medicines[0].inventoryAmount, 59.5);
  assert.equal(result.medicines[0].inventoryContainerCapacity, 60);
});

test("physical stock comparison reports lower, matching, and higher quantities without mutating tracker data", () => {
  const medicine = syrup({ inventoryAmount: 8 });
  const doseRecords = [takenRecord("2026-10-16", "08:00", "2026-10-16T08:02:00.000Z")];
  const medicineBefore = structuredClone(medicine);
  const recordsBefore = structuredClone(doseRecords);

  assert.deepEqual(comparePhysicalStock(8, 7, "tablets", "tablets"), { available: true, difference: 1, result: "lower" });
  assert.deepEqual(comparePhysicalStock(8, 8, "tablets", "tablets"), { available: true, difference: 0, result: "match" });
  assert.deepEqual(comparePhysicalStock(8, 9, "tablets", "tablets"), { available: true, difference: -1, result: "higher" });
  assert.deepEqual(medicine, medicineBefore);
  assert.deepEqual(doseRecords, recordsBefore);
});

test("physical stock comparison allows zero and liquid decimals, and rejects invalid or unavailable values and incompatible units", () => {
  assert.deepEqual(comparePhysicalStock(0, "0", "mL", "ml"), { available: true, difference: 0, result: "match" });
  assert.deepEqual(comparePhysicalStock(8.5, "8.25", "ml", "ml"), { available: true, difference: 0.25, result: "lower" });
  assert.deepEqual(comparePhysicalStock(8, "", "tablets", "tablets"), { available: false, reason: "invalid-physical-quantity" });
  assert.deepEqual(comparePhysicalStock(8, -1, "tablets", "tablets"), { available: false, reason: "invalid-physical-quantity" });
  assert.deepEqual(comparePhysicalStock(Number.NaN, 2, "tablets", "tablets"), { available: false, reason: "expected-unavailable" });
  assert.deepEqual(comparePhysicalStock(8, 2, "tablets", "capsules"), { available: false, reason: "incompatible-units" });
  assert.deepEqual(comparePhysicalStock(8, 2, "", ""), { available: false, reason: "expected-unavailable" });
});

test("incompatible legacy stock units are preserved and cannot be dose-deducted", () => {
  const legacyBottleCount = syrup({ inventoryAmount: 1, inventoryUnit: "bottles", inventoryContainerCapacity: undefined });
  const record = takenRecord("2026-10-16", "10:00", new Date(2026, 9, 16, 10, 1).toISOString());
  const result = applyTakenDose([legacyBottleCount], [], record, 0.5);
  assert.equal(result.accepted, false);
  assert.equal(result.reason, "incompatible-units");
  assert.equal(result.medicines[0].inventoryAmount, 1);
  assert.equal(result.medicines[0].inventoryUnit, "bottles");
  assert.equal(getStockStatus(legacyBottleCount), "unknown");
});

test("threshold zero and five distinguish out, low, and positive stock", () => {
  assert.equal(getStockStatus(syrup({ inventoryAmount: 0, lowStockThreshold: 0 })), "out");
  assert.equal(getStockStatus(syrup({ inventoryAmount: 0.5, lowStockThreshold: 0 })), "available");
  assert.equal(getStockStatus(syrup({ inventoryAmount: 5, lowStockThreshold: 5 })), "low");
  assert.equal(getStockStatus(syrup({ inventoryAmount: 5.5, lowStockThreshold: 5 })), "available");
  assert.equal(getStockStatus(syrup({ inventoryAmount: 4, lowStockThreshold: 5, lowStockThresholdUnit: "bottles" })), "unknown");
});

test("stock and low-stock threshold validation enforces the requested boundary for add and edit", () => {
  const cases = [
    { stock: 1, threshold: 5, valid: false },
    { stock: 5, threshold: 5, valid: true },
    { stock: 5, threshold: 1, valid: true },
    { stock: 0, threshold: 0, valid: true },
    { stock: 0, threshold: 1, valid: false },
  ];
  for (const { stock, threshold, valid } of cases) {
    const addValidation = validateInventoryThreshold(stock, threshold);
    const editValidation = validateInventoryThreshold(stock, threshold);
    assert.equal(addValidation.valid, valid, `Add Medicine ${stock}/${threshold}`);
    assert.equal(editValidation.valid, valid, `Edit Medicine ${stock}/${threshold}`);
  }
  assert.equal(validateInventoryThreshold(1.25, 1.2).valid, true);
  assert.equal(validateInventoryThreshold(-1, 0).inventoryAmountError, "Current stock must be a valid non-negative quantity.");
  assert.equal(validateInventoryThreshold(1, -0.1).lowStockThresholdError, "Low-stock threshold must be a valid non-negative quantity.");
  assert.equal(validateInventoryThreshold("", 0).valid, false);
  assert.equal(validateInventoryThreshold(1, 1.1).lowStockThresholdError, "Low-stock threshold cannot be greater than current stock.");
});

test("legacy syrup quantities remain interpreted as mL and existing history is retained", () => {
  const legacyMedicine = syrup({ inventoryAmount: 1, inventoryCapacity: 60, inventoryContainerCapacity: undefined, inventoryUnit: undefined, doseUnit: undefined });
  const oldRecord = { id: "legacy-record", medicineId: "another-med", scheduledDate: "2026-10-15", scheduledTime: "08:00", actualTakenTime: "2026-10-15T08:05:00.000Z", status: "taken_late" };
  assert.equal(inventoryUnitFor(legacyMedicine), "ml");
  assert.equal(doseUnitFor(legacyMedicine), "ml");
  const result = applyTakenDose([legacyMedicine], [oldRecord], takenRecord("2026-10-16", "10:00", new Date(2026, 9, 16, 10, 1).toISOString()), 0.5);
  assert.equal(result.medicines[0].inventoryAmount, 0.5);
  assert.equal(result.doseRecords.length, 2);
  assert.equal(result.doseRecords[0].id, "legacy-record");
});

test("tablet inventory continues to deduct in tablet units", () => {
  const tablet = { id: "synthetic-tablet", type: "Tablet", inventoryAmount: 10, inventoryUnit: "tablets", doseUnit: "tablets", lowStockThreshold: 5, lowStockThresholdUnit: "tablets" };
  const record = { id: "tablet-2026-10-16-08:00", medicineId: tablet.id, scheduledDate: "2026-10-16", scheduledTime: "08:00", actualTakenTime: new Date(2026, 9, 16, 8, 0).toISOString(), status: "taken_on_time" };
  const result = applyTakenDose([tablet], [], record, 1);
  assert.equal(result.accepted, true);
  assert.equal(result.medicines[0].inventoryAmount, 9);
});

test("five-minute overdue threshold uses elapsed milliseconds, including across midnight", () => {
  const scheduledAt = new Date(2026, 9, 16, 23, 58);
  assert.equal(isOccurrenceOverdue(scheduledAt, new Date(2026, 9, 17, 0, 2, 59, 999)), false);
  assert.equal(isOccurrenceOverdue(scheduledAt, new Date(2026, 9, 17, 0, 3)), true);
});

test("dashboard dose-time lifecycle uses exact elapsed boundaries", () => {
  const scheduledAt = new Date(2026, 9, 16, 8, 0);
  assert.equal(getOccurrenceTimeStatus(scheduledAt, new Date(scheduledAt.getTime() - 1)), "upcoming");
  assert.equal(getOccurrenceTimeStatus(scheduledAt, scheduledAt), "due");
  assert.equal(getOccurrenceTimeStatus(scheduledAt, new Date(scheduledAt.getTime() + 5 * 60_000 - 1)), "due");
  assert.equal(getOccurrenceTimeStatus(scheduledAt, new Date(scheduledAt.getTime() + 5 * 60_000)), "overdue");
  assert.equal(getOccurrenceTimeStatus(scheduledAt, new Date(scheduledAt.getTime() + 5 * 60_000 + 1)), "overdue");
});

test("schedule revisions prevent invented historical times and apply known frequency changes", () => {
  const medicine = syrup({
    frequency: "Once daily",
    scheduleTimes: ["09:00"],
    scheduleRevisions: [
      revision(localIso("2026-10-14"), { scheduleTimes: ["08:00"] }),
      revision(localIso("2026-10-17"), { scheduleTimes: ["09:00"] }),
    ],
  });
  assert.deepEqual(getMedicineOccurrencesForDate(medicine, "2026-10-16").map((item) => item.scheduledTime), ["08:00"]);
  assert.deepEqual(getMedicineOccurrencesForDate(medicine, "2026-10-17").map((item) => item.scheduledTime), ["09:00"]);

  const morningEdit = syrup({
    scheduleRevisions: [
      revision(localIso("2026-10-14"), { scheduleTimes: ["08:00"] }),
      revision(localIso("2026-10-17", "07:00"), { scheduleTimes: ["09:00"] }),
    ],
  });
  const afternoonEdit = syrup({
    scheduleRevisions: [
      revision(localIso("2026-10-14"), { scheduleTimes: ["08:00"] }),
      revision(localIso("2026-10-17", "10:00"), { scheduleTimes: ["09:00"] }),
    ],
  });
  assert.deepEqual(getMedicineOccurrencesForDate(morningEdit, "2026-10-17").map((item) => item.scheduledTime), ["09:00"]);
  assert.deepEqual(getMedicineOccurrencesForDate(afternoonEdit, "2026-10-17").map((item) => item.scheduledTime), ["08:00"]);

  const frequencyChanged = syrup({
    frequency: "Once weekly",
    scheduleTimes: ["09:00"],
    scheduleRevisions: [
      revision(localIso("2026-10-14"), { frequency: "Once daily", scheduleTimes: ["08:00"] }),
      revision(localIso("2026-10-17"), { frequency: "Once weekly", scheduleTimes: ["09:00"] }),
    ],
  });
  assert.equal(getMedicineOccurrencesForDate(frequencyChanged, "2026-10-16").length, 1);
  assert.equal(getMedicineOccurrencesForDate(frequencyChanged, "2026-10-17").length, 0);
  assert.equal(getMedicineOccurrencesForDate(frequencyChanged, "2026-10-21").length, 1);

  const now = new Date(localIso("2026-10-19", "12:00"));
  const reconciled = reconcileHistoricalMissedOccurrences([medicine], [], now);
  assert.deepEqual(reconciled.map((record) => [record.scheduledDate, record.scheduledTime, record.status]), [
    ["2026-10-14", "08:00", "missed"],
    ["2026-10-15", "08:00", "missed"],
    ["2026-10-16", "08:00", "missed"],
    ["2026-10-17", "09:00", "missed"],
    ["2026-10-18", "09:00", "missed"],
    ["2026-10-19", "09:00", "overdue"],
  ]);

  const bounded = syrup({
    scheduleRevisions: [
      revision(localIso("2026-10-14"), { endDate: "2026-10-16" }),
      revision(localIso("2026-10-17"), { scheduleTimes: ["09:00"], startDate: "2026-10-18" }),
    ],
  });
  assert.equal(getMedicineOccurrencesForDate(bounded, "2026-10-17").length, 0);
  assert.deepEqual(getMedicineOccurrencesForDate(bounded, "2026-10-18").map((item) => item.scheduledTime), ["09:00"]);
});

test("an overdue occurrence stays unresolved until the next scheduled occurrence is due", () => {
  const daily = syrup({ frequency: "Once daily", scheduleTimes: ["08:00"], startDate: "2026-10-14", scheduleRevisions: [revision(localIso("2026-10-14"), { frequency: "Once daily", scheduleTimes: ["08:00"] })] });
  const beforeNextDose = reconcileHistoricalMissedOccurrences([daily], [], new Date(localIso("2026-10-15", "07:59")));
  assert.deepEqual(beforeNextDose.map((record) => [record.scheduledDate, record.scheduledTime, record.status]), [["2026-10-14", "08:00", "overdue"]]);

  const atNextDose = reconcileHistoricalMissedOccurrences([daily], beforeNextDose, new Date(localIso("2026-10-15", "08:00")));
  assert.deepEqual(atNextDose.map((record) => [record.scheduledDate, record.scheduledTime, record.status]), [["2026-10-14", "08:00", "missed"]]);

  const afterNextDose = reconcileHistoricalMissedOccurrences([daily], atNextDose, new Date(localIso("2026-10-15", "08:06")));
  assert.deepEqual(afterNextDose.map((record) => [record.scheduledDate, record.scheduledTime, record.status]), [
    ["2026-10-14", "08:00", "missed"],
    ["2026-10-15", "08:00", "overdue"],
  ]);
});

test("taking before cutoff updates the saved occurrence and later reconciliation preserves Taken", () => {
  const daily = syrup({ frequency: "Once daily", scheduleTimes: ["08:00"], startDate: "2026-10-14", scheduleRevisions: [revision(localIso("2026-10-14"), { frequency: "Once daily", scheduleTimes: ["08:00"] })] });
  const pending = reconcileHistoricalMissedOccurrences([daily], [], new Date(localIso("2026-10-15", "07:59")));
  const original = pending[0];
  const actualTakenTime = localIso("2026-10-15", "07:59");
  const taken = applyTakenDose([daily], pending, { ...original, actualTakenTime, status: "taken_late" }, daily.doseAmount);
  assert.equal(taken.accepted, true);
  assert.equal(taken.doseRecords.length, 1);
  assert.deepEqual([taken.doseRecords[0].id, taken.doseRecords[0].scheduledDate, taken.doseRecords[0].scheduledTime, taken.doseRecords[0].actualTakenTime], [original.id, "2026-10-14", "08:00", actualTakenTime]);
  assert.equal(taken.medicines[0].inventoryAmount, daily.inventoryAmount - daily.doseAmount);

  const profileStorage = new Map();
  const syntheticStorage = {
    getItem: (key) => profileStorage.get(key) ?? null,
    setItem: (key, value) => profileStorage.set(key, value),
  };
  const profileKey = demoProfileStorageKey("late-dose@example.invalid");
  profileStorage.set(profileKey, serializeDemoProfile({ email: "late-dose@example.invalid", medicines: taken.medicines, doseRecords: taken.doseRecords }));
  const reloaded = loadDemoProfile(syntheticStorage, "late-dose@example.invalid");
  const afterCutoff = reconcileHistoricalMissedOccurrences(reloaded.medicines, reloaded.doseRecords, new Date(localIso("2026-10-15", "08:00")));
  assert.equal(afterCutoff.length, 1);
  assert.equal(afterCutoff[0].status, "taken_late");
  assert.equal(afterCutoff[0].actualTakenTime, actualTakenTime);
  const duplicate = applyTakenDose(taken.medicines, afterCutoff, { ...original, actualTakenTime, status: "taken_late" }, daily.doseAmount);
  assert.equal(duplicate.reason, "duplicate");
  assert.equal(duplicate.medicines[0].inventoryAmount, daily.inventoryAmount - daily.doseAmount);
});

test("manual schedule revision sets the missed cutoff at its next active scheduled time", () => {
  const edited = syrup({
    frequency: "Once daily",
    scheduleTimes: ["10:00"],
    startDate: "2026-10-14",
    scheduleRevisions: [
      revision(localIso("2026-10-14"), { frequency: "Once daily", scheduleTimes: ["08:00"] }),
      revision(localIso("2026-10-15", "07:00"), { frequency: "Once daily", scheduleTimes: ["10:00"] }),
    ],
  });
  assert.deepEqual(reconcileHistoricalMissedOccurrences([edited], [], new Date(localIso("2026-10-15", "09:59"))).map((record) => [record.scheduledDate, record.status]), [["2026-10-14", "overdue"]]);
  assert.deepEqual(reconcileHistoricalMissedOccurrences([edited], [], new Date(localIso("2026-10-15", "10:00"))).map((record) => [record.scheduledDate, record.status]), [["2026-10-14", "missed"]]);
});

test("incremental reconciliation finds a previous weekly occurrence across its schedule gap", () => {
  const weekly = syrup({
    frequency: "Once weekly",
    scheduleTimes: ["08:00"],
    startDate: "2026-10-14",
    scheduleRevisions: [revision(localIso("2026-10-14"), { frequency: "Once weekly", scheduleTimes: ["08:00"] })],
  });
  const reconciled = reconcileHistoricalMissedOccurrences([weekly], [], new Date(localIso("2026-10-21", "08:00")), "2026-10-20");
  assert.deepEqual(reconciled.map((record) => [record.scheduledDate, record.status]), [["2026-10-14", "missed"]]);
});

test("unknown legacy schedule periods do not create missed occurrences, and deletion preserves existing history", () => {
  const legacy = syrup({
    frequency: "Once daily",
    scheduleTimes: ["09:00"],
    startDate: "2026-10-14",
  });
  const now = new Date(localIso("2026-10-18", "12:00"));
  assert.equal(reconcileHistoricalMissedOccurrences([legacy], [], now).length, 0);

  const known = syrup({ scheduleRevisions: [revision(localIso("2026-10-14"))] });
  const materialized = reconcileHistoricalMissedOccurrences([known], [], now);
  assert.ok(materialized.length > 0);
  const afterDelete = reconcileHistoricalMissedOccurrences([], materialized, now);
  assert.equal(afterDelete, materialized);
  assert.equal(afterDelete.some((record) => record.medicineId === known.id), true);
});

test("legacy local profile shape remains readable and new optional schedule history round-trips", () => {
  const storage = new Map();
  const syntheticStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  const legacyMedicine = { ...syrup(), scheduleRevisions: undefined };
  const oldDose = takenRecord("2026-10-16", "10:00", localIso("2026-10-16", "10:10"));
  storage.set(demoProfileStorageKey("compat@example.invalid"), serializeDemoProfile({
    email: "compat@example.invalid",
    medicines: [legacyMedicine],
    doseRecords: [oldDose],
  }));
  const loaded = loadDemoProfile(syntheticStorage, "COMPAT@example.invalid");
  assert.equal(loaded.medicines.length, 1);
  assert.equal(loaded.doseRecords.length, 1);
  assert.equal(loaded.doseRecords[0].id, oldDose.id);

  const revised = { ...legacyMedicine, scheduleRevisions: [revision(localIso("2026-10-16"))] };
  storage.set(demoProfileStorageKey("compat@example.invalid"), serializeDemoProfile({ ...loaded, medicines: [revised] }));
  const roundTrip = loadDemoProfile(syntheticStorage, "compat@example.invalid");
  assert.equal(roundTrip.medicines[0].scheduleRevisions[0].scheduleTimes[0], "08:00");
  assert.equal(roundTrip.doseRecords[0].id, oldDose.id);
});

test("profile persistence rejects a stale owner after the active session changes", () => {
  const storage = new Map();
  const syntheticStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  const profileA = { email: "account-a@example.invalid", medicines: [{ id: "A" }], doseRecords: [] };
  const profileB = { email: "account-b@example.invalid", medicines: [{ id: "B" }], doseRecords: [] };

  storage.set(ACTIVE_DEMO_SESSION_KEY, "active");
  storage.set(ACTIVE_DEMO_EMAIL_KEY, "account-a@example.invalid");
  assert.equal(saveDemoProfileForActiveSession(syntheticStorage, profileA), true);
  const savedA = storage.get(demoProfileStorageKey(profileA.email));

  // Simulate another tab switching the shared session before a queued old-profile save runs.
  storage.set(ACTIVE_DEMO_EMAIL_KEY, "account-b@example.invalid");
  assert.equal(saveDemoProfileForActiveSession(syntheticStorage, { ...profileA, medicines: [{ id: "stale" }] }), false);
  assert.equal(storage.get(demoProfileStorageKey(profileA.email)), savedA);
  assert.equal(saveDemoProfileForActiveSession(syntheticStorage, profileB), true);
  assert.deepEqual(loadDemoProfile(syntheticStorage, profileB.email).medicines, [{ id: "B" }]);
});

test("malformed profile data is rejected without replacing the stored value", () => {
  const storage = new Map();
  const email = "malformed-profile@example.invalid";
  const key = demoProfileStorageKey(email);
  const malformed = "{not valid profile json";
  storage.set(key, malformed);

  assert.throws(() => loadDemoProfile({ getItem: (storageKey) => storage.get(storageKey) ?? null }, email));
  assert.equal(storage.get(key), malformed);
});

test("a legitimate empty profile remains loadable and writable for its active session", () => {
  const storage = new Map();
  const syntheticStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  const profile = { email: "empty-profile@example.invalid", medicines: [], doseRecords: [], prescriptionHistory: [] };
  storage.set(ACTIVE_DEMO_SESSION_KEY, "active");
  storage.set(ACTIVE_DEMO_EMAIL_KEY, profile.email);

  assert.deepEqual(loadDemoProfile(syntheticStorage, profile.email), profile);
  assert.equal(saveDemoProfileForActiveSession(syntheticStorage, profile), true);
  assert.deepEqual(loadDemoProfile(syntheticStorage, profile.email), profile);
});

test("session login, refresh restoration, logout, and same-tab notification retain the active identity", () => {
  const values = () => new Map();
  const makeStorage = (map) => ({
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  });
  const persistent = values();
  const tab = values();
  const target = new EventTarget();
  target.localStorage = makeStorage(persistent);
  target.sessionStorage = makeStorage(tab);
  let notifications = 0;
  target.addEventListener(DEMO_SESSION_CHANGE_EVENT, () => { notifications += 1; });
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: target });
  try {
    writeDemoSession("  Person@Example.invalid ");
    assert.deepEqual(readDemoSession(), { email: "person@example.invalid" });
    assert.equal(notifications, 1);
    // A fresh provider load after refresh reads the same persistent identity.
    assert.deepEqual(readDemoSession(), { email: "person@example.invalid" });
    clearDemoSession();
    assert.equal(readDemoSession(), null);
    assert.equal(notifications, 2);
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else delete globalThis.window;
  }
});

test("synthetic local account registration and login still enforce credentials", async () => {
  const storage = new Map();
  const syntheticStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  const email = "auth-regression@example.invalid";
  const registeredEmail = await registerDemoAccount(syntheticStorage, ` ${email.toUpperCase()} `, "synthetic-password-123");
  assert.equal(registeredEmail, email);
  assert.equal(await verifyDemoAccount(syntheticStorage, email, "synthetic-password-123"), email);
  await assert.rejects(registerDemoAccount(syntheticStorage, email.toUpperCase(), "another-synthetic-password"), DemoAccountAlreadyExistsError);
  await assert.rejects(verifyDemoAccount(syntheticStorage, email, "incorrect-synthetic-password"), DemoPasswordMismatchError);
});

test("legacy hydration baseline keeps today's earlier scheduled dose visible after profile reload", () => {
  const date = "2026-10-18";
  const now = new Date(localIso(date, "12:00"));
  const legacyMedicine = syrup({
    frequency: "Once daily",
    scheduleTimes: ["08:00"],
    startDate: "2026-10-14",
    createdAt: localIso("2026-10-14", "00:00"),
    scheduleRevisions: undefined,
  });
  const hydratedMedicine = addScheduleBaseline([legacyMedicine], now.toISOString())[0];
  const storage = new Map();
  const syntheticStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  storage.set(demoProfileStorageKey("legacy@example.invalid"), serializeDemoProfile({
    email: "legacy@example.invalid",
    medicines: [hydratedMedicine],
    doseRecords: [],
  }));

  const reloaded = loadDemoProfile(syntheticStorage, "legacy@example.invalid");
  const occurrences = getMedicineOccurrencesForDate(reloaded.medicines[0], date);
  assert.deepEqual(occurrences.map((occurrence) => occurrence.scheduledTime), ["08:00"]);
  assert.equal(getOccurrenceTimeStatus(occurrences[0].scheduledAt, now), "overdue");
  const reconciled = reconcileHistoricalMissedOccurrences(reloaded.medicines, [], now);
  assert.equal(reconciled.find((record) => record.scheduledDate === date)?.status, "overdue");
  assert.equal(reconciled.some((record) => record.scheduledDate === date && record.status === "missed"), false);
});

test("previously persisted unmarked hydration baseline is recognized without changing schedule data", () => {
  const date = "2026-10-18";
  const now = new Date(localIso(date, "12:00"));
  const oldHydrationRevision = syrup({
    frequency: "Once daily",
    scheduleTimes: ["08:00"],
    startDate: "2026-10-14",
    createdAt: localIso("2026-10-14", "00:00"),
    scheduleRevisions: [{
      effectiveAt: now.toISOString(),
      frequency: "Once daily",
      scheduleTimes: ["08:00"],
      startDate: "2026-10-14",
    }],
  });
  const recognized = addScheduleBaseline([oldHydrationRevision])[0];
  assert.equal(recognized.scheduleRevisions[0].hydrationBaseline, true);
  assert.deepEqual(recognized.scheduleRevisions[0].scheduleTimes, ["08:00"]);
  assert.deepEqual(getMedicineOccurrencesForDate(recognized, date).map((occurrence) => occurrence.scheduledTime), ["08:00"]);

  const creationRevision = { ...oldHydrationRevision, scheduleRevisions: [{ ...oldHydrationRevision.scheduleRevisions[0], effectiveAt: oldHydrationRevision.createdAt }] };
  assert.equal(addScheduleBaseline([creationRevision])[0].scheduleRevisions[0].hydrationBaseline, undefined);
});

test("unrepresented same-day missed occurrences remain available for the dashboard action", () => {
  const today = "2026-10-18";
  const unresolved = {
    id: "today-missed",
    medicineId: "synthetic-syrup",
    scheduledDate: today,
    scheduledTime: "08:00",
    status: "missed",
  };
  const alreadyTaken = { ...unresolved, id: "today-taken", status: "taken_late", actualTakenTime: localIso(today, "08:30") };
  const priorDay = { ...unresolved, id: "prior-missed", scheduledDate: "2026-10-17" };
  const prn = { ...unresolved, id: "prn-missed", isPrn: true };
  assert.deepEqual(
    getUnscheduledSameDayMissedOccurrences([unresolved, priorDay, prn], today, new Set()).map((record) => record.id),
    [unresolved.id],
  );
  assert.deepEqual(getUnscheduledSameDayMissedOccurrences([unresolved, alreadyTaken], today, new Set()), []);
  assert.deepEqual(
    getUnscheduledSameDayMissedOccurrences([unresolved], today, new Set([scheduledOccurrenceKey(unresolved.medicineId, today, "08:00")])),
    [],
  );
});

test("PRN schedules never materialize missed occurrences", () => {
  const prn = syrup({
    frequency: "As needed (PRN)",
    scheduleTimes: [],
    scheduleRevisions: [revision(localIso("2026-10-14"), { frequency: "As needed (PRN)", scheduleTimes: [] })],
  });
  assert.equal(reconcileHistoricalMissedOccurrences([prn], [], new Date(localIso("2026-10-18", "12:00"))).length, 0);
});

test("historical missed occurrences persist as distinct records and reconciliation is idempotent", () => {
  const candidate = (date, time = "08:00") => ({
    id: scheduledOccurrenceId("synthetic-syrup", date, time), medicineId: "synthetic-syrup",
    scheduledDate: date, scheduledTime: time, status: "missed",
  });
  const firstPass = upsertMissedOccurrenceRecords([], [candidate("2026-10-09"), candidate("2026-10-10")]);
  assert.deepEqual(firstPass.map(({ scheduledDate, status }) => [scheduledDate, status]), [
    ["2026-10-09", "missed"],
    ["2026-10-10", "missed"],
  ]);
  assert.deepEqual(getOutstandingMissedOccurrences(firstPass, "2026-10-10").map((record) => record.scheduledDate), ["2026-10-09"]);
  assert.deepEqual(getOutstandingMissedOccurrences(firstPass, "2026-10-11").map((record) => record.scheduledDate), ["2026-10-10", "2026-10-09"]);
  assert.equal(upsertMissedOccurrenceRecords(firstPass, [candidate("2026-10-09"), candidate("2026-10-10")]), firstPass);
});

test("a pending saved occurrence transitions to missed without changing its identity", () => {
  const pending = { id: "existing-occurrence-id", medicineId: "synthetic-syrup", scheduledDate: "2026-10-10", scheduledTime: "08:00", status: "overdue" };
  const candidate = { id: scheduledOccurrenceId(pending.medicineId, pending.scheduledDate, pending.scheduledTime), medicineId: pending.medicineId, scheduledDate: pending.scheduledDate, scheduledTime: pending.scheduledTime, status: "missed" };
  const updated = upsertMissedOccurrenceRecords([pending], [candidate]);
  assert.equal(updated.length, 1);
  assert.equal(updated[0].id, pending.id);
  assert.equal(updated[0].status, "missed");
});

test("taking today's dose does not rewrite previous missed occurrences", () => {
  const daily = syrup();
  const missed = upsertMissedOccurrenceRecords([], [
    { id: "missed-09", medicineId: daily.id, scheduledDate: "2026-10-09", scheduledTime: "08:00", status: "missed" },
    { id: "missed-10", medicineId: daily.id, scheduledDate: "2026-10-10", scheduledTime: "08:00", status: "missed" },
  ]);
  const todayRecord = {
    id: scheduledOccurrenceId(daily.id, "2026-10-11", "08:00"),
    medicineId: daily.id,
    scheduledDate: "2026-10-11",
    scheduledTime: "08:00",
    actualTakenTime: new Date(2026, 9, 11, 9, 1).toISOString(),
    status: "taken_late",
  };
  const result = applyTakenDose([daily], missed, todayRecord, daily.doseAmount);
  assert.equal(result.accepted, true);
  assert.deepEqual(result.doseRecords.filter((record) => record.status === "missed").map((record) => record.scheduledDate), ["2026-10-09", "2026-10-10"]);
});

test("late completion updates only the original missed occurrence and deducts once", () => {
  const daily = syrup();
  const original = { id: "missed-10", medicineId: daily.id, scheduledDate: "2026-10-10", scheduledTime: "08:00", status: "missed" };
  const missed = upsertMissedOccurrenceRecords([], [original]);
  const actualTakenTime = new Date(2026, 9, 11, 9, 2).toISOString();
  const lateRecord = { ...original, status: "taken_late", actualTakenTime };
  const result = applyTakenDose([daily], missed, lateRecord, daily.doseAmount);
  assert.equal(result.accepted, true);
  assert.equal(result.doseRecords[0].id, original.id);
  assert.equal(result.doseRecords[0].scheduledDate, "2026-10-10");
  assert.equal(result.doseRecords[0].scheduledTime, "08:00");
  assert.equal(result.doseRecords[0].actualTakenTime, actualTakenTime);
  assert.equal(result.medicines[0].inventoryAmount, daily.inventoryAmount - daily.doseAmount);
  assert.equal(applyTakenDose(result.medicines, result.doseRecords, lateRecord, daily.doseAmount).reason, "duplicate");
  assert.equal(scheduledOccurrenceKey(daily.id, "2026-10-10", "08:00"), scheduledOccurrenceKey(result.doseRecords[0].medicineId, result.doseRecords[0].scheduledDate, result.doseRecords[0].scheduledTime));
});

test("same-day missed dashboard occurrence becomes taken once without a conflicting history entry", () => {
  const today = "2026-10-18";
  const daily = syrup();
  const original = {
    id: scheduledOccurrenceId(daily.id, today, "08:00"),
    medicineId: daily.id,
    scheduledDate: today,
    scheduledTime: "08:00",
    scheduledInstant: localIso(today, "08:00"),
    status: "missed",
  };
  const actualTakenTime = localIso(today, "13:45");
  const taken = applyTakenDose([daily], [original], { ...original, status: "taken_late", actualTakenTime }, daily.doseAmount);
  assert.equal(taken.accepted, true);
  assert.equal(taken.doseRecords.length, 1);
  assert.deepEqual(
    [taken.doseRecords[0].scheduledDate, taken.doseRecords[0].scheduledTime, taken.doseRecords[0].actualTakenTime, taken.doseRecords[0].status],
    [today, "08:00", actualTakenTime, "taken_late"],
  );
  assert.equal(canonicalizeOccurrenceRecords(taken.doseRecords).filter((record) => record.scheduledDate === today).length, 1);
  assert.equal(getOutstandingMissedOccurrences(taken.doseRecords, "2026-10-19").length, 0);
  const duplicate = applyTakenDose(taken.medicines, taken.doseRecords, { ...original, status: "taken_late", actualTakenTime }, daily.doseAmount);
  assert.equal(duplicate.reason, "duplicate");
  assert.equal(duplicate.medicines[0].inventoryAmount, daily.inventoryAmount - daily.doseAmount);
});

test("skipping persists after reload without changing inventory or becoming actionable again", () => {
  const date = "2026-10-14";
  const today = "2026-10-15";
  const medicine = syrup({
    frequency: "Once daily",
    intervalHours: undefined,
    scheduleTimes: ["08:00"],
    startDate: date,
    scheduleRevisions: [revision(localIso(date), { frequency: "Once daily", intervalHours: undefined, scheduleTimes: ["08:00"], startDate: date })],
  });
  const overdue = reconcileHistoricalMissedOccurrences([medicine], [], new Date(localIso(today, "08:00")));
  assert.equal(overdue[0].status, "missed");
  const inventoryBeforeSkip = medicine.inventoryAmount;
  const skipped = applySkippedDose(overdue, overdue[0]);
  assert.equal(skipped.accepted, true);
  assert.equal("medicines" in skipped, false);
  assert.equal(skipped.doseRecords.length, 1);
  assert.equal(skipped.doseRecords[0].id, overdue[0].id);
  assert.deepEqual(
    [skipped.doseRecords[0].scheduledDate, skipped.doseRecords[0].scheduledTime, skipped.doseRecords[0].actualTakenTime, skipped.doseRecords[0].status],
    [date, "08:00", undefined, "skipped"],
  );
  assert.equal(medicine.inventoryAmount, inventoryBeforeSkip);

  const storage = new Map();
  const syntheticStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
  storage.set(demoProfileStorageKey("skip@example.invalid"), serializeDemoProfile({ email: "skip@example.invalid", medicines: [medicine], doseRecords: skipped.doseRecords }));
  const reloaded = loadDemoProfile(syntheticStorage, "skip@example.invalid");
  assert.equal(reloaded.doseRecords[0].status, "skipped");
  assert.equal(applySkippedDose(reloaded.doseRecords, overdue[0]).reason, "already-skipped");
  assert.equal(getOutstandingMissedOccurrences(reloaded.doseRecords, today).length, 0);
  const afterReloadReconcile = reconcileHistoricalMissedOccurrences(reloaded.medicines, reloaded.doseRecords, new Date(localIso(today, "08:00")));
  assert.equal(afterReloadReconcile.length, 1);
  assert.equal(afterReloadReconcile[0].status, "skipped");
});

test("taken and skipped outcomes cannot coexist for one occurrence", () => {
  const missed = { id: "missed", medicineId: "synthetic-syrup", scheduledDate: "2026-10-10", scheduledTime: "08:00", status: "missed" };
  const skipped = applySkippedDose([missed], missed);
  assert.equal(skipped.accepted, true);
  assert.equal(canonicalizeOccurrenceRecords([missed, ...skipped.doseRecords])[0].status, "skipped");

  const taken = { ...missed, id: "taken", status: "taken_late", actualTakenTime: localIso("2026-10-10", "08:10") };
  assert.equal(applySkippedDose([taken], { ...taken, status: "missed" }).reason, "already-taken");
  assert.equal(canonicalizeOccurrenceRecords([skipped.doseRecords[0], taken])[0].status, "taken_late");
  assert.equal(canonicalizeOccurrenceRecords([skipped.doseRecords[0], { ...missed, id: "taken-status", status: "taken_late" }])[0].status, "taken_late");
});

test("Dashboard All and Pending counts match their filtered dose lists after one of three doses is skipped", () => {
  const doses = [
    { id: "overdue-1", status: "overdue" },
    { id: "upcoming-2", status: "upcoming" },
    { id: "skipped-3", status: "skipped" },
  ];
  const allDoses = filterDoseRecords(doses, "all");
  const pendingDoses = filterDoseRecords(doses, "pending");
  assert.equal(allDoses.length, 3);
  assert.equal(pendingDoses.length, 2);
  assert.deepEqual(pendingDoses.map((dose) => dose.id), ["overdue-1", "upcoming-2"]);
});

test("Skipped dose remains excluded from Pending count after synthetic profile reload", () => {
  const records = [
    { id: "overdue-1", medicineId: "med-1", scheduledDate: "2026-10-19", scheduledTime: "08:00", status: "overdue" },
    { id: "upcoming-2", medicineId: "med-2", scheduledDate: "2026-10-19", scheduledTime: "20:00", status: "upcoming" },
    { id: "skipped-3", medicineId: "med-3", scheduledDate: "2026-10-19", scheduledTime: "09:00", status: "skipped" },
  ];
  const storage = new Map();
  const email = "skip-count@example.test";
  storage.set(demoProfileStorageKey(email), serializeDemoProfile({ email, medicines: [], doseRecords: records }));
  const reloaded = loadDemoProfile({ getItem: (key) => storage.get(key) ?? null }, email);
  assert.equal(filterDoseRecords(reloaded.doseRecords, "all").length, 3);
  assert.equal(filterDoseRecords(reloaded.doseRecords, "pending").length, 2);
  assert.equal(reloaded.doseRecords.find((record) => record.id === "skipped-3")?.scheduledTime, "09:00");
});

test("taken and skipped doses are excluded from Pending but only Taken appears in the Taken list", () => {
  const doses = [
    { id: "taken", status: "taken_late", actualTakenTime: localIso("2026-10-19", "08:30") },
    { id: "skipped", status: "skipped" },
    { id: "missed", status: "missed" },
  ];
  assert.deepEqual(filterDoseRecords(doses, "pending").map((dose) => dose.id), ["missed"]);
  assert.deepEqual(filterDoseRecords(doses, "taken").map((dose) => dose.id), ["taken"]);
});

test("unresolved overdue doses remain in the shared Pending filter", () => {
  const overdue = { id: "overdue", status: "overdue" };
  assert.deepEqual(filterDoseRecords([overdue], "pending"), [overdue]);
});

test("suspiciously close scheduled or taken occurrences warn without mutating either occurrence", () => {
  const target = { id: "target", medicineId: "synthetic-syrup", scheduledDate: "2026-10-18", scheduledTime: "08:00" };
  const targetAt = new Date(localIso(target.scheduledDate, target.scheduledTime));
  const nearbyAt = new Date(targetAt.getTime() + 4 * 60_000);
  const scheduled = [{ medicineId: target.medicineId, occurrenceKey: scheduledOccurrenceKey(target.medicineId, target.scheduledDate, target.scheduledTime), scheduledAt: targetAt }, { medicineId: target.medicineId, occurrenceKey: "other-occurrence", scheduledAt: nearbyAt }];
  const scheduledBefore = structuredClone(scheduled);
  const records = [];
  assert.deepEqual(findCloseDoseConflict(target.medicineId, scheduled[0].occurrenceKey, targetAt, scheduled, records), { source: "scheduled", relatedAt: nearbyAt });
  assert.deepEqual(scheduled, scheduledBefore);
  assert.deepEqual(records, []);
  assert.equal(findCloseDoseConflict(target.medicineId, scheduled[0].occurrenceKey, targetAt, [scheduled[0], { ...scheduled[1], scheduledAt: new Date(targetAt.getTime() + 6 * 60_000) }], records), null);

  const recentTaken = takenRecord(target.scheduledDate, "08:00", localIso(target.scheduledDate, "07:57"));
  const takenConflict = findCloseDoseConflict(target.medicineId, "unresolved-occurrence", targetAt, [], [recentTaken]);
  assert.equal(takenConflict?.source, "taken");
  assert.equal(takenConflict?.relatedAt.toISOString(), recentTaken.actualTakenTime);
  assert.equal(recentTaken.status, "taken_late");
});

test("missed occurrence upsert excludes PRN and preserves existing legacy records", () => {
  const daily = syrup();
  const prn = syrup({ id: "synthetic-prn" });
  const legacy = { id: "legacy-record", medicineId: "legacy-med", scheduledDate: "2026-10-10", scheduledTime: "08:00", status: "taken_on_time", actualTakenTime: new Date(2026, 9, 10, 8, 0).toISOString() };
  const result = upsertMissedOccurrenceRecords([legacy], [
    { id: "daily-missed", medicineId: daily.id, scheduledDate: "2026-10-10", scheduledTime: "08:00", status: "missed" },
    { id: "prn-missed", medicineId: prn.id, scheduledDate: "2026-10-10", scheduledTime: "08:00", status: "missed", isPrn: true },
  ]);
  assert.equal(result.filter((record) => record.medicineId === daily.id).length, 1);
  assert.equal(result.some((record) => record.medicineId === prn.id), false);
  assert.equal(result[0], legacy);
});

test("one medicine's multiple missed occurrences remain separately countable", () => {
  const records = upsertMissedOccurrenceRecords([], [
    { id: "daily-am", medicineId: "synthetic-syrup", scheduledDate: "2026-10-09", scheduledTime: "08:00", status: "missed" },
    { id: "daily-pm", medicineId: "synthetic-syrup", scheduledDate: "2026-10-09", scheduledTime: "20:00", status: "missed" },
  ]);
  assert.equal(records.length, 2);
  assert.deepEqual(records.map((record) => record.scheduledTime), ["08:00", "20:00"]);
});

test("conflicting duplicate outcomes canonicalize to the confirmed taken occurrence", () => {
  const missed = { id: "legacy-missed", medicineId: "synthetic-syrup", scheduledDate: "2026-10-10", scheduledTime: "08:00", status: "missed" };
  const taken = { ...missed, id: "legacy-taken", status: "missed", actualTakenTime: localIso("2026-10-10", "09:15") };
  const canonical = canonicalizeOccurrenceRecords([missed, taken]);
  assert.equal(canonical.length, 1);
  assert.equal(canonical[0].status, "taken_late");
  assert.equal(canonical[0].actualTakenTime, taken.actualTakenTime);
  assert.equal(getOutstandingMissedOccurrences([missed, taken], "2026-10-11").length, 0);
});

test("late completion updates every duplicate representation and deducts stock once", () => {
  const original = { id: "legacy-missed-a", medicineId: "synthetic-syrup", scheduledDate: "2026-10-10", scheduledTime: "08:00", status: "missed" };
  const duplicate = { ...original, id: "legacy-missed-b", medicineName: "Legacy name" };
  const actualTakenTime = localIso("2026-10-10", "09:15");
  const action = { ...original, status: "taken_late", actualTakenTime };
  const first = applyTakenDose([syrup()], [original, duplicate], action, 0.5);
  assert.equal(first.accepted, true);
  assert.equal(first.medicines[0].inventoryAmount, 59.5);
  assert.deepEqual(first.doseRecords.map((record) => [record.id, record.scheduledDate, record.scheduledTime, record.status, record.actualTakenTime]), [
    [original.id, original.scheduledDate, original.scheduledTime, "taken_late", actualTakenTime],
    [duplicate.id, original.scheduledDate, original.scheduledTime, "taken_late", actualTakenTime],
  ]);
  const repeated = applyTakenDose(first.medicines, first.doseRecords, action, 0.5);
  assert.equal(repeated.accepted, false);
  assert.equal(repeated.reason, "duplicate");
  assert.equal(repeated.medicines[0].inventoryAmount, 59.5);
});

test("elapsed-hour fall-back occurrences retain distinct instants and identities", () => {
  const previousTimezone = process.env.TZ;
  process.env.TZ = "America/New_York";
  try {
    const medicine = syrup({
      frequency: "Every X hours",
      intervalHours: 1,
      scheduleTimes: ["00:30"],
      startDate: "2026-11-01",
      createdAt: localIso("2026-11-01", "00:00"),
    });
    const repeated = getMedicineOccurrencesForDate(medicine, "2026-11-01").filter((item) => item.scheduledTime === "01:30");
    assert.equal(repeated.length, 2);
    assert.notEqual(repeated[0].scheduledInstant, repeated[1].scheduledInstant);
    assert.notEqual(
      scheduledOccurrenceId(medicine.id, repeated[0].scheduledDate, repeated[0].scheduledTime, repeated[0].scheduledInstant),
      scheduledOccurrenceId(medicine.id, repeated[1].scheduledDate, repeated[1].scheduledTime, repeated[1].scheduledInstant),
    );
    assert.notEqual(
      scheduledOccurrenceKey(medicine.id, repeated[0].scheduledDate, repeated[0].scheduledTime, repeated[0].scheduledInstant),
      scheduledOccurrenceKey(medicine.id, repeated[1].scheduledDate, repeated[1].scheduledTime, repeated[1].scheduledInstant),
    );
    const legacyTaken = { id: "legacy-fold-dose", medicineId: medicine.id, scheduledDate: "2026-11-01", scheduledTime: "01:30", status: "taken_late", actualTakenTime: repeated[0].scheduledInstant };
    const attemptedSecondFold = applyTakenDose([medicine], [legacyTaken], {
      ...legacyTaken,
      id: scheduledOccurrenceId(medicine.id, "2026-11-01", "01:30", repeated[1].scheduledInstant),
      scheduledInstant: repeated[1].scheduledInstant,
      actualTakenTime: localIso("2026-11-01", "03:00"),
    }, medicine.doseAmount);
    assert.equal(attemptedSecondFold.accepted, false);
    assert.equal(attemptedSecondFold.reason, "ambiguous-occurrence");
    assert.equal(attemptedSecondFold.medicines[0].inventoryAmount, medicine.inventoryAmount);
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
});

test("spring-forward interval and fixed-time labels match their calculated local instants", () => {
  const previousTimezone = process.env.TZ;
  process.env.TZ = "America/New_York";
  try {
    const interval = syrup({
      frequency: "Every X hours",
      intervalHours: 1,
      scheduleTimes: ["00:30"],
      startDate: "2026-03-08",
      createdAt: localIso("2026-03-08", "00:00"),
    });
    const intervalLabels = getMedicineOccurrencesForDate(interval, "2026-03-08").map((item) => item.scheduledTime);
    assert.deepEqual(intervalLabels.slice(0, 4), ["00:30", "01:30", "03:30", "04:30"]);

    const fixed = syrup({ frequency: "Once daily", scheduleTimes: ["02:30"], startDate: "2026-03-08" });
    const shifted = getMedicineOccurrencesForDate(fixed, "2026-03-08");
    assert.equal(shifted[0].scheduledTime, "03:30");
    assert.equal(`${String(shifted[0].scheduledAt.getHours()).padStart(2, "0")}:${String(shifted[0].scheduledAt.getMinutes()).padStart(2, "0")}`, "03:30");
  } finally {
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  }
});

test("medicine identity blocks normalized exact duplicates but ignores schedule and stock differences", () => {
  const existing = identityMedicine({ name: "Calan 40 mg", scheduleTimes: ["08:00"], inventoryAmount: 2 });
  const candidate = identityMedicine({ id: "synthetic-identity-b", name: " calan-40MG ", strength: "40mg", scheduleTimes: ["20:00"], inventoryAmount: 90 });
  assert.equal(findMedicineIdentityMatches(candidate, [existing])[0]?.kind, "exact");
  assert.equal(findBlockingMedicineIdentityMatch(candidate, [existing])?.medicine.id, existing.id);
  const ulsanic = identityMedicine({ id: "synthetic-ulsanic-a", name: "Ulsanic 40 mg", strength: "40 mg" });
  const formattedUlsanic = identityMedicine({ id: "synthetic-ulsanic-b", name: "  ulsanic   40mg  ", strength: "40mg" });
  assert.equal(findMedicineIdentityMatches(formattedUlsanic, [ulsanic])[0]?.kind, "exact");
  assert.deepEqual(findMedicineIdentityMatches(identityMedicine({
    id: "synthetic-identity-c",
    strength: "40 mcg",
  }), [existing]), []);
  assert.deepEqual(findMedicineIdentityMatches(identityMedicine({
    id: "synthetic-identity-d",
    type: "Capsule",
  }), [existing]), []);
});

test("medicine identity suggests a conservative spelling match without treating it as exact", () => {
  const existing = identityMedicine({ name: "Calan", strength: "40 mg" });
  const candidate = identityMedicine({ id: "synthetic-identity-b", name: "Calam", strength: "40mg" });
  assert.equal(findMedicineIdentityMatches(candidate, [existing])[0]?.kind, "likely");
  assert.equal(findBlockingMedicineIdentityMatch(candidate, [existing])?.kind, "likely");
  assert.equal(findBlockingMedicineIdentityMatch(candidate, [existing], true), undefined);
});

test("rapid repeated medicine addition is blocked after the first explicit similar-medicine confirmation", () => {
  const existing = identityMedicine({ name: "Calan" });
  const candidate = identityMedicine({ id: "synthetic-identity-b", name: "Calam" });
  const collection = [existing];
  assert.equal(findBlockingMedicineIdentityMatch(candidate, collection)?.kind, "likely");
  assert.equal(findBlockingMedicineIdentityMatch(candidate, collection, true), undefined);
  collection.push(candidate);
  const rapidRetry = identityMedicine({ id: "synthetic-identity-c", name: "Calam" });
  assert.equal(findBlockingMedicineIdentityMatch(rapidRetry, collection, true)?.kind, "exact");
});

test("possible duplicate review pairs remain detectable after synthetic profile serialization and reload", () => {
  const profile = {
    email: "duplicate-review@example.test",
    medicines: [identityMedicine({ id: "synthetic-identity-a", name: "Calan" }), identityMedicine({ id: "synthetic-identity-b", name: "Calam" })],
    doseRecords: [],
  };
  const storage = new Map();
  const key = demoProfileStorageKey("duplicate-review@example.test");
  storage.set(key, serializeDemoProfile(profile));
  const reloaded = loadDemoProfile({ getItem: (storageKey) => storage.get(storageKey) ?? null }, "duplicate-review@example.test");
  assert.equal(findPotentialMedicineIdentityPairs(reloaded.medicines).length, 1);
  assert.equal(reloaded.medicines.length, 2);
  assert.equal(reloaded.medicines[0].inventoryAmount, 30);
  assert.equal(reloaded.medicines[1].inventoryAmount, 30);
});

const prescriptionMedicine = (overrides = {}) => ({
  id: "synthetic-med-1",
  name: "Example medicine",
  type: "Tablet",
  strength: "10 mg",
  doseAmount: 1,
  doseUnit: "tablet",
  frequency: "Once daily",
  scheduleTimes: ["08:00"],
  startDate: "2026-10-22",
  instructions: "After food",
  ...overrides,
});

test("dose history sorts four same-day recorded doses newest first without mutating saved records", () => {
  const records = [
    { id: "dose-8am", scheduledDate: "2026-10-22", scheduledTime: "08:00", actualTakenTime: "2026-10-22T08:05:00.000Z" },
    { id: "dose-noon", scheduledDate: "2026-10-22", scheduledTime: "12:00", actualTakenTime: "2026-10-22T12:04:00.000Z" },
    { id: "dose-4pm", scheduledDate: "2026-10-22", scheduledTime: "16:00", actualTakenTime: "2026-10-22T16:02:00.000Z" },
    { id: "dose-8pm", scheduledDate: "2026-10-22", scheduledTime: "20:00", actualTakenTime: "2026-10-22T20:01:00.000Z" },
  ];
  const original = records.slice();
  assert.deepEqual(sortDoseHistoryRecords(records).map((record) => record.scheduledTime), ["20:00", "16:00", "12:00", "08:00"]);
  assert.deepEqual(records, original);
});

test("dose history sorts multiple days by event time and late doses by actual taken time", () => {
  const records = [
    { id: "yesterday-late", scheduledDate: "2026-10-21", scheduledTime: "08:00", actualTakenTime: "2026-10-22T02:00:00.000Z" },
    { id: "today-noon", scheduledDate: "2026-10-22", scheduledTime: "12:00", actualTakenTime: "2026-10-22T12:05:00.000Z" },
    { id: "today-evening", scheduledDate: "2026-10-22", scheduledTime: "20:00", actualTakenTime: "2026-10-22T20:05:00.000Z" },
  ];
  assert.deepEqual(sortDoseHistoryRecords(records).map((record) => record.id), ["today-evening", "today-noon", "yesterday-late"]);

  const sameScheduledDay = [
    { id: "late-8am", scheduledDate: "2026-10-22", scheduledTime: "08:00", actualTakenTime: "2026-10-22T21:00:00.000Z" },
    { id: "taken-8pm", scheduledDate: "2026-10-22", scheduledTime: "20:00", actualTakenTime: "2026-10-22T20:10:00.000Z" },
  ];
  assert.deepEqual(sortDoseHistoryRecords(sameScheduledDay).map((record) => record.id), ["late-8am", "taken-8pm"]);
  assert.equal(sameScheduledDay[0].scheduledTime, "08:00");
});

test("dose history has deterministic ties and safely retains legacy or missing timestamps", () => {
  const records = [
    { id: "b", scheduledDate: "2026-10-22", scheduledTime: "08:00", actualTakenTime: "invalid" },
    { id: "a", scheduledDate: "2026-10-22", scheduledTime: "08:00", actualTakenTime: "invalid" },
    { id: "legacy", scheduledDate: "2026-10-21", scheduledTime: "20:00" },
    { id: "same-b", scheduledDate: "2026-10-22", scheduledTime: "12:00", actualTakenTime: "2026-10-22T12:00:00.000Z" },
    { id: "same-a", scheduledDate: "2026-10-22", scheduledTime: "12:00", actualTakenTime: "2026-10-22T12:00:00.000Z" },
  ];
  const sorted = sortDoseHistoryRecords(records);
  assert.equal(sorted.length, records.length);
  assert.deepEqual(sorted.slice(0, 2).map((record) => record.id), ["same-a", "same-b"]);
  assert.deepEqual(sorted.slice(-3).map((record) => record.id), ["a", "b", "legacy"]);
  assert.deepEqual(sortDoseHistoryRecords(records).map((record) => record.id), sorted.map((record) => record.id));
});

test("new medicine prescription snapshots work with or without optional doctor fields", () => {
  const withoutDoctor = createPrescriptionHistoryEntry(prescriptionMedicine(), "2026-10-22T10:00:00.000Z", "entry-1");
  assert.equal(withoutDoctor.prescribingDoctor, undefined);
  assert.equal(withoutDoctor.medicineId, "synthetic-med-1");
  assert.deepEqual(withoutDoctor.scheduleTimes, ["08:00"]);

  const withDoctor = createPrescriptionHistoryEntry(prescriptionMedicine({
    prescribingDoctor: "Dr Example",
    prescribingClinic: "Synthetic Clinic",
    prescriptionDate: "2026-10-20",
    prescriptionNotes: "Synthetic note",
  }), "2026-10-22T10:00:00.000Z", "entry-2");
  assert.equal(withDoctor.prescribingDoctor, "Dr. Example");
  assert.equal(withDoctor.prescribingClinic, "Synthetic Clinic");
  assert.equal(withDoctor.prescriptionDate, "2026-10-20");
  assert.equal(withDoctor.prescriptionNotes, "Synthetic note");
});

test("meaningful prescription edits append snapshots while inventory and unchanged edits do not", () => {
  const previous = prescriptionMedicine({ prescribingDoctor: "Dr First", prescriptionDate: "2026-10-01" });
  const initial = createPrescriptionHistoryEntry(previous, "2026-10-02T09:00:00.000Z", "entry-1");
  const changed = { ...previous, prescribingDoctor: "Dr Second", strength: "20 mg" };
  const history = appendPrescriptionChange([initial], previous, changed, "2026-10-22T11:00:00.000Z", (() => { let n = 1; return () => `entry-${++n}`; })());
  assert.equal(history.length, 2);
  assert.equal(history[0].prescribingDoctor, "Dr. First");
  assert.equal(history[0].strength, "10 mg");
  assert.equal(history[1].prescribingDoctor, "Dr. Second");
  assert.equal(history[1].strength, "20 mg");

  const inventoryOnly = { ...changed, inventoryAmount: 4, lowStockThreshold: 2 };
  assert.equal(appendPrescriptionChange(history, changed, inventoryOnly, "2026-10-22T12:00:00.000Z", () => "unused").length, 2);
  assert.equal(appendPrescriptionChange(history, changed, { ...changed }, "2026-10-22T12:00:00.000Z", () => "unused").length, 2);
});

test("first prescription change on a legacy medicine captures the prior and updated details without changing medicine data", () => {
  const previous = prescriptionMedicine();
  const updated = { ...previous, prescribingDoctor: "Dr New" };
  const history = appendPrescriptionChange([], previous, updated, "2026-10-22T12:00:00.000Z", (() => { let n = 0; return () => `legacy-entry-${++n}`; })());
  assert.equal(history.length, 2);
  assert.equal(history[0].prescribingDoctor, undefined);
  assert.equal(history[1].prescribingDoctor, "Dr. New");
  assert.equal(previous.prescribingDoctor, undefined);
  assert.equal(previous.scheduleTimes[0], "08:00");
});

test("legacy profile serialization remains compatible and prescription history stays account scoped after medicine deletion", () => {
  const storage = new Map();
  const legacyEmail = "legacy-prescriptions@example.test";
  const legacyKey = demoProfileStorageKey(legacyEmail);
  const legacyMedicine = { id: "legacy-med", name: "Legacy", inventoryAmount: 9, scheduleRevisions: [{ effectiveAt: "2026-10-01T00:00:00.000Z" }] };
  storage.set(legacyKey, JSON.stringify({ version: 1, email: legacyEmail, medicines: [legacyMedicine], doseRecords: [{ id: "dose-old", medicineId: "legacy-med" }] }));
  const legacy = loadDemoProfile({ getItem: (key) => storage.get(key) ?? null }, legacyEmail);
  assert.deepEqual(legacy.prescriptionHistory, []);
  assert.deepEqual(legacy.medicines, [legacyMedicine]);
  assert.equal(legacy.doseRecords[0].medicineId, "legacy-med");

  const entryA = createPrescriptionHistoryEntry(prescriptionMedicine({ id: "med-a" }), "2026-10-22T12:00:00.000Z", "entry-a");
  const entryB = createPrescriptionHistoryEntry(prescriptionMedicine({ id: "med-b" }), "2026-10-22T12:00:00.000Z", "entry-b");
  const profileA = { email: "a@example.test", medicines: [{ id: "med-a" }], doseRecords: [{ id: "dose-a", medicineId: "med-a" }], prescriptionHistory: [entryA] };
  const profileB = { email: "b@example.test", medicines: [{ id: "med-b" }], doseRecords: [{ id: "dose-b", medicineId: "med-b" }], prescriptionHistory: [entryB] };
  storage.set(demoProfileStorageKey(profileA.email), serializeDemoProfile(profileA));
  storage.set(demoProfileStorageKey(profileB.email), serializeDemoProfile(profileB));
  const reloadedA = loadDemoProfile({ getItem: (key) => storage.get(key) ?? null }, profileA.email);
  const reloadedB = loadDemoProfile({ getItem: (key) => storage.get(key) ?? null }, profileB.email);
  assert.deepEqual(reloadedA.prescriptionHistory.map((entry) => entry.id), ["entry-a"]);
  assert.deepEqual(reloadedB.prescriptionHistory.map((entry) => entry.id), ["entry-b"]);

  const deletedMedicineProfile = { ...reloadedA, medicines: [] };
  storage.set(demoProfileStorageKey(profileA.email), serializeDemoProfile(deletedMedicineProfile));
  const afterDelete = loadDemoProfile({ getItem: (key) => storage.get(key) ?? null }, profileA.email);
  assert.deepEqual(afterDelete.medicines, []);
  assert.deepEqual(afterDelete.prescriptionHistory.map((entry) => entry.id), ["entry-a"]);
  assert.deepEqual(afterDelete.doseRecords, reloadedA.doseRecords);
});

test("malformed prescription history is rejected without rewriting the saved profile", () => {
  const email = "malformed-prescriptions@example.test";
  const key = demoProfileStorageKey(email);
  const saved = JSON.stringify({ version: 1, email, medicines: [], doseRecords: [], prescriptionHistory: [null] });
  const storage = new Map([[key, saved]]);
  assert.throws(() => loadDemoProfile({ getItem: (storageKey) => storage.get(storageKey) ?? null }, email));
  assert.equal(storage.get(key), saved);
});

test("prescription entries sort newest first and preserve equal-time insertion order", () => {
  const medicine = prescriptionMedicine();
  const older = createPrescriptionHistoryEntry(medicine, "2026-10-01T10:00:00.000Z", "older");
  const sameTimeEarlier = createPrescriptionHistoryEntry(medicine, "2026-10-22T10:00:00.000Z", "same-1");
  const sameTimeLater = createPrescriptionHistoryEntry(medicine, "2026-10-22T10:00:00.000Z", "same-2");
  assert.deepEqual(sortPrescriptionHistory([older, sameTimeEarlier, sameTimeLater]).map((entry) => entry.id), ["same-2", "same-1", "older"]);
});

test("doctor display normalization adds one canonical prefix and preserves empty input", () => {
  assert.equal(normalizeDoctorName("Ahmed Khan"), "Dr. Ahmed Khan");
  assert.equal(normalizeDoctorName("Dr. Ahmed Khan"), "Dr. Ahmed Khan");
  assert.equal(normalizeDoctorName("dr. Ahmed Khan"), "Dr. Ahmed Khan");
  assert.equal(normalizeDoctorName("DR. Ahmed Khan"), "Dr. Ahmed Khan");
  assert.equal(normalizeDoctorName("  Ahmed   Khan  "), "Dr. Ahmed Khan");
  assert.equal(normalizeDoctorName("  "), "");
  assert.equal(normalizeDoctorName("Dr. Dr. Ahmed Khan"), "Dr. Ahmed Khan");
  assert.equal(normalizeDoctorName(normalizeDoctorName("Ahmed Khan")), "Dr. Ahmed Khan");
});

test("doctor prefix case or presence alone does not create a prescription-history change", () => {
  const previous = prescriptionMedicine({ prescribingDoctor: "dr. Ahmed Khan" });
  const updated = { ...previous, prescribingDoctor: "  DR.   Ahmed Khan  " };
  assert.equal(appendPrescriptionChange([], previous, updated, "2026-10-22T12:00:00.000Z", () => "unused").length, 0);

  const unprefixed = { ...previous, prescribingDoctor: "Ahmed Khan" };
  assert.equal(appendPrescriptionChange([], unprefixed, previous, "2026-10-22T12:00:00.000Z", () => "unused").length, 0);
});

test("medicines sort newest first with deterministic ties and undated entries, without mutating source", () => {
  const medicines = [
    { id: "older", createdAt: "2026-10-01T09:00:00.000Z" },
    { id: "tie-b", createdAt: "2026-10-10T09:00:00.000Z" },
    { id: "invalid", createdAt: "not-a-date" },
    { id: "tie-a", createdAt: "2026-10-10T09:00:00.000Z" },
    { id: "undated" },
    { id: "newest", createdAt: "2026-10-20T09:00:00.000Z" },
  ];
  const original = medicines.slice();
  assert.deepEqual(sortMedicinesNewestFirst(medicines).map((medicine) => medicine.id), ["newest", "tie-a", "tie-b", "older", "invalid", "undated"]);
  assert.deepEqual(medicines, original);
});

test("medicine edits preserve the original creation timestamp and added label uses that timestamp", () => {
  const medicine = { id: "created-med", createdAt: "2026-10-23T15:35:00.000Z", name: "Old name" };
  assert.deepEqual(applyMedicineUpdatePreservingCreationDate(medicine, { name: "Edited name", createdAt: "2026-10-24T00:00:00.000Z" }), {
    id: "created-med", createdAt: "2026-10-23T15:35:00.000Z", name: "Edited name",
  });
  assert.equal(applyMedicineUpdatePreservingCreationDate({ id: "legacy" }, { name: "Legacy edited", createdAt: "2026-10-24T00:00:00.000Z" }).createdAt, undefined);

  const instant = new Date("2026-10-23T15:35:00.000Z");
  const dateLabel = instant.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const timeLabel = instant.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  assert.equal(formatMedicineAddedAt(medicine.createdAt), `Added ${dateLabel} · ${timeLabel}`);
  assert.equal(formatMedicineAddedAt(undefined), "Added date unavailable");
  assert.equal(formatMedicineAddedAt("invalid"), "Added date unavailable");
});

test("prescription date changes retain previous issued date separately from recorded date", () => {
  const previous = prescriptionMedicine({ prescribingDoctor: "Ahmed Khan", prescriptionDate: "2026-08-01" });
  const previousEntry = createPrescriptionHistoryEntry(previous, "2026-08-03T10:00:00.000Z", "rx-old");
  const updated = { ...previous, prescriptionDate: "2026-09-10", prescribingDoctor: "Sara Noor" };
  const history = appendPrescriptionChange([previousEntry], previous, updated, "2026-09-12T11:00:00.000Z", () => "rx-new");
  assert.deepEqual(history.map((entry) => [entry.prescriptionDate, entry.recordedAt]), [
    ["2026-08-01", "2026-08-03T10:00:00.000Z"],
    ["2026-09-10", "2026-09-12T11:00:00.000Z"],
  ]);
});

test("prescription history filters use historical doctor, issued date, and medicine snapshots together", () => {
  const medicineAOld = createPrescriptionHistoryEntry(prescriptionMedicine({ id: "med-a", name: "Medicine Alpha", strength: "10 mg", prescribingDoctor: "Ahmed Khan", prescriptionDate: "2026-08-01" }), "2026-08-03T10:00:00.000Z", "alpha-old");
  const medicineANew = createPrescriptionHistoryEntry(prescriptionMedicine({ id: "med-a", name: "Medicine Alpha", strength: "20 mg", prescribingDoctor: "Sara Noor", prescriptionDate: "2026-09-10" }), "2026-09-12T10:00:00.000Z", "alpha-new");
  const medicineBOld = createPrescriptionHistoryEntry(prescriptionMedicine({ id: "med-b", name: "Medicine Beta", prescribingDoctor: "Dr. Ahmed Khan", prescriptionDate: "2026-08-15" }), "2026-08-16T10:00:00.000Z", "beta-old");
  const missing = createPrescriptionHistoryEntry(prescriptionMedicine({ id: "med-c", name: "Medicine Gamma", prescribingDoctor: undefined, prescriptionDate: undefined }), "2026-09-20T10:00:00.000Z", "gamma-current");
  const entries = [medicineAOld, medicineANew, medicineBOld, missing];
  const original = entries.slice();

  assert.deepEqual(filterPrescriptionHistory(entries, { doctor: " dr. AHMED ", prescriptionDateFrom: "2026-08-01", prescriptionDateTo: "2026-08-31", medicine: "alpha" }).map((entry) => entry.id), ["alpha-old"]);
  assert.deepEqual(filterPrescriptionHistory(entries, { doctor: "Ahmed Khan" }).map((entry) => entry.id), ["alpha-old", "beta-old"]);
  assert.deepEqual(filterPrescriptionHistory(entries, { prescriptionDateFrom: "2026-09-01", prescriptionDateTo: "2026-09-30", medicine: "alpha" }).map((entry) => entry.id), ["alpha-new"]);
  assert.deepEqual(filterPrescriptionHistory(entries, { doctor: "Sara", prescriptionDateFrom: "2026-09-01" }).map((entry) => entry.id), ["alpha-new"]);
  assert.deepEqual(filterPrescriptionHistory(entries, { doctor: "Missing" }), []);
  assert.deepEqual(entries, original);
});

test("prescription snapshots group only by medicine ID and show newest versions first", () => {
  const sameMedicineNewest = createPrescriptionHistoryEntry(prescriptionMedicine({ id: "med-a", name: "Shared name", strength: "20 mg", prescribingDoctor: "Same Doctor" }), "2026-10-20T10:00:00.000Z", "a-new");
  const otherMedicine = createPrescriptionHistoryEntry(prescriptionMedicine({ id: "med-b", name: "Shared name", strength: "10 mg", prescribingDoctor: "Same Doctor" }), "2026-10-18T10:00:00.000Z", "b-only");
  const sameMedicineOlder = createPrescriptionHistoryEntry(prescriptionMedicine({ id: "med-a", name: "Shared name", strength: "10 mg", prescribingDoctor: "Same Doctor" }), "2026-10-10T10:00:00.000Z", "a-old");

  const groups = groupPrescriptionHistoryByMedicine([sameMedicineOlder, otherMedicine, sameMedicineNewest]);
  assert.deepEqual(groups.map((group) => [group.medicineId, group.entries.map((entry) => entry.id)]), [
    ["med-a", ["a-new", "a-old"]],
    ["med-b", ["b-only"]],
  ]);
});

test("missing medicine IDs stay in separate history groups and unknown IDs remain distinct", () => {
  const missingIdA = { ...createPrescriptionHistoryEntry(prescriptionMedicine({ id: "med-a", name: "Legacy medicine" }), "2026-10-10T10:00:00.000Z", "missing-a"), medicineId: "" };
  const missingIdB = { ...createPrescriptionHistoryEntry(prescriptionMedicine({ id: "med-a", name: "Legacy medicine" }), "2026-10-11T10:00:00.000Z", "missing-b"), medicineId: undefined };
  const unknownA = createPrescriptionHistoryEntry(prescriptionMedicine({ id: "deleted-a", name: "Same legacy name" }), "2026-10-12T10:00:00.000Z", "unknown-a");
  const unknownB = createPrescriptionHistoryEntry(prescriptionMedicine({ id: "deleted-b", name: "Same legacy name" }), "2026-10-13T10:00:00.000Z", "unknown-b");

  const groups = groupPrescriptionHistoryByMedicine([missingIdA, missingIdB, unknownA, unknownB]);
  assert.equal(groups.length, 4);
  assert.equal(new Set(groups.map((group) => group.key)).size, 4);
  assert.deepEqual(groups.map((group) => group.entries[0].id), ["missing-a", "missing-b", "unknown-a", "unknown-b"]);
});

test("history filters match older snapshots before grouping and clearing filters restores every entry", () => {
  const older = createPrescriptionHistoryEntry(prescriptionMedicine({ id: "med-a", name: "Medicine Alpha", strength: "10 mg", prescribingDoctor: "Dr. Ahmed Khan", prescriptionDate: "2026-08-01" }), "2026-08-03T10:00:00.000Z", "alpha-old-filter");
  const latest = createPrescriptionHistoryEntry(prescriptionMedicine({ id: "med-a", name: "Medicine Alpha", strength: "20 mg", prescribingDoctor: "Sara Noor", prescriptionDate: "2026-09-10" }), "2026-09-12T10:00:00.000Z", "alpha-latest-filter");
  const other = createPrescriptionHistoryEntry(prescriptionMedicine({ id: "med-b", name: "Medicine Beta", prescribingDoctor: "Ahmed Khan", prescriptionDate: "2026-08-15" }), "2026-08-16T10:00:00.000Z", "beta-filter");
  const entries = [older, latest, other];
  const olderMatch = filterPrescriptionHistory(entries, { doctor: "ahmed", medicine: "alpha", prescriptionDateFrom: "2026-08-01", prescriptionDateTo: "2026-08-01" });
  const groups = groupPrescriptionHistoryByMedicine(olderMatch);
  assert.deepEqual(groups.map((group) => group.entries.map((entry) => entry.id)), [["alpha-old-filter"]]);
  assert.deepEqual(filterPrescriptionHistory(entries, { doctor: "nobody" }), []);
  assert.deepEqual(groupPrescriptionHistoryByMedicine([]), []);

  const activeFilters = { doctor: " Dr. Ahmed ", prescriptionDateFrom: "2026-08-01" };
  assert.equal(hasActivePrescriptionHistoryFilters(activeFilters), true);
  const clearedFilters = createEmptyPrescriptionHistoryFilters();
  assert.equal(hasActivePrescriptionHistoryFilters(clearedFilters), false);
  assert.deepEqual(filterPrescriptionHistory(entries, clearedFilters).map((entry) => entry.id), entries.map((entry) => entry.id));
  assert.equal(hasActivePrescriptionHistoryFilters({ doctor: "   ", medicine: "  " }), false);
});

