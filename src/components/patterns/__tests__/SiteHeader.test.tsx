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

  it('renders the Contact link by default', () => {
    render(<SiteHeader />);
    
    const contactLink = screen.getByRole('link', { name: /contact/i });
    expect(contactLink).toBeInTheDocument();
    expect(contactLink).toHaveAttribute('href', '/contact');
  });

  it('hides the Contact link when hideContactLink is true', () => {
    render(<SiteHeader hideContactLink />);
    
    expect(screen.queryByRole('link', { name: /contact/i })).not.toBeInTheDocument();
  });

  it('renders the cta slot content', () => {
    render(<SiteHeader cta={<button>Test CTA</button>} />);
    
    expect(screen.getByRole('button', { name: /test cta/i })).toBeInTheDocument();
  });
});
