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
  it('uses the shared LegalPage component', () => {
    expect(privacyPageSource).not.toMatch(/StandardPageShell/);
    expect(privacyPageSource).toMatch(/LegalPage/);
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
    expect(within(header).getByText('Text2Ink')).toBeInTheDocument();

    const backLink = screen.getByRole('link', { name: /back to editor/i });
    expect(backLink).toHaveAttribute('href', '/editor');

    expect(
      screen.getByRole('heading', { level: 1, name: /privacy policy/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/this policy explains what information text2ink handles, why it is used/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /what stays in your browser/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /uploads and exports/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /analytics/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /contact inquiries/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /your choices and requests/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole('link', { name: /terms of service/i })
    ).toHaveAttribute('href', '/terms-of-service');
  });
});
