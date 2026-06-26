import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PRIVACY_SETTINGS_EVENT } from '@/lib/privacyConsent';
import SiteFooter from '../SiteFooter';

// Mock Version
vi.mock('@/components/Version', () => ({
  default: () => <span data-testid="version">v1.23.4</span>
}));

describe('SiteFooter', () => {
  it('renders the logo image, legal links, copyright text, and version component', () => {
    render(<SiteFooter />);
    
    // Logo
    const logoImg = screen.getByRole('img', { name: /text2ink logo/i });
    expect(logoImg).toBeInTheDocument();
    expect(logoImg).toHaveAttribute('src', '/logo-without-background.avif');
    expect(logoImg).toHaveAttribute('loading', 'lazy');
    expect(logoImg).toHaveAttribute('decoding', 'async');

    // Legal links
    const termsLink = screen.getByRole('link', { name: /terms of service/i });
    expect(termsLink).toBeInTheDocument();
    expect(termsLink).toHaveAttribute('href', '/terms-of-service');

    const privacyLink = screen.getByRole('link', { name: /privacy policy/i });
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink).toHaveAttribute('href', '/privacy-policy');

    const privacySettingsButton = screen.getByRole('button', { name: /privacy settings/i });
    expect(privacySettingsButton).toBeInTheDocument();
    
    // Copyright
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`© ${currentYear} Text2Ink. All rights reserved.`))).toBeInTheDocument();
    
    // Version
    expect(screen.getByTestId('version')).toBeInTheDocument();
  });

  it('renders product navigation links for Open Editor and Contact', () => {
    render(<SiteFooter />);

    const editorLink = screen.getByRole('link', { name: /open editor/i });
    expect(editorLink).toBeInTheDocument();
    expect(editorLink).toHaveAttribute('href', '/editor');

    const contactLink = screen.getByRole('link', { name: /contact/i });
    expect(contactLink).toBeInTheDocument();
    expect(contactLink).toHaveAttribute('href', '/contact');

    // Feature page links should not be present
    expect(screen.queryByRole('link', { name: /handwriting fonts/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /paper styles/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /paper colors/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /realism effects/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /export notes/i })).not.toBeInTheDocument();
  });

  it('renders only the logo image in the brand link without wordmark text', () => {
    render(<SiteFooter />);
    
    // Logo image should be present
    const logoImg = screen.getByRole('img', { name: /text2ink logo/i });
    expect(logoImg).toBeInTheDocument();
    
    // Check sizing classes
    expect(logoImg).toHaveClass('w-14');
    expect(logoImg).toHaveClass('h-14');
    expect(logoImg).toHaveClass('md:w-16');
    expect(logoImg).toHaveClass('md:h-16');
    
    // Wordmark text should not be present
    expect(screen.queryByText('Text')).not.toBeInTheDocument();
    expect(screen.queryByText('Ink')).not.toBeInTheDocument();
  });

  it('has increased tap targets and mobile optimizations', () => {
    render(<SiteFooter />);
    
    const links = screen.getAllByRole('link');
    const navLinks = links.filter(link => {
      const href = link.getAttribute('href');
      return href && href !== '/';
    });

    expect(navLinks.length).toBeGreaterThan(0);
    navLinks.forEach(link => {
      expect(link).toHaveClass('block');
      expect(link).toHaveClass('py-2');
      expect(link).toHaveClass('md:py-1');
    });
  });

  it('dispatches a privacy settings event from the footer control', () => {
    const listener = vi.fn();
    window.addEventListener(PRIVACY_SETTINGS_EVENT, listener);
    render(<SiteFooter />);

    fireEvent.click(screen.getByRole('button', { name: /privacy settings/i }));

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(PRIVACY_SETTINGS_EVENT, listener);
  });
});
