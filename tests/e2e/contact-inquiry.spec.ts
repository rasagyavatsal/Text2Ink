import { test, expect } from "@playwright/test";
import {
  setupInquiryEmulator,
} from "./helpers/inquiry-emulator";

/**
 * Real contact-inquiry E2E tests (issue #280).
 *
 * No Playwright route mocking — every request flows through:
 *   browser → Next.js dev server → /api/inquiry (rewrite) →
 *   Firebase Functions emulator → Firestore emulator → local SMTP sink
 *
 * Run via:
 *   npm run test:e2e:emulator
 * which starts `firebase emulators:exec` and injects:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_TO (pointing at MailHog/mailpit)
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** SMTP sink REST API base URL (MailHog / mailpit) */
const SMTP_API_BASE =
  process.env.SMTP_API_BASE ?? "http://127.0.0.1:8025";

/** Fetch and return all messages from the local SMTP sink. */
async function fetchCapturedEmails(): Promise<{
  total: number;
  items: Array<{
    Content: {
      Body: string;
      Headers: Record<string, string[]>;
    };
    Raw: { Data: string };
  }>;
}> {
  const res = await fetch(`${SMTP_API_BASE}/api/v2/messages`);
  if (!res.ok) {
    throw new Error(
      `SMTP API responded with ${res.status} — is the local mail sink running?`
    );
  }
  return res.json();
}

/** Clear all messages from the local SMTP sink. */
async function clearCapturedEmails(): Promise<void> {
  await fetch(`${SMTP_API_BASE}/api/v1/messages`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Suite: /contact page rendering
// ---------------------------------------------------------------------------

test.describe("/contact page rendering", () => {
  test("renders the contact page with form and heading", async ({ page }) => {
    await page.goto("/contact");

    // Page-level heading
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Form fields
    await expect(page.locator("#inquiry-name")).toBeVisible();
    await expect(page.locator("#inquiry-email")).toBeVisible();
    await expect(page.locator("#inquiry-topic")).toBeVisible();
    await expect(page.locator("#inquiry-message")).toBeVisible();

    // Submit button
    await expect(
      page.getByRole("button", { name: /send inquiry/i })
    ).toBeVisible();
  });

  test("shows the direct email link on the contact page", async ({ page }) => {
    await page.goto("/contact");
    const emailLink = page.locator('a[href^="mailto:"]');
    await expect(emailLink).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Suite: client-side validation
// ---------------------------------------------------------------------------

test.describe("client-side validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/contact");
  });

  test("shows name validation error when name is too short", async ({
    page,
  }) => {
    await page.locator("#inquiry-name").fill("A");
    await page.getByRole("button", { name: /send inquiry/i }).click();
    await expect(page.getByText(/name must be at least 2 characters/i)).toBeVisible();
  });

  test("shows email validation error when email is missing", async ({
    page,
  }) => {
    await page.locator("#inquiry-name").fill("Test User");
    await page.getByRole("button", { name: /send inquiry/i }).click();
    await expect(page.getByText(/email is required/i)).toBeVisible();
  });

  test("shows email validation error when email is invalid", async ({
    page,
  }) => {
    await page.locator("#inquiry-name").fill("Test User");
    await page.locator("#inquiry-email").fill("not-an-email");
    await page.getByRole("button", { name: /send inquiry/i }).click();
    await expect(page.getByText(/invalid email format/i)).toBeVisible();
  });

  test("shows topic validation error when no topic is selected", async ({
    page,
  }) => {
    await page.locator("#inquiry-name").fill("Test User");
    await page.locator("#inquiry-email").fill("test@example.com");
    await page.getByRole("button", { name: /send inquiry/i }).click();
    await expect(page.getByText(/topic is required/i)).toBeVisible();
  });

  test("shows message validation error when message is too short", async ({
    page,
  }) => {
    await page.locator("#inquiry-name").fill("Test User");
    await page.locator("#inquiry-email").fill("test@example.com");
    // Select a topic via the Select component
    await page.locator("#inquiry-topic").click();
    await page.getByRole("option", { name: "General inquiry" }).click();
    await page.locator("#inquiry-message").fill("short");
    await page.getByRole("button", { name: /send inquiry/i }).click();
    await expect(
      page.getByText(/message must be at least 10 characters/i)
    ).toBeVisible();
  });

  test("clears field error when the field value is corrected", async ({
    page,
  }) => {
    // Trigger name error
    await page.locator("#inquiry-name").fill("A");
    await page.getByRole("button", { name: /send inquiry/i }).click();
    await expect(page.getByText(/name must be at least 2 characters/i)).toBeVisible();

    // Fix the name → error should disappear
    await page.locator("#inquiry-name").fill("Alice");
    await expect(
      page.getByText(/name must be at least 2 characters/i)
    ).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Suite: real submission (requires emulator)
// ---------------------------------------------------------------------------

test.describe("real inquiry submission via emulator", () => {
  test.beforeEach(async () => {
    // Guard: emulator env + clear Firestore state before each test.
    await setupInquiryEmulator();
    await clearCapturedEmails();
  });

  test("submits a valid inquiry and shows the success UI", async ({ page }) => {
    await page.goto("/contact");

    await page.locator("#inquiry-name").fill("Alice Tester");
    await page.locator("#inquiry-email").fill("alice@example.com");
    await page.locator("#inquiry-topic").click();
    await page.getByRole("option", { name: "Bug report" }).click();
    await page
      .locator("#inquiry-message")
      .fill("This is a test message from E2E suite.");

    await page.getByRole("button", { name: /send inquiry/i }).click();

    // Success state should appear
    await expect(page.getByText(/thank you/i)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/inquiry has been received/i)).toBeVisible();
  });

  test("captured email contains name, email, topic, and message", async ({
    page,
  }) => {
    await page.goto("/contact");

    await page.locator("#inquiry-name").fill("Bob Reviewer");
    await page.locator("#inquiry-email").fill("bob@example.com");
    await page.locator("#inquiry-topic").click();
    await page.getByRole("option", { name: "Feature request" }).click();
    await page
      .locator("#inquiry-message")
      .fill("Please add dark mode to the export panel.");

    await page.getByRole("button", { name: /send inquiry/i }).click();

    await expect(page.getByText(/thank you/i)).toBeVisible({
      timeout: 15_000,
    });

    // Give the SMTP sink a moment to receive the message
    await page.waitForTimeout(1_000);

    const mailbox = await fetchCapturedEmails();
    expect(mailbox.total).toBeGreaterThanOrEqual(1);

    const rawEmail = mailbox.items[0].Content.Body;
    expect(rawEmail).toContain("Bob Reviewer");
    expect(rawEmail).toContain("bob@example.com");
    expect(rawEmail).toContain("Feature request");
    expect(rawEmail).toContain("Please add dark mode to the export panel.");
  });

  test("shows rate-limit error after exceeding submission limit", async ({
    page,
  }) => {
    const EMAIL_MAX = 3; // matches LIMITS.EMAIL_MAX in rateLimit.ts

    // Submit EMAIL_MAX valid inquiries to exhaust the per-email quota
    for (let i = 0; i < EMAIL_MAX; i++) {
      await page.goto("/contact");
      await page.locator("#inquiry-name").fill("Rate Tester");
      await page.locator("#inquiry-email").fill("rate@example.com");
      await page.locator("#inquiry-topic").click();
      await page.getByRole("option", { name: "General inquiry" }).click();
      await page
        .locator("#inquiry-message")
        .fill(`Rate limit test submission ${i + 1} of ${EMAIL_MAX}.`);
      await page.getByRole("button", { name: /send inquiry/i }).click();
      await expect(page.getByText(/thank you/i)).toBeVisible({
        timeout: 15_000,
      });
    }

    // The next submission should be rate-limited
    await page.goto("/contact");
    await page.locator("#inquiry-name").fill("Rate Tester");
    await page.locator("#inquiry-email").fill("rate@example.com");
    await page.locator("#inquiry-topic").click();
    await page.getByRole("option", { name: "General inquiry" }).click();
    await page
      .locator("#inquiry-message")
      .fill("This submission should be rate-limited.");
    await page.getByRole("button", { name: /send inquiry/i }).click();

    await expect(
      page.getByText(/too many inquiries/i)
    ).toBeVisible({ timeout: 15_000 });
  });
});
