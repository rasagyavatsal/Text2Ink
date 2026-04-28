import { Mail } from 'lucide-react';
import { Metadata } from 'next';
import GlobalHeader from '@/components/patterns/GlobalHeader';
import SiteFooter from '@/components/patterns/SiteFooter';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Have questions or feedback about Text2Ink? Reach out to us. We would love to hear from you!',
  alternates: {
    canonical: 'https://text2ink.com/contact',
  },
};

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--t2i-surface-app)] text-[var(--t2i-content-normal)]">
      <GlobalHeader action={{ href: '/editor', label: 'Editor', tone: 'primary' }} />

      <main className="flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <section className="mx-auto max-w-3xl rounded-[var(--t2i-radius-panel)] border border-[var(--t2i-border-default)] bg-[var(--t2i-surface-panel)] p-6 shadow-none sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-[var(--t2i-border-subtle)] bg-[var(--t2i-brand-soft)] text-[var(--t2i-brand-primary)]">
              <Mail className="h-6 w-6" aria-hidden="true" />
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--t2i-content-strong)] sm:text-4xl">
                Contact Text2Ink
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--t2i-content-muted)] sm:text-base">
                Send questions or product feedback by email.
              </p>
              <a
                href="mailto:rasagyavatsal@outlook.com"
                className="mt-6 inline-flex items-center justify-center rounded-full bg-[var(--t2i-brand-primary)] px-5 py-2.5 text-sm font-bold text-[var(--t2i-brand-on-primary)] transition hover:bg-[var(--t2i-brand-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--t2i-focus-ring)]"
              >
                rasagyavatsal@outlook.com
              </a>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
