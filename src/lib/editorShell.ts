export type EditorSidebarViewId = 'settings' | 'export';

export type EditorSidebarView = {
  id: EditorSidebarViewId;
  label: string;
};

export type EditorShellLayout = {
  controlSurface: 'fixed-sidebar' | 'bottom-sheet';
  sidebarPlacement: 'left' | 'none';
  sidebarWidth: number;
  sidebarCollapsible: boolean;
};

export const EDITOR_SIDEBAR_WIDTH = 384;

const SIDEBAR_VIEWS: readonly EditorSidebarView[] = [
  { id: 'settings', label: 'Settings' },
  { id: 'export', label: 'Export' },
];

export function getEditorSidebarViews(): EditorSidebarView[] {
  return SIDEBAR_VIEWS.map((view) => ({ ...view }));
}

export function resolveEditorShellLayout({ isMobile }: { isMobile: boolean }): EditorShellLayout {
  if (isMobile) {
    return {
      controlSurface: 'bottom-sheet',
      sidebarPlacement: 'none',
      sidebarWidth: 0,
      sidebarCollapsible: false,
    };
  }

  return {
    controlSurface: 'fixed-sidebar',
    sidebarPlacement: 'left',
    sidebarWidth: EDITOR_SIDEBAR_WIDTH,
    sidebarCollapsible: false,
  };
}
