import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import HomePage from '../page';

// Mock ThemePicker to avoid context issues
vi.mock('@/components/ThemePicker', () => ({
  default: () => <div data-testid="theme-picker" />
}));

describe('Landing Page Shell', () => {
  it('renders the header with Text2Ink, Contact, and Open Editor links', () => {
    render(<HomePage />);
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    
    // Check for logo text
    expect(within(header).getByText('Text')).toBeInTheDocument();
    expect(within(header).getByText('2')).toBeInTheDocument();
    expect(within(header).getByText('Ink')).toBeInTheDocument();

    // Check for Contact link
    const contactLink = screen.getByRole('link', { name: /contact/i });
    expect(contactLink).toBeInTheDocument();
    expect(contactLink).toHaveAttribute('href', '/contact');

    // Check for CTA link
    const ctaLinks = screen.getAllByRole('link', { name: /open editor/i });
    expect(ctaLinks.length).toBeGreaterThan(0);
    expect(ctaLinks[0]).toHaveAttribute('href', '/editor');
    expect(ctaLinks[0]).toHaveAttribute('data-variant', 'brand');
    expect(ctaLinks[0]).toHaveAttribute('data-size', 'sm');
  });

  it('renders the footer with logo and copyright', () => {
    render(<HomePage />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByText(/all rights reserved/i)).toBeInTheDocument();
  });

  it('renders the hero section', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: /text to handwriting converter/i })).toBeInTheDocument();
    expect(screen.getByText(/because life's too short to handwrite assignments/i)).toBeInTheDocument();
    
    // There should be two "Open Editor" links (one in header, one in hero)
    const ctaLinks = screen.getAllByRole('link', { name: /open editor/i });
    expect(ctaLinks.length).toBe(2);
    expect(ctaLinks[1]).toHaveAttribute('href', '/editor');
    expect(ctaLinks[1]).toHaveAttribute('data-variant', 'brand');
    expect(ctaLinks[1]).toHaveAttribute('data-size', 'lg');
  });

  it('renders the preview images with responsive picture sources', () => {
    const { container } = render(<HomePage />);
    const pictures = container.querySelectorAll('picture');
    expect(pictures.length).toBe(2);

    // Verify first picture has sources and img
    const firstPic = pictures[0];
    const firstSources = firstPic.querySelectorAll('source');
    expect(firstSources.length).toBe(2);
    expect(firstSources[0]).toHaveAttribute('type', 'image/avif');
    expect(firstSources[0]).toHaveAttribute('media', '(min-width: 640px)');
    expect(firstSources[0].getAttribute('srcSet')).toContain('Sample-handwriting-preview1.avif');
    expect(firstSources[1]).toHaveAttribute('type', 'image/avif');
    expect(firstSources[1].getAttribute('srcSet')).toContain('Sample-handwriting-preview1-mobile.avif');
    
    const firstImg = firstPic.querySelector('img');
    expect(firstImg).toBeInTheDocument();
    expect(firstImg).toHaveAttribute('src', '/Sample-handwriting-preview1.png');
    expect(firstImg).toHaveAttribute('alt', 'Handwriting preview 1');

    // Verify second picture
    const secondPic = pictures[1];
    const secondImg = secondPic.querySelector('img');
    expect(secondImg).toBeInTheDocument();
    expect(secondImg).toHaveAttribute('src', '/Sample-handwriting-preview2.png');
    expect(secondImg).toHaveAttribute('alt', 'Handwriting preview 2');
  });
});
