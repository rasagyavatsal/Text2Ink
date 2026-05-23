import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import SiteHeader from '@/components/patterns/SiteHeader';
import SiteFooter from '@/components/patterns/SiteFooter';

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
    title: 'Information we collect',
    body: 'Text2Ink is designed so that most handwriting generation happens in your browser. We do not require user accounts, and we do not ask for payment information to use the editor.',
  },
  {
    title: 'Editor drafts and local storage',
    body: 'When you use the editor, Text2Ink stores your typed text, handwriting settings, page settings, and some editor interface state in your browser local storage so your session can be restored on the same device. Those drafts stay on your device unless you choose to export or share them yourself.',
  },
  {
    title: 'Analytics and product measurement',
    body: 'Text2Ink uses Firebase Analytics, Google Analytics, and Contentsquare to understand aggregate usage, performance, and page interaction patterns. These services may collect technical information such as browser details, device data, referrers, and activity on the site.',
  },
  {
    title: 'Contact form submissions',
    body: 'If you send an inquiry, we collect the name, email address, topic, and message you submit. Inquiry requests are validated, checked for spam, rate-limited using hashed IP and email identifiers, and then delivered to the Text2Ink operator by email so we can respond.',
  },
  {
    title: 'How we use information',
    body: 'We use information to operate the site, improve editor reliability, understand product usage, prevent abuse, and respond to support, bug, and feature-request messages.',
  },
  {
    title: 'Your choices',
    body: 'You can clear locally stored editor drafts from your browser storage, avoid submitting the contact form if you do not want to share inquiry details, and use browser tools or extensions that limit analytics collection.',
  },
  {
    title: 'Contact',
    body: 'Questions about this policy can be sent through the contact page or by email at rasagyavatsal16@gmail.com.',
  },
];

export default function PrivacyPolicyPage() {
  const frameClasses = 'mx-auto w-full max-w-content px-page-x';

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className={`${frameClasses} py-chrome-y`}>
          <SiteHeader
            hideContactLink
            cta={(
              <Button variant="brand" size="chrome" asChild>
                <Link href="/editor">
                  Back to Editor
                </Link>
              </Button>
            )}
          />
        </div>
      </header>

      <main className="py-page-y">
        <div className={frameClasses}>
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
            <div>
              <h1 className="text-document-title font-bold tracking-tight text-foreground mb-4">
                Privacy Policy
              </h1>
              <p className="text-body-lg text-muted-foreground mb-4">
                This policy explains what information Text2Ink collects, how we use it, and what choices you have when using the service.
              </p>
              <p className="text-caption text-muted-foreground mb-8">
                Effective date: May 21, 2026
              </p>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
              <div className="space-y-8">
                {sections.map((section) => (
                  <section key={section.title} className="space-y-3">
                    <h2 className="text-section-title font-semibold tracking-tight text-foreground">
                      {section.title}
                    </h2>
                    <p className="text-body leading-7 text-muted-foreground">
                      {section.body}
                    </p>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-background py-footer mt-section">
        <div className={frameClasses}>
          <SiteFooter />
        </div>
      </footer>
    </div>
  );
}
