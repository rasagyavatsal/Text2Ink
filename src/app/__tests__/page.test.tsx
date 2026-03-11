import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LandingPage from '../page';

// Mock components that might be complex or use browser APIs
vi.mock('@/components/SamplePreviewGallery', () => ({
  default: () => <div data-testid="sample-gallery" />
}));

describe('LandingPage', () => {
  it('renders main CTA links and sample gallery', () => {
    render(<LandingPage />);
    
    expect(screen.getByText(/transform your text into/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /start writing/i })).toBeInTheDocument();
    expect(screen.getByTestId('sample-gallery')).toBeInTheDocument();
  });
});
