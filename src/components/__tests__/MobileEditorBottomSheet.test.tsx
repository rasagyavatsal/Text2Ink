import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MobileEditorBottomSheet from '../MobileEditorBottomSheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { CHROME_LAYER_Z_INDEX } from '@/lib/designSystem';

window.HTMLElement.prototype.scrollIntoView = vi.fn();

vi.mock('react-modal-sheet', async () => {
  const React = await import('react');

  const SheetRoot = React.forwardRef<any, React.HTMLAttributes<HTMLDivElement>>(
    ({ children, className, style }, ref) => {
      React.useImperativeHandle(ref, () => ({
        snapTo: vi.fn(),
        height: 0,
        y: { get: () => 0 },
      }));

      return (
        <div data-testid="sheet-root" className={className} style={style}>
          {children}
        </div>
      );
    },
  );
  SheetRoot.displayName = 'Sheet';

  const Sheet = Object.assign(SheetRoot, {
    Container: ({ children, className, style }: React.HTMLAttributes<HTMLDivElement>) => (
      <div data-testid="sheet-container" className={className} style={style}>
        {children}
      </div>
    ),
    Header: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
      <div data-testid="sheet-header" className={className}>
        {children}
      </div>
    ),
    Content: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
      <div data-testid="sheet-content" className={className}>
        {children}
      </div>
    ),
  });

  return { Sheet };
});

describe('MobileEditorBottomSheet', () => {
  it('renders floating surfaces above the control sheet layer', async () => {
    render(
      <MobileEditorBottomSheet
        activePanel="settings"
        anchor="default"
        exportPanel={<div>Export panel</div>}
        metrics={{
          viewportHeight: 844,
          viewportWidth: 390,
          headerHeight: 72,
          minSheetHeight: 48,
          defaultSheetHeight: 320,
          maxSheetHeight: 640,
          minPreviewHeight: 180,
        }}
        settingsPanel={
          <Select defaultOpen defaultValue="a4">
            <SelectTrigger aria-label="Page format">
              <SelectValue placeholder="Page format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a4">A4</SelectItem>
            </SelectContent>
          </Select>
        }
        onActivePanelChange={vi.fn()}
        onAnchorChange={vi.fn()}
        onHandlePress={vi.fn()}
        onHeightChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId('sheet-root')).toHaveStyle({
      zIndex: CHROME_LAYER_Z_INDEX.controlSheet,
    });

    expect(await screen.findAllByText('A4')).toHaveLength(2);
    expect(document.querySelector('[data-slot="select-content"]')).toHaveStyle({
      zIndex: CHROME_LAYER_Z_INDEX.floatingSurface,
    });
  });
});
