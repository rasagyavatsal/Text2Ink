import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import TextField from '../TextField';

describe('TextField', () => {
  const mockField = {
    id: 'test-id',
    text: 'Hello World',
    x: 100,
    y: 100,
    width: 200,
    height: 100,
    color: '#000000',
    fontSize: 24,
  };

  const mockOnUpdate = vi.fn();
  const mockOnDelete = vi.fn();
  const scale = 1;
  const fontFamily = 'caveat';
  const randomness = { enabled: true, spacing: 2, baseline: 1, rotation: 0.5 };

  it('renders correctly with initial values', () => {
    render(
      <TextField
        field={mockField}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
        randomness={randomness}
      />
    );
    expect(screen.getByText('Hello World')).toBeDefined();
  });

  it('calls onUpdate when text is changed', () => {
    render(
      <TextField
        field={mockField}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
        randomness={randomness}
      />
    );
    const textarea = screen.getByPlaceholderText('');
    fireEvent.change(textarea, { target: { value: 'Updated Text' } });
    expect(mockOnUpdate).toHaveBeenCalledWith({ text: 'Updated Text' });
  });

  it('handles resizing from south-east corner', () => {
    render(
      <TextField
        field={mockField}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
        randomness={randomness}
      />
    );
    
    const seHandle = screen.getByTestId('handle-se');
    fireEvent.mouseDown(seHandle, { clientX: 300, clientY: 200 });
    
    // Simulate mouse move
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 350,
      clientY: 250,
    });
    window.dispatchEvent(mouseMoveEvent);

    expect(mockOnUpdate).toHaveBeenCalled();
    const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
    expect(lastCall.width).toBeGreaterThan(200);
    expect(lastCall.height).toBeGreaterThan(100);
  });

  it('handles resizing from west side', () => {
    render(
      <TextField
        field={mockField}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
        randomness={randomness}
      />
    );
    
    const wHandle = screen.getByTestId('handle-w');
    fireEvent.mouseDown(wHandle, { clientX: 100, clientY: 150 });
    
    // Drag to the left (increase width, decrease x)
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 50,
      clientY: 150,
    });
    window.dispatchEvent(mouseMoveEvent);

    expect(mockOnUpdate).toHaveBeenCalled();
    const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
    expect(lastCall.width).toBe(250); // 200 + (100 - 50)
    expect(lastCall.x).toBe(50); // 100 - 50
  });

  it('disables spellcheck on the textarea', () => {
    render(
      <TextField
        field={mockField}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
        randomness={randomness}
      />
    );
    const textarea = screen.getByPlaceholderText('');
    expect(textarea.getAttribute('spellcheck')).toBe('false');
  });

  it('does not resize smaller than its content', () => {
    render(
      <TextField
        field={mockField}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
        randomness={randomness}
      />
    );
    
    const eHandle = screen.getByTestId('handle-e');
    // Mouse down at the right edge (x + width = 300)
    fireEvent.mouseDown(eHandle, { clientX: 300, clientY: 150 });
    
    // Drag way to the left to try to make it tiny
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 120, // Try to make width ~20
      clientY: 150,
    });
    window.dispatchEvent(mouseMoveEvent);

    expect(mockOnUpdate).toHaveBeenCalled();
    const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
    
    // Calculate expected minW in test environment:
    // 'Hello World'.length (11) * 10 = 110
    // padding = 12 / 1 = 12
    // minW = Math.max(10, 110 + 12) = 122
    expect(lastCall.width).toBeGreaterThanOrEqual(122);
  });

  it('respects a 10px hard minimum when text is empty', () => {
    const emptyField = { ...mockField, text: '', width: 100, height: 100 };
    render(
      <TextField
        field={emptyField}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
        randomness={randomness}
      />
    );
    
    const seHandle = screen.getByTestId('handle-se');
    fireEvent.mouseDown(seHandle, { clientX: 200, clientY: 200 });
    
    // Resize to almost zero
    const mouseMoveEvent = new MouseEvent('mousemove', {
      clientX: 105,
      clientY: 105,
    });
    window.dispatchEvent(mouseMoveEvent);

    expect(mockOnUpdate).toHaveBeenCalled();
    const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
    
    // minW should be at least 10 + padding (12) = 22
    // Wait, with empty text, textWidth is 0. padding is 12. 
    // Math.max(10, 0 + 12) = 12.
    expect(lastCall.width).toBeGreaterThanOrEqual(12);
    expect(lastCall.height).toBeGreaterThanOrEqual(12);
  });
});
