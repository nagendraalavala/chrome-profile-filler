/**
 * Fill history storage — tracks what was filled where and when.
 */

export interface FillHistoryEntry {
  id: string;
  timestamp: number;
  domain: string;
  url: string;
  profileName: string;
  filledCount: number;
  totalFields: number;
  fieldsSummary: string[];
}

const HISTORY_KEY = "pf_fill_history";
const MAX_ENTRIES = 200;

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

export async function getFillHistory(): Promise<FillHistoryEntry[]> {
  return get<FillHistoryEntry[]>(HISTORY_KEY, []);
}

export async function addFillHistory(entry: Omit<FillHistoryEntry, "id">): Promise<void> {
  const history = await getFillHistory();
  const newEntry: FillHistoryEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  history.unshift(newEntry);

  // Trim to max entries
  if (history.length > MAX_ENTRIES) {
    history.length = MAX_ENTRIES;
  }

  await set(HISTORY_KEY, history);
}

export async function clearFillHistory(): Promise<void> {
  await set(HISTORY_KEY, []);
}

export async function deleteFillHistoryEntry(id: string): Promise<void> {
  const history = await getFillHistory();
  await set(HISTORY_KEY, history.filter((e) => e.id !== id));
}
