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
}

type ExportFormat = 'pdf' | 'png' | 'jpg';

export default function ExportPanel({ pageRefs }: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [quality, setQuality] = useState<'standard' | 'high'>('high');

  const exportPages = async () => {
    setIsExporting(true);

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

          const canvas = await html2canvas(page, {
            scale,
            useCORS: true,
            backgroundColor: null,
            logging: false,
          });

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

          const canvas = await html2canvas(page, {
            scale,
            useCORS: true,
            backgroundColor: null,
            logging: false,
          });

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
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          Export Options
        </h3>

        <div className="space-y-4">
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
            disabled={isExporting}
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
