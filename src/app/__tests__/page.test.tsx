import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  const heroPreviewImages = [
    { src: '/preview/preview-1.jpg', width: '2481', height: '3508', alt: 'Text2Ink handwritten page preview 1' },
    { src: '/preview/preview-2.jpg', width: '2481', height: '3508', alt: 'Text2Ink handwritten page preview 2' },
    { src: '/preview/preview-3.jpg', width: '2481', height: '3508', alt: 'Text2Ink handwritten page preview 3' },
    { src: '/preview/preview-4.jpg', width: '2481', height: '3508', alt: 'Text2Ink handwritten page preview 4' },
    { src: '/preview/preview-5.jpg', width: '3508', height: '2481', alt: 'Text2Ink handwritten page preview 5' },
    { src: '/preview/preview-6.jpg', width: '3301', height: '2551', alt: 'Text2Ink handwritten page preview 6' },
  ] as const;

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

    expect(heroHeading).toHaveClass('font-bold');
    expect(heroHeading).not.toHaveClass('font-normal');
    expect(heroHeading).toHaveClass('font-[family-name:var(--font-snake)]');
    expect(heroHeading).toHaveClass('text-6xl');
    expect(heroHeading).toHaveClass('sm:text-8xl');
    expect(heroHeading).toHaveClass('md:text-9xl');
    expect(heroHeading).toHaveClass('text-foreground');
    expect(heroHeading).toHaveClass('whitespace-normal');

    const headingParts = heroHeading.querySelectorAll('span');
    expect(headingParts).toHaveLength(3);
    expect(headingParts[0]).toHaveTextContent('Text to');
    expect(headingParts[0]).toHaveClass('text-foreground');
    expect(headingParts[0]).not.toHaveClass('text-3xl');
    expect(headingParts[0]).not.toHaveClass('font-[family-name:var(--font-snake)]');
    expect(headingParts[1]).toHaveTextContent('Handwriting');
    expect(headingParts[1]).not.toHaveClass('font-[family-name:var(--font-snake)]');
    expect(headingParts[1]).toHaveClass('text-amber-600');
    expect(headingParts[1]).not.toHaveClass('text-5xl');
    expect(headingParts[2]).toHaveTextContent('Converter');
    expect(headingParts[2]).toHaveClass('text-foreground');
    expect(headingParts[2]).not.toHaveClass('text-3xl');
    expect(headingParts[2]).not.toHaveClass('font-[family-name:var(--font-snake)]');

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

  it('renders the hero preview carousel with marquee motion', () => {
    render(<HomePage />);
    const carousel = screen.getByTestId('hero-preview-carousel');
    const track = screen.getByTestId('hero-preview-carousel-track');

    expect(carousel).toBeInTheDocument();
    expect(carousel).toHaveClass('mt-6');
    expect(carousel).toHaveClass('sm:mt-8');
    expect(carousel).toHaveClass('lg:mt-10');
    expect(track).toHaveClass('landing-preview-marquee');
  });

  it('renders the hero preview cards with responsive border radius', () => {
    render(<HomePage />);
    const previewButtons = screen.getAllByTestId('hero-preview-trigger');
    const firstCard = previewButtons[0];
    const secondCard = previewButtons[1];

    expect(previewButtons).toHaveLength(6);
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

  it('renders the six carousel preview images with exact dimensions', () => {
    render(<HomePage />);
    const previewImages = screen.getAllByTestId('hero-carousel-preview');

    expect(previewImages).toHaveLength(heroPreviewImages.length);

    heroPreviewImages.forEach((preview, index) => {
      expect(previewImages[index]).toHaveAttribute('src', preview.src);
      expect(previewImages[index]).toHaveAttribute('alt', preview.alt);
      expect(previewImages[index]).toHaveAttribute('width', preview.width);
      expect(previewImages[index]).toHaveAttribute('height', preview.height);
    });
  });

  it('scales landscape carousel cards wider so their height matches portrait previews', () => {
    render(<HomePage />);
    const previewButtons = screen.getAllByTestId('hero-preview-trigger');

    expect(previewButtons[0]).toHaveClass('lg:w-[22rem]');
    expect(previewButtons[4]).toHaveClass('lg:w-[44rem]');
    expect(previewButtons[5]).toHaveClass('lg:w-[40rem]');
  });

  it('renders the preview images grid without a width constraint wrapper', () => {
    render(<HomePage />);
    const carousel = screen.getByTestId('hero-preview-carousel');
    expect(carousel).toBeInTheDocument();
    
    let current: Element | null = carousel;
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

  it('renders font preview cards from the preview directory with exact dimensions', () => {
    render(<HomePage />);

    const singlong = screen.getByAltText('Singlong handwriting font preview');
    const snake = screen.getByAltText('Snake handwriting font preview');

    expect(singlong).toHaveAttribute('src', '/preview/singlong-preview.jpg');
    expect(singlong).toHaveAttribute('width', '2481');
    expect(singlong).toHaveAttribute('height', '3508');
    expect(snake).toHaveAttribute('src', '/preview/snake-preview.jpg');
    expect(snake).toHaveAttribute('width', '2481');
    expect(snake).toHaveAttribute('height', '3508');
  });

  it('opens the shared lightbox from landing previews without zoom buttons', async () => {
    const user = userEvent.setup();
    render(<HomePage />);

    await user.click(screen.getByRole('button', { name: /open text2ink handwritten page preview 1/i }));

    const dialog = await screen.findByRole('dialog', {
      name: /text2ink handwritten page preview 1/i,
    });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByTestId('preview-lightbox-image')).toHaveAttribute('src', '/preview/preview-1.jpg');
    expect(within(dialog).queryByRole('button', { name: /zoom/i })).not.toBeInTheDocument();
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
    expect(screen.getByText(/use Singlong for an informal note-style page/i)).toBeInTheDocument();
    expect(screen.getByText(/use PDF when a teacher, client, or archive needs one file with every page/i)).toBeInTheDocument();
    expect(screen.getByText(/check the last page before exporting/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /text2ink faq/i })).toBeInTheDocument();

    expect(container.textContent).not.toMatch(/customer reviews|star ratings?|awards?|guarantee|users served|the goal is to provide useful variation/i);
  });

  it('keeps the homepage copy deep enough for the landing search intent', () => {
    const { container } = render(<HomePage />);
    const main = container.querySelector('main');
    const wordCount = main?.textContent?.trim().split(/\s+/).length ?? 0;

    expect(wordCount).toBeGreaterThanOrEqual(1800);
    expect(wordCount).toBeLessThanOrEqual(2200);
  });

  it('renders non-duplicative FAQ questions for adjacent trust details', () => {
    render(<HomePage />);

    const expectedQuestions = [
      'Can I use Text2Ink without signing in?',
      'Where is my draft saved?',
      'How do I remove saved Text2Ink data from my browser?',
      'What happens when I upload a custom font or background image?',
      'Should I export as PDF, PNG, or JPG?',
      'Can a long document export across multiple pages?',
      'Can I change one page without changing every page?',
      'What should I check before submitting or sharing an export?',
    ];

    expectedQuestions.forEach((question) => {
      expect(screen.getByRole('heading', { name: question })).toBeInTheDocument();
    });

    const faqHeadings = screen.getByRole('heading', { name: /text2ink faq/i })
      .closest('div')
      ?.querySelectorAll('h3');
    expect(faqHeadings).toHaveLength(expectedQuestions.length);
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
