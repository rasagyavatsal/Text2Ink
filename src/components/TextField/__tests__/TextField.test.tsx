import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, fireEvent, screen, waitFor } from '@testing-library/react';
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

  const focusWithSelection = (
    editor: HTMLElement,
    start: number,
    end: number,
  ) => {
    act(() => {
      fireEvent.focus(editor);
      const selection = window.getSelection()!;
      const range = document.createRange();
      const textNode = editor.firstChild ?? editor.appendChild(document.createTextNode(editor.textContent ?? ''));
      range.setStart(textNode, start);
      range.setEnd(textNode, end);
      selection.removeAllRanges();
      selection.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    });
  };

  function TextFieldHarness({
    initialField,
  }: {
    initialField: typeof mockField;
  }) {
    const [field, setField] = React.useState(initialField);

    return (
      <TextField
        field={field}
        onUpdate={(updates) => setField((current) => ({ ...current, ...updates }))}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
      />
    );
  }

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
    const editor = screen.getByRole('textbox', { name: 'Text Box editor' });
    editor.textContent = 'Updated Text';
    fireEvent.input(editor);
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

  it('renders committed text box lines from app-owned layout when not focused', () => {
    const { container } = render(
      <TextField
        field={{ ...mockField, text: 'abcdefghij', x: 580, width: 30, height: 60, fontSize: 10 }}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
      />
    );

    const committedLines = Array.from(
      container.querySelectorAll<HTMLElement>('[data-text-field-layer="committed-line"]'),
    );

    expect(committedLines.map((line) => line.textContent)).toEqual(['abc', 'def', 'ghi', 'j']);
    expect(committedLines[0]).toHaveStyle({ top: '0px' });
    expect(committedLines[1]).toHaveStyle({ top: '12px' });
    expect(committedLines[2]).toHaveStyle({ top: '24px' });
    expect(committedLines[3]).toHaveStyle({ top: '36px' });
  });

  it('keeps visible text box Document Content in the Preview while the input bridge is focused', () => {
    const { container } = render(
      <TextField
        field={{ ...mockField, text: 'abcdefghij', x: 580, width: 30, height: 60, fontSize: 10 }}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
      />
    );

    const editor = screen.getByRole('textbox', { name: 'Text Box editor' });
    fireEvent.focus(editor);

    const committedLines = Array.from(
      container.querySelectorAll<HTMLElement>('[data-text-field-layer="committed-line"]'),
    );

    expect(committedLines.map((line) => line.textContent)).toEqual(['abc', 'def', 'ghi', 'j']);
    expect(editor).toHaveAttribute('data-text-box-input-bridge', 'true');
    expect(editor).toHaveStyle({ color: 'rgba(0, 0, 0, 0)' });
    expect((editor as HTMLElement).style.caretColor).toBe('transparent');
  });

  it('keeps the text box input bridge underneath parity-rendered content and editing chrome', () => {
    const { container } = render(
      <TextField
        field={{ ...mockField, text: 'abcdefghij', x: 580, width: 30, height: 60, fontSize: 10 }}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
      />
    );

    const editor = screen.getByRole('textbox', { name: 'Text Box editor' });
    fireEvent.focus(editor);

    const committedContent = container.querySelector('[data-text-field-layer="committed-content"]');
    const editingChrome = container.querySelector('[data-text-field-layer="editing-chrome"]');

    expect(editor.compareDocumentPosition(committedContent!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(editor.compareDocumentPosition(editingChrome!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(committedContent).toHaveStyle({ userSelect: 'none' });
  });

  it('matches the input bridge line height to text box layout so selection geometry stays aligned', () => {
    render(
      <TextField
        field={{ ...mockField, text: 'abcdefghij', x: 580, width: 30, height: 60, fontSize: 10 }}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
      />
    );

    const editor = screen.getByRole('textbox', { name: 'Text Box editor' });
    expect(editor).toHaveStyle({ lineHeight: '12px' });
  });

  it('renders a visible text box Caret during collapsed Preview selection', () => {
    const { container } = render(
      <TextField
        field={{ ...mockField, text: 'abcdefghij', x: 580, width: 30, height: 60, fontSize: 10 }}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
      />
    );

    const editor = screen.getByRole('textbox', { name: 'Text Box editor' });
    focusWithSelection(editor, 2, 2);

    expect(container.querySelector('[data-text-field-layer="caret"]')).toBeInTheDocument();
  });

  it('renders text box Selection Highlight in the Preview while excluding native bridge selection paint', () => {
    const { container } = render(
      <TextField
        field={{ ...mockField, text: 'abcdefghij', x: 580, width: 30, height: 60, fontSize: 10 }}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
      />
    );

    const editor = screen.getByRole('textbox', { name: 'Text Box editor' });
    focusWithSelection(editor, 1, 4);

    expect(container.querySelectorAll('[data-text-field-layer="selection-highlight"]').length).toBeGreaterThan(0);
    expect((editor as HTMLElement).style.caretColor).toBe('transparent');
  });

  it('syncs custom Selection Highlight from document selection changes during text box drag selection', () => {
    const { container } = render(
      <TextField
        field={{ ...mockField, text: 'abcdefghij', x: 580, width: 30, height: 60, fontSize: 10 }}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
      />
    );

    const editor = screen.getByRole('textbox', { name: 'Text Box editor' });
    fireEvent.focus(editor);

    act(() => {
      const selection = window.getSelection()!;
      const range = document.createRange();
      const textNode = editor.firstChild!;
      range.setStart(textNode, 1);
      range.setEnd(textNode, 4);
      selection.removeAllRanges();
      selection.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    });

    expect(container.querySelectorAll('[data-text-field-layer="selection-highlight"]').length).toBeGreaterThan(0);
  });

  it('copies multiline text box selections when native range endpoints land on line block elements', () => {
    render(
      <TextField
        field={{ ...mockField, text: 'One\nTwo\nThree', width: 200, height: 100 }}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
      />
    );

    const editor = screen.getByRole('textbox', { name: 'Text Box editor' });
    fireEvent.focus(editor);

    act(() => {
      editor.innerHTML = 'One<div>Two</div><div>Three</div>';
      const [secondLine, thirdLine] = editor.querySelectorAll('div');
      const selection = window.getSelection()!;
      const range = document.createRange();
      range.setStart(secondLine, 0);
      range.setEnd(thirdLine, 1);
      selection.removeAllRanges();
      selection.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    });

    const clipboardData = { setData: vi.fn() };
    fireEvent.copy(editor, { clipboardData });

    expect(clipboardData.setData).toHaveBeenCalledWith('text/plain', 'Two\nThree');
  });

  it('shows in-progress Composition Text in the Preview while the text box input bridge composes', async () => {
    const { container } = render(
      <TextFieldHarness
        initialField={{ ...mockField, text: '', x: 580, width: 30, height: 60, fontSize: 10 }}
      />
    );

    const editor = screen.getByRole('textbox', { name: 'Text Box editor' });
    fireEvent.focus(editor);
    act(() => {
      editor.textContent = 'あ';
      fireEvent.compositionStart(editor);
      fireEvent.compositionUpdate(editor, { data: 'あ' });
      fireEvent.input(editor);
    });

    await waitFor(() => {
      const committedLines = Array.from(
        container.querySelectorAll<HTMLElement>('[data-text-field-layer="committed-line"]'),
      );
      expect(committedLines.map((line) => line.textContent).join('')).toBe('あ');
    });
  });

  it('keeps parity-rendered text box content in sync with undo and redo style input events', async () => {
    const { container } = render(
      <TextFieldHarness
        initialField={{ ...mockField, text: 'hello', width: 200, height: 50 }}
      />
    );

    const editor = screen.getByRole('textbox', { name: 'Text Box editor' });
    fireEvent.focus(editor);
    editor.textContent = 'hello there';
    fireEvent.input(editor, { inputType: 'historyRedo' });

    await waitFor(() => {
      expect(container.querySelector('[data-text-field-layer="committed-content"]')).toHaveTextContent('hello there');
    });

    editor.textContent = 'hello';
    fireEvent.input(editor, { inputType: 'historyUndo' });

    await waitFor(() => {
      expect(container.querySelector('[data-text-field-layer="committed-content"]')).toHaveTextContent('hello');
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

    const editor = screen.getByRole('textbox', { name: 'Text Box editor' });
    fireEvent.keyDown(editor, {
      key,
      code: key === 'Enter' ? 'Enter' : 'Space',
    });

    expect(parentKeyDown).not.toHaveBeenCalled();
  });

  it('disables spellcheck on the input bridge', () => {
    render(
      <TextField
        field={mockField}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        scale={scale}
        fontFamily={fontFamily}
      />
    );
    const editor = screen.getByRole('textbox', { name: 'Text Box editor' });
    expect(editor.getAttribute('spellcheck')).toBe('false');
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

    const editor = screen.getByRole('textbox', { name: 'Text Box editor' });
    fireEvent.focus(editor);
    fireEvent.blur(editor);

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
