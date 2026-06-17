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
      screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/this policy explains what information text2ink handles, why it is used, and what choices you have/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/effective date: June 16, 2026/i)
    ).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'What stays in your browser' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Uploads and exports' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Analytics' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Contact inquiries' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your choices and requests' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Contact' })).toBeInTheDocument();

    expect(screen.getByRole('navigation', { name: /table of contents/i })).toBeInTheDocument();
    const tocLink = screen.getByRole('link', { name: 'Uploads and exports' });
    expect(tocLink).toHaveAttribute('href', '#uploads-and-exports');

    const sectionHeading = screen.getByRole('heading', { name: 'Uploads and exports' });
    expect(sectionHeading.closest('section')).toHaveAttribute('id', 'uploads-and-exports');

    expect(
      screen.getByRole('link', { name: /terms of service/i })
    ).toHaveAttribute('href', '/terms-of-service');
  });
});
