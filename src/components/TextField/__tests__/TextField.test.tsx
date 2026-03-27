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
});
