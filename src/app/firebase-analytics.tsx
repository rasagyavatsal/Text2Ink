"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { getFirebaseAnalytics } from "@/lib/firebase";
import {
  ANALYTICS_CONSENT_CHANGED_EVENT,
  type AnalyticsConsent,
  CONTENTSQUARE_SCRIPT_SRC,
  PRIVACY_SETTINGS_EVENT,
  readAnalyticsConsent,
  writeAnalyticsConsent,
} from "@/lib/privacyConsent";

const CONSENT_PENDING = "pending";
type ConsentSnapshot = AnalyticsConsent | null | typeof CONSENT_PENDING;

function loadContentsquareScript() {
  if (document.head.querySelector(`script[src="${CONTENTSQUARE_SCRIPT_SRC}"]`)) return;

  const script = document.createElement("script");
  script.src = CONTENTSQUARE_SCRIPT_SRC;
  script.async = true;
  document.head.appendChild(script);
}

function subscribeToConsent(onStoreChange: () => void) {
  window.addEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getConsentSnapshot(): ConsentSnapshot {
  return readAnalyticsConsent();
}

function getServerConsentSnapshot(): ConsentSnapshot {
  return CONSENT_PENDING;
}

export default function FirebaseAnalytics() {
  const startedRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const consent = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    getServerConsentSnapshot
  );

  const startAnalytics = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void getFirebaseAnalytics();
    loadContentsquareScript();
  }, []);

  useEffect(() => {
    if (consent === "accepted") {
      startAnalytics();
    }
  }, [consent, startAnalytics]);

  useEffect(() => {
    function handleOpenPrivacySettings() {
      setIsOpen(true);
    }

    window.addEventListener(PRIVACY_SETTINGS_EVENT, handleOpenPrivacySettings);
    return () => {
      window.removeEventListener(PRIVACY_SETTINGS_EVENT, handleOpenPrivacySettings);
    };
  }, []);

  function chooseConsent(nextConsent: AnalyticsConsent) {
    writeAnalyticsConsent(nextConsent);
    setIsOpen(false);

    if (nextConsent === "accepted") {
      startAnalytics();
    }
  }

  if (consent === CONSENT_PENDING || (!isOpen && consent !== null)) return null;

  const status =
    consent === "accepted"
      ? "Analytics is currently allowed."
      : consent === "rejected"
        ? "Analytics is currently rejected."
        : "Choose whether Text2Ink may use analytics.";
  const isEditorRoute = pathname?.startsWith("/editor") ?? false;
  const shellClassName = isEditorRoute
    ? "pointer-events-none fixed left-14 top-2 z-[100000] w-48 rounded-md border border-border bg-background p-2 shadow-lg sm:left-auto sm:right-4 sm:top-20 sm:w-auto sm:max-w-sm sm:p-4"
    : "pointer-events-none fixed inset-x-0 bottom-0 z-[100000] border-t border-border bg-background px-public-gutter py-4 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]";
  const contentClassName = isEditorRoute
    ? "flex w-full flex-col gap-2 sm:gap-4"
    : "mx-auto flex w-full max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between";
  const copyClassName = isEditorRoute
    ? "hidden text-supporting leading-6 text-muted-foreground sm:block"
    : "text-supporting leading-6 text-muted-foreground";
  const actionsClassName = isEditorRoute
    ? "pointer-events-auto flex flex-col gap-2"
    : "pointer-events-auto flex flex-col gap-2 sm:flex-row sm:justify-end";

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="privacy-settings-title"
      className={shellClassName}
    >
      <div className={contentClassName}>
        <div className="max-w-3xl space-y-2">
          <h2 id="privacy-settings-title" className="text-supporting font-semibold text-foreground">
            Privacy settings
          </h2>
          <p className={copyClassName}>
            {status} Firebase Analytics and Contentsquare help measure aggregate usage and page interactions.
            They load only after you allow analytics. Read the{" "}
            <Link href="/privacy-policy" className="pointer-events-auto font-medium text-brand-accent hover:text-brand-accent-hover">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
        <div className={actionsClassName}>
          <Button
            type="button"
            variant="outline"
            className="h-11! px-4"
            onClick={() => chooseConsent("rejected")}
          >
            Reject analytics
          </Button>
          <Button
            type="button"
            variant="brand"
            className="h-11! px-4"
            onClick={() => chooseConsent("accepted")}
          >
            Allow analytics
          </Button>
        </div>
      </div>
    </section>
  );
}
