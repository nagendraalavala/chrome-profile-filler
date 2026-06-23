import { Profile, ProfileField } from "../models/profile";

const SYNC_PROFILES_KEY = "pf_sync_profiles";
const SYNC_ACTIVE_KEY = "pf_sync_active";
const SYNC_ENABLED_KEY = "pf_sync_enabled";
const SYNC_TIMESTAMP_KEY = "pf_sync_ts";

// chrome.storage.sync limit: ~8KB per item. Profiles without attachments
// are typically well under this, but we strip attachment data just in case.

function getSyncStorage(): typeof chrome.storage.sync | null {
  if (typeof chrome !== "undefined" && chrome.storage?.sync) {
    return chrome.storage.sync;
  }
  return null;
}

function getLocalStorage(): typeof chrome.storage.local | null {
  if (typeof chrome !== "undefined" && chrome.storage?.local) {
    return chrome.storage.local;
  }
  return null;
}

async function syncGet<T>(key: string, defaultValue: T): Promise<T> {
  const storage = getSyncStorage();
  if (!storage) return defaultValue;
  return new Promise((resolve) => {
    storage.get(key, (result) => {
      resolve(result[key] !== undefined ? (result[key] as T) : defaultValue);
    });
  });
}

async function syncSet<T>(key: string, value: T): Promise<void> {
  const storage = getSyncStorage();
  if (!storage) return;
  return new Promise((resolve, reject) => {
    storage.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

async function localGet<T>(key: string, defaultValue: T): Promise<T> {
  const storage = getLocalStorage();
  if (!storage) return defaultValue;
  return new Promise((resolve) => {
    storage.get(key, (result) => {
      resolve(result[key] !== undefined ? (result[key] as T) : defaultValue);
    });
  });
}

async function localSet<T>(key: string, value: T): Promise<void> {
  const storage = getLocalStorage();
  if (!storage) return;
  return new Promise((resolve) => {
    storage.set({ [key]: value }, resolve);
  });
}

/**
 * Strip attachment data (base64 dataUrl) from profile fields before syncing.
 * Keeps attachment metadata (fileName, mimeType, size) so user sees placeholders.
 */
function stripAttachments(fields: ProfileField[]): ProfileField[] {
  return fields.map((field) => {
    if (field.type === "GROUP" && field.children) {
      return { ...field, children: stripAttachments(field.children) };
    }
    if (field.type === "ATTACHMENT" && field.attachment) {
      return {
        ...field,
        attachment: {
          ...field.attachment,
          dataUrl: "", // strip the large base64 payload
        },
      };
    }
    return field;
  });
}

/**
 * Merge synced profile data into local profiles.
 * Local attachment data is preserved; synced text fields overwrite local.
 */
function mergeProfiles(localProfiles: Profile[], syncedProfiles: Profile[]): Profile[] {
  const localMap = new Map(localProfiles.map((p) => [p.profileId, p]));
  const merged: Profile[] = [];

  for (const synced of syncedProfiles) {
    const local = localMap.get(synced.profileId);
    if (local) {
      // Merge: use synced fields but restore local attachment data
      merged.push({
        ...synced,
        fields: restoreAttachments(synced.fields, local.fields),
      });
      localMap.delete(synced.profileId);
    } else {
      merged.push(synced);
    }
  }

  // Keep any local-only profiles
  for (const remaining of localMap.values()) {
    merged.push(remaining);
  }

  return merged;
}

/**
 * Restore attachment dataUrl from local fields into synced fields.
 */
function restoreAttachments(
  syncedFields: ProfileField[],
  localFields: ProfileField[]
): ProfileField[] {
  return syncedFields.map((sf) => {
    const localMatch = localFields.find((lf) => lf.id === sf.id);
    if (sf.type === "GROUP" && sf.children && localMatch?.children) {
      return { ...sf, children: restoreAttachments(sf.children, localMatch.children) };
    }
    if (sf.type === "ATTACHMENT" && sf.attachment && localMatch?.attachment?.dataUrl) {
      return {
        ...sf,
        attachment: {
          ...sf.attachment,
          dataUrl: localMatch.attachment.dataUrl,
        },
      };
    }
    return sf;
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function isSyncEnabled(): Promise<boolean> {
  return localGet<boolean>(SYNC_ENABLED_KEY, false);
}

export async function setSyncEnabled(enabled: boolean): Promise<void> {
  await localSet(SYNC_ENABLED_KEY, enabled);
  if (enabled) {
    await pushToSync();
  }
}

/**
 * Push current local profiles to chrome.storage.sync.
 * Strips attachments to stay within sync storage limits.
 */
export async function pushToSync(): Promise<void> {
  const enabled = await isSyncEnabled();
  if (!enabled) return;

  const storage = getLocalStorage();
  if (!storage) return;

  const profiles = await localGet<Profile[]>("pf_profiles", []);
  const activeId = await localGet<string>("pf_active_profile", "");

  const syncableProfiles = profiles.map((p) => ({
    ...p,
    fields: stripAttachments(p.fields),
  }));

  try {
    await syncSet(SYNC_PROFILES_KEY, syncableProfiles);
    await syncSet(SYNC_ACTIVE_KEY, activeId);
    await syncSet(SYNC_TIMESTAMP_KEY, Date.now());
  } catch (err) {
    console.warn("Profile Filler: sync push failed (data may exceed limits)", err);
  }
}

/**
 * Pull profiles from chrome.storage.sync and merge into local storage.
 * Returns true if local data was updated.
 */
export async function pullFromSync(): Promise<boolean> {
  const enabled = await isSyncEnabled();
  if (!enabled) return false;

  const syncedProfiles = await syncGet<Profile[]>(SYNC_PROFILES_KEY, []);
  if (syncedProfiles.length === 0) return false;

  const localProfiles = await localGet<Profile[]>("pf_profiles", []);
  const merged = mergeProfiles(localProfiles, syncedProfiles);

  // Check if anything actually changed
  const localJson = JSON.stringify(localProfiles.map((p) => p.profileId).sort());
  const mergedJson = JSON.stringify(merged.map((p) => p.profileId).sort());
  const changed = localJson !== mergedJson ||
    JSON.stringify(localProfiles) !== JSON.stringify(merged);

  if (changed) {
    await localSet("pf_profiles", merged);
  }

  // Sync active profile ID
  const syncedActiveId = await syncGet<string>(SYNC_ACTIVE_KEY, "");
  if (syncedActiveId) {
    await localSet("pf_active_profile", syncedActiveId);
  }

  return changed;
}

/**
 * Set up a listener for sync storage changes (e.g. from another device).
 * Calls the callback when profiles are updated remotely.
 */
export function onSyncChanged(callback: () => void): void {
  if (typeof chrome === "undefined" || !chrome.storage) return;
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes[SYNC_PROFILES_KEY]) {
      callback();
    }
  });
}
