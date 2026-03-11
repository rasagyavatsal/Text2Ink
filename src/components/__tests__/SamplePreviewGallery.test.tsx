import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SamplePreviewGallery from '../SamplePreviewGallery';

describe('SamplePreviewGallery', () => {
  it('renders both preview images', () => {
    render(<SamplePreviewGallery />);
    
    // There are 2 samples in SamplePreviewGallery
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThanOrEqual(2);
  });

  it('first image is eager/high priority', () => {
    render(<SamplePreviewGallery />);
    const images = screen.getAllByRole('img');
    expect(images[0]).toHaveAttribute('fetchPriority', 'high');
    expect(images[0]).toHaveAttribute('loading', 'eager');
  });
});
