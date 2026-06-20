"use client";

import { useEffect } from "react";
import { getFirebaseAnalytics } from "@/lib/firebase";

export const ANALYTICS_START_DELAY_MS = 10_000;

const CONTENTSQUARE_SCRIPT_SRC = "https://t.contentsquare.net/uxa/ea250cc30afee.js";
const ANALYTICS_START_EVENTS = ["pointerdown", "keydown", "scroll"] as const;

function loadContentsquareScript() {
  if (document.head.querySelector(`script[src="${CONTENTSQUARE_SCRIPT_SRC}"]`)) return;

  const script = document.createElement("script");
  script.src = CONTENTSQUARE_SCRIPT_SRC;
  script.async = true;
  document.head.appendChild(script);
}

export default function FirebaseAnalytics() {
  useEffect(() => {
    let started = false;
    const timeoutId = window.setTimeout(startAnalytics, ANALYTICS_START_DELAY_MS);

    function stopListening() {
      window.clearTimeout(timeoutId);
      ANALYTICS_START_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, startAnalytics);
      });
    }

    function startAnalytics() {
      if (started) return;
      started = true;
      stopListening();
      void getFirebaseAnalytics();
      loadContentsquareScript();
    }

    ANALYTICS_START_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, startAnalytics, { once: true, passive: true });
    });

    return stopListening;
  }, []);

  return null;
}
