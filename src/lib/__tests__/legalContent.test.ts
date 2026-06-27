import { describe, expect, it } from 'vitest';
import { privacyPolicyContent, termsOfServiceContent } from '../legalContent';

describe('legalContent', () => {
  it('keeps legal page metadata and parsed sections available from one source', () => {
    expect(privacyPolicyContent).toMatchObject({
      title: 'Privacy Policy',
      path: '/privacy-policy',
      effectiveDate: 'June 27, 2026',
    });
    expect(termsOfServiceContent).toMatchObject({
      title: 'Terms of Service',
      path: '/terms-of-service',
      effectiveDate: 'June 27, 2026',
    });

    expect(privacyPolicyContent.sections.map((section) => section.id)).toEqual([
      'summary',
      'information-text2ink-handles',
      'browser-storage-and-editor-files',
      'analytics-and-consent',
      'contact-inquiries',
      'vendors-and-service-providers',
      'retention',
      'your-choices-rights-and-requests',
      'no-sale-of-personal-information',
      'contact',
    ]);
    expect(termsOfServiceContent.sections.map((section) => section.id)).toEqual([
      'what-text2ink-does',
      'eligibility-and-minors',
      'your-content-and-license',
      'acceptable-use',
      'exports-and-availability',
      'suspension-and-termination',
      'disclaimers',
      'limitation-of-liability',
      'indemnity',
      'governing-law',
      'changes-to-these-terms',
      'contact',
    ]);
  });

  it('keeps privacy summary practical and specific to current data handling', () => {
    const summary = privacyPolicyContent.sections.find((section) => section.id === 'summary')?.body ?? '';

    expect(summary).toMatch(/No account, subscription, payment, or card details are required/i);
    expect(summary).toMatch(/Typed text, page settings, text boxes, uploaded font data, and uploaded background images can stay in browser storage/i);
    expect(summary).toMatch(/Contact messages, rate-limit records, and analytics events can be sent to service providers/i);
    expect(summary).toMatch(/Firebase Analytics and Contentsquare load only after you allow analytics/i);
  });

  it('keeps terms copy free of duplicate operator wording and public placeholders', () => {
    const termsText = termsOfServiceContent.sections.map((section) => section.body).join('\n\n');

    expect(termsText.match(/operated by Rasagya Vatsal/gi)).toHaveLength(1);
    expect(termsText).not.toMatch(/If a narrower venue clause is needed/i);
    expect(termsText).toMatch(/Before you submit, print, upload, or share an export/i);
    expect(termsText).toMatch(/Do not use Text2Ink to forge a signature/i);
  });
});
