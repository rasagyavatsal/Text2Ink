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
    expect(screen.getByRole('link', { name: /editor/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('combobox', { name: /theme preference/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /contact text2ink/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /rasagyavatsal@outlook.com/i })).toHaveAttribute(
      'href',
      'mailto:rasagyavatsal@outlook.com',
    );
    expect(screen.getByText(/utility inbox/i)).toBeInTheDocument();
  });

  it('keeps contact metadata canonicalized to the utility page', () => {
    expect(metadata.alternates?.canonical).toBe('https://text2ink.com/contact');
  });
});
