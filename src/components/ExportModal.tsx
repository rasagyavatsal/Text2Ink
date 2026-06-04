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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { exportEngine, type ExportFormat, type ExportProgress } from '@/lib/export/ExportEngine';
import type { HandwritingSettings, PageSettings } from '@/lib/types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  text: string;
  settings: HandwritingSettings;
  pageSettingsByPage: PageSettings[];
}

export default function ExportModal({
  isOpen,
  onClose,
  text,
  settings,
  pageSettingsByPage,
}: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasContent = text.trim().length > 0;

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Reset success state when reopening modal
  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setIsExporting(false);
      setExportProgress(null);
      setExportError(null);
      abortControllerRef.current = null;
    }
  }, [isOpen]);

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
    const controller = new AbortController();
    abortControllerRef.current = controller;
    let success = false;
    try {
      const result = await exportEngine.exportDocument({
        format,
        document: {
          text,
          settings,
          pageSettingsByPage,
        },
        signal: controller.signal,
        onProgress: setExportProgress,
      });
      success = result.status === 'success';
      if (result.status === 'cancelled') {
        setExportProgress(null);
      }
    } catch (error) {
      console.error('Export failed:', error);
      setExportError(error instanceof Error ? error.message : 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
      setExportProgress(null);
      abortControllerRef.current = null;
      if (success) {
        setIsSuccess(true);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="w-[calc(100%-2rem)] sm:max-w-md rounded-3xl sm:w-full"
        onInteractOutside={handleInteractOutside}
        onEscapeKeyDown={handleInteractOutside}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-section-title font-semibold tracking-tight text-foreground">
            <Download className="w-5 h-5 text-brand-accent" />
            Export Document
          </DialogTitle>
          <DialogDescription className="sr-only">
            Choose an export format and download the rendered document.
          </DialogDescription>
        </DialogHeader>

        {(() => {
          if (isSuccess) {
            return (
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <CheckCircle2 className="w-12 h-12 text-success" />
                <p className="font-medium text-center text-foreground">Export completed successfully!</p>
                <Button variant="brand" onClick={onClose} className="mt-4 font-semibold transition-all active:scale-95 shadow-sm">
                  Close
                </Button>
              </div>
            );
          }
          if (exportError) {
            return (
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                <AlertCircle className="w-12 h-12 text-destructive animate-in fade-in zoom-in duration-300" />
                <p className="font-medium text-center text-destructive">Export failed</p>
                <p className="text-sm text-muted-foreground text-center px-4 max-w-sm">
                  {exportError}
                </p>
                <div className="flex gap-3 mt-4 w-full justify-center">
                  <Button variant="outline" onClick={() => setExportError(null)} className="font-semibold transition-all active:scale-95">
                    Cancel
                  </Button>
                  <Button variant="brand" onClick={exportPages} className="font-semibold transition-all active:scale-95 shadow-sm">
                    Retry
                  </Button>
                </div>
              </div>
            );
          }
          return (
            <div className="space-y-6 py-4">
            <div className="flex flex-col gap-3">
              <Label className="label-text text-label" htmlFor="export-format">Format</Label>
              <Select
                value={format}
                onValueChange={(value) => setFormat(value as ExportFormat)}
                disabled={isExporting}
              >
                <SelectTrigger id="export-format" className="w-full h-control-lg">
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
              variant={hasContent ? 'brand' : 'outline'}
              size="lg"
              onClick={exportPages}
              disabled={isExporting || !hasContent}
              className={`w-full font-semibold transition-all ${
                hasContent ? 'shadow-sm active:scale-95' : 'bg-muted text-muted-foreground border-border hover:bg-muted'
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
                {(() => {
                  const currentUnits = exportProgress.phase === 'finalizing'
                    ? exportProgress.totalPages + 1
                    : exportProgress.currentPage;
                  const totalUnits = exportProgress.phase === 'finalizing'
                    ? exportProgress.totalPages + 1
                    : exportProgress.totalPages;
                  const progressPercent = Math.round((currentUnits / Math.max(1, totalUnits)) * 100);

                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">
                          {exportProgress.phase === 'finalizing'
                            ? 'Finalizing PDF...'
                            : `Page ${exportProgress.currentPage} / ${exportProgress.totalPages}`}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground bg-background border border-border px-2 py-1 rounded-md shadow-sm">
                          {progressPercent}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-brand-accent transition-all duration-300"
                          style={{
                            width: `${progressPercent}%`,
                          }}
                        />
                      </div>
                    </>
                  );
                })()}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full py-3 h-auto text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive font-bold transition-all active:scale-95"
                  onClick={() => {
                    abortControllerRef.current?.abort();
                  }}
                >
                  Cancel Export
                </Button>
              </div>
            )}

            {!hasContent && (
              <p className="text-xs text-muted-foreground text-center">
                Start typing to enable export.
              </p>
            )}
          </div>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}
