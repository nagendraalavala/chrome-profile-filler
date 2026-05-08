import { Profile, ProfileField } from "../models/profile";
import { generateId } from "./ids";
import { fieldsToNestedJson } from "./flatten";

function nestedObjectToFields(
  obj: Record<string, unknown>,
  _labelPrefix = ""
): ProfileField[] {
  const fields: ProfileField[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const label = formatLabel(key);
      fields.push({
        id: generateId(),
        key,
        label,
        type: "GROUP",
        children: nestedObjectToFields(
          value as Record<string, unknown>,
          label
        ),
        collapsed: false,
      });
    } else {
      fields.push({
        id: generateId(),
        key,
        label: formatLabel(key),
        type: "FIELD",
        value: String(value ?? ""),
      });
    }
  }

  return fields;
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export interface ImportedProfile {
  profileId?: string;
  name?: string;
  fields: Record<string, unknown>;
}

export function importProfileFromJson(json: string): Profile {
  const parsed = JSON.parse(json) as ImportedProfile;

  const profileId = parsed.profileId || generateId();
  const name = parsed.name || "Imported Profile";
  const fieldsObj = parsed.fields || parsed;

  const fields = nestedObjectToFields(
    fieldsObj as Record<string, unknown>
  );

  return { profileId, name, fields };
}

export function exportProfileToJson(profile: Profile): string {
  const nested = fieldsToNestedJson(profile.fields);
  const exportObj = {
    profileId: profile.profileId,
    name: profile.name,
    fields: nested,
  };
  return JSON.stringify(exportObj, null, 2);
}
