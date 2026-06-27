type LegalSection = {
  readonly id: string;
  readonly title: string;
  readonly body: string;
};

type LegalPageContent = {
  readonly title: string;
  readonly path: string;
  readonly description: string;
  readonly intro: string;
  readonly effectiveDate: string;
  readonly sections: LegalSection[];
};

const effectiveDate = 'June 27, 2026';
const sectionHeadingPattern = /^## (.+) \{#([a-z0-9-]+)\}$/;

function parseLegalSections(source: string): LegalSection[] {
  return source.trim().split(/\n---\n/).map((block) => {
    const [heading = '', ...bodyLines] = block.trim().split('\n');
    const match = sectionHeadingPattern.exec(heading);

    if (!match) {
      throw new Error(`Invalid legal section heading: ${heading}`);
    }

    return {
      id: match[2],
      title: match[1],
      body: bodyLines.join('\n').trim(),
    };
  });
}

export const privacyPolicyContent = {
  title: 'Privacy Policy',
  path: '/privacy-policy',
  description: 'Read how Text2Ink handles browser-saved editor drafts, analytics consent, contact-form submissions, service providers, retention, and privacy requests.',
  intro: 'This policy explains what information Text2Ink handles, why it is used, and what choices you have.',
  effectiveDate,
  sections: parseLegalSections(`
## Summary {#summary}
Text2Ink means the website and service operated by Rasagya Vatsal, an individual based in India.

- No account or payment is required. No account, subscription, payment, or card details are required to use the editor.
- Typed text, page settings, text boxes, uploaded font data, and uploaded background images can stay in browser storage under \`text2ink.editor.state\`.
- Contact messages, rate-limit records, and analytics events can be sent to service providers as described in this policy.
- Firebase Analytics and Contentsquare load only after you allow analytics.

Text2Ink does not sell personal information.

---
## Information Text2Ink handles {#information-text2ink-handles}
Text2Ink may handle editor content you type, handwriting and page settings, text boxes, custom font files, uploaded background images, generated exports, contact-form details, browser and device information, referrers, pages visited, and site interaction events.

Text2Ink uses this information to provide the editor, restore browser-saved work, generate downloads, receive and respond to inquiries, reduce spam and abuse, measure aggregate usage, improve reliability, and maintain the service.

---
## Browser storage and editor files {#browser-storage-and-editor-files}
The editor saves your current work in your browser local storage under \`text2ink.editor.state\` so the same device can restore your session. That saved editor state can include typed text, handwriting settings, page settings, text boxes, custom font data, uploaded background images, preview scale, and current page position.

When you upload a custom font or background image, your browser reads the file so Text2Ink can render it in the editor and exports. Those files can be stored locally as part of your saved editor state. Exports are generated from your editor state. You decide what to download, keep, submit, or share after exporting.

---
## Analytics and consent {#analytics-and-consent}
Firebase Analytics and Contentsquare load only after you allow analytics. Your choice is stored in your browser local storage under \`text2ink.privacy.analyticsConsent\` as \`accepted\` or \`rejected\`.

If you allow analytics, these services may collect technical and usage information such as browser details, device information, referrers, pages visited, and interactions on the site. Text2Ink uses this information to understand aggregate usage, performance, and page interaction patterns.

You can change your analytics choice from the Privacy settings control in the footer. If you reject analytics before it loads, Text2Ink will not start Firebase Analytics or inject the Contentsquare script on that visit.

---
## Contact inquiries {#contact-inquiries}
If you send a message through the contact form, Text2Ink collects the name, email address, topic, and message you submit so the inquiry can be received and answered.

Inquiry submissions are validated, checked for spam, and rate-limited. Rate limiting stores hashed IP and email identifiers, request counts, and expiry timestamps in Firestore. Rate-limit records include an expiresAt timestamp, but this app code does not configure automatic Firestore TTL deletion. A TTL policy may need to be configured separately in Firebase.

Inquiry emails are delivered to Rasagya Vatsal by email using SMTP. Rasagya Vatsal may keep inquiry emails and replies in an inbox as long as needed to respond, maintain records, prevent abuse, or meet legal obligations.

---
## Vendors and service providers {#vendors-and-service-providers}
Text2Ink uses service providers to run the site and contact workflow, including Firebase Hosting, Firebase Functions, Firestore, Firebase Analytics, Contentsquare, and SMTP email infrastructure.

These providers process information only as needed for hosting, storage, analytics, security, delivery, troubleshooting, and support of Text2Ink. Their own terms, privacy notices, and infrastructure controls may also apply.

---
## Retention {#retention}
Browser-saved editor state remains in your browser until it is overwritten, cleared by you, or removed by your browser. You can remove it by clearing site data for Text2Ink in your browser.

Analytics consent remains in local storage until you change it, clear Text2Ink site data, or use another browser or device. Contact inquiry emails and related replies are kept only as long as reasonably needed for support, records, abuse prevention, or legal obligations. Analytics retention is managed through the analytics providers and site configuration.

---
## Your choices, rights, and requests {#your-choices-rights-and-requests}
You can avoid sharing contact details by not submitting the contact form. You can reject analytics before it starts or change analytics consent later from Privacy settings in the footer. You can remove locally saved editor work by clearing Text2Ink site data in your browser.

Depending on where you live, you may have rights to request access, correction, deletion, restriction, portability, objection, withdrawal of consent, or information about how personal information is handled. You can send privacy requests through the contact page or by email at rasagyavatsal16@gmail.com. Text2Ink will respond as required by applicable law.

---
## No sale of personal information {#no-sale-of-personal-information}
Text2Ink does not sell personal information. Text2Ink also does not require an account, subscription, or payment card to use the editor.

---
## Contact {#contact}
Text2Ink is operated by Rasagya Vatsal, an individual based in India. Questions or requests about this policy can be sent through the contact page or by email at rasagyavatsal16@gmail.com.
`),
} satisfies LegalPageContent;

export const termsOfServiceContent = {
  title: 'Terms of Service',
  path: '/terms-of-service',
  description: 'Read the Terms of Service for using Text2Ink, including user content, acceptable use, exports, availability, disclaimers, liability, and contact paths.',
  intro: 'These terms explain how you may use Text2Ink and what you are responsible for when you create and export handwriting-style pages.',
  effectiveDate,
  sections: parseLegalSections(`
## What Text2Ink does {#what-text2ink-does}
Text2Ink means the website and service operated by Rasagya Vatsal, an individual based in India. The editor converts typed text into handwriting-style pages, with controls for handwriting, paper, colors, margins, text boxes, backgrounds, and exports as PDF, PNG, or JPG.

You can use the editor without creating an account or making a payment.

---
## Eligibility and minors {#eligibility-and-minors}
Text2Ink is not intended for children under 13. If you are under the age of majority where you live, use Text2Ink only with permission from a parent, guardian, school, or other responsible adult.

You are responsible for making sure your use of Text2Ink is allowed by the rules that apply to you, including school, workplace, platform, and local legal rules.

---
## Your content and license {#your-content-and-license}
You keep ownership of content you create or upload. You are responsible for the text, files, fonts, images, and other content you use with Text2Ink.

You give Text2Ink a limited license to process your content only as needed to provide the editor, render previews, generate exports, operate browser-saved settings, deliver contact inquiries, prevent abuse, and maintain the service. This license is not a transfer of ownership.

Text2Ink does not review your content for accuracy, ownership, permissions, or whether it meets any school, workplace, platform, or submission rules. Do not upload or use content unless you have the rights and permission to use it.

---
## Acceptable use {#acceptable-use}
Use Text2Ink only for lawful purposes.

Do not use Text2Ink to forge a signature, impersonate someone, present output as another person's handwriting, violate academic or workplace rules, infringe another person's rights, distribute harmful content, attack the service, abuse the contact form, or interfere with other users or the service.

When a school, workplace, client, platform, or public form has rules about handwritten submissions, checking those rules is your responsibility before using Text2Ink output.

---
## Exports and availability {#exports-and-availability}
Exports are generated from your browser and editor state. You are responsible for reviewing exported files before using or submitting them.

Before you submit, print, upload, or share an export, check the rendered text, page count, paper layout, text boxes, margins, visible uploads, and selected export format.

Text2Ink may change, improve, limit, suspend, or discontinue parts of the service. Text2Ink aims to keep the editor useful, but does not guarantee uninterrupted availability, perfect rendering, compatibility with every browser or device, or preservation of locally saved drafts.

---
## Suspension and termination {#suspension-and-termination}
Text2Ink may block, limit, suspend, or terminate access to the service or contact form if use appears unlawful, abusive, harmful, security-sensitive, or inconsistent with these terms.

You may stop using Text2Ink at any time. Locally saved editor state remains controlled by your browser and can be removed by clearing Text2Ink site data.

---
## Disclaimers {#disclaimers}
Text2Ink is provided as is and as available. To the fullest extent permitted by law, Text2Ink disclaims warranties of merchantability, fitness for a particular purpose, non-infringement, uninterrupted operation, error-free operation, and perfect export output.

Text2Ink does not promise that generated handwriting-style pages will satisfy any school, employer, platform, legal, or authenticity requirement.

---
## Limitation of liability {#limitation-of-liability}
To the fullest extent permitted by law, Text2Ink is not liable for indirect, incidental, special, consequential, exemplary, or punitive damages, lost profits, lost data, lost goodwill, service interruption, or content-related claims.

To the fullest extent permitted by law, Text2Ink total liability for any claim is limited to the greater of the amount you paid to use Text2Ink in the 12 months before the claim or USD 100.

---
## Indemnity {#indemnity}
You agree to indemnify and hold Text2Ink harmless from claims, losses, liabilities, damages, costs, and expenses, including reasonable legal fees, arising from your content, exports, misuse of the service, violation of these terms, or violation of another person's rights.

---
## Governing law {#governing-law}
Unless mandatory local law says otherwise, these terms are governed by the laws of India, without regard to conflict-of-law rules.

Any dispute will be handled by courts with competent jurisdiction in India unless mandatory consumer or local law gives you different rights.

---
## Changes to these terms {#changes-to-these-terms}
Text2Ink may update these terms when the service or policy needs change. Updates will be posted on this page with a new effective date.

Your continued use of Text2Ink after an update means you accept the revised terms.

---
## Contact {#contact}
Questions about these terms can be sent to Rasagya Vatsal through the contact page or by email at rasagyavatsal16@gmail.com.
`),
} satisfies LegalPageContent;
