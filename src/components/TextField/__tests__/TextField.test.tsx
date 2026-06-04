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
      const element = children as React.ReactElement<{ onClick?: (event: React.MouseEvent<Element>) => void }>;
      return React.cloneElement(element, {
        onClick: (event: React.MouseEvent<Element>) => {
          element.props.onClick?.(event);
          ctx?.setOpen(true);
        },
      });
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

  const dispatchPointerMove = (clientX: number, clientY: number) => {
    const event = new Event('pointermove') as PointerEvent;
    Object.defineProperties(event, {
      clientX: { value: clientX },
      clientY: { value: clientY },
      pointerId: { value: 1 },
    });
    globalThis.dispatchEvent(event);
  };

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

  it('handles resizing from south-east corner', async () => {
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
    
    mockOnUpdate.mockClear();
    const seHandle = screen.getByTestId('handle-se');
    fireEvent.pointerDown(seHandle, { clientX: 300, clientY: 200, pointerId: 1 });
    
    await waitFor(() => {
      dispatchPointerMove(350, 250);
      expect(mockOnUpdate).toHaveBeenCalled();
    });
    const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
    expect(lastCall.width).toBeGreaterThan(200);
    expect(lastCall.height).toBeGreaterThan(100);
  });

  it('handles resizing from west side', async () => {
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
    
    mockOnUpdate.mockClear();
    const wHandle = screen.getByTestId('handle-w');
    fireEvent.pointerDown(wHandle, { clientX: 100, clientY: 150, pointerId: 1 });
    
    // Drag to the left (increase width, decrease x)
    await waitFor(() => {
      dispatchPointerMove(50, 150);
      expect(mockOnUpdate).toHaveBeenCalled();
    });
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

  it('does not resize smaller than its content', async () => {
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
    
    mockOnUpdate.mockClear();
    const eHandle = screen.getByTestId('handle-e');
    fireEvent.pointerDown(eHandle, { clientX: 300, clientY: 150, pointerId: 1 });
    
    // Drag way to the left to try to make it tiny
    await waitFor(() => {
      dispatchPointerMove(120, 150);
      expect(mockOnUpdate).toHaveBeenCalled();
    });
    const lastCall = mockOnUpdate.mock.calls[mockOnUpdate.mock.calls.length - 1][0];
    
    // Calculate expected minW in test environment:
    // 'Hello World'.length (11) * 10 = 110
    // padding = 12 / 1 = 12
    // minW = Math.max(10, 110 + 12) = 122
    expect(lastCall.width).toBeGreaterThanOrEqual(122);
  });

  it('respects a 10px hard minimum when text is empty', async () => {
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
    
    mockOnUpdate.mockClear();
    const seHandle = screen.getByTestId('handle-se');
    fireEvent.pointerDown(seHandle, { clientX: 200, clientY: 200, pointerId: 1 });
    
    // Resize to almost zero
    await waitFor(() => {
      dispatchPointerMove(105, 105);
      expect(mockOnUpdate).toHaveBeenCalled();
    });
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
    });

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

  it('notifies the shell when text box typing starts', () => {
    const onTypingFocus = vi.fn();
    render(
      <TextField
        field={mockField}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
        randomness={randomness}
        onTypingFocus={onTypingFocus}
      />
    );

    fireEvent.focus(screen.getByPlaceholderText(''));

    expect(onTypingFocus).toHaveBeenCalled();
  });

  it('uses semantic tokens for text-field chrome instead of hardcoded colors', () => {
    const { container } = render(
      <TextField
        field={mockField}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
        randomness={randomness}
      />
    );
    
    // Unselected state
    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv.className).not.toContain('border-gray-');
    expect(rootDiv.className).not.toContain('border-[#E0A32A]');
    // Unselected uses border-border or similar
    // Actually, we just test that it doesn't have hardcoded colors
    
    // Select to reveal more controls
    fireEvent.pointerDown(rootDiv);

    // Selected state should use brand-accent
    expect(rootDiv.className).toContain('border-brand-accent');

    // Handles should not have hardcoded white or gray
    const neHandle = screen.getByTestId('handle-ne').firstElementChild as HTMLElement;
    expect(neHandle.className).not.toContain('bg-white');
    expect(neHandle.className).not.toContain('border-gray-');
    expect(neHandle.className).toContain('bg-background');

    // Hover hit areas should not use blue
    const nHandle = screen.getByTestId('handle-n');
    expect(nHandle.className).not.toContain('bg-blue-');
  });

  it('uses canonical label-text utility for form labels', () => {
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
    
    // Open settings
    const settingsButton = screen.getByRole('button', { name: /text box settings/i });
    fireEvent.click(settingsButton);
    
    // Check labels inside settings popover
    const fontSizeLabel = screen.getByText('Font Size');
    const textColorLabel = screen.getByText('Text Color');
    
    expect(fontSizeLabel.className).toContain('label-text');
    expect(textColorLabel.className).toContain('label-text');
    expect(fontSizeLabel.className).not.toContain('text-label font-bold text-muted-foreground uppercase tracking-widest');
  });
});
