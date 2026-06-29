import { FlattenedField, MatchResult, FormFieldInfo, SiteMapping } from "../models/profile";
import { FIELD_ALIASES, SECTION_BOOST_KEYWORDS, SYNONYM_GROUPS, TOKEN_ABBREVIATIONS, COMPOSITE_RULES, CompositeRule, detectFormType, getFormTypeBoost, FormType } from "./aliases";
import { getI18nAliases } from "./i18nAliases";
import { calculateAge } from "../utils/smartValues";

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

const STOP_WORDS = new Set([
  "to", "of", "with", "for", "the", "and", "or", "a", "an", "in", "on",
  "at", "by", "is", "as", "per", "your", "my", "our", "their",
]);

function tokenize(str: string): string[] {
  return normalize(str).split("_").filter(Boolean);
}

function tokenizeNoStop(str: string): string[] {
  return tokenize(str).filter((t) => !STOP_WORDS.has(t));
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

/**
 * Strip parenthetical content from labels to improve matching.
 * e.g. "Full Name (as per passport)" → "Full Name"
 *      "Cell Phone ( **No Google Voice # )" → "Cell Phone"
 */
function stripParenthetical(str: string): string {
  return str.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
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
  // Merge multilingual aliases
  for (const [profileKey, aliases] of Object.entries(getI18nAliases())) {
    if (!lookup.has(normalize(profileKey))) {
      lookup.set(normalize(profileKey), profileKey);
    }
    for (const alias of aliases) {
      const norm = normalize(alias);
      if (!lookup.has(norm)) {
        lookup.set(norm, profileKey);
      }
    }
  }
  return lookup;
}

const aliasLookup = buildAliasLookup();

/**
 * Builds a bidirectional concept lookup from SYNONYM_GROUPS.
 * Maps each normalized term to a concept index so both form field names
 * and user-defined profile keys can be resolved to the same concept.
 */
function buildConceptLookup(): Map<string, number> {
  const lookup = new Map<string, number>();
  for (let i = 0; i < SYNONYM_GROUPS.length; i++) {
    for (const term of SYNONYM_GROUPS[i]) {
      lookup.set(normalize(term), i);
    }
  }
  return lookup;
}

const conceptLookup = buildConceptLookup();

/** Resolve a string to its concept index, or -1 if no concept found. */
function resolveConcept(str: string): number {
  return conceptLookup.get(normalize(str)) ?? -1;
}

/**
 * Expand tokens using TOKEN_ABBREVIATIONS.
 * e.g. ["fname"] → ["first", "name"], ["addr"] → ["address"]
 */
function expandTokens(tokens: string[]): string[] {
  const expanded: string[] = [];
  for (const token of tokens) {
    const expansion = TOKEN_ABBREVIATIONS[token];
    if (expansion) {
      expanded.push(...expansion);
    } else {
      expanded.push(token);
    }
  }
  return expanded;
}

/**
 * Check if two sets of tokens refer to the same concept
 * by joining them and checking the concept lookup.
 */
function tokensMatchConcept(tokensA: string[], tokensB: string[]): boolean {
  // Only match when the FULL joined token strings resolve to the same concept.
  // Individual token-level matching (e.g. sharing just "address") is too loose
  // and is already handled by steps 6/7 with proportional scoring.
  const joinA = tokensA.join("_");
  const joinB = tokensB.join("_");
  const conceptA = resolveConcept(joinA);
  const conceptB = resolveConcept(joinB);
  if (conceptA >= 0 && conceptA === conceptB) return true;

  // For single-token sets, also check if the single token matches any
  // single token in the other set (handles "phone" vs ["phone","number"])
  if (tokensA.length === 1 || tokensB.length === 1) {
    const single = tokensA.length === 1 ? tokensA : tokensB;
    const multi = tokensA.length === 1 ? tokensB : tokensA;
    const singleConcept = resolveConcept(single[0]);
    if (singleConcept >= 0) {
      // Check if multi's joined form resolves to the same concept
      const multiJoined = multi.join("_");
      if (singleConcept === resolveConcept(multiJoined)) return true;
    }
  }
  return false;
}

function getFieldSignature(field: FormFieldInfo): string {
  return [field.name, field.id, field.label, field.placeholder, field.autocomplete]
    .filter(Boolean)
    .join("|");
}

function scoreCandidate(
  formField: FormFieldInfo,
  dotKey: string
): number {
  const rawCandidates = [
    formField.name,
    formField.id,
    formField.label,
    formField.placeholder,
    formField.autocomplete,
  ].filter(Boolean);

  // Add stripped variants (without parenthetical text) for better matching
  const candidates: string[] = [];
  for (const c of rawCandidates) {
    candidates.push(c);
    const stripped = stripParenthetical(c);
    if (stripped !== c && stripped.length >= 2) {
      candidates.push(stripped);
    }
  }

  let bestScore = 0;
  const lastSegment = dotKey.split(".").pop() || "";
  const normDotKey = normalize(dotKey.replace(/\./g, "_"));
  const keyTokensRaw = tokenize(dotKey.replace(/\./g, "_"));
  const keyTokensExpanded = expandTokens(keyTokensRaw);

  // Pre-compute concept for the profile key (last segment and full key)
  const keyConceptFull = resolveConcept(normDotKey);
  const keyConceptLast = resolveConcept(lastSegment);

  for (const candidate of candidates) {
    const normCandidate = normalize(candidate);

    // 1. Exact match on alias lookup (form field → known profile key)
    const aliasMatch = aliasLookup.get(normCandidate);
    if (aliasMatch === dotKey) {
      bestScore = Math.max(bestScore, 0.95);
      continue;
    }

    // 2. Exact normalized match
    if (normCandidate === normDotKey) {
      bestScore = Math.max(bestScore, 0.9);
      continue;
    }

    // 3. Last segment match (e.g. "city" matching "address.city")
    if (normCandidate === normalize(lastSegment)) {
      bestScore = Math.max(bestScore, 0.7);
      continue;
    }

    // 4. Bidirectional concept matching — resolve BOTH form field and
    //    profile key to canonical concepts via SYNONYM_GROUPS
    const candidateConcept = resolveConcept(normCandidate);
    if (candidateConcept >= 0 &&
        (candidateConcept === keyConceptFull || candidateConcept === keyConceptLast)) {
      bestScore = Math.max(bestScore, 0.88);
      continue;
    }

    // 5. Token-level concept matching with abbreviation expansion
    const formTokensRaw = tokenize(candidate);
    const formTokensExpanded = expandTokens(formTokensRaw);

    if (tokensMatchConcept(formTokensExpanded, keyTokensExpanded)) {
      bestScore = Math.max(bestScore, 0.85);
      continue;
    }

    // 6. Token overlap scoring (with expanded tokens)
    if (formTokensExpanded.length > 0 && keyTokensExpanded.length > 0) {
      const overlap = formTokensExpanded.filter((t) => keyTokensExpanded.includes(t)).length;
      const tokenScore = overlap / Math.max(formTokensExpanded.length, keyTokensExpanded.length);
      if (tokenScore > 0) {
        bestScore = Math.max(bestScore, tokenScore * 0.8);
      }

      // 6b. Subset matching with stop words removed — if ALL key
      // tokens are found within the form tokens (ignoring filler words),
      // the form field likely refers to the same concept.
      // e.g. "Willing to Relocate" → ["willing","relocate"] contains "relocate"
      const formContentTokens = tokenizeNoStop(candidate);
      const keyContentTokens = tokenizeNoStop(dotKey.replace(/\./g, "_"));
      const formExpContent = expandTokens(formContentTokens);
      const keyExpContent = expandTokens(keyContentTokens);

      if (keyExpContent.length > 0 && formExpContent.length > 0) {
        if (keyExpContent.length <= formExpContent.length) {
          const keySubset = keyExpContent.filter(
            (t) => formExpContent.includes(t)
          ).length;
          if (keySubset === keyExpContent.length) {
            const ratio = keySubset / formExpContent.length;
            bestScore = Math.max(bestScore, 0.55 + ratio * 0.25);
          }
        }
        if (formExpContent.length <= keyExpContent.length) {
          const formSubset = formExpContent.filter(
            (t) => keyExpContent.includes(t)
          ).length;
          if (formSubset === formExpContent.length) {
            const ratio = formSubset / keyExpContent.length;
            bestScore = Math.max(bestScore, 0.55 + ratio * 0.25);
          }
        }
      }
    }

    // 7. Per-token concept matching — check if individual tokens
    //    from form and key resolve to the same concept
    if (formTokensExpanded.length > 0 && keyTokensExpanded.length > 0) {
      let conceptOverlap = 0;
      const matchedKeyTokens = new Set<number>();
      for (const ft of formTokensExpanded) {
        const ftConcept = resolveConcept(ft);
        if (ftConcept < 0) continue;
        for (let ki = 0; ki < keyTokensExpanded.length; ki++) {
          if (matchedKeyTokens.has(ki)) continue;
          if (ftConcept === resolveConcept(keyTokensExpanded[ki])) {
            conceptOverlap++;
            matchedKeyTokens.add(ki);
            break;
          }
        }
      }
      if (conceptOverlap > 0) {
        const conceptScore = conceptOverlap / Math.max(formTokensExpanded.length, keyTokensExpanded.length);
        bestScore = Math.max(bestScore, conceptScore * 0.75);
      }
    }

    // 8. Fuzzy match on last segment
    const fScore = fuzzyScore(candidate, lastSegment);
    if (fScore > 0.7) {
      bestScore = Math.max(bestScore, fScore * 0.6);
    }
  }

  // Section heading boost
  bestScore += getSectionBoost(formField.sectionHeading, dotKey);

  return Math.min(bestScore, 1);
}

/**
 * Try to match a form field against composite rules.
 * Returns the combined value and a virtual key if a composite match is found.
 */
function tryCompositeMatch(
  formField: FormFieldInfo,
  profileFields: FlattenedField[]
): { value: string; rule: CompositeRule; confidence: number } | null {
  const rawCands = [
    formField.name,
    formField.id,
    formField.label,
    formField.placeholder,
    formField.autocomplete,
  ].filter(Boolean);
  const candidates: string[] = [];
  for (const c of rawCands) {
    candidates.push(c);
    const stripped = stripParenthetical(c);
    if (stripped !== c && stripped.length >= 2) {
      candidates.push(stripped);
    }
  }

  for (const rule of COMPOSITE_RULES) {
    // Check if any candidate matches a composite concept
    let matched = false;
    for (const candidate of candidates) {
      const normCandidate = normalize(candidate);
      const candidateTokens = expandTokens(tokenize(candidate));

      for (const concept of rule.concepts) {
        const normConcept = normalize(concept);
        // Direct match
        if (normCandidate === normConcept) {
          matched = true;
          break;
        }
          // Token match (e.g. "full_name" matches "fullName")
          // Also handles "full_name_as_per_passport" matching "full_name" (candidate contains all concept tokens)
          const conceptTokens = expandTokens(tokenize(concept));
          if (candidateTokens.length > 0 && conceptTokens.length > 0) {
            const overlap = candidateTokens.filter((t) => conceptTokens.includes(t)).length;
            if (overlap === conceptTokens.length) {
              matched = true;
              break;
            }
          }
        // Concept-based match
        const candidateConcept = resolveConcept(normCandidate);
        const ruleConcept = resolveConcept(normConcept);
        if (candidateConcept >= 0 && candidateConcept === ruleConcept) {
          matched = true;
          break;
        }
      }
      if (matched) break;
    }

    if (!matched) continue;

    // Check if we have all the source keys in the profile
    const values: string[] = [];
    let allFound = true;
    for (const sourceKey of rule.sourceKeys) {
      // Try exact match first, then concept-based match
      let found = profileFields.find((f) => f.dotKey === sourceKey);
      if (!found) {
        // Try matching by last segment or concept
        found = profileFields.find((f) => {
          const lastSeg = f.dotKey.split(".").pop() || "";
          return normalize(lastSeg) === normalize(sourceKey) ||
                 normalize(f.dotKey) === normalize(sourceKey);
        });
      }
      if (found && found.value) {
        values.push(found.value);
      } else {
        allFound = false;
        break;
      }
    }

    if (allFound && values.length > 0) {
      return {
        value: values.join(rule.separator),
        rule,
        confidence: 0.85,
      };
    }
  }

  return null;
}

/**
 * For splitting: check if any unmatched form fields can be satisfied
 * by splitting a composite profile field value.
 */
function trySplitMatch(
  formField: FormFieldInfo,
  profileFields: FlattenedField[]
): { value: string; sourceKey: string; confidence: number } | null {
  for (const rule of COMPOSITE_RULES) {
    if (!rule.splitPattern || !rule.splitTargets) continue;

    // Check if this form field matches one of the split targets
    const candidates = [
      formField.name,
      formField.id,
      formField.label,
      formField.placeholder,
      formField.autocomplete,
    ].filter(Boolean);

    let targetIndex = -1;
    for (const candidate of candidates) {
      const normCandidate = normalize(candidate);
      const candidateTokens = expandTokens(tokenize(candidate));

      for (let i = 0; i < rule.splitTargets.length; i++) {
        const target = rule.splitTargets[i];
        const normTarget = normalize(target);
        const targetTokens = expandTokens(tokenize(target));

        if (normCandidate === normTarget) {
          targetIndex = i;
          break;
        }
        // Token-level match
        if (candidateTokens.length > 0 && targetTokens.length > 0) {
          const overlap = candidateTokens.filter((t) => targetTokens.includes(t)).length;
          if (overlap === targetTokens.length && overlap === candidateTokens.length) {
            targetIndex = i;
            break;
          }
        }
        // Concept match
        const candidateConcept = resolveConcept(normCandidate);
        const targetConcept = resolveConcept(normTarget);
        if (candidateConcept >= 0 && candidateConcept === targetConcept) {
          targetIndex = i;
          break;
        }
      }
      if (targetIndex >= 0) break;
    }

    if (targetIndex < 0) continue;

    // Find a composite value in profile fields that matches any of the rule concepts
    for (const concept of rule.concepts) {
      const compositeField = profileFields.find((f) => {
        const normKey = normalize(f.dotKey);
        return normKey === normalize(concept) ||
               resolveConcept(normKey) === resolveConcept(concept);
      });

      if (compositeField && compositeField.value) {
        const match = compositeField.value.match(rule.splitPattern);
        if (match && match[targetIndex + 1]) {
          return {
            value: match[targetIndex + 1],
            sourceKey: compositeField.dotKey,
            confidence: 0.82,
          };
        }
      }
    }
  }

  return null;
}

export function matchFields(
  formFields: FormFieldInfo[],
  profileFields: FlattenedField[],
  siteMappings: SiteMapping[],
  domain: string
): MatchResult[] {
  const results: MatchResult[] = [];

  // Detect form type for context-aware scoring
  const formType: FormType = detectFormType(formFields);

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
        const hasValue = !!(matched.value && matched.value.trim());
        // Attachments are never auto-selected — user must explicitly check them
        const isAttach = !!(matched.isAttachment && matched.attachment?.dataUrl);
        results.push({
          formFieldName: formField.name || formField.id,
          formFieldLabel: formField.label || formField.placeholder || formField.name || formField.id,
          formFieldElement: signature,
          profileKey: matched.dotKey,
          value: matched.value,
          confidence: 1.0,
          selected: hasValue && !isAttach,
          group: getGroupPrefix(matched.dotKey) || undefined,
          isAttachment: matched.isAttachment,
          attachment: matched.attachment,
        });
        continue;
      }
    }

    // 2-8. Score all profile fields and pick the best
    let bestMatch: FlattenedField | null = null;
    let bestScore = 0;

    for (const profileField of candidatePool) {
      let score = scoreCandidate(formField, profileField.dotKey);
      // Apply form type context boost
      score *= getFormTypeBoost(formType, profileField.dotKey);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = profileField;
      }
    }

    if (bestMatch && bestScore >= 0.3) {
      const hasValue = !!(bestMatch.value && bestMatch.value.trim());
      const isAttach = !!(bestMatch.isAttachment && bestMatch.attachment?.dataUrl);
      results.push({
        formFieldName: formField.name || formField.id,
        formFieldLabel: formField.label || formField.placeholder || formField.name || formField.id,
        formFieldElement: signature,
        profileKey: bestMatch.dotKey,
        value: bestMatch.value,
        confidence: Math.round(bestScore * 100) / 100,
        selected: (hasValue || isAttach) && bestScore >= 0.6 && !isAttach,
        group: getGroupPrefix(bestMatch.dotKey) || undefined,
        isAttachment: bestMatch.isAttachment,
        attachment: bestMatch.attachment,
      });
      continue;
    }

    // 9. Try composite matching (combine multiple profile fields)
    if (!isFileField) {
      const composite = tryCompositeMatch(formField, regularFields);
      if (composite) {
        const hasValue = !!(composite.value && composite.value.trim());
        results.push({
          formFieldName: formField.name || formField.id,
          formFieldLabel: formField.label || formField.placeholder || formField.name || formField.id,
          formFieldElement: signature,
          profileKey: composite.rule.sourceKeys.join(" + "),
          value: composite.value,
          confidence: composite.confidence,
          selected: hasValue,
          group: undefined,
        });
        continue;
      }

      // 9b. DOB → age auto-calculation
      const ageAliases = ["age", "current_age", "your_age", "years_old"];
      const fieldNorm = normalize(formField.name || formField.label || formField.id || "");
      const isAgeField = ageAliases.some((a) => fieldNorm.includes(a));
      if (isAgeField) {
        // Find DOB in profile fields
        const dobField = regularFields.find((f) => {
          const key = normalize(f.dotKey);
          return key.includes("dob") || key.includes("dateofbirth") || key.includes("birthday") || key.includes("birthdate") || key.includes("date_of_birth");
        });
        if (dobField && dobField.value) {
          const age = calculateAge(dobField.value);
          if (age !== null) {
            results.push({
              formFieldName: formField.name || formField.id,
              formFieldLabel: formField.label || formField.placeholder || formField.name || formField.id,
              formFieldElement: signature,
              profileKey: dobField.dotKey + " → age",
              value: String(age),
              confidence: 0.9,
              selected: true,
              group: undefined,
            });
            continue;
          }
        }
      }

      // 10. Try split matching (split a composite profile value)
      const split = trySplitMatch(formField, regularFields);
      if (split) {
        const hasValue = !!(split.value && split.value.trim());
        results.push({
          formFieldName: formField.name || formField.id,
          formFieldLabel: formField.label || formField.placeholder || formField.name || formField.id,
          formFieldElement: signature,
          profileKey: split.sourceKey + " (split)",
          value: split.value,
          confidence: split.confidence,
          selected: hasValue,
          group: undefined,
        });
        continue;
      }
    }

    // No match found
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

  return results;
}
