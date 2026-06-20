import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import HomePage from '../page';

// Mock ThemePicker to avoid context issues
vi.mock('@/components/ThemePicker', () => ({
  default: () => <div data-testid="theme-picker" />
}));

const homePageSource = fs.readFileSync(
  path.resolve(__dirname, '../page.tsx'),
  'utf-8'
);

describe('HomePage', () => {
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

  it('renders the hero section', () => {
    render(<HomePage />);
    const heroHeading = screen.getByRole('heading', {
      name: 'Convert typed text into realistic handwriting',
    });
    expect(heroHeading).toBeInTheDocument();

    const highlightedText = within(heroHeading).getByText('realistic handwriting');
    expect(highlightedText.tagName).toBe('SPAN');
    expect(heroHeading).not.toHaveClass('font-bold');
    expect(heroHeading).toHaveClass('font-normal');
    expect(highlightedText).toHaveClass('font-bold');
    expect(highlightedText).toHaveClass('font-[family-name:var(--font-ff-comma)]');
    expect(highlightedText).toHaveClass('text-amber-600');
    expect(heroHeading).toHaveClass('whitespace-normal');
    expect(heroHeading).toHaveClass('lg:whitespace-nowrap');
    expect(heroHeading.querySelectorAll('span')).toHaveLength(1);
    
    const brElement = heroHeading.querySelector('br');
    expect(brElement).toBeInTheDocument();
    expect(brElement).toHaveClass('sm:hidden');
    expect(brElement).toHaveClass('lg:block');

    expect(screen.getByText(/create realistic handwritten pages from typed text/i)).toBeInTheDocument();
    
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

  it('renders the how to use section with responsive spacing and readable instruction cards', () => {
    render(<HomePage />);
    const section = screen.getByRole('heading', { name: /how to use text2ink/i }).closest('section');
    expect(section).toBeInTheDocument();
    expect(section).toHaveClass('mt-10');
    expect(section).toHaveClass('sm:mt-16');
    expect(section).toHaveClass('md:mt-24');

    // Spacing around the header of the section
    const headerWrapper = screen.getByRole('heading', { name: /how to use text2ink/i }).parentElement;
    expect(headerWrapper).toHaveClass('mb-8');
    expect(headerWrapper).toHaveClass('sm:mb-10');
    expect(headerWrapper).toHaveClass('md:mb-12');

    // Instruction cards padding and readability
    const cards = section?.querySelectorAll('.grid > div');
    expect(cards?.length).toBe(6);
    cards?.forEach((card) => {
      // Consistent padding across phone and tablet layouts
      expect(card).toHaveClass('p-5');
      expect(card).toHaveClass('sm:p-6');
      
      // Readable line lengths across breakpoints
      const p = card.querySelector('p');
      expect(p).toHaveClass('max-w-prose');
    });
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
    expect(firstImg).toHaveAttribute('alt', 'Handwriting preview 1');
    expect(firstImg).toHaveAttribute('width', '618');
    expect(firstImg).toHaveAttribute('height', '800');
    expect(firstImg).toHaveAttribute('loading', 'eager');
    expect(firstImg).toHaveAttribute('fetchPriority', 'high');

    // Verify second picture
    const secondPic = pictures[1];
    const secondImg = secondPic.querySelector('img');
    expect(secondImg).toBeInTheDocument();
    expect(secondImg).toHaveAttribute('src', '/Sample-handwriting-preview2.png');
    expect(secondImg).toHaveAttribute('alt', 'Handwriting preview 2');
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

  it('renders the how to use section', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: /how to use text2ink/i })).toBeInTheDocument();
    expect(screen.getByText(/Create a handwritten document by typing your content/i)).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: /open the editor and type/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /choose handwriting/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /set up paper/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /add page details/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /tune realism/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /review and export/i })).toBeInTheDocument();
  });
});
