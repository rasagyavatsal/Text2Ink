import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import MobileEditorBottomSheet from '../MobileEditorBottomSheet';
import { createMobileSheetSnapPoints, getMobileSheetAnchorSnapIndex } from '@/lib/mobileEditorSheet';

const { sheetMock } = vi.hoisted(() => ({
  sheetMock: vi.fn(({ children }: any) => children),
}));

vi.mock('react-modal-sheet', () => ({
  Sheet: Object.assign(
    sheetMock,
    {
      Container: ({ children, className }: any) => <div className={className}>{children}</div>,
      Header: ({ children, className }: any) => <div className={className}>{children}</div>,
      Content: ({ children, className }: any) => <div className={className}>{children}</div>,
    }
  ),
}));

vi.mock('@/components/Version', () => ({
  default: () => <span>Version</span>,
}));

describe('MobileEditorBottomSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses semantic theme tokens instead of hardcoded colors', () => {
    const { container } = render(
      <MobileEditorBottomSheet
        anchor="default"
        metrics={{
          viewportHeight: 800,
          viewportWidth: 400,
          headerHeight: 60,
          minSheetHeight: 100,
          defaultSheetHeight: 400,
          maxSheetHeight: 700,
          minPreviewHeight: 200,
        }}
        settingsPanel={<div>Settings</div>}
        onAnchorChange={() => {}}
        onHandlePress={() => {}}
        onHeightChange={() => {}}
      />
    );
    
    const html = container.innerHTML;
    
    // Forbidden hardcoded classes
    expect(html).not.toMatch(/bg-white/);
    expect(html).not.toMatch(/bg-gray-100/);
    expect(html).not.toMatch(/bg-gray-200/);
    expect(html).not.toMatch(/bg-gray-300/);
    expect(html).not.toMatch(/bg-gray-50\/70/);
    expect(html).not.toMatch(/border-gray-200/);
    expect(html).not.toMatch(/border-gray-100/);
    expect(html).not.toMatch(/text-gray-500/);
    expect(html).not.toMatch(/text-\[#E0A32A\]/);
    expect(html).not.toMatch(/border-\[#E0A32A\]/);
    expect(html).not.toMatch(/bg-\[#E0A32A\]\/5/);
    expect(html).not.toMatch(/ring-\[#E0A32A\]/);
  });

  it('uses theme-adaptive ring offset backgrounds for focus states', () => {
    const { container } = render(
      <MobileEditorBottomSheet
        anchor="default"
        metrics={{
          viewportHeight: 800,
          viewportWidth: 400,
          headerHeight: 60,
          minSheetHeight: 100,
          defaultSheetHeight: 400,
          maxSheetHeight: 700,
          minPreviewHeight: 200,
        }}
        settingsPanel={<div>Settings</div>}
        onAnchorChange={() => {}}
        onHandlePress={() => {}}
        onHeightChange={() => {}}
      />
    );
    
    // Any element with focus-visible:ring-offset-2 should also have focus-visible:ring-offset-background
    const buttons = container.querySelectorAll('button');
    buttons.forEach(button => {
      if (button.className.includes('focus-visible:ring-offset-2')) {
        expect(button.className).toContain('focus-visible:ring-offset-background');
      }
    });
  });

  it('starts at the peek anchor instead of the default anchor', async () => {
    const onHeightChange = vi.fn();
    const metrics = {
      viewportHeight: 800,
      viewportWidth: 400,
      headerHeight: 60,
      minSheetHeight: 100,
      defaultSheetHeight: 400,
      maxSheetHeight: 700,
      minPreviewHeight: 200,
    };

    render(
      <MobileEditorBottomSheet
        anchor="peek"
        metrics={metrics}
        settingsPanel={<div>Settings</div>}
        onAnchorChange={() => {}}
        onHandlePress={() => {}}
        onHeightChange={onHeightChange}
      />
    );

    const sheetProps = sheetMock.mock.calls[0]?.[0];
    const snapPoints = createMobileSheetSnapPoints(metrics);

    expect(sheetProps.initialSnap).toBe(getMobileSheetAnchorSnapIndex('peek', snapPoints, metrics));

    await waitFor(() => {
      expect(onHeightChange).toHaveBeenCalledWith(metrics.minSheetHeight);
    });
    expect(onHeightChange).not.toHaveBeenCalledWith(metrics.defaultSheetHeight);
  });
});
