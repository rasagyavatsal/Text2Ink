import type { Metadata } from 'next';
import LegalPage from '@/components/patterns/LegalPage';

const canonicalUrl = 'https://text2ink.com/terms-of-service';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'Read the Terms of Service for using Text2Ink, including acceptable use, export responsibility, and service changes.',
  alternates: {
    canonical: canonicalUrl,
  },
};

const sections = [
  {
    title: 'Using Text2Ink',
    body: 'Text2Ink lets you convert typed text into handwriting-style pages and export the results for your own notes, drafts, assignments, and creative work. You may use the service only in compliance with applicable law and these terms.',
  },
  {
    title: 'Acceptable use',
    body: 'You may not use Text2Ink to violate academic, workplace, or platform rules, infringe another person’s rights, distribute malware, abuse the contact form, or interfere with the service. We may limit or block usage that creates security, legal, or reliability risk.',
  },
  {
    title: 'Exported content and responsibility',
    body: 'You are responsible for the text you enter, the handwriting-style exports you generate, and how you use them. Text2Ink provides formatting and export tools, but it does not review your content for accuracy, ownership, or suitability for any submission requirement.',
  },
  {
    title: 'Availability and updates',
    body: 'We may change, improve, suspend, or discontinue parts of Text2Ink at any time. We aim to keep the editor available, but we do not guarantee uninterrupted access, perfect rendering on every browser, or preservation of locally stored drafts.',
  },
  {
    title: 'Changes to the service',
    body: 'If we make material changes to these terms, we may update this page and the effective date below. Your continued use of Text2Ink after those changes means you accept the revised terms.',
  },
  {
    title: 'Contact',
    body: 'Questions about these terms can be sent through the contact page or by email at rasagyavatsal16@gmail.com.',
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="These terms govern your use of Text2Ink, the rules for acceptable use, and your responsibilities when you export handwriting-style pages."
      effectiveDate="May 21, 2026"
      sections={sections}
    />
  );
}
