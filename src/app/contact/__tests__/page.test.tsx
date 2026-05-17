import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ContactPage from '../page';
import { useTheme } from 'next-themes';

vi.mock('next-themes', () => ({
  useTheme: vi.fn(),
}));

describe('ContactPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useTheme as any).mockReturnValue({
      theme: 'system',
      setTheme: vi.fn(),
      themes: ['light', 'dark', 'system'],
    });
  });

  it('renders contact email and a single editor return action', () => {
    render(<ContactPage />);

    expect(screen.getByText(/get in touch/i)).toBeInTheDocument();
    expect(screen.getByText(/rasagyavatsal@outlook.com/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /back to editor/i })).toHaveLength(1);
    expect(screen.getByRole('link', { name: /back to editor/i })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('link', { name: /back to home/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /open editor/i })).not.toBeInTheDocument();
  });

  it('renders the ThemePicker in the header', () => {
    render(<ContactPage />);
    expect(screen.getByRole('group', { name: /theme preference/i })).toBeInTheDocument();
  });

  it('uses semantic design tokens instead of hardcoded colors', () => {
    const { container } = render(<ContactPage />);
    const html = container.innerHTML;
    
    expect(html).not.toMatch(/bg-white/);
    expect(html).not.toMatch(/bg-gray-/);
    expect(html).not.toMatch(/text-gray-/);
    expect(html).not.toMatch(/text-black/);
    expect(html).not.toMatch(/border-gray-/);
    expect(html).not.toMatch(/#E0A32A/);
    expect(html).not.toMatch(/#c99225/);
  });
});
