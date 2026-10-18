import type { DoseRecord, Medicine } from "@/contexts/MedicineContext";
import type { MissedOccurrenceCandidate, PendingOccurrenceCandidate } from "@/lib/medicineLogic";
import { getMedicineOccurrencesForDate, localDateString } from "@/lib/schedule";
import { isOccurrenceOverdue, scheduledOccurrenceId, upsertMissedOccurrenceRecords, upsertPendingOccurrenceRecords } from "@/lib/medicineLogic";

function dateFromLocalString(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function firstKnownDate(medicine: Medicine) {
  const firstRevision = medicine.scheduleRevisions?.slice().sort((a, b) => a.effectiveAt.localeCompare(b.effectiveAt))[0];
  const revisionDate = firstRevision
    ? localDateString(new Date(firstRevision.effectiveAt))
    : medicine.startDate;
  return revisionDate > medicine.startDate ? revisionDate : medicine.startDate;
}

/** Find the immediately preceding known occurrence when a reconciliation range starts mid-history. */
function previousOccurrenceBefore(medicine: Medicine, beforeDate: string, earliestDate: string) {
  const day = dateFromLocalString(beforeDate);
  day.setDate(day.getDate() - 1);
  const earliest = dateFromLocalString(earliestDate);
  while (day >= earliest) {
    const occurrences = getMedicineOccurrencesForDate(medicine, localDateString(day));
    if (occurrences.length) return occurrences[occurrences.length - 1];
    day.setDate(day.getDate() - 1);
  }
  return null;
}

/**
 * Keep a scheduled occurrence unresolved until its next occurrence becomes due.
 * At that exact cutoff it becomes missed; before then it is stored as overdue so
 * History can still offer the existing record-as-taken action across reloads.
 */
export function reconcileHistoricalMissedOccurrences(
  medicines: Medicine[],
  doseRecords: DoseRecord[],
  now: Date,
  fromDate?: string,
): DoseRecord[] {
  const today = localDateString(now);
  const pendingOccurrences: PendingOccurrenceCandidate[] = [];
  const missedOccurrences: MissedOccurrenceCandidate[] = [];

  for (const medicine of medicines) {
    if (!medicine.scheduleRevisions?.length) continue;

    const earliestDate = firstKnownDate(medicine);
    const scanStart = fromDate && fromDate > earliestDate ? fromDate : earliestDate;
    const occurrences = [];
    if (scanStart > earliestDate) {
      const previous = previousOccurrenceBefore(medicine, scanStart, earliestDate);
      if (previous) occurrences.push(previous);
    }

    const day = dateFromLocalString(scanStart);
    const todayDate = dateFromLocalString(today);
    while (day <= todayDate) {
      occurrences.push(...getMedicineOccurrencesForDate(medicine, localDateString(day)));
      day.setDate(day.getDate() + 1);
    }
    occurrences.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

    for (let index = 0; index < occurrences.length; index++) {
      const occurrence = occurrences[index];
      const scheduledAt = occurrence.scheduledAt;
      if (scheduledAt >= now) continue;

      const candidateBase = {
        id: scheduledOccurrenceId(medicine.id, occurrence.scheduledDate, occurrence.scheduledTime, occurrence.scheduledInstant),
        medicineId: medicine.id,
        scheduledDate: occurrence.scheduledDate,
        scheduledTime: occurrence.scheduledTime,
        scheduledInstant: occurrence.scheduledInstant,
        medicineName: medicine.name,
        medicineType: medicine.type,
        medicineStrength: medicine.strength,
      };
      const nextOccurrence = occurrences[index + 1];

      if (nextOccurrence && nextOccurrence.scheduledAt <= now) {
        missedOccurrences.push({ ...candidateBase, status: "missed" });
      } else if (isOccurrenceOverdue(scheduledAt, now)) {
        pendingOccurrences.push({ ...candidateBase, status: "overdue" });
      }
    }
  }

  const withMissed = upsertMissedOccurrenceRecords(doseRecords, missedOccurrences);
  return upsertPendingOccurrenceRecords(withMissed, pendingOccurrences);
}
