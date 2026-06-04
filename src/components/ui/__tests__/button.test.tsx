import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '../button';

describe('Button brand variants', () => {
  describe('brand variant', () => {
    it('renders with solid brand-accent fill', () => {
      render(<Button variant="brand">Brand CTA</Button>);
      const button = screen.getByRole('button', { name: 'Brand CTA' });
      expect(button.className).toMatch(/bg-brand-accent\b/);
      expect(button.className).toMatch(/text-brand-accent-foreground/);
      expect(button.className).toMatch(/hover:bg-brand-accent-hover/);
    });
  });

  describe('brand-soft variant', () => {
    it('renders with subtle outlined brand-accent', () => {
      render(<Button variant="brand-soft">Brand Soft</Button>);
      const button = screen.getByRole('button', { name: 'Brand Soft' });
      expect(button.className).toMatch(/bg-brand-accent\/5/);
      expect(button.className).toMatch(/border-brand-accent\/20/);
      expect(button.className).toMatch(/text-brand-accent\b/);
      expect(button.className).toMatch(/hover:bg-brand-accent\/10/);
    });
  });

  describe('size composition', () => {
    const sizes = ['sm', 'default', 'lg', 'icon'] as const;

    it.each(sizes)('brand variant renders at size=%s', (size) => {
      render(<Button variant="brand" size={size}>{`brand-${size}`}</Button>);
      const button = screen.getByRole('button', { name: `brand-${size}` });
      expect(button.className).toMatch(/bg-brand-accent\b/);
      expect(button.dataset.size).toBe(size);
    });

    it.each(sizes)('brand-soft variant renders at size=%s', (size) => {
      render(<Button variant="brand-soft" size={size}>{`soft-${size}`}</Button>);
      const button = screen.getByRole('button', { name: `soft-${size}` });
      expect(button.className).toMatch(/bg-brand-accent\/5/);
      expect(button.dataset.size).toBe(size);
    });
  });

  describe('disabled state', () => {
    it('brand variant applies disabled styles', () => {
      render(<Button variant="brand" disabled>Disabled Brand</Button>);
      const button = screen.getByRole('button', { name: 'Disabled Brand' });
      expect(button).toBeDisabled();
      expect(button.className).toMatch(/disabled:pointer-events-none/);
      expect(button.className).toMatch(/disabled:opacity-50/);
    });

    it('brand-soft variant applies disabled styles', () => {
      render(<Button variant="brand-soft" disabled>Disabled Soft</Button>);
      const button = screen.getByRole('button', { name: 'Disabled Soft' });
      expect(button).toBeDisabled();
      expect(button.className).toMatch(/disabled:pointer-events-none/);
      expect(button.className).toMatch(/disabled:opacity-50/);
    });
  });
});
