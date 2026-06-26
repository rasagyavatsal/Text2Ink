import LegalPage from '@/components/patterns/LegalPage';
import { buildLegalMetadata } from '@/lib/seo/pageMetadata';

const path = '/terms-of-service';
const title = 'Terms of Service';
const description = 'Read the Terms of Service for using Text2Ink, including user content, acceptable use, exports, availability, disclaimers, liability, and contact paths.';

export const metadata = buildLegalMetadata({ path, title, description });

const sections = [
  {
    id: 'what-text2ink-does',
    title: 'What Text2Ink does',
    body: 'Text2Ink means the website and service operated by Rasagya Vatsal. Text2Ink is a web editor owned and operated by Rasagya Vatsal, an individual based in India. The editor converts typed text into handwriting-style pages, with controls for handwriting, paper, colors, margins, text boxes, backgrounds, and exports as PDF, PNG, or JPG.\n\nYou can use the editor without creating an account or making a payment.',
  },
  {
    id: 'eligibility-and-minors',
    title: 'Eligibility and minors',
    body: 'Text2Ink is not intended for children under 13. If you are under the age of majority where you live, use Text2Ink only with permission from a parent, guardian, school, or other responsible adult.\n\nYou are responsible for making sure your use of Text2Ink is allowed by the rules that apply to you, including school, workplace, platform, and local legal rules.',
  },
  {
    id: 'your-content-and-license',
    title: 'Your content and license',
    body: 'You keep ownership of content you create or upload. You are responsible for the text, files, fonts, images, and other content you use with Text2Ink.\n\nYou give Text2Ink a limited license to process your content only as needed to provide the editor, render previews, generate exports, operate browser-saved settings, deliver contact inquiries, prevent abuse, and maintain the service. This license is not a transfer of ownership.\n\nText2Ink does not review your content for accuracy, ownership, permissions, or whether it meets any school, workplace, platform, or submission rules. Do not upload or use content unless you have the rights and permission to use it.',
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: 'Use Text2Ink only for lawful purposes.\n\nDo not use Text2Ink to deceive someone, impersonate someone, violate academic or workplace rules, infringe another person’s rights, distribute harmful content, attack the service, abuse the contact form, or interfere with other users or the service.',
  },
  {
    id: 'exports-and-availability',
    title: 'Exports and availability',
    body: 'Exports are generated from your browser and editor state. You are responsible for reviewing exported files before using or submitting them.\n\nText2Ink may change, improve, limit, suspend, or discontinue parts of the service. Text2Ink aims to keep the editor useful, but does not guarantee uninterrupted availability, perfect rendering, compatibility with every browser or device, or preservation of locally saved drafts.',
  },
  {
    id: 'suspension-and-termination',
    title: 'Suspension and termination',
    body: 'Text2Ink may block, limit, suspend, or terminate access to the service or contact form if use appears unlawful, abusive, harmful, security-sensitive, or inconsistent with these terms.\n\nYou may stop using Text2Ink at any time. Locally saved editor state remains controlled by your browser and can be removed by clearing Text2Ink site data.',
  },
  {
    id: 'disclaimers',
    title: 'Disclaimers',
    body: 'Text2Ink is provided as is and as available. To the fullest extent permitted by law, Text2Ink disclaims warranties of merchantability, fitness for a particular purpose, non-infringement, uninterrupted operation, error-free operation, and perfect export output.\n\nText2Ink does not promise that generated handwriting-style pages will satisfy any school, employer, platform, legal, or authenticity requirement.',
  },
  {
    id: 'limitation-of-liability',
    title: 'Limitation of liability',
    body: 'To the fullest extent permitted by law, Text2Ink is not liable for indirect, incidental, special, consequential, exemplary, or punitive damages, lost profits, lost data, lost goodwill, service interruption, or content-related claims.\n\nTo the fullest extent permitted by law, Text2Ink total liability for any claim is limited to the greater of the amount you paid to use Text2Ink in the 12 months before the claim or USD 100.',
  },
  {
    id: 'indemnity',
    title: 'Indemnity',
    body: 'You agree to indemnify and hold Text2Ink harmless from claims, losses, liabilities, damages, costs, and expenses, including reasonable legal fees, arising from your content, exports, misuse of the service, violation of these terms, or violation of another person\'s rights.',
  },
  {
    id: 'governing-law',
    title: 'Governing law',
    body: 'Text2Ink is operated by Rasagya Vatsal, an individual based in India. Unless mandatory local law says otherwise, these terms are governed by the laws of India, without regard to conflict-of-law rules.\n\nAny dispute will be handled by courts with competent jurisdiction in India unless mandatory consumer or local law gives you different rights. If a narrower venue clause is needed, this section should be replaced with the correct state, city, or court language after legal review.',
  },
  {
    id: 'changes-to-these-terms',
    title: 'Changes to these terms',
    body: 'Text2Ink may update these terms when the service or policy needs change. Updates will be posted on this page with a new effective date.\n\nYour continued use of Text2Ink after an update means you accept the revised terms.',
  },
  {
    id: 'contact',
    title: 'Contact',
    body: 'Questions about these terms can be sent to Rasagya Vatsal through the contact page or by email at rasagyavatsal16@gmail.com.',
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalPage
      title={title}
      path={path}
      intro="These terms explain how you may use Text2Ink and what you are responsible for when you create and export handwriting-style pages."
      effectiveDate="June 26, 2026"
      sections={sections}
    />
  );
}
