'use client';

import React from 'react';
import { Download, Settings } from 'lucide-react';
import Version from '@/components/Version';
import { SidebarTabStrip } from '@/components/patterns/EditorPatterns';
import { getEditorSidebarViews, type EditorSidebarViewId, EDITOR_SIDEBAR_WIDTH } from '@/lib/editorShell';

interface DesktopEditorChromeProps {
  activePanel: EditorSidebarViewId;
  exportPanel: React.ReactNode;
  preview: React.ReactNode;
  settingsPanel: React.ReactNode;
  onActivePanelChange: (panel: EditorSidebarViewId) => void;
}

export default function DesktopEditorChrome({
  activePanel,
  exportPanel,
  preview,
  settingsPanel,
  onActivePanelChange,
}: DesktopEditorChromeProps) {
  const sidebarViews = getEditorSidebarViews().map((view) => ({
    ...view,
    icon: view.id === 'settings' ? Settings : Download,
  }));

  return (
    <>
      <aside
        aria-label="Editor tools"
        className="hidden min-h-0 flex-col overflow-hidden border-r border-[var(--t2i-border-default)] bg-[var(--t2i-surface-panel)] xl:flex"
        role="complementary"
        style={{ width: EDITOR_SIDEBAR_WIDTH, flex: `0 0 ${EDITOR_SIDEBAR_WIDTH}px` }}
      >
        <SidebarTabStrip
          activeView={activePanel}
          onViewChange={onActivePanelChange}
          views={sidebarViews}
        />

        <div
          id={`editor-${activePanel}-panel`}
          role="tabpanel"
          aria-labelledby={`editor-${activePanel}-tab`}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[var(--t2i-surface-panel-muted)]"
        >
          {activePanel === 'settings' ? settingsPanel : exportPanel}
        </div>
        <div className="flex shrink-0 justify-center border-t border-[var(--t2i-border-subtle)] bg-[var(--t2i-surface-panel)] px-4 py-2">
          <Version />
        </div>
      </aside>

      {preview}
    </>
  );
}
