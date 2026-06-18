import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import TermsOfServicePage, { metadata } from '../page';

vi.mock('@/components/ThemePicker', () => ({
  default: () => <div data-testid="theme-picker" />,
}));

const termsPageSource = fs.readFileSync(
  path.resolve(__dirname, '../page.tsx'),
  'utf-8'
);

describe('TermsOfServicePage', () => {
  it('uses the shared LegalPage component', () => {
    expect(termsPageSource).not.toMatch(/StandardPageShell/);
    expect(termsPageSource).toMatch(/LegalPage/);
  });

  it('publishes canonical metadata for the legal route', () => {
    expect(metadata.title).toBe('Terms of Service');
    expect(metadata.alternates?.canonical).toBe('https://text2ink.com/terms-of-service');
  });

  it('renders real terms content inside the shared site chrome', () => {
    render(<TermsOfServicePage />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();

    const header = screen.getByRole('banner');
    expect(within(header).getByText('Text2Ink')).toBeInTheDocument();

    const backLink = screen.getByRole('link', { name: /back to editor/i });
    expect(backLink).toHaveAttribute('href', '/editor');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Terms of Service' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/these terms explain how you may use text2ink/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/effective date: June 16, 2026/i)
    ).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'What Text2Ink does' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your content' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Acceptable use' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Exports and availability' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Changes to these terms' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Contact' })).toBeInTheDocument();

    expect(screen.getAllByRole('navigation', { name: /table of contents/i })[0]).toBeInTheDocument();
    const tocLinks = screen.getAllByRole('link', { name: 'Acceptable use' });
    expect(tocLinks.length).toBe(2);
    expect(tocLinks[0]).toHaveAttribute('href', '#acceptable-use');
    expect(tocLinks[1]).toHaveAttribute('href', '#acceptable-use');

    const sectionHeading = screen.getByRole('heading', { name: 'Acceptable use' });
    expect(sectionHeading.closest('section')).toHaveAttribute('id', 'acceptable-use');

    expect(
      screen.getByRole('link', { name: /privacy policy/i })
    ).toHaveAttribute('href', '/privacy-policy');
  });
});
