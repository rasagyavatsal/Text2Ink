import type { ComponentType } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import PrivacyPolicyPage, { metadata as privacyMetadata } from '../privacy-policy/page';
import TermsOfServicePage, { metadata as termsMetadata } from '../terms-of-service/page';

vi.mock('@/components/ThemePicker', () => ({
  default: () => <div data-testid="theme-picker" />,
}));

type LegalRouteCase = {
  readonly name: string;
  readonly Page: ComponentType;
  readonly metadata: typeof privacyMetadata;
  readonly canonical: string;
  readonly intro: RegExp;
  readonly sectionHeadings: readonly string[];
  readonly tocHeading: string;
  readonly reciprocalLink: RegExp;
  readonly reciprocalHref: string;
};

const legalRouteCase = (
  name: string,
  Page: ComponentType,
  metadata: typeof privacyMetadata,
  canonical: string,
  intro: RegExp,
  headings: string,
  tocHeading: string,
  reciprocalLink: RegExp,
  reciprocalHref: string
): LegalRouteCase => ({
  name,
  Page,
  metadata,
  canonical,
  intro,
  sectionHeadings: headings.split('|'),
  tocHeading,
  reciprocalLink,
  reciprocalHref,
});

const legalRouteCases = [
  legalRouteCase(
    'Privacy Policy', PrivacyPolicyPage, privacyMetadata, 'https://text2ink.com/privacy-policy',
    /this policy explains what information text2ink handles, why it is used, and what choices you have/i,
    'Summary|Information Text2Ink handles|Browser storage and editor files|Analytics and consent|Contact inquiries|Vendors and service providers|Retention|Your choices, rights, and requests|No sale of personal information|Contact',
    'Analytics and consent', /terms of service/i, '/terms-of-service'
  ),
  legalRouteCase(
    'Terms of Service', TermsOfServicePage, termsMetadata, 'https://text2ink.com/terms-of-service',
    /these terms explain how you may use text2ink/i,
    'What Text2Ink does|Eligibility and minors|Your content and license|Acceptable use|Exports and availability|Suspension and termination|Disclaimers|Limitation of liability|Indemnity|Governing law|Changes to these terms|Contact',
    'Acceptable use', /privacy policy/i, '/privacy-policy'
  ),
] satisfies readonly LegalRouteCase[];

describe('legal pages', () => {
  it.each(legalRouteCases)('publishes canonical metadata for $name', ({ name, metadata, canonical }) => {
    expect(metadata.title).toBe(name);
    expect(metadata.alternates?.canonical).toBe(canonical);
    expect(metadata.openGraph?.url).toBe(canonical);
  });

  it.each(legalRouteCases)('renders real $name content inside the shared site chrome', ({
    name,
    Page,
    intro,
    sectionHeadings,
    tocHeading,
    reciprocalLink,
    reciprocalHref,
  }) => {
    render(<Page />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(within(screen.getByRole('banner')).getByText('Text2Ink')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to editor/i })).toHaveAttribute('href', '/editor');

    const breadcrumb = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(within(breadcrumb).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(within(breadcrumb).getByText(name)).toBeInTheDocument();

    expect(screen.getByRole('heading', { level: 1, name })).toBeInTheDocument();
    expect(screen.getByText(intro)).toBeInTheDocument();
    expect(screen.getByText(/effective date: June 27, 2026/i)).toBeInTheDocument();

    for (const heading of sectionHeadings) {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    }

    expect(screen.getAllByRole('navigation', { name: /table of contents/i })[0]).toBeInTheDocument();
    const tocLinks = screen.getAllByRole('link', { name: tocHeading });
    expect(tocLinks.length).toBe(1);
    expect(tocLinks[0]).toHaveAttribute('href', `#${tocHeading.toLowerCase().replaceAll(' ', '-')}`);
    expect(screen.getByRole('heading', { name: tocHeading }).closest('section')).toHaveAttribute(
      'id',
      tocLinks[0].getAttribute('href')?.slice(1),
    );
    expect(screen.getByRole('link', { name: reciprocalLink })).toHaveAttribute('href', reciprocalHref);
  });

  it('covers the expanded Privacy Policy compliance anchors', () => {
    render(<PrivacyPolicyPage />);

    expect(screen.getByText(/no account or payment is required/i)).toBeInTheDocument();
    expect(screen.getByText(/no account, subscription, payment, or card details are required/i)).toBeInTheDocument();
    expect(screen.getByText(/typed text, page settings, text boxes, uploaded font data, and uploaded background images can stay in browser storage/i)).toBeInTheDocument();
    expect(screen.getByText(/contact messages, rate-limit records, and analytics events can be sent to service providers/i)).toBeInTheDocument();
    expect(screen.getAllByText(/firebase analytics and contentsquare load only after you allow analytics/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/rate-limit records include an expiresAt timestamp/i)).toBeInTheDocument();
    expect(screen.getAllByText(/text2ink does not sell personal information/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Text2Ink means the website and service operated by Rasagya Vatsal/i)).toBeInTheDocument();
    expect(screen.getAllByText(/operated by Rasagya Vatsal, an individual based in India/i).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/\boperator\b/i);
    expect(document.body.textContent).not.toMatch(/\bwe\b/i);
  });

  it('covers the expanded Terms of Service anchors', () => {
    render(<TermsOfServicePage />);

    expect(screen.getByText(/you keep ownership of content you create or upload/i)).toBeInTheDocument();
    expect(screen.getByText(/under 13/i)).toBeInTheDocument();
    expect(screen.getByText(/before you submit, print, upload, or share an export/i)).toBeInTheDocument();
    expect(screen.getByText(/do not use text2ink to forge a signature/i)).toBeInTheDocument();
    expect(screen.getByText(/provided as is/i)).toBeInTheDocument();
    expect(screen.getByText(/not liable for indirect, incidental, special, consequential, exemplary, or punitive damages/i)).toBeInTheDocument();
    expect(screen.getByText(/indemnify and hold text2ink harmless/i)).toBeInTheDocument();
    expect(screen.getByText(/governed by the laws of India/i)).toBeInTheDocument();
    expect(screen.getByText(/Text2Ink means the website and service operated by Rasagya Vatsal/i)).toBeInTheDocument();
    expect(screen.getAllByText(/operated by Rasagya Vatsal, an individual based in India/i).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/If a narrower venue clause is needed/i);
    expect(document.body.textContent).not.toMatch(/\boperator\b/i);
    expect(document.body.textContent).not.toMatch(/\bwe\b/i);
  });

  it.each(legalRouteCases)('emits breadcrumb JSON-LD for $name', ({ Page }) => {
    const { container } = render(<Page />);
    const schemas = Array.from(container.querySelectorAll('script[type="application/ld+json"]'))
      .map((script) => JSON.parse(script.textContent ?? '{}'));

    expect(schemas.some((schema) => schema['@type'] === 'BreadcrumbList')).toBe(true);
  });
});
