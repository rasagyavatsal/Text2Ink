import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SiteFooter from '../SiteFooter';

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ priority, ...props }: any) => {
    return <img alt="" {...props} />;
  },
}));

// Mock Version
vi.mock('@/components/Version', () => ({
  default: () => <span data-testid="version">v1.23.4</span>
}));

describe('SiteFooter', () => {
  it('renders the logo image, legal links, copyright text, and version component', () => {
    render(<SiteFooter />);
    
    // Logo
    expect(screen.getByRole('img', { name: /text2ink logo/i })).toBeInTheDocument();

    // Legal links
    const termsLink = screen.getByRole('link', { name: /terms of service/i });
    expect(termsLink).toBeInTheDocument();
    expect(termsLink).toHaveAttribute('href', '/terms-of-service');

    const privacyLink = screen.getByRole('link', { name: /privacy policy/i });
    expect(privacyLink).toBeInTheDocument();
    expect(privacyLink).toHaveAttribute('href', '/privacy-policy');
    
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
});

