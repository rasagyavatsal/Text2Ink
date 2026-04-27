import { describe, expect, it } from 'vitest';
import {
  EDITOR_SIDEBAR_WIDTH,
  getEditorSidebarViews,
  resolveEditorShellLayout,
} from '@/lib/editorShell';

describe('editor shell layout rules', () => {
  it('uses a permanent fixed-width left sidebar on desktop', () => {
    expect(resolveEditorShellLayout({ isMobile: false })).toEqual({
      controlSurface: 'fixed-sidebar',
      sidebarPlacement: 'left',
      sidebarWidth: EDITOR_SIDEBAR_WIDTH,
      sidebarCollapsible: false,
    });
  });

  it('keeps mobile controls in the bottom sheet instead of the desktop sidebar', () => {
    expect(resolveEditorShellLayout({ isMobile: true })).toEqual({
      controlSurface: 'bottom-sheet',
      sidebarPlacement: 'none',
      sidebarWidth: 0,
      sidebarCollapsible: false,
    });
  });

  it('exposes Settings and Export as the only top-level sidebar views', () => {
    expect(getEditorSidebarViews()).toEqual([
      { id: 'settings', label: 'Settings' },
      { id: 'export', label: 'Export' },
    ]);
  });
});
