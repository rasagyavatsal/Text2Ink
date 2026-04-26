'use client';

import React, { useEffect, useRef, useState } from 'react';
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
import { DOM_EXPORT_SCALE, pageTextFromLines, renderDomPageToCanvas } from '@/lib/domExport';
import { resolvePageLayout } from '@/lib/pageLayout';
import FeedbackDialog from './FeedbackDialog';

interface ExportPanelProps {
  hasContent: boolean;
  settings: HandwritingSettings;
  pages: LineData[][];
  isPaginationComplete: boolean;
  pageSettingsByPage: PageSettings[];
  totalPages: number;
  currentPageIndex: number;
  onCurrentPageChange: (pageIndex: number) => void;
  onExportingChange?: (isExporting: boolean) => void;
  onExportPageIndexChange?: (pageIndex: number | null) => void;
}

type ExportFormat = 'pdf' | 'png' | 'jpg';

type PdfWorkerMessage =
  | { type: 'initialized' }
  | { type: 'pageAdded' }
  | { type: 'generated'; payload: ArrayBuffer }
  | { type: 'error'; payload: string };

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
};

export default function ExportPanel({
  hasContent,
  settings,
  pages,
  isPaginationComplete,
  pageSettingsByPage,
  totalPages,
  currentPageIndex,
  onExportingChange,
  onExportPageIndexChange,
}: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const originalPageIndexRef = useRef<number>(0);
  const cancelExportRef = useRef(false);

  const pagesRef = useRef<LineData[][]>(pages);
  const isPaginationCompleteRef = useRef<boolean>(isPaginationComplete);
  const totalPagesRef = useRef<number>(totalPages);

  useEffect(() => {
    pagesRef.current = pages;
  }, [pages]);

  useEffect(() => {
    isPaginationCompleteRef.current = isPaginationComplete;
  }, [isPaginationComplete]);

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

  const exportPages = async () => {
    setIsExporting(true);
    onExportingChange?.(true);
    cancelExportRef.current = false;
    originalPageIndexRef.current = currentPageIndex;

    // Trigger full pagination in the editor
    onExportPageIndexChange?.(0);
    
    // Wait for pagination to include ALL pages
    const waitForPagination = async () => {
      const start = Date.now();
      const timeout = 10000; // 10s timeout
      while (Date.now() - start < timeout) {
        if (isPaginationCompleteRef.current && pagesRef.current.length >= totalPagesRef.current) {
          return true;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return false;
    };

    await waitForPagination();

    const currentPages = pagesRef.current;
    const exportTotal = Math.max(1, currentPages.length);
    
    const resolvedFontFamily = getResolvedFontFamily();

    // Ensure fonts are loaded
    try {
      await document.fonts.ready;
      await document.fonts.load(`${settings.fontSize}px ${resolvedFontFamily}`);
    } catch (e) {
      console.warn('Failed to verify font loading for export:', e);
    }

    let success = false;
    try {
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

          const canvas = await renderDomPageToCanvas({
            pageIndex: i,
            pageText: pageTextFromLines(pageLines),
            pageSettings,
            settings,
            fontFamily: resolvedFontFamily,
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
          
          success = true;
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

          const canvas = await renderDomPageToCanvas({
            pageIndex: i,
            pageText: pageTextFromLines(pageLines),
            pageSettings,
            settings,
            fontFamily: resolvedFontFamily,
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
        if (!cancelExportRef.current) {
          success = true;
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      onExportPageIndexChange?.(null);
      setIsExporting(false);
      setExportProgress(null);
      onExportingChange?.(false);
      if (success) {
        setIsFeedbackOpen(true);
      }
    }
  };

  return (
    <div className="p-6 space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-5">
          <Download className="w-5 h-5 text-[#E0A32A]" />
          <h3 className="font-semibold text-lg">Export Options</h3>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest" htmlFor="export-format">Format</Label>
            <Select
              value={format}
              onValueChange={(value) => setFormat(value as ExportFormat)}
            >
              <SelectTrigger id="export-format" className="bg-gray-100 border-none h-9 text-sm">
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
            className={`w-full font-bold transition-all active:scale-95 h-11 ${
              !hasContent ? 'bg-gray-100 text-gray-400 hover:bg-gray-100' : 'bg-[#E0A32A] hover:bg-[#c99225] text-white shadow-sm'
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
            <div className="space-y-4 p-3 bg-gray-100 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  {format === 'pdf' && exportProgress.current >= exportProgress.total - 1
                    ? 'Finalizing PDF...'
                    : `Page ${Math.min(exportProgress.total, exportProgress.current + 1)} / ${exportProgress.total}`}
                </span>
                <span className="text-[10px] font-bold text-gray-700 bg-white px-1.5 py-0.5 rounded shadow-sm">
                  {Math.round((exportProgress.current / exportProgress.total) * 100)}%
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full bg-[#E0A32A] transition-all duration-300"
                  style={{
                    width: `${Math.round((exportProgress.current / exportProgress.total) * 100)}%`,
                  }}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                className="w-full h-8 text-[10px] font-bold text-red-500 hover:text-red-600 hover:bg-white/50 uppercase tracking-widest"
                onClick={() => {
                  cancelExportRef.current = true;
                }}
              >
                Cancel Export
              </Button>
            </div>
          )}

          {!hasContent && (
            <p className="text-[10px] font-bold text-amber-600/60 text-center uppercase tracking-wider">
              Start typing to enable export
            </p>
          )}

          <p className="text-[10px] text-gray-400 text-center leading-relaxed italic">
            {format === 'pdf'
              ? 'All pages will be combined into a single PDF'
              : 'Each page will be downloaded as a separate image'}
          </p>
        </div>
      </div>
      <FeedbackDialog 
        isOpen={isFeedbackOpen} 
        onClose={() => setIsFeedbackOpen(false)} 
      />
    </div>
  );
}
