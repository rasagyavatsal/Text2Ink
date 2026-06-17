import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LegalPage from '../LegalPage';

vi.mock('@/components/patterns/SiteHeader', () => ({
  default: () => <div data-testid="site-header" />,
}));
vi.mock('@/components/patterns/SiteFooter', () => ({
  default: () => <div data-testid="site-footer" />,
}));

describe('LegalPage', () => {
  it('renders table of contents from section list and section content', () => {
    const sections = [
      { id: 'section-1', title: 'Section 1', body: 'Body 1' },
      { id: 'section-2', title: 'Section 2', body: 'Body 2' },
    ];
    render(
      <LegalPage
        title="Test Page"
        intro="Test Intro"
        effectiveDate="Jan 1, 2026"
        sections={sections}
      />
    );

    // Verify sections render properly with IDs
    const heading1 = screen.getByRole('heading', { level: 2, name: 'Section 1' });
    expect(heading1.closest('section')).toHaveAttribute('id', 'section-1');

    // Verify TOC renders
    const nav = screen.getByRole('navigation', { name: /table of contents/i });
    expect(nav).toBeInTheDocument();
    
    const link1 = screen.getByRole('link', { name: 'Section 1' });
    expect(link1).toHaveAttribute('href', '#section-1');

    const link2 = screen.getByRole('link', { name: 'Section 2' });
    expect(link2).toHaveAttribute('href', '#section-2');
  });
});
