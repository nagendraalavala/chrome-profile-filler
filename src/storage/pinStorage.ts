const PIN_HASH_KEY = "pf_pin_hash";
const PIN_SALT_KEY = "pf_pin_salt";
const RECOVERY_QUESTION_KEY = "pf_recovery_question";
const RECOVERY_HASH_KEY = "pf_recovery_hash";
const RECOVERY_SALT_KEY = "pf_recovery_salt";
const LOCK_TIMEOUT_KEY = "pf_lock_timeout_ms";
const LAST_ACTIVITY_KEY = "pf_last_activity";

const DEFAULT_LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes

function getStorage(): typeof chrome.storage.local | null {
  if (typeof chrome !== "undefined" && chrome.storage) {
    return chrome.storage.local;
  }
  return null;
}

async function get<T>(key: string, defaultValue: T): Promise<T> {
  const storage = getStorage();
  if (!storage) {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : defaultValue;
  }
  return new Promise((resolve) => {
    storage.get(key, (result) => {
      resolve(result[key] !== undefined ? (result[key] as T) : defaultValue);
    });
  });
}

async function set<T>(key: string, value: T): Promise<void> {
  const storage = getStorage();
  if (!storage) {
    localStorage.setItem(key, JSON.stringify(value));
    return;
  }
  return new Promise((resolve) => {
    storage.set({ [key]: value }, resolve);
  });
}

function generateSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(salt + pin);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizeRecoveryAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function isPinSet(): Promise<boolean> {
  const hash = await get<string>(PIN_HASH_KEY, "");
  return hash.length > 0;
}

export async function setupPin(
  pin: string,
  recovery?: { question: string; answer: string },
): Promise<void> {
  const salt = generateSalt();
  const hash = await hashPin(pin, salt);
  await set(PIN_SALT_KEY, salt);
  await set(PIN_HASH_KEY, hash);

  if (recovery && recovery.question.trim() && recovery.answer.trim()) {
    const recoverySalt = generateSalt();
    const recoveryHash = await hashPin(
      normalizeRecoveryAnswer(recovery.answer),
      recoverySalt,
    );
    await set(RECOVERY_QUESTION_KEY, recovery.question.trim());
    await set(RECOVERY_SALT_KEY, recoverySalt);
    await set(RECOVERY_HASH_KEY, recoveryHash);
  } else {
    await set(RECOVERY_QUESTION_KEY, "");
    await set(RECOVERY_SALT_KEY, "");
    await set(RECOVERY_HASH_KEY, "");
  }

  await updateLastActivity();
}

export async function verifyPin(pin: string): Promise<boolean> {
  const salt = await get<string>(PIN_SALT_KEY, "");
  const storedHash = await get<string>(PIN_HASH_KEY, "");
  if (!salt || !storedHash) return false;
  const hash = await hashPin(pin, salt);
  return hash === storedHash;
}

export async function changePin(
  currentPin: string,
  newPin: string
): Promise<boolean> {
  const valid = await verifyPin(currentPin);
  if (!valid) return false;
  await setupPin(newPin);
  return true;
}

export async function removePin(currentPin: string): Promise<boolean> {
  const valid = await verifyPin(currentPin);
  if (!valid) return false;
  await set(PIN_HASH_KEY, "");
  await set(PIN_SALT_KEY, "");
  await set(RECOVERY_QUESTION_KEY, "");
  await set(RECOVERY_SALT_KEY, "");
  await set(RECOVERY_HASH_KEY, "");
  return true;
}

export async function getRecoveryQuestion(): Promise<string> {
  return get<string>(RECOVERY_QUESTION_KEY, "");
}

export async function hasRecoveryQuestion(): Promise<boolean> {
  const question = await getRecoveryQuestion();
  return question.trim().length > 0;
}

export async function resetPinWithRecovery(
  question: string,
  answer: string,
  newPin: string,
): Promise<boolean> {
  const storedQuestion = await get<string>(RECOVERY_QUESTION_KEY, "");
  const storedSalt = await get<string>(RECOVERY_SALT_KEY, "");
  const storedHash = await get<string>(RECOVERY_HASH_KEY, "");

  if (!storedQuestion || !storedSalt || !storedHash) {
    return false;
  }

  const questionMatches =
    storedQuestion.trim().toLowerCase() === question.trim().toLowerCase();
  if (!questionMatches) return false;

  const answerHash = await hashPin(normalizeRecoveryAnswer(answer), storedSalt);
  if (answerHash !== storedHash) return false;

  await setupPin(newPin, {
    question: storedQuestion,
    answer,
  });

  return true;
}

export async function getLockTimeout(): Promise<number> {
  return get<number>(LOCK_TIMEOUT_KEY, DEFAULT_LOCK_TIMEOUT);
}

export async function setLockTimeout(ms: number): Promise<void> {
  await set(LOCK_TIMEOUT_KEY, ms);
}

export async function updateLastActivity(): Promise<void> {
  await set(LAST_ACTIVITY_KEY, Date.now());
}

export async function isSessionExpired(): Promise<boolean> {
  const lastActivity = await get<number>(LAST_ACTIVITY_KEY, 0);
  if (lastActivity === 0) return true;
  const timeout = await getLockTimeout();
  return Date.now() - lastActivity > timeout;
}
