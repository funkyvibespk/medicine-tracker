import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { addScheduleBaseline, getMedicineOccurrencesForDate, getScheduledTimesForDate } from "../lib/schedule.ts";
import { demoProfileStorageKey, loadDemoProfile, serializeDemoProfile } from "../lib/demoProfiles.ts";
import {
  availableVolumeFromContainers,
  applyTakenDose,
  doseUnitFor,
  canonicalizeOccurrenceRecords,
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

