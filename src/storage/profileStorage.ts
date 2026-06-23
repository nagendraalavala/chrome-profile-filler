import { Profile, SiteMapping } from "../models/profile";
import { generateId } from "../utils/ids";
import { pushToSync } from "./syncStorage";

const PROFILES_KEY = "pf_profiles";
const MAPPINGS_KEY = "pf_site_mappings";
const ACTIVE_PROFILE_KEY = "pf_active_profile";

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

export async function getProfiles(): Promise<Profile[]> {
  return get<Profile[]>(PROFILES_KEY, []);
}

export async function saveProfiles(profiles: Profile[]): Promise<void> {
  await set(PROFILES_KEY, profiles);
  pushToSync().catch(() => { /* sync errors are non-fatal */ });
}

export async function getProfile(profileId: string): Promise<Profile | null> {
  const profiles = await getProfiles();
  return profiles.find((p) => p.profileId === profileId) || null;
}

export async function addProfile(profile: Profile): Promise<void> {
  const profiles = await getProfiles();
  profiles.push(profile);
  await saveProfiles(profiles);
}

export async function updateProfile(updated: Profile): Promise<void> {
  const profiles = await getProfiles();
  const idx = profiles.findIndex((p) => p.profileId === updated.profileId);
  if (idx !== -1) {
    profiles[idx] = updated;
  } else {
    profiles.push(updated);
  }
  await saveProfiles(profiles);
}

export async function deleteProfile(profileId: string): Promise<void> {
  const profiles = await getProfiles();
  await saveProfiles(profiles.filter((p) => p.profileId !== profileId));
}

export async function getActiveProfileId(): Promise<string | null> {
  return get<string | null>(ACTIVE_PROFILE_KEY, null);
}

export async function setActiveProfileId(profileId: string): Promise<void> {
  await set(ACTIVE_PROFILE_KEY, profileId);
  pushToSync().catch(() => { /* sync errors are non-fatal */ });
}

export async function getSiteMappings(): Promise<SiteMapping[]> {
  return get<SiteMapping[]>(MAPPINGS_KEY, []);
}

export async function saveSiteMapping(mapping: SiteMapping): Promise<void> {
  const mappings = await getSiteMappings();
  const idx = mappings.findIndex(
    (m) => m.domain === mapping.domain && m.fieldSignature === mapping.fieldSignature
  );
  if (idx !== -1) {
    mappings[idx] = mapping;
  } else {
    mappings.push(mapping);
  }
  await set(MAPPINGS_KEY, mappings);
}

export async function saveSiteMappings(newMappings: SiteMapping[]): Promise<void> {
  const mappings = await getSiteMappings();
  for (const mapping of newMappings) {
    const idx = mappings.findIndex(
      (m) => m.domain === mapping.domain && m.fieldSignature === mapping.fieldSignature
    );
    if (idx !== -1) {
      mappings[idx] = mapping;
    } else {
      mappings.push(mapping);
    }
  }
  await set(MAPPINGS_KEY, mappings);
}

export function createDefaultProfile(): Profile {
  return {
    profileId: generateId(),
    name: "My Profile",
    fields: [
      {
        id: generateId(),
        key: "firstName",
        label: "First Name",
        type: "FIELD",
        value: "",
      },
      {
        id: generateId(),
        key: "lastName",
        label: "Last Name",
        type: "FIELD",
        value: "",
      },
      {
        id: generateId(),
        key: "email",
        label: "Email",
        type: "FIELD",
        value: "",
      },
      {
        id: generateId(),
        key: "phone",
        label: "Phone",
        type: "FIELD",
        value: "",
      },
      {
        id: generateId(),
        key: "address",
        label: "Address",
        type: "GROUP",
        collapsed: false,
        children: [
          { id: generateId(), key: "line1", label: "Address Line 1", type: "FIELD", value: "" },
          { id: generateId(), key: "line2", label: "Address Line 2", type: "FIELD", value: "" },
          { id: generateId(), key: "city", label: "City", type: "FIELD", value: "" },
          { id: generateId(), key: "state", label: "State", type: "FIELD", value: "" },
          { id: generateId(), key: "zip", label: "Zip", type: "FIELD", value: "" },
          { id: generateId(), key: "country", label: "Country", type: "FIELD", value: "" },
        ],
      },
      {
        id: generateId(),
        key: "workExperience",
        label: "Work Experience",
        type: "GROUP",
        collapsed: false,
        children: [
          { id: generateId(), key: "company", label: "Company", type: "FIELD", value: "" },
          { id: generateId(), key: "title", label: "Job Title", type: "FIELD", value: "" },
          { id: generateId(), key: "years", label: "Years", type: "FIELD", value: "" },
        ],
      },
      {
        id: generateId(),
        key: "social",
        label: "Social Links",
        type: "GROUP",
        collapsed: false,
        children: [
          { id: generateId(), key: "linkedin", label: "LinkedIn", type: "FIELD", value: "" },
          { id: generateId(), key: "github", label: "GitHub", type: "FIELD", value: "" },
        ],
      },
      {
        id: generateId(),
        key: "documents",
        label: "Documents",
        type: "GROUP",
        collapsed: false,
        children: [
          { id: generateId(), key: "resume", label: "Resume / CV", type: "ATTACHMENT", value: "" },
          { id: generateId(), key: "coverLetter", label: "Cover Letter", type: "ATTACHMENT", value: "" },
          { id: generateId(), key: "driversLicense", label: "Driver's License", type: "ATTACHMENT", value: "" },
          { id: generateId(), key: "passport", label: "Passport", type: "ATTACHMENT", value: "" },
          { id: generateId(), key: "photo", label: "Photo", type: "ATTACHMENT", value: "" },
        ],
      },
    ],
  };
}
