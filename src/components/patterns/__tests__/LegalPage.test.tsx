import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LegalPage from '../LegalPage';

vi.mock('@/components/patterns/SiteHeader', () => ({
  default: () => <div data-testid="site-header" />,
}));
vi.mock('@/components/patterns/SiteFooter', () => ({
  default: () => <div data-testid="site-footer" />,
}));

const legalPageSource = fs.readFileSync(
  path.resolve(__dirname, '../LegalPage.tsx'),
  'utf-8'
);

describe('LegalPage', () => {
  it('renders table of contents from section list and section content', () => {
    const sections = [
      { id: 'section-1', title: 'Section 1', body: 'Body 1' },
      { id: 'section-2', title: 'Section 2', body: 'Body 2' },
    ];
    render(
      <LegalPage
        title="Test Page"
        path="/test-page"
        intro="Test Intro"
        effectiveDate="Jan 1, 2026"
        sections={sections}
      />
    );

    // Verify sections render properly with IDs
    const heading1 = screen.getByRole('heading', { level: 2, name: 'Section 1' });
    expect(heading1.closest('section')).toHaveAttribute('id', 'section-1');

    // Verify TOC renders (both desktop and mobile)
    const navs = screen.getAllByRole('navigation', { name: /table of contents/i });
    expect(navs.length).toBe(2);
    
    const links1 = screen.getAllByRole('link', { name: 'Section 1' });
    expect(links1.length).toBe(2);
    expect(links1[0]).toHaveAttribute('href', '#section-1');
    expect(links1[1]).toHaveAttribute('href', '#section-1');

    const links2 = screen.getAllByRole('link', { name: 'Section 2' });
    expect(links2.length).toBe(2);
    expect(links2[0]).toHaveAttribute('href', '#section-2');
    expect(links2[1]).toHaveAttribute('href', '#section-2');
  });

  it('renders a mobile/tablet TOC with compact layout and larger tap targets', () => {
    const sections = [
      { id: 'section-1', title: 'Section 1', body: 'Body 1' },
    ];
    render(
      <LegalPage
        title="Test Page"
        path="/test-page"
        intro="Test Intro"
        effectiveDate="Jan 1, 2026"
        sections={sections}
      />
    );

    // Verify desktop TOC container is hidden on small screens
    const navs = screen.getAllByRole('navigation', { name: /table of contents/i });
    const desktopAside = navs[0].closest('aside');
    expect(desktopAside).toHaveClass('hidden');
    expect(desktopAside).toHaveClass('lg:block');

    // Verify mobile TOC is hidden on desktop screens
    const mobileNav = navs[1];
    expect(mobileNav).toHaveClass('lg:hidden');

    // Verify mobile TOC links have increased tap targets for mobile use
    const mobileLink = mobileNav.querySelector('a');
    expect(mobileLink).toHaveClass('min-h-[44px]');
  });

  it('renders section bodies with blank-line breaks as separate paragraphs', () => {
    const sections = [
      { id: 'sec-1', title: 'Sec 1', body: 'Paragraph 1.\n\nParagraph 2.' },
    ];
    render(
      <LegalPage
        title="Test"
        path="/test"
        intro="Intro"
        effectiveDate="Jan 1, 2026"
        sections={sections}
      />
    );
    const section = screen.getByRole('heading', { level: 2, name: 'Sec 1' }).closest('section');
    expect(section).toBeInTheDocument();
    
    // Find all paragraphs in this section
    const paragraphs = section?.querySelectorAll('p');
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs?.[0]).toHaveTextContent('Paragraph 1.');
    expect(paragraphs?.[1]).toHaveTextContent('Paragraph 2.');
  });

  it('uses px-public-gutter', () => {
    expect(legalPageSource).toMatch(/px-public-gutter/);
  });

  it('no longer uses the old max-w-4xl legal body wrapper', () => {
    expect(legalPageSource).not.toMatch(/max-w-4xl/);
  });

  it('centers the TOC/content group with a max-w-document container', () => {
    expect(legalPageSource).toMatch(/max-w-document/);
    expect(legalPageSource).toMatch(/mx-auto/);
  });
});
