'use client';

import React, { useState } from 'react';
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
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ExportPanelProps {
  pageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
  hasContent: boolean;
}

type ExportFormat = 'pdf' | 'png' | 'jpg';

export default function ExportPanel({ pageRefs, hasContent }: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [quality, setQuality] = useState<'standard' | 'high'>('high');

  const shouldNormalizeColor = (value: string) =>
    /(?:oklch|oklab|lab|lch|color-mix|color)\(/i.test(value);

  const normalizeCanvasColor = (doc: Document, value: string) => {
    const canvas = doc.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const sentinel = 'rgb(1, 2, 3)';
    ctx.fillStyle = sentinel;
    try {
      ctx.fillStyle = value;
    } catch {
      return null;
    }

    const normalized = ctx.fillStyle;
    if (!normalized || normalized === sentinel) return null;
    if (shouldNormalizeColor(normalized)) return null;
    return normalized;
  };

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

  const applyExportSafeClone = (documentClone: Document, exportBg: string) => {
    documentClone.documentElement.classList.remove('dark');

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
    const cls = '__exporting_html2canvas_safe_theme';
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

  const preSanitizeElement = (element: HTMLElement) => {
    const inlineBackups = new Map<HTMLElement, string>();
    const elements = [element, ...Array.from(element.querySelectorAll('*'))];

    for (const el of elements) {
      if (!(el instanceof HTMLElement)) continue;
      inlineBackups.set(el, el.getAttribute('style') || '');

      const cs = window.getComputedStyle(el);

      const setSafeColor = (prop: string, value: string, fallback: string) => {
        if (!value || !shouldNormalizeColor(value)) return;
        const normalized = normalizeCanvasColor(document, value);
        el.style.setProperty(prop, normalized ?? fallback, 'important');
      };

      setSafeColor('background-color', cs.backgroundColor, 'transparent');
      setSafeColor('color', cs.color, '#000000');
      setSafeColor('border-color', cs.borderColor, 'transparent');
      setSafeColor('border-top-color', cs.borderTopColor, 'transparent');
      setSafeColor('border-right-color', cs.borderRightColor, 'transparent');
      setSafeColor('border-bottom-color', cs.borderBottomColor, 'transparent');
      setSafeColor('border-left-color', cs.borderLeftColor, 'transparent');
      setSafeColor('outline-color', cs.outlineColor, 'transparent');
      setSafeColor('text-decoration-color', cs.textDecorationColor, 'transparent');
      setSafeColor('caret-color', cs.caretColor, '#000000');

      if (shouldNormalizeColor(cs.boxShadow)) {
        el.style.setProperty('box-shadow', 'none', 'important');
      }
      if (shouldNormalizeColor(cs.textShadow)) {
        el.style.setProperty('text-shadow', 'none', 'important');
      }
    }

    return () => {
      for (const [el, backup] of inlineBackups) {
        if (backup) {
          el.setAttribute('style', backup);
        } else {
          el.removeAttribute('style');
        }
      }
    };
  };

  const exportPages = async () => {
    setIsExporting(true);

    const cleanup = applyExportSafeDocument();

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    try {
      const pages = pageRefs.current.filter((ref) => ref !== null);
      if (pages.length === 0) {
        alert('No pages to export');
        return;
      }

      const scale = quality === 'high' ? 2 : 1;

      if (format === 'pdf') {
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'pt',
          format: 'letter',
        });

        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          if (!page) continue;

          const computedBg = window.getComputedStyle(page).backgroundColor;
          const exportBg =
            computedBg && computedBg !== 'rgba(0, 0, 0, 0)' ? computedBg : '#ffffff';

          const restoreElement = preSanitizeElement(page);
          let canvas: HTMLCanvasElement;
          try {
            canvas = await html2canvas(page, {
              scale,
              useCORS: true,
              backgroundColor: exportBg,
              onclone: (documentClone, elementClone) => {
                applyExportSafeClone(documentClone, exportBg);
                (elementClone as HTMLElement).style.transform = 'none';
                (elementClone as HTMLElement).style.transformOrigin = 'top left';
                sanitizeCloneColors(documentClone, elementClone);
              },
              logging: false,
            });
          } finally {
            restoreElement();
          }

          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();

          if (i > 0) {
            pdf.addPage();
          }

          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        }

        pdf.save('handwritten-document.pdf');
      } else {
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          if (!page) continue;

          const computedBg = window.getComputedStyle(page).backgroundColor;
          const exportBg =
            computedBg && computedBg !== 'rgba(0, 0, 0, 0)' ? computedBg : '#ffffff';

          const restoreElement = preSanitizeElement(page);
          let canvas: HTMLCanvasElement;
          try {
            canvas = await html2canvas(page, {
              scale,
              useCORS: true,
              backgroundColor: exportBg,
              onclone: (documentClone, elementClone) => {
                applyExportSafeClone(documentClone, exportBg);
                (elementClone as HTMLElement).style.transform = 'none';
                (elementClone as HTMLElement).style.transformOrigin = 'top left';
                sanitizeCloneColors(documentClone, elementClone);
              },
              logging: false,
            });
          } finally {
            restoreElement();
          }

          const link = document.createElement('a');
          link.download = `handwritten-page-${i + 1}.${format}`;
          link.href = canvas.toDataURL(
            format === 'png' ? 'image/png' : 'image/jpeg',
            0.95
          );
          link.click();

          if (pages.length > 1 && i < pages.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      cleanup();
      setIsExporting(false);
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

          <div className="space-y-2">
            <Label htmlFor="export-quality">Quality</Label>
            <Select
              value={quality}
              onValueChange={(value) =>
                setQuality(value as 'standard' | 'high')
              }
            >
              <SelectTrigger id="export-quality">
                <SelectValue placeholder="Select quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard (1x)</SelectItem>
                <SelectItem value="high">High (2x)</SelectItem>
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
    </div>
  );
}
