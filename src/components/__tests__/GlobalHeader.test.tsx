import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import GlobalHeader from '@/components/patterns/GlobalHeader';


describe('GlobalHeader', () => {
  it('uses the real logo, compact theme cycle button, and full-width gutter policy', () => {
    render(<GlobalHeader action={{ href: '/contact', label: 'Contact', tone: 'ghost' }} />);

    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /text2ink/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('img', { name: /text2ink logo/i })).toHaveAttribute('src', '/logo-without-background.png');
    expect(screen.queryByText('T2')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /theme preference/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /theme preference: system/i })).toBeInTheDocument();
    expect(screen.getByTestId('global-header-inner')).toHaveClass('max-w-full');
  });
});
