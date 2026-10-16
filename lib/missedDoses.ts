import type { DoseRecord, Medicine } from "@/contexts/MedicineContext";
import type { MissedOccurrenceCandidate } from "@/lib/medicineLogic";
import { getMedicineOccurrencesForDate, localDateString } from "@/lib/schedule";
import { isOccurrenceOverdue, scheduledOccurrenceId, upsertMissedOccurrenceRecords } from "@/lib/medicineLogic";

function dateFromLocalString(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Materialize only occurrences whose schedule revision is known to have been active. */
export function reconcileHistoricalMissedOccurrences(
  medicines: Medicine[],
  doseRecords: DoseRecord[],
  now: Date,
  fromDate?: string,
  includeToday = false,
): DoseRecord[] {
  const today = localDateString(now);
  const missedOccurrences: MissedOccurrenceCandidate[] = [];
  for (const medicine of medicines) {
    if (medicine.frequency === "As needed (PRN)") continue;
    // Legacy medicines are given a baseline revision at hydration. If a caller
    // has no revision at all, its past schedule is unknown and must not be guessed.
    if (!medicine.scheduleRevisions?.length) continue;
    const firstKnownDate = medicine.scheduleRevisions?.length
      ? localDateString(new Date(medicine.scheduleRevisions[0].effectiveAt))
      : medicine.startDate;
    const scheduleStartDate = firstKnownDate > medicine.startDate ? firstKnownDate : medicine.startDate;
    const firstDate = fromDate && fromDate > scheduleStartDate ? fromDate : scheduleStartDate;
    const day = dateFromLocalString(firstDate);
    const todayDate = dateFromLocalString(today);
    while (day < todayDate || (includeToday && day.getTime() === todayDate.getTime())) {
      const date = localDateString(day);
      for (const occurrence of getMedicineOccurrencesForDate(medicine, date)) {
        const scheduledAt = occurrence.scheduledAt;
        if (!isOccurrenceOverdue(scheduledAt, now)) continue;

        missedOccurrences.push({
          id: scheduledOccurrenceId(medicine.id, date, occurrence.scheduledTime, occurrence.scheduledInstant),
          medicineId: medicine.id,
          scheduledDate: occurrence.scheduledDate,
          scheduledTime: occurrence.scheduledTime,
          scheduledInstant: occurrence.scheduledInstant,
          status: "missed",
          medicineName: medicine.name,
          medicineType: medicine.type,
          medicineStrength: medicine.strength,
        });
      }
      day.setDate(day.getDate() + 1);
    }
  }

  return upsertMissedOccurrenceRecords(doseRecords, missedOccurrences);
}

