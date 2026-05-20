import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StandardPageShell from '../StandardPageShell';

describe('StandardPageShell', () => {
  it('renders header, content, and footer slots', () => {
    render(
      <StandardPageShell
        header={<div data-testid="header-slot">Header</div>}
        content={<div data-testid="content-slot">Content</div>}
        footer={<div data-testid="footer-slot">Footer</div>}
      />
    );

    expect(screen.getByTestId('header-slot')).toBeInTheDocument();
    expect(screen.getByTestId('content-slot')).toBeInTheDocument();
    expect(screen.getByTestId('footer-slot')).toBeInTheDocument();
  });

  it('renders with min-h-screen background wrapper', () => {
    const { container } = render(
      <StandardPageShell
        header={<div>Header</div>}
        content={<div>Content</div>}
        footer={<div>Footer</div>}
      />
    );

    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain('min-h-screen');
    expect(wrapper?.className).toContain('bg-background');
  });

  it('renders header with banner role', () => {
    render(
      <StandardPageShell
        header={<div>Header content</div>}
        content={<div>Content</div>}
        footer={<div>Footer</div>}
      />
    );

    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('renders footer with contentinfo role', () => {
    render(
      <StandardPageShell
        header={<div>Header</div>}
        content={<div>Content</div>}
        footer={<div>Footer content</div>}
      />
    );

    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('does not hardcode page-specific content', () => {
    const { container } = render(
      <StandardPageShell
        header={<span data-testid="custom-header">My Page</span>}
        content={<span data-testid="custom-content">Hello</span>}
        footer={<span data-testid="custom-footer">Bye</span>}
      />
    );

    expect(screen.getByTestId('custom-header')).toHaveTextContent('My Page');
    expect(screen.getByTestId('custom-content')).toHaveTextContent('Hello');
    expect(screen.getByTestId('custom-footer')).toHaveTextContent('Bye');
    // No Text2Ink branding, no InquiryForm, no hardcoded links
    expect(container.textContent).not.toContain('Text2Ink');
    expect(container.textContent).not.toContain('Back to Editor');
  });
});
