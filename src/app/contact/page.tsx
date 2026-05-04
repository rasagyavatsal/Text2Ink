import { Metadata } from 'next';
import GlobalHeader from '@/components/patterns/GlobalHeader';
import SiteFooter from '@/components/patterns/SiteFooter';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Questions, feedback, or bug reports? Reach out anytime by email.',
  alternates: {
    canonical: 'https://text2ink.com/contact',
  },
};

export default function ContactPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--t2i-surface-app)] text-[var(--t2i-content-normal)]">
      <GlobalHeader action={{ href: '/editor', label: 'Editor', tone: 'primary' }} />

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-12">
        <section className="flex w-full max-w-3xl flex-col items-center justify-center gap-6 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-[var(--t2i-content-strong)] sm:text-5xl">
            Contact
          </h1>
          <p className="max-w-2xl text-base text-[var(--t2i-content-muted)] sm:text-lg">
            Questions, feedback, or bug reports? Feel free to reach out anytime.
          </p>
          <a
            href="mailto:rasagyavatsal@outlook.com"
            className="text-xl font-semibold text-[var(--t2i-brand-primary)] transition hover:text-[var(--t2i-brand-hover)] hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--t2i-focus-ring)] sm:text-2xl"
          >
            rasagyavatsal@outlook.com
          </a>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
