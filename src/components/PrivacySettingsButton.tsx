"use client";

import { openPrivacySettings } from "@/lib/privacyConsent";

export default function PrivacySettingsButton() {
  return (
    <button
      type="button"
      className="block py-2 md:py-1 text-left transition-colors hover:text-brand-accent"
      onClick={openPrivacySettings}
    >
      Privacy settings
    </button>
  );
}
