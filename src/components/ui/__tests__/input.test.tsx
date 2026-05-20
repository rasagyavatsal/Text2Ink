import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { Input, Textarea } from '../input';

describe('Input component', () => {
  it('renders with token-based control height', () => {
    render(<Input placeholder="Enter name" />);
    const input = screen.getByPlaceholderText('Enter name');
    expect(input.className).toMatch(/h-control-md/);
  });

  it('renders with standard border and focus ring classes', () => {
    render(<Input placeholder="Focus test" />);
    const input = screen.getByPlaceholderText('Focus test');
    expect(input.className).toMatch(/border-input/);
    expect(input.className).toMatch(/focus-visible:ring-ring/);
    expect(input.className).toMatch(/placeholder:text-muted-foreground/);
  });

  it('renders disabled state', () => {
    render(<Input placeholder="Disabled" disabled />);
    const input = screen.getByPlaceholderText('Disabled');
    expect(input).toBeDisabled();
    expect(input.className).toMatch(/disabled:cursor-not-allowed/);
    expect(input.className).toMatch(/disabled:opacity-50/);
  });

  it('merges custom className with base styles', () => {
    render(<Input placeholder="Custom" className="my-custom-class" />);
    const input = screen.getByPlaceholderText('Custom');
    expect(input.className).toContain('my-custom-class');
    expect(input.className).toMatch(/h-control-md/);
  });

  it('sets data-slot="input"', () => {
    render(<Input placeholder="Slot" />);
    const input = screen.getByPlaceholderText('Slot');
    expect(input.getAttribute('data-slot')).toBe('input');
  });

  it('forwards ref to the underlying input element', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} placeholder="Ref" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});

describe('Textarea component', () => {
  it('renders with matching base styles but no fixed height', () => {
    render(<Textarea placeholder="Message" />);
    const textarea = screen.getByPlaceholderText('Message');
    expect(textarea.className).toMatch(/border-input/);
    expect(textarea.className).toMatch(/focus-visible:ring-ring/);
    expect(textarea.className).toMatch(/placeholder:text-muted-foreground/);
    expect(textarea.className).not.toMatch(/h-control-md/);
  });

  it('sets data-slot="textarea"', () => {
    render(<Textarea placeholder="Slot" />);
    const textarea = screen.getByPlaceholderText('Slot');
    expect(textarea.getAttribute('data-slot')).toBe('textarea');
  });

  it('merges custom className', () => {
    render(<Textarea placeholder="Custom" className="min-h-[80px]" />);
    const textarea = screen.getByPlaceholderText('Custom');
    expect(textarea.className).toContain('min-h-[80px]');
  });

  it('forwards ref to the underlying textarea element', () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} placeholder="Ref" />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });
});
