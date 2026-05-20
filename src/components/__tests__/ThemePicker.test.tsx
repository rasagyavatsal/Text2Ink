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

  it('renders a single toggle button indicating the current theme', () => {
    render(<ThemePicker />);
    
    // The default mock theme is 'system', so it should show the system toggle
    const button = screen.getByRole('button', { name: /system theme/i });
    expect(button).toBeInTheDocument();
    
    // It should not render other theme buttons
    expect(screen.queryByRole('button', { name: /light theme/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /dark theme/i })).not.toBeInTheDocument();
  });

  it('cycles theme through light -> dark -> system on click', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ThemePicker />);
    
    // Initial mock state has theme 'system'
    const button = screen.getByRole('button', { name: /system theme/i });
    
    // Click 1: system -> light
    await user.click(button);
    expect(setThemeMock).toHaveBeenCalledWith('light');
    
    // Update mock to simulate theme changed to 'light'
    (useTheme as any).mockReturnValue({
      theme: 'light',
      setTheme: setThemeMock,
      themes: ['light', 'dark', 'system'],
    });
    rerender(<ThemePicker />);
    
    // Click 2: light -> dark
    const lightButton = screen.getByRole('button', { name: /light theme/i });
    await user.click(lightButton);
    expect(setThemeMock).toHaveBeenCalledWith('dark');
    
    // Update mock to simulate theme changed to 'dark'
    (useTheme as any).mockReturnValue({
      theme: 'dark',
      setTheme: setThemeMock,
      themes: ['light', 'dark', 'system'],
    });
    rerender(<ThemePicker />);
    
    // Click 3: dark -> system
    const darkButton = screen.getByRole('button', { name: /dark theme/i });
    await user.click(darkButton);
    expect(setThemeMock).toHaveBeenCalledWith('system');
  });
});
