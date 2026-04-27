'use client';

import React, { useEffect, useMemo, useState } from 'react';
import NextImage from 'next/image';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  HandwritingSettings,
  PageSettings,
  HANDWRITING_FONTS,
  PAPER_COLORS,
  LineData,
  FontOption,
  PaperTemplateId,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import { SectionCard, SettingRow, SelectorCarousel, UploadWell } from '@/components/patterns/EditorPatterns';
import { detectBackgroundLines } from '@/lib/lineDetection';
import { PAGE_FORMATS, PAPER_TEMPLATES, resolvePageLayout } from '@/lib/pageLayout';
import { 
  Type, 
  Palette, 
  FileText, 
  Wand2, 
  Upload, 
  X, 
  Minus, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Trash2,
  Settings2
} from 'lucide-react';

import {
  validateFontFile,
  generateFontFamilyName,
  processLineDetectionResult,
  readFilesAsDataURL,
} from '@/lib/settingsHelpers';

const FontCard = ({ 
  font, 
  isSelected, 
  onClick,
  customStyle
}: { 
  font: FontOption, 
  isSelected: boolean, 
  onClick: () => void,
  customStyle?: React.CSSProperties
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-xl p-2.5 flex flex-col items-center gap-2 transition-all border-2 w-full",
        isSelected 
          ? "bg-[var(--t2i-state-selected)] border-[var(--t2i-state-selected-border)] text-[var(--t2i-accent-info)] shadow-sm" 
          : "bg-[var(--t2i-surface-panel-muted)] border-transparent hover:bg-[var(--t2i-state-hover)] text-[var(--t2i-content-normal)]"
      )}
    >
      <div 
        className={cn(
          "w-full aspect-[1.6/1] rounded-lg flex items-center justify-center text-2xl overflow-hidden transition-colors",
          isSelected ? "bg-white/70" : "bg-[var(--t2i-surface-panel)]",
          !customStyle && font.className
        )}
        style={customStyle}
      >
        AaBb
      </div>
      <span className={cn(
        "text-[10px] font-bold truncate w-full text-center px-1 uppercase tracking-tight",
        isSelected ? "text-[var(--t2i-accent-info)]" : "text-[var(--t2i-content-muted)]"
      )}>
        {font.name}
      </span>
    </button>
  );
};

interface SettingsPanelProps {
  settings: HandwritingSettings;
  onSettingsChange: (settings: HandwritingSettings) => void;
  pageSettings: PageSettings;
  onPageSettingsChange: (pageSettings: PageSettings) => void;
  currentPageIndex: number;
  onApplyToAllPages?: () => void;
  previewScale: number;
  onPreviewScaleChange: (value: number) => void;
  onCurrentPageChange: (index: number) => void;
  totalPages: number;
  isPaginationComplete: boolean;
  pages: LineData[][];
  onClearAll: () => void;
}

export default function SettingsPanel({
  settings,
  onSettingsChange,
  pageSettings,
  onPageSettingsChange,
  currentPageIndex,
  onApplyToAllPages,
  previewScale,
  onPreviewScaleChange,
  onCurrentPageChange,
  totalPages,
  isPaginationComplete,
  pages,
  onClearAll,
}: SettingsPanelProps) {
  const [customFontError, setCustomFontError] = useState<string | null>(null);
  const [lineDetecting, setLineDetecting] = useState(false);
  const [lineDetectError, setLineDetectError] = useState<string | null>(null);
  const [lineDetectInfo, setLineDetectInfo] = useState<{ offset: number; spacing: number } | null>(null);

  const hasCustomBackground =
    (settings.customBackgroundImages?.length ?? 0) > 0 || !!settings.customBackgroundImage;

  const effectiveBackgroundImages =
    (settings.customBackgroundImages?.length ?? 0) > 0
      ? settings.customBackgroundImages
      : settings.customBackgroundImage
        ? [settings.customBackgroundImage]
        : [];

  const currentBackground = useMemo(
    () => settings.customBackgroundImages?.[currentPageIndex] ?? settings.customBackgroundImage,
    [currentPageIndex, settings.customBackgroundImages, settings.customBackgroundImage]
  );
  const resolvedLayout = useMemo(
    () => resolvePageLayout({ settings, pageSettings, pageIndex: currentPageIndex }),
    [currentPageIndex, pageSettings, settings],
  );

  const [fontPageIndex, setFontPageIndex] = useState(0);
  const [paperPageIndex, setPaperPageIndex] = useState(0);
  const availableFonts = useMemo(() => HANDWRITING_FONTS.filter(f => f.value !== 'custom'), []);
  const fontsPerPage = 4;
  const totalFontPages = Math.ceil(availableFonts.length / fontsPerPage);
  const papersPerPage = 4;
  const totalPaperPages = Math.ceil(PAPER_TEMPLATES.length / papersPerPage);

  const visibleFonts = useMemo(() => {
    const start = fontPageIndex * fontsPerPage;
    return availableFonts.slice(start, start + fontsPerPage);
  }, [fontPageIndex, availableFonts]);

  const visiblePaperTemplates = useMemo(() => {
    const start = paperPageIndex * papersPerPage;
    return PAPER_TEMPLATES.slice(start, start + papersPerPage);
  }, [paperPageIndex]);

  const handleNextFonts = () => {
    setFontPageIndex((prev) => (prev + 1) % totalFontPages);
  };

  const handlePrevFonts = () => {
    setFontPageIndex((prev) => (prev - 1 + totalFontPages) % totalFontPages);
  };

  const handleNextPapers = () => {
    setPaperPageIndex((prev) => (prev + 1) % totalPaperPages);
  };

  const handlePrevPapers = () => {
    setPaperPageIndex((prev) => (prev - 1 + totalPaperPages) % totalPaperPages);
  };

  useEffect(() => {
    setLineDetectError(null);
    setLineDetectInfo(null);
  }, [currentPageIndex, currentBackground]);



  const updateSetting = <K extends keyof HandwritingSettings>(
    key: K,
    value: HandwritingSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const updatePageSetting = <K extends keyof PageSettings>(
    key: K,
    value: PageSettings[K]
  ) => {
    onPageSettingsChange({ ...pageSettings, [key]: value });
  };

  const updateSettings = (patch: Partial<HandwritingSettings>) => {
    onSettingsChange({ ...settings, ...patch });
  };

  const paperStyleForTemplate = (templateId: PaperTemplateId): HandwritingSettings['paperStyle'] => {
    const template = PAPER_TEMPLATES.find((paper) => paper.id === templateId);
    if (template?.kind === 'blank') return 'blank';
    if (template?.kind === 'graph' || template?.kind === 'dot-grid') return 'grid';
    if (templateId === 'margin-ruled' || templateId === 'legal-pad' || templateId === 'blue-notebook') return 'ruled';
    return 'lined';
  };

  const handleDetectLines = async () => {
    if (!currentBackground || lineDetecting) return;
    setLineDetectError(null);
    setLineDetectInfo(null);
    setLineDetecting(true);

    try {
      const expectedLineHeight = resolvedLayout.lineSpacing;
      const result = await detectBackgroundLines(currentBackground, {
        targetWidth: resolvedLayout.width,
        targetHeight: resolvedLayout.height,
        marginTop: pageSettings.marginTop,
        marginBottom: pageSettings.marginBottom,
        marginLeft: pageSettings.marginLeft,
        marginRight: pageSettings.marginRight,
        expectedLineHeight,
      });

      if (!result) {
        setLineDetectError('Could not detect consistent horizontal lines in this background.');
        return;
      }

      const { offset, spacing } = processLineDetectionResult(result, pageSettings, settings);

      onPageSettingsChange({
        ...pageSettings,
        customLineOffset: offset,
        customLineSpacing: spacing,
      });
      setLineDetectInfo({ offset, spacing });
    } catch {
      setLineDetectError('Failed to analyze background. Please try another image.');
    } finally {
      setLineDetecting(false);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <SectionCard
        title={(
          <span className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-[var(--t2i-brand-primary)]" />
            General
          </span>
        )}
        description="Workspace controls, page navigation, and page-level helpers."
      >
        <div className="space-y-6">
          <SettingRow label="Zoom" value={`${Math.round(previewScale * 100)}%`}>
            <div className="flex items-center gap-1 rounded-lg bg-[var(--t2i-surface-panel-muted)] p-1">
              <button
                type="button"
                onClick={() => onPreviewScaleChange(Number((previewScale - 0.1).toFixed(2)))}
                className="rounded-md p-2 text-[var(--t2i-content-muted)] transition-all hover:bg-[var(--t2i-surface-panel)] hover:text-[var(--t2i-brand-primary)] hover:shadow-sm"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <div className="flex-1 text-center text-xs font-bold text-[var(--t2i-content-normal)]">
                {Math.round(previewScale * 100)}%
              </div>
              <button
                type="button"
                onClick={() => onPreviewScaleChange(Number((previewScale + 0.1).toFixed(2)))}
                className="rounded-md p-2 text-[var(--t2i-content-muted)] transition-all hover:bg-[var(--t2i-surface-panel)] hover:text-[var(--t2i-brand-primary)] hover:shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </SettingRow>

          <SettingRow label="Page Navigation" value={`Page ${currentPageIndex + 1} of ${totalPages}`}>
            <div className="flex items-center justify-between rounded-lg bg-[var(--t2i-surface-panel-muted)] p-1">
              <button
                type="button"
                onClick={() => onCurrentPageChange(Math.max(0, currentPageIndex - 1))}
                disabled={currentPageIndex === 0}
                className="rounded-md p-2 text-[var(--t2i-content-muted)] transition-all hover:bg-[var(--t2i-surface-panel)] hover:text-[var(--t2i-brand-primary)] hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-xs font-bold text-[var(--t2i-content-normal)]">
                Page {currentPageIndex + 1} of {totalPages}
              </div>
              <button
                type="button"
                onClick={() =>
                  onCurrentPageChange(
                    isPaginationComplete
                      ? Math.min(pages.length - 1, currentPageIndex + 1)
                      : currentPageIndex + 1
                  )
                }
                disabled={isPaginationComplete && currentPageIndex >= pages.length - 1}
                className="rounded-md p-2 text-[var(--t2i-content-muted)] transition-all hover:bg-[var(--t2i-surface-panel)] hover:text-[var(--t2i-brand-primary)] hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </SettingRow>

          <button
            onClick={onApplyToAllPages}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#E0A32A]/5 border border-[#E0A32A]/20 rounded-xl text-xs font-bold text-[#E0A32A] hover:bg-[#E0A32A]/10 transition-all active:scale-95"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Apply settings to all pages
          </button>

          <div className="pt-2">
            <button
              onClick={() => {
                const newField = {
                  id: crypto.randomUUID(),
                  text: '',
                  x: 100,
                  y: 100,
                  width: 200,
                  height: 50,
                  color: settings.inkColor,
                  fontSize: pageSettings.fontSize,
                };
                updatePageSetting('textFields', [...(pageSettings.textFields || []), newField]);
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-100 border border-transparent rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-200 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Text Box
            </button>
            <p className="text-[10px] text-gray-400 mt-2 text-center italic">
              Add draggable text boxes for dates, names, or signatures.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={(
          <span className="flex items-center gap-2">
            <Type className="h-4 w-4 text-[var(--t2i-brand-primary)]" />
            Typography
          </span>
        )}
        description="Handwriting style, sizing, spacing, and line movement."
      >
        <div className="space-y-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fonts</Label>
            </div>
            
            <SelectorCarousel
              ariaLabel="Fonts"
              pageLabel="Font page"
              currentPage={fontPageIndex}
              totalPages={totalFontPages}
              onPrevious={handlePrevFonts}
              onNext={handleNextFonts}
            >
              <div className="grid grid-cols-2 gap-3">
                {visibleFonts.map((font) => (
                  <FontCard
                    key={font.value}
                    font={font}
                    isSelected={settings.fontFamily === font.value}
                    onClick={() => {
                      setCustomFontError(null);
                      updateSetting('fontFamily', font.value);
                    }}
                  />
                ))}
              </div>
            </SelectorCarousel>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Custom Font</Label>
            <div className="grid grid-cols-2 gap-3">
              {settings.customFont ? (
                <div className="relative group">
                  <FontCard
                    font={{ name: settings.customFont.name, value: 'custom', className: '' }}
                    isSelected={settings.fontFamily === 'custom'}
                    onClick={() => {
                      setCustomFontError(null);
                      updateSetting('fontFamily', 'custom');
                    }}
                    customStyle={{ fontFamily: settings.customFont.family }}
                  />
                  <button
                    onClick={() => {
                      setCustomFontError(null);
                      updateSettings({
                        fontFamily:
                          settings.fontFamily === 'custom'
                            ? HANDWRITING_FONTS[0].value
                            : settings.fontFamily,
                        customFont: null,
                      });
                    }}
                    className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors opacity-100 xl:opacity-0 xl:group-hover:opacity-100 shadow-sm z-10"
                    title="Remove custom font"
                    type="button"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <UploadWell className="w-full aspect-[1/0.95] gap-2 group">
                  <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center mb-2 group-hover:bg-[#E0A32A]/10 transition-colors">
                    <Upload className="w-4 h-4 text-gray-400 group-hover:text-[#E0A32A] transition-colors" />
                  </div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tight group-hover:text-[#E0A32A] transition-colors text-center px-2">Upload Font</span>
                  <input
                    type="file"
                    accept=".ttf,.otf,font/ttf,font/otf,application/x-font-ttf,application/x-font-opentype"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;

                      setCustomFontError(null);

                      const { format, error } = validateFontFile(file);

                      if (error || !format) {
                        setCustomFontError(error);
                        return;
                      }

                      const reader = new FileReader();
                      reader.onerror = () => {
                        setCustomFontError('Failed to read the font file. Please try again.');
                      };
                      reader.onload = (event) => {
                        const dataUrl = event.target?.result as string | undefined;
                        if (!dataUrl) {
                          setCustomFontError('Failed to read the font file. Please try again.');
                          return;
                        }

                        const family = generateFontFamilyName(file.name);

                        updateSettings({
                          fontFamily: 'custom',
                          customFont: {
                            name: file.name,
                            family,
                            dataUrl,
                            format,
                          },
                        });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </UploadWell>
              )}

              {customFontError && (
                <p className="text-[10px] font-bold text-red-500 uppercase">{customFontError}</p>
              )}
            </div>
            <p className="text-[10px] text-gray-400 leading-relaxed italic">
              Upload a custom handwriting font (.ttf or .otf).
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Font Size</Label>
              <div className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                {pageSettings.fontSize}px
              </div>
            </div>
            <Slider
              value={[pageSettings.fontSize]}
              onValueChange={([value]) => updatePageSetting('fontSize', value)}
              min={14}
              max={48}
              step={1}
            />
          </div>

          {resolvedLayout.controls.showLineHeightControl && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Line Height</Label>
                <div className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                  {settings.lineHeight.toFixed(1)}
                </div>
              </div>
              <Slider
                value={[settings.lineHeight]}
                onValueChange={([value]) => updateSetting('lineHeight', value)}
                min={1.2}
                max={3}
                step={0.1}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Line Tilt</Label>
              <div className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                {pageSettings.lineTilt}°
              </div>
            </div>
            <Slider
              value={[pageSettings.lineTilt]}
              onValueChange={([value]) => updatePageSetting('lineTilt', value)}
              min={-15}
              max={15}
              step={0.5}
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={(
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[var(--t2i-brand-primary)]" />
            Page Layout
          </span>
        )}
        description="Paper format, templates, backgrounds, and calibration controls."
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest" htmlFor="page-format">Page Format</Label>
              <Select
                value={settings.pageFormatId}
                onValueChange={(value) =>
                  updateSetting('pageFormatId', value as HandwritingSettings['pageFormatId'])
                }
              >
                <SelectTrigger id="page-format" className="bg-gray-100 border-none h-9 text-sm">
                  <SelectValue placeholder="Page format" />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_FORMATS.map((format) => (
                    <SelectItem key={format.id} value={format.id}>
                      {format.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest" htmlFor="page-orientation">Orientation</Label>
              <Select
                value={settings.pageOrientation}
                onValueChange={(value) =>
                  updateSetting('pageOrientation', value as HandwritingSettings['pageOrientation'])
                }
              >
                <SelectTrigger id="page-orientation" className="bg-gray-100 border-none h-9 text-sm">
                  <SelectValue placeholder="Orientation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">Portrait</SelectItem>
                  <SelectItem value="landscape">Landscape</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Paper Templates</Label>
            </div>

            <SelectorCarousel
              ariaLabel="Paper templates"
              pageLabel="Paper page"
              currentPage={paperPageIndex}
              totalPages={totalPaperPages}
              onPrevious={handlePrevPapers}
              onNext={handleNextPapers}
            >
              <div className="grid grid-cols-2 gap-3">
                {visiblePaperTemplates.map((paper) => {
                  const isSelected = resolvedLayout.paperTemplate?.id === paper.id && !hasCustomBackground;
                  return (
                    <button
                      key={paper.id}
                      type="button"
                      onClick={() =>
                        updateSettings({
                          paperTemplateId: paper.id,
                          paperStyle: paperStyleForTemplate(paper.id),
                        })
                      }
                      className={cn(
                        "cursor-pointer rounded-xl p-2.5 flex flex-col items-center gap-2 transition-all border-2 w-full",
                        isSelected
                          ? "bg-[var(--t2i-state-selected)] border-[var(--t2i-state-selected-border)] text-[var(--t2i-accent-info)] shadow-sm"
                          : "bg-[var(--t2i-surface-panel-muted)] border-transparent hover:bg-[var(--t2i-state-hover)] text-[var(--t2i-content-normal)]"
                      )}
                    >
                      <span
                        className={cn(
                          "w-full aspect-[1.6/1] rounded-lg overflow-hidden border flex items-center justify-center",
                          isSelected ? "border-white/30" : "border-gray-200"
                        )}
                        style={{ backgroundColor: paper.tone }}
                        aria-hidden="true"
                      >
                        {paper.kind === 'blank' ? (
                          <span className="w-10 h-10 rounded-full bg-white/30" />
                        ) : (
                          <span
                            className="block w-full h-full"
                            style={{
                              backgroundImage:
                                paper.kind === 'dot-grid'
                                  ? `radial-gradient(${paper.lineColor ?? '#9aa7b0'} 1px, transparent 1px)`
                                  : paper.kind === 'graph'
                                    ? `linear-gradient(${paper.lineColor ?? '#b9d4e8'} 1px, transparent 1px), linear-gradient(90deg, ${paper.lineColor ?? '#b9d4e8'} 1px, transparent 1px)`
                                    : `repeating-linear-gradient(to bottom, transparent 0 17px, ${paper.lineColor ?? '#9ec7e9'} 18px 19px)`,
                              backgroundSize: paper.kind === 'dot-grid' ? '12px 12px' : paper.kind === 'graph' ? '14px 14px' : '100% 19px',
                            }}
                          />
                        )}
                      </span>
                      <span className={cn(
                        "text-[10px] font-bold truncate w-full text-center px-1 uppercase tracking-tight",
                        isSelected ? "text-[var(--t2i-accent-info)]" : "text-[var(--t2i-content-muted)]"
                      )}>
                        {paper.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </SelectorCarousel>
          </div>

          {resolvedLayout.controls.showMarginControls && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Top Margin</Label>
                <span className="text-[10px] font-bold text-gray-500">
                  {pageSettings.marginTop}px
                </span>
              </div>
              <Slider
                value={[pageSettings.marginTop]}
                onValueChange={([value]) => updatePageSetting('marginTop', value)}
                min={20}
                max={120}
                step={5}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bottom Margin</Label>
                <span className="text-[10px] font-bold text-gray-500">
                  {pageSettings.marginBottom}px
                </span>
              </div>
              <Slider
                value={[pageSettings.marginBottom]}
                onValueChange={([value]) => updatePageSetting('marginBottom', value)}
                min={20}
                max={120}
                step={5}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Left Margin</Label>
                <span className="text-[10px] font-bold text-gray-500">
                  {pageSettings.marginLeft}px
                </span>
              </div>
              <Slider
                value={[pageSettings.marginLeft]}
                onValueChange={([value]) => updatePageSetting('marginLeft', value)}
                min={20}
                max={120}
                step={5}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Right Margin</Label>
                <span className="text-[10px] font-bold text-gray-500">
                  {pageSettings.marginRight}px
                </span>
              </div>
              <Slider
                value={[pageSettings.marginRight]}
                onValueChange={([value]) => updatePageSetting('marginRight', value)}
                min={20}
                max={120}
                step={5}
              />
            </div>
          </div>
          )}

          {resolvedLayout.controls.showMarginControls && settings.paperStyle === 'ruled' && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Margin Line Offset</Label>
                <div className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                  {settings.ruledMarginLineOffset}px
                </div>
              </div>
              <Slider
                value={[settings.ruledMarginLineOffset]}
                onValueChange={([value]) => updateSetting('ruledMarginLineOffset', value)}
                min={-80}
                max={240}
                step={2}
              />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Custom Background Image</Label>
            <div className="space-y-3">
              {effectiveBackgroundImages.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    {effectiveBackgroundImages.map((src, idx) => (
                      <div key={`${idx}-${src.slice(0, 30)}`} className="relative group">
                        <NextImage
                          src={src}
                          alt={`Custom background ${idx + 1}`}
                          width={256}
                          height={128}
                          className="w-full h-16 object-cover rounded-lg border border-gray-100"
                          unoptimized
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = effectiveBackgroundImages.filter((_, i) => i !== idx);
                            updateSettings({
                              customBackgroundImages: next,
                              customBackgroundImage: next.length > 0 ? next[0] : null,
                            });
                          }}
                          className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity shadow-sm"
                          title="Remove background image"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      updateSettings({
                        customBackgroundImages: [],
                        customBackgroundImage: null,
                      })
                    }
                    className="text-[10px] font-bold text-red-500 uppercase tracking-wider hover:underline"
                  >
                    Remove all
                  </button>
                </div>
              )}

              <UploadWell className="h-20 w-full">
                <Upload className="w-5 h-5 text-gray-400 mb-1" />
                <span className="text-[10px] font-bold text-gray-500 uppercase">Upload PNG or JPG</span>
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = '';
                    if (files.length === 0) return;

                    readFilesAsDataURL(files)
                      .then((results) => {
                        const next = [...effectiveBackgroundImages, ...results];
                        updateSettings({
                          customBackgroundImages: next,
                          customBackgroundImage: next[0] ?? null,
                        });
                      })
                      .catch(() => { });
                  }}
                />
              </UploadWell>
              <p className="text-[10px] text-gray-400 text-center italic">
                Image will be used as page background
              </p>
            </div>
          </div>

          {resolvedLayout.controls.showCustomLineControls && (
            <div className="space-y-6 pt-2">
              <div className="flex flex-col gap-2 p-3 bg-gray-100 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold text-[#E0A32A] uppercase tracking-widest">Auto-Detect Lines</Label>
                  <button
                    type="button"
                    onClick={handleDetectLines}
                    disabled={!currentBackground || lineDetecting}
                    className="text-[10px] font-bold bg-[#E0A32A] text-white px-3 py-1.5 rounded-md hover:bg-[#c99225] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {lineDetecting ? 'Detecting...' : 'Detect Lines'}
                  </button>
                </div>
                {lineDetectInfo && (
                  <p className="text-[10px] font-bold text-green-600 bg-white/50 px-2 py-1 rounded">
                    ✓ Applied offset {lineDetectInfo.offset}px and spacing {lineDetectInfo.spacing}px.
                  </p>
                )}
                {lineDetectError && (
                  <p className="text-[10px] font-bold text-red-500 bg-white/50 px-2 py-1 rounded">{lineDetectError}</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Line Offset (Y Position)</Label>
                  <div className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                    {pageSettings.customLineOffset}px
                  </div>
                </div>
                <Slider
                  value={[pageSettings.customLineOffset]}
                  onValueChange={([value]) => updatePageSetting('customLineOffset', value)}
                  min={-50}
                  max={50}
                  step={1}
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Custom Line Spacing</Label>
                  <div className="flex items-center gap-2">
                    {pageSettings.customLineSpacing !== null && (
                      <button
                        onClick={() => updatePageSetting('customLineSpacing', null)}
                        className="text-[10px] font-bold text-[#E0A32A] uppercase tracking-wider hover:underline"
                      >
                        Reset
                      </button>
                    )}
                    <div className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                      {pageSettings.customLineSpacing ?? 'Auto'}
                    </div>
                  </div>
                </div>
                <Slider
                  value={[pageSettings.customLineSpacing ?? Math.round(pageSettings.fontSize * settings.lineHeight)]}
                  onValueChange={([value]) => updatePageSetting('customLineSpacing', value)}
                  min={20}
                  max={120}
                  step={1}
                />
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard
        title={(
          <span className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-[var(--t2i-brand-primary)]" />
            Colors
          </span>
        )}
        description="Ink, paper, and line colors stay faithful to the exported document."
      >
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ink Color</Label>
            <div className="flex items-center gap-3 p-1.5 bg-gray-100 rounded-lg">
              <input
                type="color"
                value={settings.inkColor}
                onChange={(e) => updateSetting('inkColor', e.target.value)}
                className="w-8 h-8 rounded-md cursor-pointer border-0 p-0 bg-transparent"
              />
              <span className="text-xs font-bold text-gray-700 uppercase tracking-tight">
                {settings.inkColor}
              </span>
            </div>
          </div>

          {resolvedLayout.controls.showPaperColorControl && (
          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Paper Color</Label>
            <div className="flex flex-wrap gap-2 p-1.5 bg-gray-100 rounded-lg">
              {PAPER_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => updateSetting('paperColor', color.value)}
                  className={`w-7 h-7 rounded-md border-2 transition-all ${settings.paperColor === color.value
                    ? 'border-[#E0A32A] scale-110'
                    : 'border-white hover:border-gray-200'
                    }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
          )}

          {resolvedLayout.controls.showLineColorControl && settings.paperStyle !== 'blank' && (
            <div className="flex flex-col gap-2">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Line Color</Label>
              <div className="flex items-center gap-3 p-1.5 bg-gray-100 rounded-lg">
                <input
                  type="color"
                  value={settings.lineColor}
                  onChange={(e) => updateSetting('lineColor', e.target.value)}
                  className="w-8 h-8 rounded-md cursor-pointer border-0 p-0 bg-transparent"
                />
                <span className="text-xs font-bold text-gray-700 uppercase tracking-tight">
                  {settings.lineColor}
                </span>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Danger Zone" description="Destructive reset actions for the current document.">
        <button
          onClick={onClearAll}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-all active:scale-95 border border-red-100"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear Everything
        </button>
      </SectionCard>
    </div>
  );
}
