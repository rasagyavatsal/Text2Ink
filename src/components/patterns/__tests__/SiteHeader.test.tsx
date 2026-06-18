import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SiteHeader from '../SiteHeader';

// Mock ThemePicker
vi.mock('@/components/ThemePicker', () => ({
  default: () => <div data-testid="theme-picker" />
}));

describe('SiteHeader', () => {
  it('renders the Text2Ink logo', () => {
    render(<SiteHeader />);
    
    const logoLink = screen.getByRole('link', { name: /text2ink/i });
    expect(logoLink).toBeInTheDocument();
    expect(logoLink).toHaveAttribute('href', '/');
  });

  it('renders the ThemePicker', () => {
    render(<SiteHeader />);
    
    expect(screen.getByTestId('theme-picker')).toBeInTheDocument();
  });

  it('renders the Contact link by default and hides it on mobile', () => {
    render(<SiteHeader />);
    
    const contactLink = screen.getByRole('link', { name: /contact/i });
    expect(contactLink).toBeInTheDocument();
    expect(contactLink).toHaveAttribute('href', '/contact');
    expect(contactLink).toHaveAttribute('data-size', 'chrome');
    
    // The link wrapper should have the compact behavior classes to hide on mobile
    expect(contactLink).toHaveClass('hidden', 'sm:inline-flex');
  });

  it('hides the Contact link when hideContactLink is true', () => {
    render(<SiteHeader hideContactLink />);
    
    expect(screen.queryByRole('link', { name: /contact/i })).not.toBeInTheDocument();
  });

  it('renders the cta slot content', () => {
    render(<SiteHeader cta={<button>Test CTA</button>} />);
    
    expect(screen.getByRole('button', { name: /test cta/i })).toBeInTheDocument();
  });

  it('applies responsive control height overrides and larger interactive targets for mobile and tablet', () => {
    const { container } = render(<SiteHeader cta={<button className="original-cta">CTA</button>} />);
    
    // Check for responsive CSS variable override on the container
    const headerContainer = container.firstChild;
    expect(headerContainer).toHaveClass('[--control-height-md:2.75rem]');
    expect(headerContainer).toHaveClass('lg:[--control-height-md:2.25rem]');

    // Check for larger brand logo touch target classes
    const brandLink = screen.getByRole('link', { name: /text2ink/i });
    expect(brandLink).toHaveClass('min-h-11');
    expect(brandLink).toHaveClass('py-1');
  });
});

