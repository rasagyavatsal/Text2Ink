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

  const dispatchPointerMove = (clientX: number, clientY: number) => {
    const event = new Event('pointermove') as PointerEvent;
    Object.defineProperties(event, {
      clientX: { value: clientX },
      clientY: { value: clientY },
      pointerId: { value: 1 },
    });
    window.dispatchEvent(event);
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
      />
    );
    expect(screen.getAllByText('Hello World').length).toBeGreaterThan(0);
  });

  it('calls onUpdate when text is changed', () => {
    render(
      <TextField
        field={mockField}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
      />
    );
    const textarea = screen.getByPlaceholderText('');
    fireEvent.change(textarea, { target: { value: 'Updated Text' } });
    expect(mockOnUpdate).toHaveBeenCalledWith(expect.objectContaining({ text: 'Updated Text' }));
  });

  it('does not expose manual resize handles', () => {
    render(
      <TextField
        field={mockField}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
      />
    );

    expect(screen.queryByTestId('handle-se')).not.toBeInTheDocument();
    expect(screen.queryByTestId('handle-w')).not.toBeInTheDocument();
  });

  it('renders tiny move and settings controls', () => {
    render(
      <TextField
        field={mockField}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
      />
    );

    const moveButton = screen.getByLabelText('Move text box');
    const settingsButton = screen.getByLabelText('Text box settings');
    const moveIcon = moveButton.querySelector('svg');
    const settingsIcon = settingsButton.querySelector('svg');

    expect(moveButton).toHaveClass('size-7');
    expect(settingsButton).toHaveClass('size-7');
    expect(moveIcon).toHaveAttribute('width', '10');
    expect(moveIcon).toHaveAttribute('height', '10');
    expect(settingsIcon).toHaveAttribute('width', '10');
    expect(settingsIcon).toHaveAttribute('height', '10');
  });

  it('clamps dragging so the whole text box stays inside the page', async () => {
    render(
      <TextField
        field={{ ...mockField, x: 500, y: 700, width: 120, height: 80 }}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
      />
    );

    fireEvent.pointerDown(screen.getByLabelText('Move text box'), { clientX: 500, clientY: 700, pointerId: 1 });

    await waitFor(() => {
      dispatchPointerMove(700, 900);
      expect(mockOnUpdate).toHaveBeenCalledWith(expect.objectContaining({ x: 492, y: 712 }));
    });
  });

  it('wraps auto-fit text at the available page width', async () => {
    render(
      <TextField
        field={{ ...mockField, text: 'abcdefghij', x: 580, width: 10, height: 10, fontSize: 10 }}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
      />
    );

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(expect.objectContaining({
        width: 30,
        height: 60,
      }));
    });
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

  it('disables spellcheck on the textarea', () => {
    render(
      <TextField
        field={mockField}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
      />
    );
    const textarea = screen.getByPlaceholderText('');
    expect(textarea.getAttribute('spellcheck')).toBe('false');
  });

  it('keeps an empty text box at its placed size without exposing resize handles', async () => {
    const emptyField = { ...mockField, text: '', width: 100, height: 100 };
    render(
      <TextField
        field={emptyField}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
      />
    );

    expect(screen.queryByTestId('handle-se')).not.toBeInTheDocument();
    expect(mockOnUpdate).not.toHaveBeenCalled();
  });

  it('keeps initial size when empty and only shrinks when text is added', async () => {
    const { rerender } = render(
      <TextField
        field={{ ...mockField, text: '', width: 200, height: 50 }}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
      />
    );

    expect(mockOnUpdate).not.toHaveBeenCalled();

    rerender(
      <TextField
        field={{ ...mockField, text: 'a', width: 200, height: 50 }}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
      />
    );

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
      />
    );

    expect(screen.getByTestId('popover-anchor')).toHaveStyle({ left: '108px', top: '208px' });
    rectSpy.mockRestore();
  });

  it('notifies the shell when preview editing starts and ends in a text box', () => {
    const onPreviewEditingChange = vi.fn();
    render(
      <TextField
        field={mockField}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
        onPreviewEditingChange={onPreviewEditingChange}
      />
    );

    const textarea = screen.getByPlaceholderText('');
    fireEvent.focus(textarea);
    fireEvent.blur(textarea);

    expect(onPreviewEditingChange).toHaveBeenNthCalledWith(1, true);
    expect(onPreviewEditingChange).toHaveBeenNthCalledWith(2, false);
  });

  it('does not rewrite stored text-box dimensions when preview zoom changes', () => {
    const stableField = {
      ...mockField,
      text: 'a',
      width: 26.4,
      height: 40.8,
    };
    const { rerender } = render(
      <TextField
        field={stableField}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={1}
        fontFamily={fontFamily}
      />
    );

    mockOnUpdate.mockClear();

    rerender(
      <TextField
        field={stableField}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={2}
        fontFamily={fontFamily}
      />
    );

    expect(mockOnUpdate).not.toHaveBeenCalled();
  });
});
