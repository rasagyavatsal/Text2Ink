import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import HomePage, { metadata } from '../page';
import { productFacts } from '@/lib/seo/productFacts';

// Mock ThemePicker to avoid context issues
vi.mock('@/components/ThemePicker', () => ({
  default: () => <div data-testid="theme-picker" />
}));

const homePageSource = fs.readFileSync(
  path.resolve(__dirname, '../page.tsx'),
  'utf-8'
);

describe('HomePage', () => {
  it('publishes canonical homepage metadata', () => {
    expect(metadata.alternates?.canonical).toBe('https://text2ink.com/');
    expect(metadata.openGraph?.url).toBe('https://text2ink.com/');
    expect(metadata.openGraph?.images).toEqual(expect.arrayContaining([
      expect.objectContaining({
        alt: expect.stringMatching(/text2ink handwritten page preview/i),
      }),
    ]));
  });

  it('keeps the landing page frame local to the route module', () => {
    expect(homePageSource).not.toMatch(/StandardPageShell/);
    expect(homePageSource).toMatch(/<header\b/);
    expect(homePageSource).toMatch(/<main\b/);
    expect(homePageSource).toMatch(/<footer\b/);
  });

  it('preloads the hero handwriting font directly from the page', () => {
    expect(homePageSource).toContain("preload('/fonts/FFCommaTrial-Regular.ttf'");
    expect(homePageSource).toContain("as: 'font'");
    expect(homePageSource).toContain("crossOrigin: ''");
  });

  it('renders the header with Text2Ink, Contact, and Open Editor links', () => {
    render(<HomePage />);
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    
    // Check for logo text
    expect(within(header).getByText('Text2Ink')).toBeInTheDocument();

    // Check for Contact link
    const contactLink = within(header).getByRole('link', { name: /contact/i });
    expect(contactLink).toBeInTheDocument();
    expect(contactLink).toHaveAttribute('href', '/contact');

    // Check for CTA link
    const ctaLinks = screen.getAllByRole('link', { name: /open editor/i });
    expect(ctaLinks.length).toBeGreaterThan(0);
    expect(ctaLinks[0]).toHaveAttribute('href', '/editor');
    expect(ctaLinks[0]).toHaveAttribute('data-variant', 'brand');
    expect(ctaLinks[0]).toHaveAttribute('data-size', 'chrome');
  });

  it('renders the footer with legal navigation and copyright', () => {
    render(<HomePage />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /terms of service/i })).toHaveAttribute('href', '/terms-of-service');
    expect(screen.getByRole('link', { name: /privacy policy/i })).toHaveAttribute('href', '/privacy-policy');
    expect(screen.getByText(/all rights reserved/i)).toBeInTheDocument();
  });

  it('renders the pillar hero and direct answer', () => {
    render(<HomePage />);
    const heroHeading = screen.getByRole('heading', {
      name: 'Text to Handwriting Converter',
    });
    expect(heroHeading).toBeInTheDocument();

    const highlightedText = within(heroHeading).getByText('Handwriting');
    expect(highlightedText.tagName).toBe('SPAN');
    expect(heroHeading).not.toHaveClass('font-bold');
    expect(heroHeading).toHaveClass('font-normal');
    expect(highlightedText).toHaveClass('font-bold');
    expect(highlightedText).toHaveClass('font-[family-name:var(--font-ff-comma)]');
    expect(highlightedText).toHaveClass('text-amber-600');
    expect(heroHeading).toHaveClass('whitespace-normal');
    expect(heroHeading.querySelectorAll('span')).toHaveLength(1);

    const directAnswer = screen.getByTestId('home-direct-answer');
    const wordCount = directAnswer.textContent?.trim().split(/\s+/).length ?? 0;
    expect(wordCount).toBeGreaterThanOrEqual(50);
    expect(wordCount).toBeLessThanOrEqual(100);
    expect(directAnswer).toHaveTextContent(/PDF, PNG, or JPG/i);
    
    // There should be three "Open Editor" links (one in header, one in hero, one in footer)
    const ctaLinks = screen.getAllByRole('link', { name: /open editor/i });
    expect(ctaLinks.length).toBe(3);
    expect(ctaLinks[1]).toHaveAttribute('href', '/editor');
    expect(ctaLinks[1]).toHaveAttribute('data-variant', 'brand');
    expect(ctaLinks[1]).toHaveAttribute('data-size', 'lg');
  });

  it('renders the preview images grid with responsive spacing and gaps', () => {
    const { container } = render(<HomePage />);
    const pictures = container.querySelectorAll('picture');
    const grid = pictures[0].closest('.grid');
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveClass('mt-6');
    expect(grid).toHaveClass('sm:mt-8');
    expect(grid).toHaveClass('lg:mt-10');
    expect(grid).toHaveClass('gap-4');
    expect(grid).toHaveClass('sm:gap-6');
    expect(grid).toHaveClass('md:gap-8');
  });

  it('renders the preview image cards with responsive border radius', () => {
    const { container } = render(<HomePage />);
    const pictures = container.querySelectorAll('picture');
    const firstCard = pictures[0].closest('.rounded-xl, .rounded-2xl');
    const secondCard = pictures[1].closest('.rounded-xl, .rounded-2xl');
    expect(firstCard).toBeInTheDocument();
    expect(firstCard).toHaveClass('rounded-xl');
    expect(firstCard).toHaveClass('sm:rounded-2xl');
    expect(secondCard).toBeInTheDocument();
    expect(secondCard).toHaveClass('rounded-xl');
    expect(secondCard).toHaveClass('sm:rounded-2xl');
  });

  it('does not render the retired how to use section', () => {
    render(<HomePage />);
    expect(screen.queryByRole('heading', { name: /how to use text2ink/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Create a handwritten document by typing your content/i)).not.toBeInTheDocument();
  });

  it('renders the preview images with responsive picture sources', () => {
    const { container } = render(<HomePage />);
    const pictures = container.querySelectorAll('picture');
    expect(pictures.length).toBe(2);

    // Verify first picture has sources and img
    const firstPic = pictures[0];
    const firstSources = firstPic.querySelectorAll('source');
    expect(firstSources.length).toBe(2);
    expect(firstSources[0]).toHaveAttribute('type', 'image/avif');
    expect(firstSources[0]).toHaveAttribute('media', '(min-width: 640px)');
    expect(firstSources[0].getAttribute('srcSet')).toContain('Sample-handwriting-preview1.avif');
    expect(firstSources[1]).toHaveAttribute('type', 'image/avif');
    expect(firstSources[1].getAttribute('srcSet')).toContain('Sample-handwriting-preview1-mobile.avif');
    
    const firstImg = firstPic.querySelector('img');
    expect(firstImg).toBeInTheDocument();
    expect(firstImg).toHaveAttribute('src', '/Sample-handwriting-preview1.png');
    expect(firstImg).toHaveAttribute('alt', 'Text2Ink handwritten page preview on lined notebook paper');
    expect(firstImg).toHaveAttribute('width', '618');
    expect(firstImg).toHaveAttribute('height', '800');
    expect(firstImg).toHaveAttribute('loading', 'eager');
    expect(firstImg).toHaveAttribute('fetchPriority', 'high');

    // Verify second picture
    const secondPic = pictures[1];
    const secondImg = secondPic.querySelector('img');
    expect(secondImg).toBeInTheDocument();
    expect(secondImg).toHaveAttribute('src', '/Sample-handwriting-preview2.png');
    expect(secondImg).toHaveAttribute('alt', 'Text2Ink handwritten page preview with blue ink and notebook lines');
    expect(secondImg).toHaveAttribute('width', '618');
    expect(secondImg).toHaveAttribute('height', '800');
    expect(secondImg).toHaveAttribute('loading', 'lazy');
    expect(secondImg).not.toHaveAttribute('fetchPriority', 'high');
  });

  it('renders the preview images grid without a width constraint wrapper', () => {
    const { container } = render(<HomePage />);
    const pictures = container.querySelectorAll('picture');
    const grid = pictures[0].closest('.grid');
    expect(grid).toBeInTheDocument();
    
    let current = grid;
    let hasMaxWidth = false;
    while (current && current.tagName !== 'MAIN') {
      if (current.classList && current.classList.contains('max-w-content')) {
        hasMaxWidth = true;
        break;
      }
      // Workaround for TypeScript saying parentElement might be null and not an Element in DOM
      current = current.parentElement as Element | null;
    }
    expect(hasMaxWidth).toBe(false);
  });

  it('removes the retired feature-section placeholders', () => {
    const { container } = render(<HomePage />);

    expect(screen.queryByRole('heading', { name: /text2ink features/i })).not.toBeInTheDocument();
    expect(container.querySelectorAll('[data-testid="feature-section"]')).toHaveLength(0);
    expect(screen.queryByText('Image placeholder')).not.toBeInTheDocument();
  });

  it('renders the SEO landing sections from supported product facts', () => {
    const { container } = render(<HomePage />);

    const landingSection = screen.getByRole('heading', { name: /what text2ink does/i }).closest('section');
    expect(landingSection).toBeInTheDocument();

    [
      'What Text2Ink does',
      'How to convert text to handwriting online',
      'Handwriting font options',
      'Notebook paper and page setup',
      'Realism controls',
      'Text boxes and page control',
      'Export options',
      'Responsible use and privacy',
    ].forEach((heading) => {
      expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
    });

    expect(screen.queryByRole('link', { name: /export handwritten notes/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(`${productFacts.handwritingFonts.length} built-in handwriting fonts`)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(`${productFacts.paper.styles.length} paper styles`)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(new RegExp(productFacts.paper.styles[0].name)).length).toBeGreaterThan(0);
    expect(screen.getByText(new RegExp(productFacts.paper.colors[0].name))).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(productFacts.browserDraft.storageKey)).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /text2ink faq/i })).toBeInTheDocument();

    expect(container.textContent).not.toMatch(/customer reviews|star ratings?|awards?|guarantee|users served/i);
  });

  it('keeps the homepage copy deep enough for the landing search intent', () => {
    const { container } = render(<HomePage />);
    const main = container.querySelector('main');
    const wordCount = main?.textContent?.trim().split(/\s+/).length ?? 0;

    expect(wordCount).toBeGreaterThanOrEqual(1800);
    expect(wordCount).toBeLessThanOrEqual(2400);
  });

  it('renders non-duplicative FAQ questions for adjacent trust details', () => {
    render(<HomePage />);

    [
      'Can I use Text2Ink without signing in?',
      'Where is my draft saved?',
      'How do I remove saved Text2Ink data from my browser?',
      'What happens when I upload a custom font or background image?',
      'Why is export disabled when there is no text?',
      'Can one document produce more than one exported page?',
      'Can I change one page without changing every page?',
      'Does Text2Ink review whether my content is allowed by school or workplace rules?',
      'What should I check before submitting or sharing an export?',
      'How can I report a bug or request a feature?',
    ].forEach((question) => {
      expect(screen.getByRole('heading', { name: question })).toBeInTheDocument();
    });
  });

  it('emits WebSite, Organization, WebApplication, FAQ, and breadcrumb JSON-LD', () => {
    const { container } = render(<HomePage />);
    const schemas = Array.from(container.querySelectorAll('script[type="application/ld+json"]'))
      .map((script) => JSON.parse(script.textContent ?? '{}'));
    const types = schemas.map((schema) => schema['@type']);

    expect(types).toEqual(expect.arrayContaining([
      'WebSite',
      'Organization',
      'WebApplication',
      'FAQPage',
      'BreadcrumbList',
    ]));
    expect(schemas.find((schema) => schema['@type'] === 'WebApplication')).not.toHaveProperty('aggregateRating');
  });

  it('keeps FAQ JSON-LD matched to visible FAQ content without review or rating schema', () => {
    const { container } = render(<HomePage />);
    const schemas = Array.from(container.querySelectorAll('script[type="application/ld+json"]'))
      .map((script) => JSON.parse(script.textContent ?? '{}'));
    const faqSchema = schemas.find((schema) => schema['@type'] === 'FAQPage');

    expect(faqSchema?.mainEntity).toEqual(expect.arrayContaining(
      Array.from(screen.getByRole('heading', { name: /text2ink faq/i }).closest('section')?.querySelectorAll('h3') ?? [])
        .map((heading) => expect.objectContaining({
          '@type': 'Question',
          name: heading.textContent,
          acceptedAnswer: expect.objectContaining({
            '@type': 'Answer',
            text: expect.any(String),
          }),
        }))
    ));

    expect(JSON.stringify(schemas)).not.toMatch(/Review|AggregateRating|Rating/);
  });
});
