import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import MobileEditorBottomSheet from '../MobileEditorBottomSheet';

vi.mock('react-modal-sheet', () => ({
  Sheet: Object.assign(
    ({ children }: { children: React.ReactNode }) => <div data-testid="sheet">{children}</div>,
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
  it('uses semantic theme tokens instead of hardcoded colors', () => {
    const { container } = render(
      <MobileEditorBottomSheet
        activePanel="settings"
        anchor="default"
        exportPanel={<div>Export</div>}
        metrics={{
          viewportHeight: 800,
          viewportWidth: 400,
          headerHeight: 60,
          safeAreaBottom: 0,
          minSheetHeight: 100,
          defaultSheetHeight: 400,
          maxSheetHeight: 700,
        }}
        settingsPanel={<div>Settings</div>}
        onActivePanelChange={() => {}}
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
        activePanel="settings"
        anchor="default"
        exportPanel={<div>Export</div>}
        metrics={{
          viewportHeight: 800,
          viewportWidth: 400,
          headerHeight: 60,
          safeAreaBottom: 0,
          minSheetHeight: 100,
          defaultSheetHeight: 400,
          maxSheetHeight: 700,
        }}
        settingsPanel={<div>Settings</div>}
        onActivePanelChange={() => {}}
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

    // Also tabs should have focus visible states
    const tabs = container.querySelectorAll('[role="tab"]');
    tabs.forEach(tab => {
      expect(tab.className).toContain('focus-visible:ring-offset-2');
      expect(tab.className).toContain('focus-visible:ring-offset-background');
      expect(tab.className).toContain('focus-visible:ring-brand-accent');
    });
  });
});
