'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import HandwritingEditor from '@/components/HandwritingEditor';
import SettingsPanel from '@/components/SettingsPanel';
import ExportPanel from '@/components/ExportPanel';
import Version from '@/components/Version';
import './editor.css';

import {
  HandwritingSettings,
  DEFAULT_SETTINGS,
  PageSettings,
  defaultPageSettingsFromHandwritingSettings,
  LineData,
} from '@/lib/types';
import { loadEditorStateV1, saveEditorStateV1 } from '@/lib/editorPersistence';
import { applyPageSettingsToAll } from '@/lib/settingsHelpers';
import { Settings, Download, ChevronLeft, ChevronRight, X, Pencil, LayoutGrid } from 'lucide-react';

const MemoSettingsPanel = React.memo(SettingsPanel);
const MemoExportPanel = React.memo(ExportPanel);

export default function EditorPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [text, setText] = useState('');
  const [settings, setSettings] = useState<HandwritingSettings>(DEFAULT_SETTINGS);
  const [pageSettingsByPage, setPageSettingsByPage] = useState<PageSettings[]>(() => [
    defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS),
  ]);
  const [activePanel, setActivePanel] = useState<'settings' | 'export'>('settings');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [previewScale, setPreviewScale] = useState(1);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [pages, setPages] = useState<LineData[][]>([]);
  const [isPaginationComplete, setIsPaginationComplete] = useState(true);
  const [exportPageIndex, setExportPageIndex] = useState<number | null>(null);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  const hasLoadedFromStorageRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initial scale for mobile
  useEffect(() => {
    if (isMobile && hasLoadedFromStorageRef.current) {
      const padding = 32; // 16px on each side
      const availableWidth = window.innerWidth - padding;
      const scale = Number((availableWidth / 612).toFixed(2));
      setPreviewScale(Math.min(1.2, Math.max(0.4, scale)));
    }
  }, [isMobile]);

  useEffect(() => {
    if (hasLoadedFromStorageRef.current) return;

    const persisted = loadEditorStateV1<HandwritingSettings, PageSettings>();
    if (!persisted) {
      hasLoadedFromStorageRef.current = true;
      return;
    }

    setText(persisted.text);
    setSettings(persisted.settings);
    setPageSettingsByPage(
      persisted.pageSettingsByPage.length > 0
        ? persisted.pageSettingsByPage
        : [defaultPageSettingsFromHandwritingSettings(persisted.settings)]
    );

    setActivePanel(persisted.ui.activePanel);
    setSidebarOpen(persisted.ui.sidebarOpen);
    setPreviewScale(persisted.ui.previewScale);
    setCurrentPageIndex(persisted.ui.currentPageIndex);

    hasLoadedFromStorageRef.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoadedFromStorageRef.current) return;
    if (typeof window === 'undefined') return;

    const save = () => {
      saveEditorStateV1<HandwritingSettings, PageSettings>({
        text,
        settings,
        pageSettingsByPage,
        ui: {
          activePanel,
          sidebarOpen,
          previewScale,
          currentPageIndex,
          editorMode: 'write',
        },
      });
    };

    const timeout = window.setTimeout(save, 400);
    return () => window.clearTimeout(timeout);
  }, [
    activePanel,
    currentPageIndex,
    pageSettingsByPage,
    previewScale,
    settings,
    sidebarOpen,
    text,
  ]);

  useEffect(() => {
    if (!hasLoadedFromStorageRef.current) return;
    if (typeof window === 'undefined') return;

    const handleUnload = () => {
      saveEditorStateV1<HandwritingSettings, PageSettings>({
        text,
        settings,
        pageSettingsByPage,
        ui: {
          activePanel,
          sidebarOpen,
          previewScale,
          currentPageIndex,
          editorMode: 'write',
        },
      });
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [
    activePanel,
    currentPageIndex,
    pageSettingsByPage,
    previewScale,
    settings,
    sidebarOpen,
    text,
  ]);

  const clampPreviewScale = useCallback((value: number) => Math.min(2, Math.max(0.5, value)), []);

  const ensurePageSettingsLength = useCallback(
    (desiredLength: number) => {
      setPageSettingsByPage((prev) => {
        if (prev.length >= desiredLength) return prev;
        const next = [...prev];
        const fallback = next[next.length - 1] ?? defaultPageSettingsFromHandwritingSettings(settings);
        while (next.length < desiredLength) {
          next.push({ ...fallback });
        }
        return next;
      });
    },
    [settings]
  );

  const currentPageSettings = useMemo(
    () => pageSettingsByPage[currentPageIndex] ?? defaultPageSettingsFromHandwritingSettings(settings),
    [currentPageIndex, pageSettingsByPage, settings]
  );

  const applyCurrentPageSettingsToAll = useCallback(() => {
    setPageSettingsByPage((prev) => {
      const defaultSettings = defaultPageSettingsFromHandwritingSettings(settings);
      return applyPageSettingsToAll(prev, currentPageIndex, totalPages, defaultSettings);
    });
  }, [currentPageIndex, settings, totalPages]);

  const handlePageSettingsChange = useCallback(
    (nextPageSettings: PageSettings) => {
      ensurePageSettingsLength(currentPageIndex + 1);
      setPageSettingsByPage((prev) => {
        const next = [...prev];
        while (next.length <= currentPageIndex) {
          next.push(defaultPageSettingsFromHandwritingSettings(settings));
        }
        next[currentPageIndex] = nextPageSettings;
        return next;
      });
    },
    [currentPageIndex, ensurePageSettingsLength, settings]
  );

  const handleClearAll = useCallback(() => {
    if (window.confirm('Are you sure you want to remove all text and text fields from all pages? This action cannot be undone.')) {
      setText('');
      setCurrentPageIndex(0);
      setSettings((prev) => ({ ...prev, textFields: [] }));
      setPageSettingsByPage((prev) => prev.map((ps) => ({ ...ps, textFields: [] })));
    }
  }, [setText, setCurrentPageIndex, setSettings, setPageSettingsByPage]);

  const handlePreviewScaleChange = useCallback(
    (value: number) => setPreviewScale(clampPreviewScale(value)),
    [clampPreviewScale]
  );

  const handleCurrentPageChange = useCallback(
    (nextIndex: number) => {
      ensurePageSettingsLength(nextIndex + 1);
      setCurrentPageIndex(nextIndex);
    },
    [ensurePageSettingsLength]
  );

  const handleTotalPagesChange = useCallback(
    (nextTotalPages: number) => {
      setTotalPages(nextTotalPages);
      ensurePageSettingsLength(nextTotalPages);
    },
    [ensurePageSettingsLength]
  );

  useEffect(() => {
    setPageSettingsByPage((prev) => {
      return prev.map((pageSettings) => ({
        ...pageSettings,
        inkColor: settings.inkColor,
        paperColor: settings.paperColor,
        lineColor: settings.lineColor,
      }));
    });
  }, [settings.inkColor, settings.paperColor, settings.lineColor]);

  const openMobilePanel = (panel: 'settings' | 'export') => {
    setActivePanel(panel);
    setMobilePanelOpen(true);
  };

  if (!mounted) return null;

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden relative">
      {/* Header */}
      <header className="border-b border-gray-200 shrink-0 bg-white">
        <div className="max-w-full mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-bold text-2xl md:text-3xl font-dancing-script hover:opacity-80 transition-opacity">
              <span className="text-[#E0A32A]">Text</span>
              <span className="text-black">2</span>
              <span className="text-[#E0A32A]">Ink</span>
            </Link>
          </div>
          <Link
            href="/"
            className="bg-[#E0A32A] text-white px-3 md:px-5 py-1.5 md:py-2 rounded-lg text-sm md:text-base font-medium hover:bg-[#c99225] transition-colors"
          >
            {isMobile ? 'Home' : 'Back to Home'}
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 bg-gray-100 overflow-hidden relative">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <div
            className={`bg-white border-r border-gray-200 flex flex-col min-h-0 transition-all duration-300 ${sidebarOpen ? 'w-96' : 'w-0'
              } overflow-hidden`}
          >
            {/* Panel Tabs at the Top */}
            <div className="flex border-b border-gray-200 shrink-0">
              <button
                onClick={() => setActivePanel('settings')}
                className={`flex-1 py-4 px-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${activePanel === 'settings'
                  ? 'text-[#E0A32A] border-b-2 border-[#E0A32A] bg-[#E0A32A]/5'
                  : 'text-gray-500 hover:text-[#E0A32A] hover:bg-[#E0A32A]/5'
                  }`}
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button
                onClick={() => setActivePanel('export')}
                className={`flex-1 py-4 px-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all ${activePanel === 'export'
                  ? 'text-[#E0A32A] border-b-2 border-[#E0A32A] bg-[#E0A32A]/5'
                  : 'text-gray-500 hover:text-[#E0A32A] hover:bg-[#E0A32A]/5'
                  }`}
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>

            {/* Panel Content - Scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-white">
              {activePanel === 'settings' ? (
                <MemoSettingsPanel
                  settings={settings}
                  onSettingsChange={setSettings}
                  pageSettings={currentPageSettings}
                  onPageSettingsChange={handlePageSettingsChange}
                  currentPageIndex={currentPageIndex}
                  onApplyToAllPages={applyCurrentPageSettingsToAll}
                  previewScale={previewScale}
                  onPreviewScaleChange={handlePreviewScaleChange}
                  onCurrentPageChange={handleCurrentPageChange}
                  totalPages={totalPages}
                  isPaginationComplete={isPaginationComplete}
                  pages={pages}
                  onClearAll={handleClearAll}
                />
              ) : (
                <MemoExportPanel
                  hasContent={text.trim().length > 0}
                  settings={settings}
                  pages={pages}
                  isPaginationComplete={isPaginationComplete}
                  pageSettingsByPage={pageSettingsByPage}
                  totalPages={totalPages}
                  currentPageIndex={currentPageIndex}
                  onCurrentPageChange={handleCurrentPageChange}
                  onExportingChange={(isExporting) => {
                    if (!isExporting) setExportPageIndex(null);
                  }}
                  onExportPageIndexChange={setExportPageIndex}
                />
              )}
            </div>
            <div className="shrink-0 py-2 px-4 border-t border-gray-100 flex justify-center bg-gray-50/50">
              <Version />
            </div>
          </div>
        )}

        {/* Toggle Sidebar Button (Desktop Only) */}
        {!isMobile && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`fixed top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 rounded-r-xl p-3 shadow-xl hover:shadow-2xl transition-all duration-300 group ${sidebarOpen ? 'left-[384px]' : 'left-0'
              }`}
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-[#E0A32A] transition-colors" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#E0A32A] transition-colors" />
            )}
          </button>
        )}

        {/* Main Content - Editor */}
        <div className={`flex-1 min-h-0 overflow-y-auto overscroll-contain bg-gray-100 pb-20 lg:pb-0`}>
          <div className={`min-h-full flex justify-center ${isMobile ? 'py-4 px-4' : 'py-12 px-6'}`}>
            <HandwritingEditor
              text={text}
              onTextChange={setText}
              settings={settings}
              onSettingsChange={setSettings}
              pageSettingsByPage={pageSettingsByPage}
              onPageSettingsChange={handlePageSettingsChange}
              exportingPageIndex={exportPageIndex}
              previewScale={previewScale}
              onPreviewScaleChange={handlePreviewScaleChange}
              currentPageIndex={currentPageIndex}
              onCurrentPageChange={handleCurrentPageChange}
              onTotalPagesChange={handleTotalPagesChange}
              onPagesChange={setPages}
              onPaginationCompleteChange={setIsPaginationComplete}
              onApplyToAllPages={applyCurrentPageSettingsToAll}
            />
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        {isMobile && (
          <div className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around px-2 z-50">
            <button
              onClick={() => openMobilePanel('settings')}
              className={`flex flex-col items-center gap-1 ${activePanel === 'settings' ? 'text-[#E0A32A]' : 'text-gray-500'}`}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50">
                <Settings className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase">Settings</span>
            </button>
            <button
              onClick={() => openMobilePanel('export')}
              className={`flex flex-col items-center gap-1 ${activePanel === 'export' ? 'text-[#E0A32A]' : 'text-gray-500'}`}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-50">
                <Download className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold uppercase">Export</span>
            </button>
          </div>
        )}

        {/* Mobile Sidebar Panel (Dialog) */}
        {isMobile && (
          <div
            className={`fixed inset-0 z-[60] transition-opacity duration-300 ${mobilePanelOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
          >
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobilePanelOpen(false)} />
            <div
              className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl transition-transform duration-300 ease-out overflow-hidden flex flex-col max-h-[90vh] ${mobilePanelOpen ? 'translate-y-0' : 'translate-y-full'
                }`}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-900">
                  {activePanel === 'settings' ? 'Settings' : 'Export'}
                </h2>
                <button
                  onClick={() => setMobilePanelOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto pb-20">
                {activePanel === 'settings' ? (
                  <MemoSettingsPanel
                    settings={settings}
                    onSettingsChange={setSettings}
                    pageSettings={currentPageSettings}
                    onPageSettingsChange={handlePageSettingsChange}
                    currentPageIndex={currentPageIndex}
                    onApplyToAllPages={applyCurrentPageSettingsToAll}
                    previewScale={previewScale}
                    onPreviewScaleChange={handlePreviewScaleChange}
                    onCurrentPageChange={handleCurrentPageChange}
                    totalPages={totalPages}
                    isPaginationComplete={isPaginationComplete}
                    pages={pages}
                    onClearAll={handleClearAll}
                  />
                ) : (
                  <MemoExportPanel
                    hasContent={text.trim().length > 0}
                    settings={settings}
                    pages={pages}
                    isPaginationComplete={isPaginationComplete}
                    pageSettingsByPage={pageSettingsByPage}
                    totalPages={totalPages}
                    currentPageIndex={currentPageIndex}
                    onCurrentPageChange={handleCurrentPageChange}
                    onExportingChange={(isExporting) => {
                      if (!isExporting) setExportPageIndex(null);
                    }}
                    onExportPageIndexChange={setExportPageIndex}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
