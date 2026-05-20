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
import { Download, FileImage, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { HandwritingSettings, PageSettings, LineData } from '@/lib/types';
import { renderPageToCanvas } from '@/lib/canvasRenderer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export default function ExportModal({
  isOpen,
  onClose,
  hasContent,
  settings,
  pages,
  isPaginationComplete,
  pageSettingsByPage,
  totalPages,
  currentPageIndex,
  onExportingChange,
  onExportPageIndexChange,
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
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

  // Reset success state when reopening modal
  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setIsExporting(false);
      setExportProgress(null);
      cancelExportRef.current = false;
      setExportError(null);
    }
  }, [isOpen]);

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

  const handleInteractOutside = (e: Event) => {
    if (isExporting) {
      e.preventDefault();
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isExporting) {
      onClose();
    }
  };

  const exportPages = async () => {
    setExportError(null);
    setIsExporting(true);
    setIsSuccess(false);
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

    const canvas = document.createElement('canvas');

    let success = false;
    try {
      const progressTotal = format === 'pdf' ? exportTotal + 1 : exportTotal;
      setExportProgress({ current: 0, total: progressTotal });

      // 300 DPI calculation (2550 / 612 = 4.166...)
      const dpiScale = 4.1666666667;

      if (format === 'pdf') {
        const worker = new Worker(new URL('../workers/pdfWorker.ts', import.meta.url), {
          type: 'module',
        });

        const waitMessage = (type: string) => 
          new Promise<unknown>((resolve, reject) => {
            const handler = (ev: MessageEvent) => {
              if (ev.data.type === type) {
                worker.removeEventListener('message', handler);
                resolve(ev.data.payload);
              } else if (ev.data.type === 'error') {
                worker.removeEventListener('message', handler);
                reject(new Error(ev.data.payload));
              }
            };
            worker.addEventListener('message', handler);
          });

        worker.postMessage({
          type: 'init',
          payload: { orientation: 'portrait', unit: 'pt', format: 'letter' }
        });
        await waitMessage('initialized');

        const pdfWidth = 612;
        const pdfHeight = 792;

        for (let i = 0; i < exportTotal; i++) {
          if (cancelExportRef.current) break;

          setExportProgress({ current: i, total: progressTotal });
          onExportPageIndexChange?.(i);
          
          const pageLines = currentPages[i] || [];
          const pageSettings = pageSettingsByPage[i] || pageSettingsByPage[0];

          await renderPageToCanvas({
            canvas,
            pageIndex: i,
            lines: pageLines,
            pageSettings,
            settings,
            scale: dpiScale,
            fontFamily: resolvedFontFamily,
          });

          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
          if (!blob) throw new Error('Failed to create page image');
          const arrayBuffer = await blob.arrayBuffer();

          worker.postMessage({
            type: 'addPage',
            payload: {
              imgData: arrayBuffer,
              width: pdfWidth,
              height: pdfHeight,
              isFirstPage: i === 0
            }
          }, [arrayBuffer]);

          await new Promise(resolve => setTimeout(resolve, 0));
        }

        if (!cancelExportRef.current) {
          setExportProgress({ current: exportTotal, total: progressTotal });
          worker.postMessage({ type: 'generate' });
          const pdfBuffer = await waitMessage('generated');
          
          const blob = new Blob([pdfBuffer as ArrayBuffer], { type: 'application/pdf' });
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

          await renderPageToCanvas({
            canvas,
            pageIndex: i,
            lines: pageLines,
            pageSettings,
            settings,
            scale: dpiScale,
            fontFamily: resolvedFontFamily,
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
      setExportError(error instanceof Error ? error.message : 'Export failed. Please try again.');
    } finally {
      onExportPageIndexChange?.(null);
      setIsExporting(false);
      setExportProgress(null);
      onExportingChange?.(false);
      if (success) {
        setIsSuccess(true);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-md"
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={handleInteractOutside}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-brand-accent" />
            Export Document
          </DialogTitle>
          <DialogDescription>
            Download your handwritten pages as a single PDF or individual images.
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <CheckCircle2 className="w-12 h-12 text-success" />
            <p className="font-medium text-center">Export completed successfully!</p>
            <Button variant="brand" onClick={onClose} className="mt-4">
              Close
            </Button>
          </div>
        ) : exportError ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <AlertCircle className="w-12 h-12 text-destructive animate-in fade-in zoom-in duration-300" />
            <p className="font-medium text-center text-destructive">Export failed</p>
            <p className="text-sm text-muted-foreground text-center px-4 max-w-sm">
              {exportError}
            </p>
            <div className="flex gap-3 mt-4 w-full justify-center">
              <Button variant="outline" onClick={() => setExportError(null)}>
                Cancel
              </Button>
              <Button variant="brand" onClick={exportPages}>
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="flex flex-col gap-2">
              <Label className="label-text" htmlFor="export-format">Format</Label>
              <Select
                value={format}
                onValueChange={(value) => setFormat(value as ExportFormat)}
                disabled={isExporting}
              >
                <SelectTrigger id="export-format" className="bg-muted border-none h-control-lg text-sm">
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
              variant={hasContent ? 'brand' : 'default'}
              onClick={exportPages}
              disabled={isExporting || !hasContent}
              className={`w-full font-bold transition-all active:scale-95 h-11 ${
                !hasContent ? 'bg-muted text-muted-foreground hover:bg-muted' : 'shadow-sm'
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
              <div className="space-y-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="label-text">
                    {format === 'pdf' && exportProgress.current >= exportProgress.total - 1
                      ? 'Finalizing PDF...'
                      : `Page ${Math.min(exportProgress.total, exportProgress.current + 1)} / ${exportProgress.total}`}
                  </span>
                  <span className="text-label font-bold text-foreground bg-background px-1.5 py-0.5 rounded shadow-sm">
                    {Math.round((exportProgress.current / exportProgress.total) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-brand-accent transition-all duration-300"
                    style={{
                      width: `${Math.round((exportProgress.current / exportProgress.total) * 100)}%`,
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full h-8 text-label font-bold text-destructive hover:text-destructive/80 hover:bg-background/50 uppercase tracking-widest"
                  onClick={() => {
                    cancelExportRef.current = true;
                  }}
                >
                  Cancel Export
                </Button>
              </div>
            )}

            {!hasContent && (
              <p className="text-label font-bold text-brand-accent/60 text-center uppercase tracking-wider">
                Start typing to enable export
              </p>
            )}

            <p className="text-label text-muted-foreground text-center leading-relaxed italic">
              {format === 'pdf'
                ? 'All pages will be combined into a single PDF'
                : 'Each page will be downloaded as a separate image'}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
