'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, FileImage, FileText, Loader2 } from 'lucide-react';
import { HandwritingSettings, PageSettings, LineData } from '@/lib/types';
import {
  DOM_EXPORT_SCALE,
  capturePageElementToCanvas,
  pageTextFromLines,
  settlePageElementForCapture,
} from '@/lib/domExport';
import { resolvePageLayout } from '@/lib/pageLayout';
import { SectionCard } from '@/components/patterns/EditorPatterns';
import PageContent from './PageContent';

interface ExportPanelProps {
  hasContent: boolean;
  settings: HandwritingSettings;
  pages: LineData[][];
  isPaginationComplete: boolean;
  paginationRevision: number;
  pageSettingsByPage: PageSettings[];
  totalPages: number;
  onExportingChange?: (isExporting: boolean) => void;
  onExportPageIndexChange?: (pageIndex: number | null) => void;
}

type ExportFormat = 'pdf' | 'png' | 'jpg';

type PdfWorkerMessage =
  | { type: 'initialized' }
  | { type: 'pageAdded' }
  | { type: 'generated'; payload: ArrayBuffer }
  | { type: 'error'; payload: string };

const HIDDEN_EXPORT_HOST_STYLE = {
  all: 'initial',
  position: 'fixed',
  left: '-10000px',
  top: '0',
  display: 'block',
  pointerEvents: 'none',
  background: 'transparent',
  border: '0',
  margin: '0',
  padding: '0',
  boxSizing: 'border-box',
} as const;

const FONT_VARIABLES: Record<string, string> = {
  'caveat': '--font-caveat',
  'dancing-script': '--font-dancing-script',
  'indie-flower': '--font-indie-flower',
  'shadows-into-light': '--font-shadows-into-light',
  'kalam': '--font-kalam',
  'patrick-hand': '--font-patrick-hand',
  'architects-daughter': '--font-architects-daughter',
  'satisfy': '--font-satisfy',
  'homemade-apple': '--font-homemade-apple',
  'beth-ellen': '--font-beth-ellen',
  'cedarville-cursive': '--font-cedarville-cursive',
  'dirty-enough': '--font-dirty-enough',
  'kristi': '--font-kristi',
  'rudiment': '--font-rudiment',
  'singlong': '--font-singlong',
  'strings-free': '--font-strings-free',
};

export default function ExportPanel({
  hasContent,
  settings,
  pages,
  isPaginationComplete,
  paginationRevision,
  pageSettingsByPage,
  totalPages,
  onExportingChange,
  onExportPageIndexChange,
}: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(null);
  const [renderedExportPage, setRenderedExportPage] = useState<{
    pageIndex: number;
    pageText: string;
    pageSettings: PageSettings;
    fontFamily: string;
  } | null>(null);
  const cancelExportRef = useRef(false);
  const hiddenPageRef = useRef<HTMLDivElement | null>(null);
  const exportHelperTextId = useId();

  const pagesRef = useRef<LineData[][]>(pages);
  const isPaginationCompleteRef = useRef<boolean>(isPaginationComplete);
  const paginationRevisionRef = useRef<number>(paginationRevision);
  const totalPagesRef = useRef<number>(totalPages);

  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  useEffect(() => {
    isPaginationCompleteRef.current = isPaginationComplete;
  }, [isPaginationComplete]);

  useEffect(() => {
    paginationRevisionRef.current = paginationRevision;
  }, [paginationRevision]);

  useEffect(() => {
    totalPagesRef.current = totalPages;
  }, [totalPages]);

  useEffect(() => {
    return () => {
      cancelExportRef.current = true;
    };
  }, []);

  const getResolvedFontFamily = () => {
    if (settings.fontFamily === 'custom' && settings.customFont) {
      return `"${settings.customFont.family}", cursive`;
    }
    const varName = FONT_VARIABLES[settings.fontFamily];
    if (!varName) return 'cursive';
    if (typeof document === 'undefined' || typeof window === 'undefined') return 'cursive';
    const scope = document.body ?? document.documentElement;
    const value = window.getComputedStyle(scope).getPropertyValue(varName).trim();
    return value || 'cursive';
  };

  const ensureResolvedFontFamilyIsReady = async (resolvedFontFamily: string) => {
    const fonts = document.fonts;
    if (!fonts) return;

    await fonts.ready;
    const loadedFonts = await fonts.load(`${settings.fontSize}px ${resolvedFontFamily}`);
    if (loadedFonts.length === 0) {
      throw new Error(`The export font "${resolvedFontFamily}" could not be loaded.`);
    }
  };

  const exportPages = async () => {
    setIsExporting(true);
    cancelExportRef.current = false;
    setExportErrorMessage(null);
    let exportLockStarted = false;

    const waitForPagination = async (minimumRevision: number) => {
      const start = Date.now();
      const timeout = 10000;
      while (Date.now() - start < timeout) {
        if (
          paginationRevisionRef.current >= minimumRevision &&
          isPaginationCompleteRef.current &&
          pagesRef.current.length >= totalPagesRef.current
        ) {
          return true;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      return false;
    };

    const waitForHiddenPage = async () => {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      const page = hiddenPageRef.current;
      if (!page) {
        throw new Error('Failed to prepare the export page.');
      }

      return page;
    };

    try {
      const resolvedFontFamily = getResolvedFontFamily();
      await ensureResolvedFontFamilyIsReady(resolvedFontFamily);

      const requestedPaginationRevision = onExportPageIndexChange
        ? paginationRevisionRef.current + 1
        : paginationRevisionRef.current;
      onExportPageIndexChange?.(0);

      const paginationSettled = await waitForPagination(requestedPaginationRevision);
      if (!paginationSettled) {
        throw new Error('The document layout did not settle in time for export.');
      }

      const currentPages = pagesRef.current;
      const exportTotal = Math.max(1, currentPages.length);
      onExportingChange?.(true);
      exportLockStarted = true;

      const progressTotal = format === 'pdf' ? exportTotal + 1 : exportTotal;
      setExportProgress({ current: 0, total: progressTotal });

      if (format === 'pdf') {
        const worker = new Worker(new URL('../workers/pdfWorker.ts', import.meta.url), {
          type: 'module',
        });

        const waitMessage = (type: PdfWorkerMessage['type']) =>
          new Promise<PdfWorkerMessage>((resolve, reject) => {
            const handler = (ev: MessageEvent<PdfWorkerMessage>) => {
              if (ev.data.type === type) {
                worker.removeEventListener('message', handler);
                resolve(ev.data);
              } else if (ev.data.type === 'error') {
                worker.removeEventListener('message', handler);
                reject(new Error(ev.data.payload));
              }
            };
            worker.addEventListener('message', handler);
          });

        worker.postMessage({
          type: 'init',
          payload: {
            orientation: settings.pageOrientation,
            unit: 'pt',
            format: [
              resolvePageLayout({
                settings,
                pageSettings: pageSettingsByPage[0],
                pageIndex: 0,
              }).width,
              resolvePageLayout({
                settings,
                pageSettings: pageSettingsByPage[0],
                pageIndex: 0,
              }).height,
            ],
          }
        });
        await waitMessage('initialized');

        for (let i = 0; i < exportTotal; i++) {
          if (cancelExportRef.current) break;

          setExportProgress({ current: i, total: progressTotal });
          onExportPageIndexChange?.(i);
          
          const pageLines = currentPages[i] || [];
          const pageSettings = pageSettingsByPage[i] || pageSettingsByPage[0];
          const layout = resolvePageLayout({ settings, pageSettings, pageIndex: i });
          const pageText = pageTextFromLines(pageLines);
          flushSync(() => {
            setRenderedExportPage({
              pageIndex: i,
              pageText,
              pageSettings,
              fontFamily: resolvedFontFamily,
            });
          });

          const page = await waitForHiddenPage();

          await settlePageElementForCapture(page, {
            fontFamily: resolvedFontFamily,
            fontSize: pageSettings.fontSize,
          });

          const canvas = await capturePageElementToCanvas({
            page,
            width: layout.width,
            height: layout.height,
            scale: DOM_EXPORT_SCALE,
          });

          // Optimization: Use toBlob instead of toDataURL to avoid Base64 overhead
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
          if (!blob) throw new Error('Failed to create page image');
          const arrayBuffer = await blob.arrayBuffer();

          worker.postMessage({
            type: 'addPage',
            payload: {
              imgData: arrayBuffer,
              width: layout.width,
              height: layout.height,
              isFirstPage: i === 0
            }
          }, [arrayBuffer]);

          await new Promise(resolve => setTimeout(resolve, 0));
        }

        if (!cancelExportRef.current) {
          // Final progress step: PDF Generation
          setExportProgress({ current: exportTotal, total: progressTotal });
          worker.postMessage({ type: 'generate' });
          const generatedMessage = await waitMessage('generated');
          if (generatedMessage.type !== 'generated') {
            throw new Error('Unexpected response from PDF worker');
          }
          const pdfBuffer = generatedMessage.payload;
          
          const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'handwritten-document.pdf';
          link.click();
          URL.revokeObjectURL(url);
        }

        worker.postMessage({ type: 'cleanup' });
        worker.terminate();
      } else {
        for (let i = 0; i < exportTotal; i++) {
          if (cancelExportRef.current) break;

          setExportProgress({ current: i, total: progressTotal });
          onExportPageIndexChange?.(i);
          
          const pageLines = currentPages[i] || [];
          const pageSettings = pageSettingsByPage[i] || pageSettingsByPage[0];
          const layout = resolvePageLayout({ settings, pageSettings, pageIndex: i });
          const pageText = pageTextFromLines(pageLines);
          flushSync(() => {
            setRenderedExportPage({
              pageIndex: i,
              pageText,
              pageSettings,
              fontFamily: resolvedFontFamily,
            });
          });

          const page = await waitForHiddenPage();

          await settlePageElementForCapture(page, {
            fontFamily: resolvedFontFamily,
            fontSize: pageSettings.fontSize,
          });

          const canvas = await capturePageElementToCanvas({
            page,
            width: layout.width,
            height: layout.height,
            scale: DOM_EXPORT_SCALE,
          });

          const imgData = canvas.toDataURL(`image/${format === 'jpg' ? 'jpeg' : 'png'}`);
          const link = document.createElement('a');
          link.download = `handwritten-page-${i + 1}.${format}`;
          link.href = imgData;
          link.click();

          setExportProgress({ current: i + 1, total: progressTotal });
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
      setExportErrorMessage(
        error instanceof Error ? error.message : 'Export failed. Please try again.',
      );
    } finally {
      onExportPageIndexChange?.(null);
      flushSync(() => {
        setRenderedExportPage(null);
      });
      setIsExporting(false);
      setExportProgress(null);
      if (exportLockStarted) {
        onExportingChange?.(false);
      }
    }
  };

  return (
    <div className="space-y-4 p-4">
      <SectionCard
        title={(
          <span className="flex items-center gap-2">
            <Download className="h-4 w-4 text-[var(--t2i-brand-primary)]" />
            Export
          </span>
        )}
      >
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-bold text-[var(--t2i-content-muted)] uppercase tracking-widest" htmlFor="export-format">Format</Label>
            <Select
              value={format}
              onValueChange={(value) => setFormat(value as ExportFormat)}
            >
              <SelectTrigger id="export-format" className="bg-[var(--t2i-surface-panel-muted)] border-[var(--t2i-border-subtle)] h-9 text-sm">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    PDF Document
                  </div>
                </SelectItem>
                <SelectItem value="png">
                  <div className="flex items-center gap-2">
                    <FileImage className="w-4 h-4" />
                    PNG Image
                  </div>
                </SelectItem>
                <SelectItem value="jpg">
                  <div className="flex items-center gap-2">
                    <FileImage className="w-4 h-4" />
                    JPG Image
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={exportPages}
            disabled={isExporting || !hasContent}
            aria-describedby={!hasContent ? exportHelperTextId : undefined}
            className={`h-11 w-full border font-bold shadow-none transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-100 ${
              !hasContent
                ? 'border-[var(--t2i-border-default)] bg-[var(--t2i-surface-panel)] text-[var(--t2i-content-muted)] hover:bg-[var(--t2i-surface-panel)]'
                : 'border-transparent bg-[var(--t2i-brand-primary)] text-[var(--t2i-brand-on-primary)] hover:bg-[var(--t2i-brand-hover)]'
            }`}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Export {format.toUpperCase()}
              </>
            )}
          </Button>

          {isExporting && exportProgress && (
            <div className="space-y-4 p-3 bg-[var(--t2i-surface-panel-muted)] rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[var(--t2i-content-muted)] uppercase tracking-widest">
                  {format === 'pdf' && exportProgress.current >= exportProgress.total - 1
                    ? 'Finalizing PDF...'
                    : `Page ${Math.min(exportProgress.total, exportProgress.current + 1)} / ${exportProgress.total}`}
                </span>
                <span className="text-[10px] font-bold text-[var(--t2i-content-normal)] bg-[var(--t2i-surface-panel)] px-1.5 py-0.5 rounded">
                  {Math.round((exportProgress.current / exportProgress.total) * 100)}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[var(--t2i-border-default)] overflow-hidden">
                <div
                  className="h-full bg-[var(--t2i-brand-primary)] transition-all duration-300"
                  style={{
                    width: `${Math.round((exportProgress.current / exportProgress.total) * 100)}%`,
                  }}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                className="w-full h-8 text-[10px] font-bold text-red-500 hover:text-red-600 hover:bg-[var(--t2i-state-hover)] uppercase tracking-widest"
                onClick={() => {
                  cancelExportRef.current = true;
                }}
              >
                Cancel Export
              </Button>
            </div>
          )}

          <p
            id={exportHelperTextId}
            className={`text-center text-[10px] leading-relaxed ${
              !hasContent ? 'text-[var(--t2i-content-muted)]' : 'text-[var(--t2i-content-subtle)]'
            }`}
          >
            {!hasContent
              ? 'Add text in the Preview to export.'
              : format === 'pdf'
                ? 'Single PDF'
                : 'Separate page images'}
          </p>

          {exportErrorMessage && (
            <p role="alert" className="text-center text-[10px] leading-relaxed text-red-500">
              {exportErrorMessage}
            </p>
          )}
        </div>
      </SectionCard>

      <div aria-hidden="true" style={HIDDEN_EXPORT_HOST_STYLE}>
        {renderedExportPage && (
          <div ref={hiddenPageRef} style={{ all: 'initial', display: 'block' }}>
            <PageContent
              mode="export"
              pageIndex={renderedExportPage.pageIndex}
              pageText={renderedExportPage.pageText}
              pageLines={pagesRef.current[renderedExportPage.pageIndex] ?? []}
              pageSettings={renderedExportPage.pageSettings}
              settings={settings}
              fontFamily={renderedExportPage.fontFamily}
              scale={1}
            />
          </div>
        )}
      </div>
    </div>
  );
}
