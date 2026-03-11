import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ContactPage from '../page';

describe('ContactPage', () => {
  it('renders contact email and navigation links', () => {
    render(<ContactPage />);
    
    expect(screen.getByText(/get in touch/i)).toBeInTheDocument();
    expect(screen.getByText(/rasagyavatsal@outlook.com/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to home/i })).toBeInTheDocument();
  });
});
