import type { Metadata } from 'next';
import LegalPage from '@/components/patterns/LegalPage';

const canonicalUrl = 'https://text2ink.com/privacy-policy';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'Read how Text2Ink handles editor drafts, analytics, contact-form submissions, and other information tied to the service.',
  alternates: {
    canonical: canonicalUrl,
  },
};

const sections = [
  {
    id: 'what-stays-in-your-browser',
    title: 'What stays in your browser',
    body: 'Text2Ink does not require an account or payment to use the editor.\n\nThe editor saves your current work in your browser’s local storage under `text2ink.editor.state` so the same device can restore your session. That saved editor state can include typed text, handwriting settings, page settings, text boxes, custom font data, uploaded background images, preview scale, and current page position.\n\nThis editor state remains in your browser until it is overwritten, cleared by you, or removed by your browser. You can remove it by clearing site data for Text2Ink in your browser.',
  },
  {
    id: 'uploads-and-exports',
    title: 'Uploads and exports',
    body: 'When you upload a custom font or background image, your browser reads the file so Text2Ink can render it in the editor and exports. Those files can be stored locally as part of your saved editor state.\n\nExports are generated from your editor state. You decide what to download, keep, submit, or share after exporting.',
  },
  {
    id: 'analytics',
    title: 'Analytics',
    body: 'Text2Ink loads Firebase Analytics and Contentsquare to understand aggregate usage, performance, and page interaction patterns.\n\nThese services may collect technical and usage information such as browser details, device information, referrers, pages visited, and interactions on the site. Text2Ink uses this information to understand how the site is used and improve reliability and usability.',
  },
  {
    id: 'contact-inquiries',
    title: 'Contact inquiries',
    body: 'If you send a message through the contact form, Text2Ink collects the name, email address, topic, and message you submit so we can receive and respond to your inquiry.\n\nInquiry submissions are validated, checked for spam, and rate-limited. Rate limiting stores hashed IP and email identifiers, request counts, and expiry timestamps in Firestore. The current Firebase configuration does not show an automatic Firestore TTL deletion policy for those rate-limit records.\n\nInquiry emails are delivered to the Text2Ink operator by email using SMTP.',
  },
  {
    id: 'your-choices-and-requests',
    title: 'Your choices and requests',
    body: 'You can avoid sharing contact details by not submitting the contact form. You can limit analytics collection with browser settings, privacy tools, or extensions. You can remove locally saved editor work by clearing Text2Ink site data in your browser.\n\nYou can contact Text2Ink to ask about access, correction, deletion, or other privacy questions related to information you have provided. Text2Ink will respond to requests as required by applicable law.',
  },
  {
    id: 'contact',
    title: 'Contact',
    body: 'Questions about this policy can be sent through the contact page or by email at rasagyavatsal16@gmail.com.',
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="This policy explains what information Text2Ink handles, why it is used, and what choices you have."
      effectiveDate="June 16, 2026"
      sections={sections}
    />
  );
}
