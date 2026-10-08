import type { Medicine } from "@/contexts/MedicineContext";

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
  return true;
}

export function isPrnMedicine(medicine: Medicine) {
  return medicine.frequency === "As needed (PRN)";
}

export function getScheduledTimesForDate(medicine: Medicine, dateString: string): string[] {
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
    const times: string[] = [];
    const step = intervalHours * 60 * 60 * 1000;
    let occurrence = anchor.getTime();
    if (occurrence < dayStart.getTime()) {
      occurrence += Math.ceil((dayStart.getTime() - occurrence) / step) * step;
    }
    while (occurrence < dayEnd.getTime()) {
      const current = new Date(occurrence);
      if (localDateString(current) === dateString) {
        times.push(`${current.getHours().toString().padStart(2, "0")}:${current.getMinutes().toString().padStart(2, "0")}`);
      }
      occurrence += step;
    }
    return times;
  }

  return [...medicine.scheduleTimes].filter(Boolean).sort();
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

