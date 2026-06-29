import { AutoFillRule, ExpiryField } from "../models/autoFillRule";

const RULES_KEY = "pf_autofill_rules";
const EXPIRY_KEY = "pf_expiry_fields";

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

// Auto-Fill Rules
export async function getRules(): Promise<AutoFillRule[]> {
  return get<AutoFillRule[]>(RULES_KEY, []);
}

export async function saveRules(rules: AutoFillRule[]): Promise<void> {
  return set(RULES_KEY, rules);
}

// Expiry Fields
export async function getExpiryFields(): Promise<ExpiryField[]> {
  return get<ExpiryField[]>(EXPIRY_KEY, []);
}

export async function saveExpiryFields(fields: ExpiryField[]): Promise<void> {
  return set(EXPIRY_KEY, fields);
}

export function getExpiringFields(fields: ExpiryField[], daysAhead = 30): ExpiryField[] {
  const now = Date.now();
  const threshold = now + daysAhead * 24 * 60 * 60 * 1000;
  return fields.filter((f) => {
    const expiry = new Date(f.expiryDate).getTime();
    return expiry > 0 && expiry <= threshold;
  });
}
