import { FlattenedField, MatchResult, FormFieldInfo, SiteMapping } from "../models/profile";
import { FIELD_ALIASES, SECTION_BOOST_KEYWORDS } from "./aliases";

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

function tokenize(str: string): string[] {
  return normalize(str).split("_").filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function fuzzyScore(a: string, b: string): number {
  const dist = levenshtein(normalize(a), normalize(b));
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - dist / maxLen;
}

function getGroupPrefix(dotKey: string): string {
  const parts = dotKey.split(".");
  return parts.length > 1 ? parts[0] : "";
}

function getSectionBoost(
  sectionHeading: string,
  dotKey: string
): number {
  if (!sectionHeading) return 0;
  const normalizedHeading = sectionHeading.toLowerCase();
  const groupPrefix = getGroupPrefix(dotKey);
  if (!groupPrefix) return 0;

  const keywords = SECTION_BOOST_KEYWORDS[groupPrefix];
  if (!keywords) return 0;

  for (const keyword of keywords) {
    if (normalizedHeading.includes(keyword)) {
      return 0.15;
    }
  }
  return 0;
}

function buildAliasLookup(): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const [profileKey, aliases] of Object.entries(FIELD_ALIASES)) {
    lookup.set(normalize(profileKey), profileKey);
    for (const alias of aliases) {
      lookup.set(normalize(alias), profileKey);
    }
  }
  return lookup;
}

const aliasLookup = buildAliasLookup();

function getFieldSignature(field: FormFieldInfo): string {
  return [field.name, field.id, field.label, field.placeholder, field.autocomplete]
    .filter(Boolean)
    .join("|");
}

function scoreCandidate(
  formField: FormFieldInfo,
  dotKey: string
): number {
  const candidates = [
    formField.name,
    formField.id,
    formField.label,
    formField.placeholder,
    formField.autocomplete,
  ].filter(Boolean);

  let bestScore = 0;

  for (const candidate of candidates) {
    const normCandidate = normalize(candidate);

    // Exact match on alias lookup
    const aliasMatch = aliasLookup.get(normCandidate);
    if (aliasMatch === dotKey) {
      bestScore = Math.max(bestScore, 0.95);
      continue;
    }

    // Exact normalized match
    const normDotKey = normalize(dotKey.replace(/\./g, "_"));
    if (normCandidate === normDotKey) {
      bestScore = Math.max(bestScore, 0.9);
      continue;
    }

    // Last segment match (e.g. "city" matching "address.city")
    const lastSegment = dotKey.split(".").pop() || "";
    if (normCandidate === normalize(lastSegment)) {
      bestScore = Math.max(bestScore, 0.7);
      continue;
    }

    // Token overlap scoring
    const formTokens = tokenize(candidate);
    const keyTokens = tokenize(dotKey.replace(/\./g, "_"));
    if (formTokens.length > 0 && keyTokens.length > 0) {
      const overlap = formTokens.filter((t) => keyTokens.includes(t)).length;
      const tokenScore = overlap / Math.max(formTokens.length, keyTokens.length);
      bestScore = Math.max(bestScore, tokenScore * 0.8);
    }

    // Fuzzy match on last segment
    const fScore = fuzzyScore(candidate, lastSegment);
    if (fScore > 0.7) {
      bestScore = Math.max(bestScore, fScore * 0.6);
    }
  }

  // Section heading boost
  bestScore += getSectionBoost(formField.sectionHeading, dotKey);

  return Math.min(bestScore, 1);
}

export function matchFields(
  formFields: FormFieldInfo[],
  profileFields: FlattenedField[],
  siteMappings: SiteMapping[],
  domain: string
): MatchResult[] {
  const results: MatchResult[] = [];

  // Separate attachment-capable fields from regular profile fields
  const attachmentFields = profileFields.filter((f) => f.isAttachment);
  const regularFields = profileFields.filter((f) => !f.isAttachment);

  for (const formField of formFields) {
    const signature = getFieldSignature(formField);
    const isFileField = formField.isFileInput || formField.type === "file";
    const candidatePool = isFileField ? attachmentFields : regularFields;

    // 1. Check saved site mappings first
    const savedMapping = siteMappings.find(
      (m) => m.domain === domain && m.fieldSignature === signature
    );

    if (savedMapping) {
      const matched = profileFields.find((p) => p.dotKey === savedMapping.profileKey);
      if (matched) {
        results.push({
          formFieldName: formField.name || formField.id,
          formFieldLabel: formField.label || formField.placeholder || formField.name || formField.id,
          formFieldElement: signature,
          profileKey: matched.dotKey,
          value: matched.value,
          confidence: 1.0,
          selected: true,
          group: getGroupPrefix(matched.dotKey) || undefined,
          isAttachment: matched.isAttachment,
          attachment: matched.attachment,
        });
        continue;
      }
    }

    // 2-5. Score all profile fields and pick the best
    let bestMatch: FlattenedField | null = null;
    let bestScore = 0;

    for (const profileField of candidatePool) {
      const score = scoreCandidate(formField, profileField.dotKey);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = profileField;
      }
    }

    if (bestMatch && bestScore >= 0.3) {
      results.push({
        formFieldName: formField.name || formField.id,
        formFieldLabel: formField.label || formField.placeholder || formField.name || formField.id,
        formFieldElement: signature,
        profileKey: bestMatch.dotKey,
        value: bestMatch.value,
        confidence: Math.round(bestScore * 100) / 100,
        selected: bestScore >= 0.6,
        group: getGroupPrefix(bestMatch.dotKey) || undefined,
        isAttachment: bestMatch.isAttachment,
        attachment: bestMatch.attachment,
      });
    } else {
      results.push({
        formFieldName: formField.name || formField.id,
        formFieldLabel: formField.label || formField.placeholder || formField.name || formField.id,
        formFieldElement: signature,
        profileKey: "",
        value: "",
        confidence: 0,
        selected: false,
        group: undefined,
      });
    }
  }

  return results;
}
