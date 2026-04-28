import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/Version', () => ({
  default: () => <span data-testid="version">1.0.0</span>,
}));

import HomePage, { metadata } from '../page';

describe('Home page', () => {
  it('introduces Text2Ink with a focused headline and a single editor CTA', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { name: /text to handwriting converter/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to editor/i })).toHaveAttribute('href', '/editor');
    expect(screen.getByRole('link', { name: /contact/i })).toHaveAttribute('href', '/contact');
  });

  it('shows two static handwriting previews and the shared site footer', () => {
    render(<HomePage />);

    expect(screen.getByTestId('homepage-preview-gallery')).toHaveClass('grid-cols-1');
    expect(screen.getByTestId('homepage-preview-gallery')).toHaveClass('lg:grid-cols-2');
    expect(screen.getByRole('img', { name: /handwriting preview 1/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /handwriting preview 2/i })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByTestId('version')).toBeInTheDocument();
  });

  it('keeps homepage metadata canonicalized to the root route', () => {
    expect(metadata.alternates?.canonical).toBe('https://text2ink.com/');
    expect(metadata.openGraph?.url).toBe('https://text2ink.com/');
  });
});
