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

  it('renders only the logo image in the brand link without wordmark text', () => {
    render(<SiteFooter />);
    
    // Logo image should be present
    expect(screen.getByRole('img', { name: /text2ink logo/i })).toBeInTheDocument();
    
    // Wordmark text should not be present
    expect(screen.queryByText('Text')).not.toBeInTheDocument();
    expect(screen.queryByText('Ink')).not.toBeInTheDocument();
  });
});
