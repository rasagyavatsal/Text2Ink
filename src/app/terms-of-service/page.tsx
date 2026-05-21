import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import SiteHeader from '@/components/patterns/SiteHeader';
import SiteFooter from '@/components/patterns/SiteFooter';

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
              <h1 className="text-page-title font-bold tracking-tight text-foreground mb-4">
                Terms of Service
              </h1>
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
