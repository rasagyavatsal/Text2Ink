import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Slider } from '../slider';

describe('Slider', () => {
  it('keeps the thumb above the track without a pointer hover halo', () => {
    render(<Slider aria-label="Ink pressure" value={[40]} min={0} max={100} />);

    const thumb = screen.getByRole('slider', { name: 'Ink pressure' });
    const slider = thumb.closest('[data-slot="slider"]');
    const track = slider?.querySelector('[data-slot="slider-track"]');
    const sliderClasses = slider?.className.split(/\s+/) ?? [];
    const thumbClasses = thumb.className.split(/\s+/);

    expect(sliderClasses).toContain('isolate');
    expect(track?.className.split(/\s+/)).toContain('z-0');
    expect(thumbClasses).toContain('z-20');
    expect(thumbClasses).toContain('size-icon-md');
    expect(thumbClasses).toContain('border-primary');
    expect(thumbClasses).toContain('bg-background');
    expect(thumbClasses).not.toContain('bg-transparent');
    expect(thumbClasses).toContain('before:size-11');
    expect(thumbClasses).toContain('before:bg-transparent');
    expect(thumbClasses).not.toContain('hover:ring-4');
    expect(thumbClasses).toContain('focus-visible:ring-2');
    expect(thumbClasses).not.toContain('focus-visible:ring-4');
  });
});
