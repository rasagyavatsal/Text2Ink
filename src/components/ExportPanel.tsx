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
import { HandwritingSettings } from '@/lib/types';
import {
  shouldNormalizeColor,
  normalizeCanvasColor,
  waitForPages,
  waitForPageRef,
  waitForPageIndex,
  getInlinedFontCSS,
} from '@/lib/exportHelpers';
import FeedbackDialog from './FeedbackDialog';

interface ExportPanelProps {
  pageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  hasContent: boolean;
  settings: HandwritingSettings;
  totalPages: number;
  currentPageIndex: number;
  onCurrentPageChange: (pageIndex: number) => void;
  onExportingChange?: (isExporting: boolean) => void;
  onExportPageIndexChange?: (pageIndex: number | null) => void;
}

type ExportFormat = 'pdf' | 'png' | 'jpg';

export default function ExportPanel({
  pageRefs,
  hasContent,
  settings,
  totalPages,
  currentPageIndex,
  onCurrentPageChange,
  onExportingChange,
  onExportPageIndexChange,
}: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<{ current: number; total: number } | null>(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const originalPageIndexRef = useRef<number>(0);
  const currentPageIndexRef = useRef<number>(currentPageIndex);
  const cancelExportRef = useRef(false);

  useEffect(() => {
    currentPageIndexRef.current = currentPageIndex;
  }, [currentPageIndex]);

  useEffect(() => {
    return () => {
      cancelExportRef.current = true;
    };
  }, []);

  const sanitizeCloneColors = (documentClone: Document, elementClone: HTMLElement) => {
    const win = documentClone.defaultView;
    if (!win) return;

    const elements = [elementClone, ...Array.from(elementClone.querySelectorAll('*'))];

    for (const el of elements) {
      if (!(el instanceof win.HTMLElement)) continue;
      const cs = win.getComputedStyle(el);

      const setSafeColor = (prop: string, value: string, fallback: string) => {
        if (!value || !shouldNormalizeColor(value)) return;
        const normalized = normalizeCanvasColor(documentClone, value);
        el.style.setProperty(prop, normalized ?? fallback, 'important');
      };

      const setSafeValue = (prop: string, value: string, fallback: string) => {
        if (!value || !shouldNormalizeColor(value)) return;
        el.style.setProperty(prop, fallback, 'important');
      };

      setSafeColor('background-color', cs.backgroundColor, 'rgba(0, 0, 0, 0)');
      setSafeColor('color', cs.color, 'rgb(0, 0, 0)');

      // Preserve text-shadow and filter for ink effects if safe
      if (cs.textShadow && !shouldNormalizeColor(cs.textShadow)) {
        el.style.textShadow = cs.textShadow;
      }
      if (cs.filter && !shouldNormalizeColor(cs.filter)) {
        el.style.filter = cs.filter;
      }

      setSafeColor('border-top-color', cs.borderTopColor, 'rgba(0, 0, 0, 0)');
      setSafeColor('border-right-color', cs.borderRightColor, 'rgba(0, 0, 0, 0)');
      setSafeColor('border-bottom-color', cs.borderBottomColor, 'rgba(0, 0, 0, 0)');
      setSafeColor('border-left-color', cs.borderLeftColor, 'rgba(0, 0, 0, 0)');
      setSafeColor('outline-color', cs.outlineColor, 'rgba(0, 0, 0, 0)');
      setSafeColor(
        'text-decoration-color',
        cs.textDecorationColor,
        'rgba(0, 0, 0, 0)'
      );
      setSafeColor('caret-color', cs.caretColor, 'rgb(0, 0, 0)');

      setSafeValue('box-shadow', cs.boxShadow, 'none');
      setSafeValue('text-shadow', cs.textShadow, 'none');
      setSafeValue('background-image', cs.backgroundImage, 'none');
      setSafeValue('filter', cs.filter, 'none');
      setSafeValue('backdrop-filter', (cs as CSSStyleDeclaration).getPropertyValue('backdrop-filter'), 'none');

      for (let i = 0; i < cs.length; i++) {
        const prop = cs.item(i);
        const value = cs.getPropertyValue(prop);
        if (!value || !shouldNormalizeColor(value)) continue;

        const lowerProp = prop.toLowerCase();
        if (lowerProp === 'color') {
          setSafeColor(prop, value, 'rgb(0, 0, 0)');
          continue;
        }

        if (lowerProp.endsWith('color') || lowerProp.includes('color')) {
          setSafeColor(prop, value, 'rgba(0, 0, 0, 0)');
          continue;
        }

        if (lowerProp.includes('shadow')) {
          el.style.setProperty(prop, 'none', 'important');
          continue;
        }

        if (lowerProp === 'background' || lowerProp.startsWith('background-')) {
          el.style.setProperty(prop, lowerProp === 'background-image' ? 'none' : 'transparent', 'important');
          continue;
        }

        if (lowerProp.includes('filter')) {
          el.style.setProperty(prop, 'none', 'important');
          continue;
        }

        el.style.setProperty(prop, 'initial', 'important');
      }
    }
  };

  const applyExportSafeClone = (documentClone: Document, exportBg: string, inlinedCSS: string) => {
    documentClone.documentElement.classList.remove('dark');

    if (inlinedCSS) {
      const style = documentClone.createElement('style');
      style.textContent = inlinedCSS;
      documentClone.head.appendChild(style);
    }

    if (settings.fontFamily === 'custom' && settings.customFont) {
      const customFontStyle = documentClone.createElement('style');
      customFontStyle.textContent = `@font-face{font-family:"${settings.customFont.family}";src:url("${settings.customFont.dataUrl}") format("${settings.customFont.format}");font-display:swap;}`;
      documentClone.head.appendChild(customFontStyle);
    }

    const safeTheme = documentClone.createElement('style');
    safeTheme.textContent = `:root,.dark{
  --background: #ffffff !important;
  --foreground: #111827 !important;
  --card: #ffffff !important;
  --card-foreground: #111827 !important;
  --popover: #ffffff !important;
  --popover-foreground: #111827 !important;
  --primary: #111827 !important;
  --primary-foreground: #ffffff !important;
  --secondary: #f3f4f6 !important;
  --secondary-foreground: #111827 !important;
  --muted: #f3f4f6 !important;
  --muted-foreground: #6b7280 !important;
  --accent: #f3f4f6 !important;
  --accent-foreground: #111827 !important;
  --destructive: #ef4444 !important;
  --border: #e5e7eb !important;
  --input: #e5e7eb !important;
  --ring: #9ca3af !important;
  --chart-1: #f59e0b !important;
  --chart-2: #10b981 !important;
  --chart-3: #3b82f6 !important;
  --chart-4: #8b5cf6 !important;
  --chart-5: #ec4899 !important;
  --sidebar: #ffffff !important;
  --sidebar-foreground: #111827 !important;
  --sidebar-primary: #111827 !important;
  --sidebar-primary-foreground: #ffffff !important;
  --sidebar-accent: #f3f4f6 !important;
  --sidebar-accent-foreground: #111827 !important;
  --sidebar-border: #e5e7eb !important;
  --sidebar-ring: #9ca3af !important;
}`;
    documentClone.head.appendChild(safeTheme);

    const pseudo = documentClone.createElement('style');
    pseudo.textContent = '*::before,*::after{content:none !important;}';
    documentClone.head.appendChild(pseudo);

    documentClone.documentElement.style.backgroundColor = exportBg;
    documentClone.documentElement.style.color = 'rgb(0, 0, 0)';
    documentClone.body.style.backgroundColor = exportBg;
    documentClone.body.style.color = 'rgb(0, 0, 0)';
  };

  const applyExportSafeDocument = () => {
    const cls = '__exporting_modern_screenshot_safe_theme';
    document.body.classList.add(cls);

    let style = document.getElementById(cls) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = cls;
      style.textContent = `:root, .dark, body.${cls}{
  --background: #ffffff !important;
  --foreground: #111827 !important;
  --card: #ffffff !important;
  --card-foreground: #111827 !important;
  --popover: #ffffff !important;
  --popover-foreground: #111827 !important;
  --primary: #111827 !important;
  --primary-foreground: #ffffff !important;
  --secondary: #f3f4f6 !important;
  --secondary-foreground: #111827 !important;
  --muted: #f3f4f6 !important;
  --muted-foreground: #6b7280 !important;
  --accent: #f3f4f6 !important;
  --accent-foreground: #111827 !important;
  --destructive: #ef4444 !important;
  --border: #e5e7eb !important;
  --input: #e5e7eb !important;
  --ring: #9ca3af !important;
  --chart-1: #f59e0b !important;
  --chart-2: #10b981 !important;
  --chart-3: #3b82f6 !important;
  --chart-4: #8b5cf6 !important;
  --chart-5: #ec4899 !important;
  --sidebar: #ffffff !important;
  --sidebar-foreground: #111827 !important;
  --sidebar-primary: #111827 !important;
  --sidebar-primary-foreground: #ffffff !important;
  --sidebar-accent: #f3f4f6 !important;
  --sidebar-accent-foreground: #111827 !important;
  --sidebar-border: #e5e7eb !important;
  --sidebar-ring: #9ca3af !important;
}
body.${cls} *::before,body.${cls} *::after{content:none !important;}`;
      document.head.appendChild(style);
    }

    return () => {
      document.body.classList.remove(cls);
      style?.remove();
    };
  };

  const exportPages = async () => {
    setIsExporting(true);
    onExportingChange?.(true);
    cancelExportRef.current = false;
    originalPageIndexRef.current = currentPageIndex;

    const exportTotal = Math.max(1, totalPages);
    
    // Set the first page for initial font/setup
    onExportPageIndexChange?.(0);
    await waitForPageRef(pageRefs, 0, 5000);

    const cleanup = applyExportSafeDocument();
    const inlinedFontCSS = await getInlinedFontCSS();

    if (settings.fontFamily === 'custom' && settings.customFont) {
      try {
        await document.fonts.load(`16px "${settings.customFont.family}"`);
        await document.fonts.ready;
      } catch {
      }
    }

    let success = false;
    try {
      const { domToPng } = await import('modern-screenshot');

      setExportProgress({ current: 0, total: exportTotal });

      // 300 DPI calculation (2550 / 612 = 4.166...)
      const dpiScale = 4.1666666667;

      if (format === 'pdf') {
        const worker = new Worker(new URL('../workers/pdfWorker.ts', import.meta.url), {
          type: 'module',
        });

        // Helper to wait for specific message types from the worker
        const waitMessage = (type: string) => 
          new Promise<any>((resolve, reject) => {
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

        // US Letter size in points (72 DPI)
        const pdfWidth = 612;
        const pdfHeight = 792;

        for (let i = 0; i < exportTotal; i++) {
          if (cancelExportRef.current) break;

          setExportProgress({ current: i, total: exportTotal });
          onExportPageIndexChange?.(i);
          
          const page = await waitForPageRef(pageRefs, i, 5000);
          if (!page) {
            throw new Error(`Failed to render page ${i + 1} before export capture.`);
          }

          // Small yield for responsiveness
          await new Promise(resolve => setTimeout(resolve, 0));

          const computedBg = window.getComputedStyle(page).backgroundColor;
          const exportBg =
            computedBg && computedBg !== 'rgba(0, 0, 0, 0)' ? computedBg : '#ffffff';

          const imgData = await domToPng(page, {
            scale: dpiScale,
            backgroundColor: exportBg,
            onCloneNode: (clonedNode) => {
              const elementClone = clonedNode as HTMLElement;
              const documentClone = elementClone.ownerDocument;
              if (elementClone && documentClone) {
                applyExportSafeClone(documentClone, exportBg, inlinedFontCSS);
                elementClone.style.transform = 'none';
                elementClone.style.transformOrigin = 'top left';
                sanitizeCloneColors(documentClone, elementClone);
              }
            },
          });

          // Convert data URL to ArrayBuffer for faster transfer to worker
          const res = await fetch(imgData);
          const arrayBuffer = await res.arrayBuffer();

          worker.postMessage({
            type: 'addPage',
            payload: {
              imgData: arrayBuffer,
              width: pdfWidth,
              height: pdfHeight,
              isFirstPage: i === 0
            }
          }, [arrayBuffer]);

          setExportProgress({ current: i + 1, total: exportTotal });
          
          // Yield again after heavy operation
          await new Promise(resolve => setTimeout(resolve, 0));
        }

        if (!cancelExportRef.current) {
          worker.postMessage({ type: 'generate' });
          const pdfBuffer = await waitMessage('generated');
          
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

          setExportProgress({ current: i, total: exportTotal });
          onExportPageIndexChange?.(i);
          
          const page = await waitForPageRef(pageRefs, i, 5000);
          if (!page) {
            throw new Error(`Failed to render page ${i + 1} before export capture.`);
          }

          // Small yield
          await new Promise(resolve => setTimeout(resolve, 0));

          const computedBg = window.getComputedStyle(page).backgroundColor;
          const exportBg =
            computedBg && computedBg !== 'rgba(0, 0, 0, 0)' ? computedBg : '#ffffff';

          const imgData = await domToPng(page, {
            scale: dpiScale,
            backgroundColor: exportBg,
            onCloneNode: (clonedNode) => {
              const elementClone = clonedNode as HTMLElement;
              const documentClone = elementClone.ownerDocument;
              if (elementClone && documentClone) {
                applyExportSafeClone(documentClone, exportBg, inlinedFontCSS);
                elementClone.style.transform = 'none';
                elementClone.style.transformOrigin = 'top left';
                sanitizeCloneColors(documentClone, elementClone);
              }
            },
          });

          const link = document.createElement('a');
          link.download = `handwritten-page-${i + 1}.${format}`;
          link.href = imgData;
          link.click();

          setExportProgress({ current: i + 1, total: exportTotal });

          // Yield again
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
      cleanup();
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
        <h3 className="font-semibold text-lg mb-5 flex items-center gap-2">
          <Download className="w-5 h-5 text-[#E0A32A]" />
          Export Options
        </h3>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="export-format">Format</Label>
            <Select
              value={format}
              onValueChange={(value) => setFormat(value as ExportFormat)}
            >
              <SelectTrigger id="export-format">
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
            className="w-full"
            size="lg"
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
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>
                  Exporting page {Math.min(exportProgress.total, exportProgress.current + 1)} of {exportProgress.total}
                </span>
                <span>{Math.round((exportProgress.current / exportProgress.total) * 100)}%</span>
              </div>
              <div className="h-2 w-full rounded bg-gray-200 overflow-hidden">
                <div
                  className="h-full bg-[#E0A32A] transition-all"
                  style={{
                    width: `${Math.round((exportProgress.current / exportProgress.total) * 100)}%`,
                  }}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  cancelExportRef.current = true;
                }}
              >
                Cancel Export
              </Button>
            </div>
          )}

          {!hasContent && (
            <p className="text-xs text-amber-600 text-center">
              Start typing to enable export
            </p>
          )}

          <p className="text-xs text-muted-foreground text-center">
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
