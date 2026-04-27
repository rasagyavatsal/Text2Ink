import { Mail, MessageSquare, Sparkles } from 'lucide-react';
import { Metadata } from 'next';
import GlobalHeader from '@/components/patterns/GlobalHeader';
import Version from '@/components/Version';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Have questions or feedback about Text2Ink? Reach out to us. We would love to hear from you!',
  alternates: {
    canonical: 'https://text2ink.com/contact',
  },
};

const contactReasons = [
  {
    title: 'Bug Reports',
    description: 'Found something broken in the editor or export flow? Send the details and I will prioritize a fix.',
    icon: MessageSquare,
  },
  {
    title: 'Feature Requests',
    description: 'Have an idea for a better document workflow? Share what would make Text2Ink more useful.',
    icon: Sparkles,
  },
  {
    title: 'General Feedback',
    description: 'Tell me what feels polished, what feels confusing, and where the product can improve.',
    icon: Mail,
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[var(--t2i-surface-app)] text-[var(--t2i-content-normal)]">
      <GlobalHeader
        action={{ href: '/', label: 'Editor', tone: 'primary' }}
        maxWidth="content"
      />

      <main className="px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-4xl">
          <section className="t2i-utility-hero text-center">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--t2i-accent-info)]">
              Utility inbox
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-[var(--t2i-content-strong)] sm:text-5xl">
              Contact Text2Ink
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[var(--t2i-content-muted)] sm:text-lg">
              Have questions, feedback, or suggestions? This page is a lightweight product utility for getting help and sharing what would make the handwriting workflow better.
            </p>
          </section>

          <section className="mt-10 rounded-[var(--t2i-radius-panel)] border border-[var(--t2i-border-default)] bg-[var(--t2i-surface-panel)] p-6 shadow-[var(--t2i-shadow-medium)] sm:p-8">
            <div className="grid gap-6 md:grid-cols-[auto,1fr] md:items-center">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[var(--t2i-brand-soft)] text-[var(--t2i-brand-primary)] ring-1 ring-[var(--t2i-brand-primary)]/20 md:mx-0">
                <Mail className="h-8 w-8" aria-hidden="true" />
              </div>

              <div className="text-center md:text-left">
                <h2 className="text-xl font-semibold text-[var(--t2i-content-strong)]">
                  Email
                </h2>
                <a
                  href="mailto:rasagyavatsal@outlook.com"
                  className="mt-2 inline-flex rounded-md text-lg font-semibold text-[var(--t2i-brand-primary)] transition hover:text-[var(--t2i-brand-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--t2i-focus-ring)]"
                >
                  rasagyavatsal@outlook.com
                </a>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--t2i-content-muted)]">
                  Whether you found a bug, need help exporting, or just want to share product feedback, feel free to reach out. I typically respond within 24–48 hours.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {contactReasons.map(({ title, description, icon: Icon }) => (
              <article
                key={title}
                className="rounded-2xl border border-[var(--t2i-border-default)] bg-[var(--t2i-surface-card)] p-5 shadow-[var(--t2i-shadow-low)]"
              >
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-xl bg-[var(--t2i-state-selected)] text-[var(--t2i-accent-info)]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-[var(--t2i-content-strong)]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--t2i-content-muted)]">
                  {description}
                </p>
              </article>
            ))}
          </section>
        </div>
      </main>

      <footer className="border-t border-[var(--t2i-border-subtle)] px-4 py-6 sm:px-6" role="contentinfo">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-sm text-[var(--t2i-content-muted)] sm:flex-row">
          <p>© {new Date().getFullYear()} Text2Ink. All rights reserved.</p>
          <Version />
        </div>
      </footer>
    </div>
  );
}
