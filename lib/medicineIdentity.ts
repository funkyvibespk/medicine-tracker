import type { Medicine } from "@/contexts/MedicineContext";

export type MedicineIdentityMatchKind = "exact" | "likely";

export interface MedicineIdentityMatch {
  medicine: Medicine;
  kind: MedicineIdentityMatchKind;
}

export interface MedicineIdentityPair {
  first: Medicine;
  second: Medicine;
  kind: MedicineIdentityMatchKind;
}

function canonicalCharacters(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

/** Normalize formatting only; units remain distinct (for example, mg is not mcg). */
export function normalizeMedicineStrength(strength?: string): string {
  const normalized = (strength ?? "").normalize("NFKC").trim().toLowerCase();
  const numericWithUnit = normalized.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (!numericWithUnit) return canonicalCharacters(normalized);
  const number = Number(numericWithUnit[1]);
  const value = Number.isFinite(number) ? String(number) : numericWithUnit[1];
  return `${value}${canonicalCharacters(numericWithUnit[2])}`;
}

/** Remove presentation-only spacing and punctuation, plus a trailing duplicate of the separate strength field. */
export function normalizeMedicineName(name: string, strength?: string): string {
  let normalized = canonicalCharacters(name);
  const normalizedStrength = normalizeMedicineStrength(strength);
  if (normalizedStrength && normalized.length > normalizedStrength.length && normalized.endsWith(normalizedStrength)) {
    normalized = normalized.slice(0, -normalizedStrength.length);
  }
  return normalized;
}

function oneEditApart(left: string, right: string): boolean {
  if (left === right || Math.abs(left.length - right.length) > 1 || Math.min(left.length, right.length) < 5) return false;
  let leftIndex = 0;
  let rightIndex = 0;
  let edits = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex++;
      rightIndex++;
      continue;
    }
    edits++;
    if (edits > 1) return false;
    if (left.length === right.length && left[leftIndex] === right[rightIndex + 1] && left[leftIndex + 1] === right[rightIndex]) {
      leftIndex += 2;
      rightIndex += 2;
    } else if (left.length > right.length) {
      leftIndex++;
    } else if (right.length > left.length) {
      rightIndex++;
    } else {
      leftIndex++;
      rightIndex++;
    }
  }
  if (leftIndex < left.length || rightIndex < right.length) edits++;
  return edits === 1;
}

function canCompareIdentity(candidate: Medicine, existing: Medicine): boolean {
  return candidate.id !== existing.id && candidate.type === existing.type &&
    normalizeMedicineStrength(candidate.strength) === normalizeMedicineStrength(existing.strength);
}

/** Match by normalized name, form, and strength. Schedule and stock intentionally do not define identity. */
export function findMedicineIdentityMatches(candidate: Medicine, medicines: Medicine[]): MedicineIdentityMatch[] {
  const candidateName = normalizeMedicineName(candidate.name, candidate.strength);
  if (!candidateName) return [];
  const compatible = medicines.filter((medicine) =>
    canCompareIdentity(candidate, medicine) && normalizeMedicineName(medicine.name, medicine.strength)
  );
  const exact = compatible.filter((medicine) => normalizeMedicineName(medicine.name, medicine.strength) === candidateName);
  const matches: MedicineIdentityMatch[] = exact.map((medicine) => ({ medicine, kind: "exact" }));
  if (exact.length) return matches;
  return compatible
    .filter((medicine) => oneEditApart(candidateName, normalizeMedicineName(medicine.name, medicine.strength)))
    .map((medicine) => ({ medicine, kind: "likely" }));
}

/** Return the match that must block insertion; likely matches are overridable only by explicit confirmation. */
export function findBlockingMedicineIdentityMatch(
  candidate: Medicine,
  medicines: Medicine[],
  allowLikelyDuplicate = false,
): MedicineIdentityMatch | undefined {
  return findMedicineIdentityMatches(candidate, medicines).find((match) =>
    match.kind === "exact" || !allowLikelyDuplicate
  );
}

export function findPotentialMedicineIdentityPairs(medicines: Medicine[]): MedicineIdentityPair[] {
  const pairs: MedicineIdentityPair[] = [];
  for (let firstIndex = 0; firstIndex < medicines.length; firstIndex++) {
    const first = medicines[firstIndex];
    for (const match of findMedicineIdentityMatches(first, medicines.slice(firstIndex + 1))) {
      pairs.push({ first, second: match.medicine, kind: match.kind });
    }
  }
  return pairs;
}
