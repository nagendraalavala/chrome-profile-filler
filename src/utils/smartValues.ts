/**
 * Smart value formatting utilities.
 * Handles date format detection/conversion, phone formatting,
 * radio/checkbox matching, and DOB→age calculation.
 */

// ---------------------------------------------------------------------------
// Date format detection & conversion
// ---------------------------------------------------------------------------

type DateFormat =
  | "YYYY-MM-DD"
  | "MM/DD/YYYY"
  | "DD/MM/YYYY"
  | "MM-DD-YYYY"
  | "DD-MM-YYYY"
  | "YYYY/MM/DD"
  | "Month DD, YYYY"
  | "DD Month YYYY"
  | "MM/YYYY"
  | "MM/YY"
  | "YYYY";

interface ParsedDate {
  year: number;
  month: number;
  day?: number;
}

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

const MONTH_SHORT = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

function parseMonthName(str: string): number {
  const lower = str.toLowerCase();
  let idx = MONTH_NAMES.indexOf(lower);
  if (idx >= 0) return idx + 1;
  idx = MONTH_SHORT.indexOf(lower);
  if (idx >= 0) return idx + 1;
  return -1;
}

export function parseDate(value: string): ParsedDate | null {
  const trimmed = value.trim();

  // ISO: 2024-05-15 or 2024/05/15
  let m = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (m) return { year: +m[1], month: +m[2], day: +m[3] };

  // US: 05/15/2024 or 05-15-2024
  m = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const a = +m[1], b = +m[2], y = +m[3];
    // Assume MM/DD/YYYY if first number ≤ 12
    if (a <= 12) return { year: y, month: a, day: b };
    // Otherwise DD/MM/YYYY
    return { year: y, month: b, day: a };
  }

  // MM/DD/YY or MM-DD-YY
  m = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2})$/);
  if (m) {
    const yr = +m[3];
    return { year: yr >= 50 ? 1900 + yr : 2000 + yr, month: +m[1], day: +m[2] };
  }

  // MM/YYYY or MM-YYYY
  m = trimmed.match(/^(\d{1,2})[-/](\d{4})$/);
  if (m) return { year: +m[2], month: +m[1] };

  // MM/YY or MM-YY
  m = trimmed.match(/^(\d{1,2})[-/](\d{2})$/);
  if (m) {
    const yr = +m[2];
    return { year: yr >= 50 ? 1900 + yr : 2000 + yr, month: +m[1] };
  }

  // YYYY only
  m = trimmed.match(/^(\d{4})$/);
  if (m) return { year: +m[1], month: 1 };

  // "May 15, 2024" or "15 May 2024"
  // "Month YYYY"
  m = trimmed.match(/^([a-zA-Z]+)\s+(\d{4})$/);
  if (m) {
    const mo = parseMonthName(m[1]);
    if (mo > 0) return { year: +m[2], month: mo };
  }

  // "May 15, 2024" or "15 May 2024"
  m = trimmed.match(/^(\w+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (m) {
    const mo = parseMonthName(m[1]);
    if (mo > 0) return { year: +m[3], month: mo, day: +m[2] };
  }
  m = trimmed.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/);
  if (m) {
    const mo = parseMonthName(m[2]);
    if (mo > 0) return { year: +m[3], month: mo, day: +m[1] };
  }

  return null;
}

function detectDateFormat(element: HTMLElement): DateFormat {
  const hints: string[] = [];

  if (element instanceof HTMLInputElement) {
    const ph = element.placeholder.toLowerCase();
    hints.push(ph);
    const pattern = element.getAttribute("data-date-format") || element.getAttribute("pattern") || "";
    hints.push(pattern.toLowerCase());
  }

  const label = element.getAttribute("aria-label") || "";
  hints.push(label.toLowerCase());

  const combined = hints.join(" ");

  if (combined.includes("yyyy-mm-dd") || combined.includes("iso")) return "YYYY-MM-DD";
  if (combined.includes("dd/mm/yyyy") || combined.includes("dd/mm")) return "DD/MM/YYYY";
  if (combined.includes("mm/dd/yyyy") || combined.includes("mm/dd")) return "MM/DD/YYYY";
  if (combined.includes("dd-mm-yyyy")) return "DD-MM-YYYY";
  if (combined.includes("mm-dd-yyyy")) return "MM-DD-YYYY";
  if (combined.includes("mm/yyyy") || combined.includes("mm-yyyy")) return "MM/YYYY";
  if (combined.includes("mm/yy") || combined.includes("mm-yy")) return "MM/YY";
  if (combined.includes("yyyy") && !combined.includes("mm") && !combined.includes("dd")) return "YYYY";

  // Default to MM/DD/YYYY for US-oriented sites
  return "MM/DD/YYYY";
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function formatDate(parsed: ParsedDate, format: DateFormat): string {
  const { year, month } = parsed;
  const day = parsed.day || 1;
  const yy = (year % 100).toString().padStart(2, "0");
  switch (format) {
    case "YYYY-MM-DD": return `${year}-${pad2(month)}-${pad2(day)}`;
    case "MM/DD/YYYY": return `${pad2(month)}/${pad2(day)}/${year}`;
    case "DD/MM/YYYY": return `${pad2(day)}/${pad2(month)}/${year}`;
    case "MM-DD-YYYY": return `${pad2(month)}-${pad2(day)}-${year}`;
    case "DD-MM-YYYY": return `${pad2(day)}-${pad2(month)}-${year}`;
    case "YYYY/MM/DD": return `${year}/${pad2(month)}/${pad2(day)}`;
    case "Month DD, YYYY": return `${MONTH_NAMES[month - 1]?.charAt(0).toUpperCase()}${MONTH_NAMES[month - 1]?.slice(1)} ${day}, ${year}`;
    case "DD Month YYYY": return `${day} ${MONTH_NAMES[month - 1]?.charAt(0).toUpperCase()}${MONTH_NAMES[month - 1]?.slice(1)} ${year}`;
    case "MM/YYYY": return `${pad2(month)}/${year}`;
    case "MM/YY": return `${pad2(month)}/${yy}`;
    case "YYYY": return `${year}`;
    default: return `${pad2(month)}/${pad2(day)}/${year}`;
  }
}

export function smartFormatDate(value: string, element: HTMLElement): string {
  const parsed = parseDate(value);
  if (!parsed) return value;

  // If the element is an HTML date input, always use ISO format
  if (element instanceof HTMLInputElement && element.type === "date") {
    return formatDate(parsed, "YYYY-MM-DD");
  }
  if (element instanceof HTMLInputElement && element.type === "month") {
    return formatDate(parsed, "YYYY-MM-DD").slice(0, 7);
  }

  const fmt = detectDateFormat(element);
  return formatDate(parsed, fmt);
}

// ---------------------------------------------------------------------------
// DOB → Age calculation
// ---------------------------------------------------------------------------

export function calculateAge(dobValue: string): number | null {
  const parsed = parseDate(dobValue);
  if (!parsed) return null;

  const today = new Date();
  let age = today.getFullYear() - parsed.year;
  const monthDiff = today.getMonth() + 1 - parsed.month;
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < (parsed.day || 1))) {
    age--;
  }
  return age >= 0 ? age : null;
}

// ---------------------------------------------------------------------------
// Smart phone formatting
// ---------------------------------------------------------------------------

type PhoneFormat = "raw" | "us_parens" | "dashed" | "dotted" | "international";

function detectPhoneFormat(element: HTMLElement): PhoneFormat {
  const hints: string[] = [];
  if (element instanceof HTMLInputElement) {
    hints.push(element.placeholder.toLowerCase());
    hints.push(element.getAttribute("pattern") || "");
  }
  const combined = hints.join(" ");

  if (combined.includes("(") && combined.includes(")")) return "us_parens";
  if (combined.includes("+")) return "international";
  if (combined.includes(".")) return "dotted";
  if (combined.includes("-")) return "dashed";

  return "raw";
}

function extractDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function smartFormatPhone(value: string, element: HTMLElement): string {
  const digits = extractDigits(value);
  if (digits.length < 7) return value; // too short to format

  const fmt = detectPhoneFormat(element);

  // 10-digit US number
  if (digits.length === 10) {
    const area = digits.slice(0, 3);
    const mid = digits.slice(3, 6);
    const last = digits.slice(6);
    switch (fmt) {
      case "us_parens": return `(${area}) ${mid}-${last}`;
      case "dashed": return `${area}-${mid}-${last}`;
      case "dotted": return `${area}.${mid}.${last}`;
      case "international": return `+1${area}${mid}${last}`;
      default: return value;
    }
  }

  // 11-digit US number (1 + 10)
  if (digits.length === 11 && digits[0] === "1") {
    const area = digits.slice(1, 4);
    const mid = digits.slice(4, 7);
    const last = digits.slice(7);
    switch (fmt) {
      case "us_parens": return `(${area}) ${mid}-${last}`;
      case "dashed": return `${area}-${mid}-${last}`;
      case "dotted": return `${area}.${mid}.${last}`;
      case "international": return `+1${area}${mid}${last}`;
      default: return value;
    }
  }

  return value;
}

// ---------------------------------------------------------------------------
// Radio button & checkbox value matching
// ---------------------------------------------------------------------------

const YES_VALUES = new Set(["yes", "y", "true", "1", "on", "agree", "accept", "confirmed"]);
const NO_VALUES = new Set(["no", "n", "false", "0", "off", "disagree", "decline"]);

const GENDER_MAP: Record<string, string[]> = {
  male: ["male", "m", "man", "mr", "boy", "gentleman"],
  female: ["female", "f", "woman", "ms", "mrs", "miss", "girl", "lady"],
  other: ["other", "non-binary", "nonbinary", "prefer not to say", "not specified", "x"],
};

export function matchRadioValue(optionValue: string, optionLabel: string, profileValue: string): boolean {
  const pv = profileValue.trim().toLowerCase();
  const ov = optionValue.trim().toLowerCase();
  const ol = optionLabel.trim().toLowerCase();

  // Exact match
  if (ov === pv || ol === pv) return true;

  // Yes/No matching
  if (YES_VALUES.has(pv) && (YES_VALUES.has(ov) || YES_VALUES.has(ol))) return true;
  if (NO_VALUES.has(pv) && (NO_VALUES.has(ov) || NO_VALUES.has(ol))) return true;

  // Gender matching
  for (const [canonical, variants] of Object.entries(GENDER_MAP)) {
    if (variants.includes(pv) || pv === canonical) {
      if (variants.includes(ov) || variants.includes(ol) || ov === canonical || ol === canonical) {
        return true;
      }
    }
  }

  // Partial/contains match for longer values
  if (pv.length >= 3) {
    if (ol.includes(pv) || pv.includes(ol)) return true;
    if (ov.includes(pv) || pv.includes(ov)) return true;
  }

  return false;
}

export function matchCheckboxValue(checkboxLabel: string, profileValue: string): boolean {
  const pv = profileValue.trim().toLowerCase();
  const cl = checkboxLabel.trim().toLowerCase();

  // If profile value looks like a boolean yes, check the checkbox
  if (YES_VALUES.has(pv)) return true;

  // If the checkbox label contains the profile value
  if (cl.includes(pv) || pv.includes(cl)) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Data validation
// ---------------------------------------------------------------------------

export interface ValidationWarning {
  field: string;
  message: string;
  severity: "error" | "warning";
}

export function validateProfileValue(key: string, value: string): ValidationWarning | null {
  if (!value || !value.trim()) return null;

  const lower = key.toLowerCase();

  // Email validation
  if (lower.includes("email") || lower.includes("e_mail") || lower.includes("mail")) {
    if (!value.includes("@") || !value.includes(".")) {
      return { field: key, message: "Email appears invalid (missing @ or domain)", severity: "error" };
    }
  }

  // Phone validation
  if (lower.includes("phone") || lower.includes("cell") || lower.includes("mobile") || lower.includes("tel")) {
    const digits = extractDigits(value);
    if (digits.length < 7) {
      return { field: key, message: "Phone number too short (less than 7 digits)", severity: "warning" };
    }
    if (digits.length > 15) {
      return { field: key, message: "Phone number too long (more than 15 digits)", severity: "warning" };
    }
  }

  // ZIP code validation
  if (lower.includes("zip") || lower.includes("postal")) {
    if (!/^\d{5}(-\d{4})?$/.test(value) && !/^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/.test(value)) {
      return { field: key, message: "ZIP/postal code format may be incorrect", severity: "warning" };
    }
  }

  // SSN validation
  if (lower.includes("ssn") || lower.includes("social_security")) {
    const digits = extractDigits(value);
    if (digits.length !== 4 && digits.length !== 9) {
      return { field: key, message: "SSN should be 4 or 9 digits", severity: "warning" };
    }
  }

  // URL validation for social fields
  if (lower.includes("linkedin") || lower.includes("github") || lower.includes("website") || lower.includes("portfolio")) {
    if (value.length > 5 && !value.startsWith("http") && !value.startsWith("www.") && !value.startsWith("@")) {
      return { field: key, message: "URL should start with http:// or https://", severity: "warning" };
    }
  }

  return null;
}
