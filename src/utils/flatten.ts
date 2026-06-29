import { ProfileField, FlattenedField } from "../models/profile";

export function flattenFields(
  fields: ProfileField[],
  prefix = ""
): FlattenedField[] {
  const result: FlattenedField[] = [];

  for (const field of fields) {
    const dotKey = prefix ? `${prefix}.${field.key}` : field.key;

    if (field.type === "GROUP" && field.children) {
      result.push(...flattenFields(field.children, dotKey));
    } else if (field.type === "ATTACHMENT") {
      // Attachment autofill is intentionally disabled. Preserve a plain value
      // so imported/legacy profiles remain editable without file automation.
      result.push({
        dotKey,
        value: field.value || "",
        label: field.label,
      });
    } else if (field.type === "FIELD" && field.value !== undefined) {
      result.push({
        dotKey,
        value: field.value,
        label: field.label,
      });
    }
  }

  return result;
}

export function unflattenToNestedObject(
  flatMap: Record<string, string>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [dotKey, value] of Object.entries(flatMap)) {
    const parts = dotKey.split(".");
    let current: Record<string, unknown> = result;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== "object") {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  return result;
}

export function flattenNestedObject(
  obj: Record<string, unknown>,
  prefix = ""
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    const dotKey = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(
        result,
        flattenNestedObject(value as Record<string, unknown>, dotKey)
      );
    } else {
      result[dotKey] = String(value ?? "");
    }
  }

  return result;
}

export function fieldsToFlatMap(fields: ProfileField[]): Record<string, string> {
  const flatFields = flattenFields(fields);
  const result: Record<string, string> = {};
  for (const f of flatFields) {
    result[f.dotKey] = f.value;
  }
  return result;
}

export function fieldsToNestedJson(fields: ProfileField[]): Record<string, unknown> {
  const flatMap = fieldsToFlatMap(fields);
  return unflattenToNestedObject(flatMap);
}
