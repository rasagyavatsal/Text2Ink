import type { Metadata } from 'next';
import LegalPage from '@/components/patterns/LegalPage';
import JsonLd from '@/components/seo/JsonLd';
import { buildBreadcrumbListJsonLd } from '@/lib/seo/jsonLd';
import { canonicalUrl, siteFacts } from '@/lib/seo/productFacts';

const canonical = canonicalUrl('/terms-of-service');
const title = 'Terms of Service';
const description = 'Read the Terms of Service for using Text2Ink, including acceptable use, export responsibility, and service changes.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical,
  },
  openGraph: {
    type: 'website',
    url: canonical,
    siteName: siteFacts.siteName,
    title,
    description,
  },
  twitter: {
    card: 'summary',
    title,
    description,
  },
};

const sections = [
  {
    id: 'what-text2ink-does',
    title: 'What Text2Ink does',
    body: 'Text2Ink is a web editor that converts typed text into handwriting-style pages. It lets you customize handwriting, paper, colors, margins, text boxes, backgrounds, and export the result as PDF, PNG, or JPG.\n\nYou can use the editor without creating an account or making a payment.',
  },
  {
    id: 'your-content',
    title: 'Your content',
    body: 'You are responsible for the text, files, fonts, images, and other content you use with Text2Ink.\n\nText2Ink does not review your content for accuracy, ownership, permissions, or whether it meets any school, workplace, platform, or submission rules. Do not upload or use content unless you have the rights and permission to use it.',
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: 'Use Text2Ink only for lawful purposes.\n\nDo not use Text2Ink to deceive someone, impersonate someone, violate academic or workplace rules, infringe another person’s rights, distribute harmful content, attack the service, abuse the contact form, or interfere with other users or the service.',
  },
  {
    id: 'exports-and-availability',
    title: 'Exports and availability',
    body: 'Exports are generated from your browser and editor state. You are responsible for reviewing exported files before using or submitting them.\n\nText2Ink may change, improve, limit, suspend, or discontinue parts of the service. We aim to keep the editor useful, but we do not guarantee uninterrupted availability, perfect rendering, compatibility with every browser or device, or preservation of locally saved drafts.',
  },
  {
    id: 'changes-to-these-terms',
    title: 'Changes to these terms',
    body: 'We may update these terms when the service or policy needs change. Updates will be posted on this page with a new effective date.\n\nYour continued use of Text2Ink after an update means you accept the revised terms.',
  },
  {
    id: 'contact',
    title: 'Contact',
    body: 'Questions about these terms can be sent through the contact page or by email at rasagyavatsal16@gmail.com.',
  },
];

export default function TermsOfServicePage() {
  return (
    <>
      <JsonLd
        data={buildBreadcrumbListJsonLd([
          { name: 'Home', url: canonicalUrl('/') },
          { name: title, url: canonical },
        ])}
      />
      <LegalPage
        title="Terms of Service"
        intro="These terms explain how you may use Text2Ink and what you are responsible for when you create and export handwriting-style pages."
        effectiveDate="June 16, 2026"
        sections={sections}
      />
    </>
  );
}
