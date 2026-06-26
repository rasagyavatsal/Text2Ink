import LegalPage from '@/components/patterns/LegalPage';
import { buildLegalMetadata } from '@/lib/seo/pageMetadata';

const path = '/privacy-policy';
const title = 'Privacy Policy';
const description = 'Read how Text2Ink handles browser-saved editor drafts, analytics consent, contact-form submissions, service providers, retention, and privacy requests.';

export const metadata = buildLegalMetadata({ path, title, description });

const sections = [
  {
    id: 'summary',
    title: 'Summary',
    body: 'Text2Ink means the website and service operated by Rasagya Vatsal. No account or payment is required to use Text2Ink. Most editor work stays in your browser. Contact inquiries are sent to Rasagya Vatsal so Text2Ink can respond. Firebase Analytics and Contentsquare load only after you allow analytics. Text2Ink does not sell personal information.',
  },
  {
    id: 'information-text2ink-handles',
    title: 'Information Text2Ink handles',
    body: 'Text2Ink may handle editor content you type, handwriting and page settings, text boxes, custom font files, uploaded background images, generated exports, contact-form details, browser and device information, referrers, pages visited, and site interaction events.\n\nText2Ink uses this information to provide the editor, restore browser-saved work, generate downloads, receive and respond to inquiries, reduce spam and abuse, measure aggregate usage, improve reliability, and maintain the service.',
  },
  {
    id: 'browser-storage-and-editor-files',
    title: 'Browser storage and editor files',
    body: 'The editor saves your current work in your browser local storage under `text2ink.editor.state` so the same device can restore your session. That saved editor state can include typed text, handwriting settings, page settings, text boxes, custom font data, uploaded background images, preview scale, and current page position.\n\nWhen you upload a custom font or background image, your browser reads the file so Text2Ink can render it in the editor and exports. Those files can be stored locally as part of your saved editor state. Exports are generated from your editor state. You decide what to download, keep, submit, or share after exporting.',
  },
  {
    id: 'analytics-and-consent',
    title: 'Analytics and consent',
    body: 'Firebase Analytics and Contentsquare load only after you allow analytics. Your choice is stored in your browser local storage under `text2ink.privacy.analyticsConsent` as `accepted` or `rejected`.\n\nIf you allow analytics, these services may collect technical and usage information such as browser details, device information, referrers, pages visited, and interactions on the site. Text2Ink uses this information to understand aggregate usage, performance, and page interaction patterns.\n\nYou can change your analytics choice from the Privacy settings control in the footer. If you reject analytics before it loads, Text2Ink will not start Firebase Analytics or inject the Contentsquare script on that visit.',
  },
  {
    id: 'contact-inquiries',
    title: 'Contact inquiries',
    body: 'If you send a message through the contact form, Text2Ink collects the name, email address, topic, and message you submit so the inquiry can be received and answered.\n\nInquiry submissions are validated, checked for spam, and rate-limited. Rate limiting stores hashed IP and email identifiers, request counts, and expiry timestamps in Firestore. Rate-limit records include an expiresAt timestamp, but this app code does not configure automatic Firestore TTL deletion. A TTL policy may need to be configured separately in Firebase.\n\nInquiry emails are delivered to Rasagya Vatsal by email using SMTP. Rasagya Vatsal may keep inquiry emails and replies in an inbox as long as needed to respond, maintain records, prevent abuse, or meet legal obligations.',
  },
  {
    id: 'vendors-and-service-providers',
    title: 'Vendors and service providers',
    body: 'Text2Ink uses service providers to run the site and contact workflow, including Firebase Hosting, Firebase Functions, Firestore, Firebase Analytics, Contentsquare, and SMTP email infrastructure.\n\nThese providers process information only as needed for hosting, storage, analytics, security, delivery, troubleshooting, and support of Text2Ink. Their own terms, privacy notices, and infrastructure controls may also apply.',
  },
  {
    id: 'retention',
    title: 'Retention',
    body: 'Browser-saved editor state remains in your browser until it is overwritten, cleared by you, or removed by your browser. You can remove it by clearing site data for Text2Ink in your browser.\n\nAnalytics consent remains in local storage until you change it, clear Text2Ink site data, or use another browser or device. Contact inquiry emails and related replies are kept only as long as reasonably needed for support, records, abuse prevention, or legal obligations. Analytics retention is managed through the analytics providers and site configuration.',
  },
  {
    id: 'your-choices-rights-and-requests',
    title: 'Your choices, rights, and requests',
    body: 'You can avoid sharing contact details by not submitting the contact form. You can reject analytics before it starts or change analytics consent later from Privacy settings in the footer. You can remove locally saved editor work by clearing Text2Ink site data in your browser.\n\nDepending on where you live, you may have rights to request access, correction, deletion, restriction, portability, objection, withdrawal of consent, or information about how personal information is handled. You can send privacy requests through the contact page or by email at rasagyavatsal16@gmail.com. Text2Ink will respond as required by applicable law.',
  },
  {
    id: 'no-sale-of-personal-information',
    title: 'No sale of personal information',
    body: 'Text2Ink does not sell personal information. Text2Ink also does not require an account, subscription, or payment card to use the editor.',
  },
  {
    id: 'contact',
    title: 'Contact',
    body: 'Text2Ink is operated by Rasagya Vatsal, an individual based in India. Questions or requests about this policy can be sent through the contact page or by email at rasagyavatsal16@gmail.com.',
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title={title}
      path={path}
      intro="This policy explains what information Text2Ink handles, why it is used, and what choices you have."
      effectiveDate="June 26, 2026"
      sections={sections}
    />
  );
}
