import { render, screen } from '@testing-library/react';
import SiteFooter from '../SiteFooter';

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ priority, ...props }: any) => {
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock Version
vi.mock('@/components/Version', () => ({
  default: () => <span data-testid="version">v1.23.4</span>
}));

describe('SiteFooter', () => {
  it('renders the logo image, copyright text, and version component', () => {
    render(<SiteFooter />);
    
    // Logo
    expect(screen.getByRole('img', { name: /text2ink logo/i })).toBeInTheDocument();
    
    // Copyright
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`© ${currentYear} Text2Ink. All rights reserved.`))).toBeInTheDocument();
    
    // Version
    expect(screen.getByTestId('version')).toBeInTheDocument();
  });
});
