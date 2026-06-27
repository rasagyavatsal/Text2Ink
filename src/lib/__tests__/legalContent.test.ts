import { describe, expect, it } from 'vitest';
import { privacyPolicyContent, termsOfServiceContent } from '../legalContent';

describe('legalContent', () => {
  it('keeps legal page metadata and parsed sections available from one source', () => {
    expect(privacyPolicyContent).toMatchObject({
      title: 'Privacy Policy',
      path: '/privacy-policy',
      effectiveDate: 'June 26, 2026',
    });
    expect(termsOfServiceContent).toMatchObject({
      title: 'Terms of Service',
      path: '/terms-of-service',
      effectiveDate: 'June 26, 2026',
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
});
