/**
 * Playwright inquiry emulator setup helper.
 *
 * Import and call `setupInquiryEmulator()` in a `test.beforeEach` hook
 * for any Playwright suite that submits the contact inquiry form and
 * needs to verify Firestore side-effects via the Firebase emulator.
 *
 * The Firebase Functions emulator must be reachable at
 * `http://127.0.0.1:5001/text2ink/us-central1/inquiry` and the Firestore
 * emulator at `http://127.0.0.1:8080` (ports declared in `firebase.json`).
 *
 * Run tests via:
 *   npm run test:e2e:emulator
 * which calls `firebase emulators:exec` and injects the required environment
 * variables automatically.
 */

import {
  assertFirestoreEmulatorEnv,
  clearFirestoreEmulatorData,
} from "../../../src/lib/e2e/inquiry-emulator";

// Re-export so callers only need one import.
export { assertFirestoreEmulatorEnv, clearFirestoreEmulatorData };

/**
 * Sets up the Firestore emulator for an inquiry E2E test:
 *  1. Guards that `FIRESTORE_EMULATOR_HOST` is present.
 *  2. Clears all Firestore emulator data.
 *
 * Call this inside a Playwright `test.beforeEach` hook.
 *
 * @param projectId Firebase project id. Defaults to `"text2ink"`.
 */
export async function setupInquiryEmulator(
  projectId = "text2ink"
): Promise<void> {
  assertFirestoreEmulatorEnv();
  await clearFirestoreEmulatorData(projectId);
}
