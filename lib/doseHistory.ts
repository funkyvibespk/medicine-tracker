export interface DoseHistorySortRecord {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  scheduledInstant?: string;
  actualTakenTime?: string;
}

function validTimestamp(value: string | undefined): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function scheduledTimestamp(record: DoseHistorySortRecord): number | null {
  const exactScheduledInstant = validTimestamp(record.scheduledInstant);
  if (exactScheduledInstant !== null) return exactScheduledInstant;

  const dateParts = record.scheduledDate.split("-").map(Number);
  const timeParts = record.scheduledTime.split(":").map(Number);
  if (dateParts.length !== 3 || timeParts.length !== 2 || [...dateParts, ...timeParts].some((part) => !Number.isInteger(part))) return null;
  const [year, month, day] = dateParts;
  const [hour, minute] = timeParts;
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  const scheduled = new Date(year, month - 1, day, hour, minute);
  if (scheduled.getFullYear() !== year || scheduled.getMonth() !== month - 1 || scheduled.getDate() !== day) return null;
  return scheduled.getTime();
}

/** Sort a derived dose-history view by event time without mutating saved records. */
export function sortDoseHistoryRecords<T extends DoseHistorySortRecord>(records: readonly T[]): T[] {
  return records
    .map((record, index) => ({ record, index, timestamp: validTimestamp(record.actualTakenTime) ?? scheduledTimestamp(record) }))
    .sort((a, b) => {
      if (a.timestamp !== null && b.timestamp !== null && a.timestamp !== b.timestamp) return b.timestamp - a.timestamp;
      if (a.timestamp !== null && b.timestamp === null) return -1;
      if (a.timestamp === null && b.timestamp !== null) return 1;

      const dateOrder = b.record.scheduledDate.localeCompare(a.record.scheduledDate);
      if (dateOrder) return dateOrder;
      const timeOrder = b.record.scheduledTime.localeCompare(a.record.scheduledTime);
      if (timeOrder) return timeOrder;
      const idOrder = a.record.id.localeCompare(b.record.id);
      return idOrder || a.index - b.index;
    })
    .map(({ record }) => record);
}
