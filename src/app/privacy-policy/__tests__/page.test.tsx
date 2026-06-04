import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import PrivacyPolicyPage, { metadata } from '../page';

vi.mock('@/components/ThemePicker', () => ({
  default: () => <div data-testid="theme-picker" />,
}));

const privacyPageSource = fs.readFileSync(
  path.resolve(__dirname, '../page.tsx'),
  'utf-8'
);

describe('PrivacyPolicyPage', () => {
  it('keeps the legal page frame local to the route module', () => {
    expect(privacyPageSource).not.toMatch(/StandardPageShell/);
    expect(privacyPageSource).toMatch(/<header\b/);
    expect(privacyPageSource).toMatch(/<main\b/);
    expect(privacyPageSource).toMatch(/<footer\b/);
  });

  it('publishes canonical metadata for the legal route', () => {
    expect(metadata.title).toBe('Privacy Policy');
    expect(metadata.alternates?.canonical).toBe('https://text2ink.com/privacy-policy');
  });

  it('renders real privacy content inside the shared site chrome', () => {
    render(<PrivacyPolicyPage />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();

    const header = screen.getByRole('banner');
    expect(within(header).getByText('Text')).toBeInTheDocument();
    expect(within(header).getByText('2')).toBeInTheDocument();
    expect(within(header).getByText('Ink')).toBeInTheDocument();

    const backLink = screen.getByRole('link', { name: /back to editor/i });
    expect(backLink).toHaveAttribute('href', '/editor');

    expect(
      screen.getByRole('heading', { level: 1, name: /privacy policy/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/this policy explains what information text2ink collects/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /editor drafts and local storage/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /analytics and product measurement/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /contact form submissions/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/firebase analytics, google analytics, and contentsquare/i)
    ).toBeInTheDocument();

    expect(
      screen.getByRole('link', { name: /terms of service/i })
    ).toHaveAttribute('href', '/terms-of-service');
  });
});
