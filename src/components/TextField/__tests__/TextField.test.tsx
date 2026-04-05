import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import TextField from '../TextField';

vi.mock('@/lib/pagination', () => ({
  createMeasure: (_fontFamily: string, fontSize: number) => (text: string) => text.length * fontSize * 0.6,
}));

vi.mock('@/components/ui/popover', async () => {
  const React = await import('react');

  const PopoverContext = React.createContext<{
    open: boolean;
    setOpen: (open: boolean) => void;
  } | null>(null);

  function Popover({
    children,
    open: controlledOpen,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
    const open = controlledOpen ?? uncontrolledOpen;
    const setOpen = onOpenChange ?? setUncontrolledOpen;

    return (
      <PopoverContext.Provider value={{ open, setOpen }}>
        {children}
      </PopoverContext.Provider>
    );
  }

  function PopoverTrigger({
    asChild,
    children,
  }: {
    asChild?: boolean;
    children: React.ReactElement;
  }) {
    const ctx = React.useContext(PopoverContext);

    if (asChild && React.isValidElement(children)) {
      const element = children as React.ReactElement;
      return React.cloneElement(element, {
        onClick: (event: React.MouseEvent) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (element.props as any).onClick?.(event);
          ctx?.setOpen(true);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    }

    return (
      <button type="button" onClick={() => ctx?.setOpen(true)}>
        {children}
      </button>
    );
  }

  function PopoverContent({ children, ...props }: { children: React.ReactNode }) {
    const ctx = React.useContext(PopoverContext);
    if (!ctx?.open) return null;
    return (
      <div data-testid="popover-content" {...props}>
        {children}
      </div>
    );
  }

  function PopoverAnchor(props: React.HTMLAttributes<HTMLDivElement>) {
    return <div data-testid="popover-anchor" {...props} />;
  }

  return {
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverAnchor,
  };
});

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

  beforeEach(() => {
    mockOnUpdate.mockClear();
    mockOnDelete.mockClear();
  });

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

  it.each([
    ['Enter', 'Enter'],
    ['Space', ' '],
  ])('stops %s from bubbling out of the text field', (_label, key) => {
    const parentKeyDown = vi.fn();

    render(
      <div onKeyDown={parentKeyDown}>
        <TextField
          field={mockField}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          scale={scale}
          fontFamily={fontFamily}
          randomness={randomness}
        />
      </div>
    );

    const textarea = screen.getByPlaceholderText('');
    fireEvent.keyDown(textarea, {
      key,
      code: key === 'Enter' ? 'Enter' : 'Space',
    });

    expect(parentKeyDown).not.toHaveBeenCalled();
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

    it('keeps initial size when empty and only shrinks when text is added', async () => {
    const { rerender } = render(
      <TextField
        field={{ ...mockField, text: '', width: 200, height: 50 }}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
        randomness={randomness}
      />
    );

    // Should NOT have called onUpdate to shrink yet because it's empty
    expect(mockOnUpdate).not.toHaveBeenCalled();

    // Now add text
    rerender(
      <TextField
        field={{ ...mockField, text: 'a', width: 200, height: 50 }}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
        randomness={randomness}
      />
    );

    // Now it should call onUpdate to shrink to fit 'a'
    expect(mockOnUpdate).toHaveBeenCalled();
    const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
    expect(lastCall.width).toBeLessThan(200);
    });

    it('expands immediately when font size grows beyond the current box size', async () => {
    const compactField = { ...mockField, width: 150, height: 50, fontSize: 24 };
    const { rerender } = render(
      <TextField
        field={compactField}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
        randomness={randomness}
      />
    );

    mockOnUpdate.mockClear();

    rerender(
      <TextField
        field={{ ...compactField, fontSize: 40 }}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
        randomness={randomness}
      />
    );

    await waitFor(() => {
      const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
      expect(lastCall.width).toBe(276);
      expect(lastCall.height).toBe(60);
    });
  });

  it('shrinks immediately when font size gets smaller', async () => {
    const largerField = { ...mockField, width: 300, height: 200, fontSize: 40 };
    const { rerender } = render(
      <TextField
        field={largerField}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
        randomness={randomness}
      />
    );

    mockOnUpdate.mockClear();

    rerender(
      <TextField
        field={{ ...largerField, fontSize: 24 }}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
        randomness={randomness}
      />
    );

    await waitFor(() => {
      const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
      expect(lastCall.width).toBeCloseTo(170.4, 1);
      expect(lastCall.height).toBeCloseTo(40.8, 1);
    });
  });

  it('keeps the settings popover anchored while font size changes', async () => {
    const rectSpy = vi.spyOn(HTMLButtonElement.prototype, 'getBoundingClientRect').mockReturnValue({
      x: 100,
      y: 200,
      left: 100,
      top: 200,
      right: 116,
      bottom: 216,
      width: 16,
      height: 16,
      toJSON: () => {},
    } as DOMRect);

    const { rerender } = render(
      <TextField
        field={{ ...mockField, width: 150, height: 50, fontSize: 24 }}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
        randomness={randomness}
      />
    );

    fireEvent.click(screen.getByLabelText('Text box settings'));

    const anchor = await screen.findByTestId('popover-anchor');
    expect(anchor).toHaveStyle({ left: '108px', top: '208px' });

    rerender(
      <TextField
        field={{ ...mockField, width: 150, height: 50, fontSize: 40 }}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
        randomness={randomness}
      />
    );

    expect(screen.getByTestId('popover-anchor')).toHaveStyle({ left: '108px', top: '208px' });
    rectSpy.mockRestore();
  });

  it('shows handles when focused', () => {
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
    const container = screen.getByTestId('resize-handles-container');

    // Initially should have opacity-0 and group-hover:opacity-100
    let classes = container.className.split(' ');
    expect(classes).toContain('opacity-0');
    expect(classes).toContain('group-hover:opacity-100');
    expect(classes).not.toContain('opacity-100');

    // Focus the textarea
    fireEvent.focus(textarea);

    // Now it should have opacity-100 and NOT opacity-0
    classes = container.className.split(' ');
    expect(classes).toContain('opacity-100');
    expect(classes).not.toContain('opacity-0');
    expect(classes).not.toContain('group-hover:opacity-100');
  });

  it('shows settings icon when settings are open', async () => {
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
    
    const settingsButton = screen.getByLabelText('Text box settings');
    const settingsContainer = screen.getByTestId('settings-icon-container');

    // Initially hidden
    expect(settingsContainer.className.split(' ')).toContain('opacity-0');

    // Click settings to open popover
    fireEvent.click(settingsButton);

    // Now it should be visible
    expect(settingsContainer.className.split(' ')).toContain('opacity-100');
    expect(settingsContainer.className.split(' ')).not.toContain('opacity-0');
  });
});
