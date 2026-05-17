import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ThemePicker from '../ThemePicker';
import { useTheme } from 'next-themes';

vi.mock('next-themes', () => ({
  useTheme: vi.fn(),
}));

describe('ThemePicker', () => {
  const setThemeMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useTheme as any).mockReturnValue({
      theme: 'system',
      setTheme: setThemeMock,
      themes: ['light', 'dark', 'system'],
    });
  });

  it('renders three theme options', () => {
    render(<ThemePicker />);
    
    // It should have options for Light, Dark, System
    expect(screen.getByRole('button', { name: /light/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dark/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /system/i })).toBeInTheDocument();
  });

  it('calls setTheme when an option is clicked', async () => {
    const user = userEvent.setup();
    render(<ThemePicker />);
    
    await user.click(screen.getByRole('button', { name: /dark/i }));
    expect(setThemeMock).toHaveBeenCalledWith('dark');
    
    await user.click(screen.getByRole('button', { name: /light/i }));
    expect(setThemeMock).toHaveBeenCalledWith('light');
    
    await user.click(screen.getByRole('button', { name: /system/i }));
    expect(setThemeMock).toHaveBeenCalledWith('system');
  });
});
