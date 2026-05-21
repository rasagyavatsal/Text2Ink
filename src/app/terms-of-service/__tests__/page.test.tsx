import fs from 'fs';
import path from 'path';
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
  it('keeps the legal page frame local to the route module', () => {
    expect(termsPageSource).not.toMatch(/StandardPageShell/);
    expect(termsPageSource).toMatch(/<header\b/);
    expect(termsPageSource).toMatch(/<main\b/);
    expect(termsPageSource).toMatch(/<footer\b/);
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
    expect(within(header).getByText('Text')).toBeInTheDocument();
    expect(within(header).getByText('2')).toBeInTheDocument();
    expect(within(header).getByText('Ink')).toBeInTheDocument();

    const backLink = screen.getByRole('link', { name: /back to editor/i });
    expect(backLink).toHaveAttribute('href', '/editor');

    expect(
      screen.getByRole('heading', { level: 1, name: /terms of service/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/these terms govern your use of text2ink/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /acceptable use/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /exported content and responsibility/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /changes to the service/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('link', { name: /privacy policy/i })
    ).toHaveAttribute('href', '/privacy-policy');
  });
});
