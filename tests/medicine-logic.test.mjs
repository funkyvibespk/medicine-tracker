import test from "node:test";
import assert from "node:assert/strict";
import { getScheduledTimesForDate } from "../lib/schedule.ts";
import {
  availableVolumeFromContainers,
  applyTakenDose,
  doseUnitFor,
  getStockStatus,
  inventoryUnitFor,
  minutesFromScheduledOccurrence,
  scheduledOccurrenceId,
} from "../lib/medicineLogic.ts";

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

