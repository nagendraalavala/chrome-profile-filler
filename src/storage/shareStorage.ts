import { Profile, ProfileField } from "../models/profile";
import { SharedProfile, ShareMetadata } from "../models/sharedProfile";
import { generateId } from "../utils/ids";

const SHARED_PROFILES_KEY = "pf_shared_profiles";
const SHARE_METADATA_KEY = "pf_share_metadata";

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

function generateShareCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code.slice(0, 4) + "-" + code.slice(4);
}

function stripAttachments(fields: ProfileField[]): ProfileField[] {
  return fields.map((f) => {
    const stripped: ProfileField = { ...f };
    if (stripped.type === "ATTACHMENT") {
      stripped.attachment = undefined;
      stripped.value = "[attachment stripped for sharing]";
    }
    if (stripped.children) {
      stripped.children = stripAttachments(stripped.children);
    }
    return stripped;
  });
}

export async function createShare(
  profile: Profile,
  sharedBy: string,
  expiresInHours: number | null,
): Promise<SharedProfile> {
  const shareId = generateId();
  const shareCode = generateShareCode();
  const now = Date.now();

  const shared: SharedProfile = {
    shareId,
    shareCode,
    profileName: profile.name,
    fields: stripAttachments(profile.fields),
    sharedBy,
    sharedAt: now,
    expiresAt: expiresInHours ? now + expiresInHours * 60 * 60 * 1000 : null,
  };

  // Store the shared profile data
  const existing = await getSharedProfiles();
  existing.push(shared);
  await set(SHARED_PROFILES_KEY, existing);

  // Store metadata about what we've shared
  const metadata = await getShareMetadata();
  metadata.push({
    shareId,
    shareCode,
    profileId: profile.profileId,
    profileName: profile.name,
    sharedAt: now,
    expiresAt: shared.expiresAt,
  });
  await set(SHARE_METADATA_KEY, metadata);

  return shared;
}

export async function getSharedProfiles(): Promise<SharedProfile[]> {
  return get<SharedProfile[]>(SHARED_PROFILES_KEY, []);
}

export async function getShareMetadata(): Promise<ShareMetadata[]> {
  return get<ShareMetadata[]>(SHARE_METADATA_KEY, []);
}

export async function importSharedProfile(shareCode: string): Promise<SharedProfile | null> {
  const all = await getSharedProfiles();
  const normalized = shareCode.trim().toUpperCase();
  const found = all.find((s) => s.shareCode === normalized);
  if (!found) return null;

  // Check expiry
  if (found.expiresAt && Date.now() > found.expiresAt) {
    return null;
  }

  return found;
}

export async function revokeShare(shareId: string): Promise<void> {
  const shared = await getSharedProfiles();
  await set(SHARED_PROFILES_KEY, shared.filter((s) => s.shareId !== shareId));

  const metadata = await getShareMetadata();
  await set(SHARE_METADATA_KEY, metadata.filter((m) => m.shareId !== shareId));
}

export async function cleanExpiredShares(): Promise<void> {
  const now = Date.now();
  const shared = await getSharedProfiles();
  const active = shared.filter((s) => !s.expiresAt || s.expiresAt > now);
  if (active.length !== shared.length) {
    await set(SHARED_PROFILES_KEY, active);
  }

  const metadata = await getShareMetadata();
  const activeMeta = metadata.filter((m) => !m.expiresAt || m.expiresAt > now);
  if (activeMeta.length !== metadata.length) {
    await set(SHARE_METADATA_KEY, activeMeta);
  }
}
