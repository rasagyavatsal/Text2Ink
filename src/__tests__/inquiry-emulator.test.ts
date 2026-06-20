/**
 * Unit tests for the inquiry emulator setup helper.
 * Tracer-bullet tests for issue #278.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  assertFirestoreEmulatorEnv,
  buildClearFirestoreUrl,
} from "@/lib/e2e/inquiry-emulator";

describe("assertFirestoreEmulatorEnv", () => {
  const originalHost = process.env.FIRESTORE_EMULATOR_HOST;

  beforeEach(() => {
    delete process.env.FIRESTORE_EMULATOR_HOST;
  });

  afterEach(() => {
    if (originalHost !== undefined) {
      process.env.FIRESTORE_EMULATOR_HOST = originalHost;
    } else {
      delete process.env.FIRESTORE_EMULATOR_HOST;
    }
  });

  it("throws when FIRESTORE_EMULATOR_HOST is absent", () => {
    expect(() => assertFirestoreEmulatorEnv()).toThrowError(
      /FIRESTORE_EMULATOR_HOST is not set/
    );
  });

  it("does not throw when FIRESTORE_EMULATOR_HOST is present", () => {
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
    expect(() => assertFirestoreEmulatorEnv()).not.toThrow();
  });
});

describe("buildClearFirestoreUrl", () => {
  it("returns the Firestore emulator REST clear-data URL for project text2ink", () => {
    const url = buildClearFirestoreUrl("127.0.0.1:8080", "text2ink");
    expect(url).toBe(
      "http://127.0.0.1:8080/emulator/v1/projects/text2ink/databases/(default)/documents"
    );
  });

  it("uses the host and project id passed as arguments", () => {
    const url = buildClearFirestoreUrl("localhost:9090", "my-project");
    expect(url).toContain("my-project");
    expect(url).toContain("localhost:9090");
  });
});
