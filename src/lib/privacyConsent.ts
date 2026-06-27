export const ANALYTICS_CONSENT_STORAGE_KEY = "text2ink.privacy.analyticsConsent";
export const ANALYTICS_CONSENT_CHANGED_EVENT = "text2ink:analytics-consent-changed";
export const PRIVACY_SETTINGS_EVENT = "text2ink:privacy-settings";
export const CONTENTSQUARE_SCRIPT_SRC = "https://t.contentsquare.net/uxa/ea250cc30afee.js";

export type AnalyticsConsent = "accepted" | "rejected";

let inMemoryAnalyticsConsent: AnalyticsConsent | null = null;

export function isAnalyticsConsent(value: unknown): value is AnalyticsConsent {
  return value === "accepted" || value === "rejected";
}

export function readAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY);
    return isAnalyticsConsent(stored) ? stored : null;
  } catch {
    return inMemoryAnalyticsConsent;
  }
}

export function writeAnalyticsConsent(consent: AnalyticsConsent) {
  inMemoryAnalyticsConsent = consent;
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, consent);
  } catch {
    // Consent still applies for the current page even when storage is blocked.
  }
  window.dispatchEvent(new Event(ANALYTICS_CONSENT_CHANGED_EVENT));
}

export function openPrivacySettings() {
  window.dispatchEvent(new Event(PRIVACY_SETTINGS_EVENT));
}
