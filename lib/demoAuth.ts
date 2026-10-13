import { normalizeDemoEmail } from "@/lib/demoProfiles";

export const DEMO_ACCOUNT_REGISTRY_KEY = "chilldose_demo_accounts_v1";

const REGISTRY_VERSION = 1 as const;
const PBKDF2_ITERATIONS = 600_000;
const DERIVED_KEY_BITS = 256;
const SALT_BYTES = 16;
export const DEMO_PASSWORD_MIN_LENGTH = 8;

interface DemoAccount {
  email: string;
  salt: string;
  passwordHash: string;
}

interface DemoAccountRegistry {
  version: typeof REGISTRY_VERSION;
  accounts: DemoAccount[];
}

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export class DemoAccountAlreadyExistsError extends Error {
  constructor() {
    super("An account already exists for this email. Log in to continue.");
    this.name = "DemoAccountAlreadyExistsError";
  }
}

export class DemoAccountNotFoundError extends Error {
  constructor() {
    super("No local account was found for this email. Get started to register it first.");
    this.name = "DemoAccountNotFoundError";
  }
}

export class DemoPasswordMismatchError extends Error {
  constructor() {
    super("That password does not match this local account.");
    this.name = "DemoPasswordMismatchError";
  }
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(value: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})+$/i.test(value)) throw new Error("The local account registry is invalid and was left unchanged.");
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (pair) => Number.parseInt(pair, 16));
}

function readRegistry(storage: StorageLike): DemoAccountRegistry {
  const raw = storage.getItem(DEMO_ACCOUNT_REGISTRY_KEY);
  if (raw === null) return { version: REGISTRY_VERSION, accounts: [] };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" || parsed === null ||
      (parsed as Partial<DemoAccountRegistry>).version !== REGISTRY_VERSION ||
      !Array.isArray((parsed as Partial<DemoAccountRegistry>).accounts)
    ) {
      throw new Error();
    }

    const accounts = (parsed as DemoAccountRegistry).accounts;
    const emails = new Set<string>();
    if (accounts.some((account) =>
      typeof account !== "object" || account === null ||
      typeof account.email !== "string" || normalizeDemoEmail(account.email) !== account.email || emails.has(account.email) ||
      typeof account.salt !== "string" || typeof account.passwordHash !== "string" ||
      !/^(?:[0-9a-f]{2})+$/i.test(account.salt) || !/^(?:[0-9a-f]{2})+$/i.test(account.passwordHash) ||
      !emails.add(account.email)
    )) {
      throw new Error();
    }

    return { version: REGISTRY_VERSION, accounts };
  } catch {
    throw new Error("The local account registry could not be read safely. Existing account and tracker data was left unchanged.");
  }
}

async function hashPassword(password: string, salt: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.getRandomValues || !globalThis.crypto.subtle) {
    throw new Error("This browser does not provide secure local password hashing. Use a current browser to continue.");
  }
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    DERIVED_KEY_BITS,
  );
  return toHex(new Uint8Array(bits));
}

function equalHash(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function registerDemoAccount(storage: StorageLike, emailInput: string, password: string): Promise<string> {
  const email = normalizeDemoEmail(emailInput);
  if (!email) throw new Error("Enter an email address to create a local account.");
  if (password.length < DEMO_PASSWORD_MIN_LENGTH) throw new Error(`Choose a password with at least ${DEMO_PASSWORD_MIN_LENGTH} characters.`);
  if (readRegistry(storage).accounts.some((account) => account.email === email)) {
    throw new DemoAccountAlreadyExistsError();
  }

  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const passwordHash = await hashPassword(password, salt);
  // Re-read after the async hash so a second signup in this tab cannot overwrite a new account.
  const registry = readRegistry(storage);
  if (registry.accounts.some((account) => account.email === email)) {
    throw new DemoAccountAlreadyExistsError();
  }
  registry.accounts.push({ email, salt: toHex(salt), passwordHash });
  storage.setItem(DEMO_ACCOUNT_REGISTRY_KEY, JSON.stringify(registry));
  return email;
}

export async function verifyDemoAccount(storage: StorageLike, emailInput: string, password: string): Promise<string> {
  const email = normalizeDemoEmail(emailInput);
  if (!email) throw new DemoAccountNotFoundError();
  const account = readRegistry(storage).accounts.find((candidate) => candidate.email === email);
  if (!account) throw new DemoAccountNotFoundError();

  const suppliedHash = await hashPassword(password, fromHex(account.salt));
  if (!equalHash(suppliedHash, account.passwordHash)) throw new DemoPasswordMismatchError();
  return email;
}

export async function changeDemoPassword(
  storage: StorageLike,
  emailInput: string,
  currentPassword: string,
  newPassword: string,
): Promise<string> {
  const email = normalizeDemoEmail(emailInput);
  if (!email) throw new DemoAccountNotFoundError();
  if (newPassword.length < DEMO_PASSWORD_MIN_LENGTH) {
    throw new Error(`Choose a password with at least ${DEMO_PASSWORD_MIN_LENGTH} characters.`);
  }

  const originalRegistry = readRegistry(storage);
  const originalAccount = originalRegistry.accounts.find((candidate) => candidate.email === email);
  if (!originalAccount) throw new DemoAccountNotFoundError();

  const currentHash = await hashPassword(currentPassword, fromHex(originalAccount.salt));
  if (!equalHash(currentHash, originalAccount.passwordHash)) throw new DemoPasswordMismatchError();
  if (newPassword === currentPassword) {
    throw new Error("Your new password must be different from your current password.");
  }

  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const passwordHash = await hashPassword(newPassword, salt);

  // Re-read after hashing. Update only the matching credential if it is still unchanged.
  const registry = readRegistry(storage);
  const account = registry.accounts.find((candidate) => candidate.email === email);
  if (!account) throw new DemoAccountNotFoundError();
  if (account.salt !== originalAccount.salt || !equalHash(account.passwordHash, originalAccount.passwordHash)) {
    throw new Error("This local account changed during the update. Please try again.");
  }
  account.salt = toHex(salt);
  account.passwordHash = passwordHash;
  storage.setItem(DEMO_ACCOUNT_REGISTRY_KEY, JSON.stringify(registry));
  return email;
}
