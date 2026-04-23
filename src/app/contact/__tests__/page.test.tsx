import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ContactPage from '../page';

describe('ContactPage', () => {
  it('renders contact email and a single editor return action', () => {
    render(<ContactPage />);

    expect(screen.getByText(/get in touch/i)).toBeInTheDocument();
    expect(screen.getByText(/rasagyavatsal@outlook.com/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /back to editor/i })).toHaveLength(1);
    expect(screen.getByRole('link', { name: /back to editor/i })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('link', { name: /back to home/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /open editor/i })).not.toBeInTheDocument();
  });
});
