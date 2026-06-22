/**
 * Thin wrapper around chrome.i18n.getMessage for React components.
 * Falls back to the key name if the message is not found.
 */
export function t(key: string, ...substitutions: string[]): string {
  try {
    const msg = chrome.i18n.getMessage(key, substitutions);
    return msg || key;
  } catch {
    return key;
  }
}

export function getUILanguage(): string {
  try {
    return chrome.i18n.getUILanguage();
  } catch {
    return "en";
  }
}

export const SUPPORTED_LOCALES: { code: string; name: string }[] = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "pt", name: "Português" },
  { code: "hi", name: "हिन्दी" },
  { code: "zh", name: "中文" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "ar", name: "العربية" },
];
