import type { Medicine, MedicineScheduleRevision } from "@/contexts/MedicineContext";

export interface ScheduledOccurrence {
  scheduledDate: string;
  scheduledTime: string;
  scheduledAt: Date;
  /** Present for elapsed-hour schedules so repeated wall-clock times remain distinct. */
  scheduledInstant?: string;
}

export function localDateString(date: Date = new Date()) {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function calendarDayNumber(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function dateIsActive(medicine: Medicine, dateString: string) {
  if (dateString < medicine.startDate) return false;
  if (medicine.endDate && dateString > medicine.endDate) return false;
  if (medicine.createdAt) {
    const createdAt = new Date(medicine.createdAt);
    if (!Number.isNaN(createdAt.getTime()) && dateString < localDateString(createdAt)) return false;
  }
  return true;
}

export function isPrnMedicine(medicine: Medicine) {
  return medicine.frequency === "As needed (PRN)";
}

function scheduleFromSnapshot(medicine: Medicine, dateString: string): ScheduledOccurrence[] {
  if (!dateIsActive(medicine, dateString) || isPrnMedicine(medicine)) return [];

  const frequency = medicine.frequency;
  const anchorDay = calendarDayNumber(medicine.startDate);
  const currentDay = calendarDayNumber(dateString);
  const elapsedDays = currentDay - anchorDay;

  if (frequency === "Every other day" && elapsedDays % 2 !== 0) return [];
  if (frequency === "Once weekly" && elapsedDays % 7 !== 0) return [];
  if (frequency === "Every 2 weeks" && elapsedDays % 14 !== 0) return [];

  if (frequency === "Once monthly") {
    const [startYear, startMonth, startDay] = medicine.startDate.split("-").map(Number);
    const [year, month] = dateString.split("-").map(Number);
    const startMonthIndex = startYear * 12 + startMonth - 1;
    const currentMonthIndex = year * 12 + month - 1;
    const dayOfMonth = Math.min(startDay, new Date(year, month, 0).getDate());
    if (currentMonthIndex < startMonthIndex || Number(dateString.slice(-2)) !== dayOfMonth) return [];
  }

  if (frequency === "Every X hours") {
    const intervalHours = Math.max(1, Math.min(24, Math.floor(medicine.intervalHours || 8)));
    const anchorTime = medicine.scheduleTimes[0] || "08:00";
    const [year, month, day] = medicine.startDate.split("-").map(Number);
    const [hour, minute] = anchorTime.split(":").map(Number);
    const anchor = new Date(year, month - 1, day, hour, minute);
    const [currentYear, currentMonth, currentDate] = dateString.split("-").map(Number);
    const dayStart = new Date(currentYear, currentMonth - 1, currentDate);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const occurrences: ScheduledOccurrence[] = [];
    const step = intervalHours * 60 * 60 * 1000;
    let occurrence = anchor.getTime();
    if (occurrence < dayStart.getTime()) {
      occurrence += Math.ceil((dayStart.getTime() - occurrence) / step) * step;
    }
    while (occurrence < dayEnd.getTime()) {
      const current = new Date(occurrence);
      const createdAt = medicine.createdAt ? new Date(medicine.createdAt) : null;
      if (localDateString(current) === dateString && (!createdAt || Number.isNaN(createdAt.getTime()) || current >= createdAt)) {
        const time = `${current.getHours().toString().padStart(2, "0")}:${current.getMinutes().toString().padStart(2, "0")}`;
        occurrences.push({ scheduledDate: dateString, scheduledTime: time, scheduledAt: current, scheduledInstant: current.toISOString() });
      }
      occurrence += step;
    }
    return occurrences;
  }

  const createdAt = medicine.createdAt ? new Date(medicine.createdAt) : null;
  return [...medicine.scheduleTimes].filter((time) => {
    if (!time) return false;
    if (!createdAt || Number.isNaN(createdAt.getTime()) || localDateString(createdAt) !== dateString) return true;
    const [hour, minute] = time.split(":").map(Number);
    return new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate(), hour, minute) >= createdAt;
  }).sort().map((time) => {
    const [hour, minute] = time.split(":").map(Number);
    // Native local Date resolution deterministically shifts nonexistent spring-forward
    // wall times forward by the DST gap (for example, 02:30 becomes 03:30).
    const scheduledAt = new Date(Number(dateString.slice(0, 4)), Number(dateString.slice(5, 7)) - 1, Number(dateString.slice(8, 10)), hour, minute);
    const scheduledTime = `${scheduledAt.getHours().toString().padStart(2, "0")}:${scheduledAt.getMinutes().toString().padStart(2, "0")}`;
    return { scheduledDate: localDateString(scheduledAt), scheduledTime, scheduledAt };
  });
}

function withScheduleRevision(medicine: Medicine, revision: MedicineScheduleRevision): Medicine {
  return {
    ...medicine,
    frequency: revision.frequency,
    intervalHours: revision.intervalHours,
    scheduleTimes: revision.scheduleTimes,
    startDate: revision.startDate,
    endDate: revision.endDate,
  };
}

/** Generate occurrences using only schedule revisions known to have been active then. */
export function getMedicineOccurrencesForDate(medicine: Medicine, dateString: string): ScheduledOccurrence[] {
  const revisions = medicine.scheduleRevisions?.slice().sort((a, b) => a.effectiveAt.localeCompare(b.effectiveAt));
  if (!revisions?.length) return scheduleFromSnapshot(medicine, dateString);

  const occurrences: ScheduledOccurrence[] = [];
  revisions.forEach((revision, index) => {
    const revisionStart = new Date(revision.effectiveAt).getTime();
    const revisionEnd = revisions[index + 1] ? new Date(revisions[index + 1].effectiveAt).getTime() : Number.POSITIVE_INFINITY;
    if (!Number.isFinite(revisionStart) || !Number.isFinite(revisionEnd) && index + 1 < revisions.length) return;
    for (const occurrence of scheduleFromSnapshot(withScheduleRevision(medicine, revision), dateString)) {
      const instant = occurrence.scheduledAt.getTime();
      if (instant >= revisionStart && instant < revisionEnd) occurrences.push(occurrence);
    }
  });
  return occurrences.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
}

/** Backward-compatible wall-clock view used by medicine summary UI. */
export function getScheduledTimesForDate(medicine: Medicine, dateString: string): string[] {
  return scheduleFromSnapshot(medicine, dateString).map((occurrence) => occurrence.scheduledTime);
}

export function formatDuration(totalMinutes: number) {
  const minutes = Math.max(0, Math.floor(Math.abs(totalMinutes)));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours && remainder) return `${hours}h ${remainder}m`;
  if (hours) return `${hours}h`;
  return `${minutes} min`;
}

export function estimatedDosesPerDay(medicine: Medicine) {
  if (isPrnMedicine(medicine)) return null;
  if (medicine.frequency === "Every other day") return 0.5;
  if (medicine.frequency === "Once weekly") return 1 / 7;
  if (medicine.frequency === "Every 2 weeks") return 1 / 14;
  if (medicine.frequency === "Once monthly") return 1 / 30.4375;
  if (medicine.frequency === "Every X hours") return 24 / Math.max(1, medicine.intervalHours || 8);
  return medicine.scheduleTimes.length;
}

