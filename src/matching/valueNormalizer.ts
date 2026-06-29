/**
 * Value normalization maps for smart dropdown matching.
 * Maps abbreviations ↔ full names for US states, Canadian provinces,
 * countries, and other common dropdown values.
 */

export const US_STATES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "District of Columbia",
  AS: "American Samoa",
  GU: "Guam",
  MP: "Northern Mariana Islands",
  PR: "Puerto Rico",
  VI: "Virgin Islands",
};

export const CA_PROVINCES: Record<string, string> = {
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NS: "Nova Scotia",
  NT: "Northwest Territories",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon",
};

export const COUNTRIES: Record<string, string> = {
  US: "United States",
  USA: "United States of America",
  CA: "Canada",
  UK: "United Kingdom",
  GB: "United Kingdom",
  AU: "Australia",
  NZ: "New Zealand",
  IN: "India",
  DE: "Germany",
  FR: "France",
  ES: "Spain",
  IT: "Italy",
  JP: "Japan",
  CN: "China",
  KR: "South Korea",
  BR: "Brazil",
  MX: "Mexico",
  AR: "Argentina",
  CL: "Chile",
  CO: "Colombia",
  PE: "Peru",
  RU: "Russia",
  ZA: "South Africa",
  NG: "Nigeria",
  EG: "Egypt",
  KE: "Kenya",
  GH: "Ghana",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  NL: "Netherlands",
  BE: "Belgium",
  CH: "Switzerland",
  AT: "Austria",
  PT: "Portugal",
  IE: "Ireland",
  PL: "Poland",
  CZ: "Czech Republic",
  RO: "Romania",
  HU: "Hungary",
  GR: "Greece",
  TR: "Turkey",
  IL: "Israel",
  AE: "United Arab Emirates",
  SA: "Saudi Arabia",
  SG: "Singapore",
  MY: "Malaysia",
  TH: "Thailand",
  PH: "Philippines",
  ID: "Indonesia",
  VN: "Vietnam",
  PK: "Pakistan",
  BD: "Bangladesh",
  LK: "Sri Lanka",
  TW: "Taiwan",
  HK: "Hong Kong",
};

/** Build reverse maps (full name → abbreviation) at module load */
function buildReverseMap(map: Record<string, string>): Map<string, string> {
  const reverse = new Map<string, string>();
  for (const [abbr, full] of Object.entries(map)) {
    reverse.set(full.toLowerCase(), abbr);
  }
  return reverse;
}

const US_STATES_REVERSE = buildReverseMap(US_STATES);
const CA_PROVINCES_REVERSE = buildReverseMap(CA_PROVINCES);
const COUNTRIES_REVERSE = buildReverseMap(COUNTRIES);

/**
 * Get all known expansions of a value.
 * E.g. "MO" → ["MO", "Missouri"], "Missouri" → ["Missouri", "MO"]
 */
export function getValueVariants(value: string): string[] {
  const variants = [value];
  const upper = value.toUpperCase();
  const lower = value.toLowerCase();

  // Try abbreviation → full name
  if (US_STATES[upper]) variants.push(US_STATES[upper]);
  if (CA_PROVINCES[upper]) variants.push(CA_PROVINCES[upper]);
  if (COUNTRIES[upper]) variants.push(COUNTRIES[upper]);

  // Try full name → abbreviation
  const stateAbbr = US_STATES_REVERSE.get(lower);
  if (stateAbbr) variants.push(stateAbbr);
  const provAbbr = CA_PROVINCES_REVERSE.get(lower);
  if (provAbbr) variants.push(provAbbr);
  const countryAbbr = COUNTRIES_REVERSE.get(lower);
  if (countryAbbr) variants.push(countryAbbr);

  return variants;
}

/**
 * Smart match a profile value against a <select> option.
 * Tries multiple strategies in order:
 * 1. Exact match (case-insensitive) on value or text
 * 2. Abbreviation expansion match (MO → Missouri)
 * 3. Partial/contains match (value appears in option text or vice versa)
 * 4. Word-boundary match for multi-word options
 *
 * Returns the matching option's value, or null if no match.
 */
export function findBestSelectMatch(
  options: HTMLOptionElement[],
  profileValue: string,
): HTMLOptionElement | null {
  const val = profileValue.trim();
  if (!val) return null;

  const valLower = val.toLowerCase();

  // Strategy 1: Exact match on value or text (existing behavior)
  const exact = options.find(
    (opt) =>
      opt.value.toLowerCase() === valLower ||
      opt.text.trim().toLowerCase() === valLower,
  );
  if (exact) return exact;

  // Strategy 2: Abbreviation expansion
  const variants = getValueVariants(val);
  for (const variant of variants) {
    if (variant === val) continue; // skip the original, already checked
    const varLower = variant.toLowerCase();
    const abbrevMatch = options.find(
      (opt) =>
        opt.value.toLowerCase() === varLower ||
        opt.text.trim().toLowerCase() === varLower,
    );
    if (abbrevMatch) return abbrevMatch;
  }

  // Strategy 3: Option value matches an abbreviation we know
  // e.g. option value="MO" text="Missouri", profile value = "Missouri"
  for (const opt of options) {
    const optVal = opt.value.trim();
    const optText = opt.text.trim();
    const optVariants = getValueVariants(optVal);
    const optTextVariants = getValueVariants(optText);

    for (const ov of optVariants) {
      if (ov.toLowerCase() === valLower) return opt;
    }
    for (const ov of optTextVariants) {
      if (ov.toLowerCase() === valLower) return opt;
    }
  }

  // Strategy 4: Partial/startsWith match — only for values with 3+ characters
  // to avoid false positives with short abbreviations
  if (val.length >= 3) {
    const startsMatch = options.find(
      (opt) =>
        opt.text.trim().toLowerCase().startsWith(valLower) ||
        opt.value.toLowerCase().startsWith(valLower),
    );
    if (startsMatch) return startsMatch;
  }

  return null;
}
