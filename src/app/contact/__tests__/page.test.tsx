import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ContactPage, { metadata } from '../page';

vi.mock('@/components/Version', () => ({
  default: () => <span data-testid="version">1.0.0</span>,
}));

describe('Contact page', () => {
  it('uses the shared product navigation and a lightweight utility layout', () => {
    render(<ContactPage />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /text2ink/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /editor/i })).toHaveAttribute('href', '/editor');
    expect(screen.queryByRole('combobox', { name: /theme preference/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /theme preference: system/i })).toBeInTheDocument();
    expect(screen.getByTestId('global-header-inner')).toHaveClass('max-w-full');
    expect(screen.getByRole('heading', { name: /contact text2ink/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /rasagyavatsal@outlook.com/i })).toHaveAttribute(
      'href',
      'mailto:rasagyavatsal@outlook.com',
    );
    expect(screen.queryByText(/utility inbox/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/bug reports/i)).not.toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByTestId('version')).toBeInTheDocument();
  });

  it('keeps contact metadata canonicalized to the utility page', () => {
    expect(metadata.alternates?.canonical).toBe('https://text2ink.com/contact');
  });
});
