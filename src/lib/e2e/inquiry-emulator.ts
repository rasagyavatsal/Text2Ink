/**
 * E2E inquiry emulator setup helpers.
 *
 * These utilities are used by Playwright inquiry E2E tests to:
 *  1. Guard that the Firebase Firestore emulator is running.
 *  2. Clear Firestore emulator data before each test.
 *
 * They are intentionally kept as pure functions so they can be unit-tested
 * with Vitest without requiring a live emulator.
 */

// ---------------------------------------------------------------------------
// Guard
// ---------------------------------------------------------------------------

/**
 * Asserts that `FIRESTORE_EMULATOR_HOST` is set in the current environment.
 *
 * Call this at the top of any Playwright test setup that depends on the
 * Firestore emulator. It provides a clear error message instead of a
 * cryptic network failure when the emulator is not running.
 *
 * @throws {Error} If `FIRESTORE_EMULATOR_HOST` is not set.
 */
export function assertFirestoreEmulatorEnv(): void {
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      "FIRESTORE_EMULATOR_HOST is not set. " +
        "Run e2e tests via the emulator script (npm run test:e2e:emulator) " +
        "so that the Firebase emulator environment variables are injected."
    );
  }
}

// ---------------------------------------------------------------------------
// URL builder
// ---------------------------------------------------------------------------

/**
 * Builds the Firestore emulator REST endpoint URL used to delete all documents
 * in the default database of the given project.
 *
 * The Firebase Emulator Suite exposes a DELETE endpoint at:
 * `DELETE /emulator/v1/projects/{project}/databases/(default)/documents`
 *
 * @param emulatorHost The value of `FIRESTORE_EMULATOR_HOST` (e.g. `"127.0.0.1:8080"`).
 * @param projectId    The Firebase project id (e.g. `"text2ink"`).
 * @returns The full URL string.
 */
export function buildClearFirestoreUrl(
  emulatorHost: string,
  projectId: string
): string {
  return `http://${emulatorHost}/emulator/v1/projects/${projectId}/databases/(default)/documents`;
}

// ---------------------------------------------------------------------------
// Clear helper (used by Playwright globalSetup / beforeEach)
// ---------------------------------------------------------------------------

/**
 * Clears all Firestore emulator data for the given project before inquiry tests.
 *
 * This function:
 *  1. Calls `assertFirestoreEmulatorEnv()` to validate the environment.
 *  2. Issues a `DELETE` request to the Firestore emulator REST API.
 *
 * Call this in a Playwright `beforeEach` hook (or global setup) for any test
 * suite that writes to Firestore via the `/api/inquiry` endpoint.
 *
 * @param projectId Firebase project id. Defaults to `"text2ink"`.
 * @throws If `FIRESTORE_EMULATOR_HOST` is not set or the DELETE request fails.
 */
export async function clearFirestoreEmulatorData(
  projectId = "text2ink"
): Promise<void> {
  assertFirestoreEmulatorEnv();

  const host = process.env.FIRESTORE_EMULATOR_HOST!;
  const url = buildClearFirestoreUrl(host, projectId);

  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    throw new Error(
      `Failed to clear Firestore emulator data: HTTP ${res.status} ${res.statusText}`
    );
  }
}
