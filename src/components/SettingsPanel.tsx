'use client';

import React, { useEffect, useMemo, useState } from 'react';
import NextImage from 'next/image';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  HandwritingSettings,
  PageSettings,
  HANDWRITING_FONTS,
  PAPER_STYLES,
  PAPER_COLORS,
  LineData,
  FontOption,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import { detectBackgroundLines } from '@/lib/lineDetection';
import { PAGE_HEIGHT, PAGE_WIDTH } from '@/lib/pageConstants';
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
  Settings2,
  Grid
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
    <div
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-xl p-2.5 flex flex-col items-center gap-2 transition-all border-2 w-full",
        isSelected 
          ? "bg-[#E0A32A] border-[#E0A32A] text-white shadow-md shadow-[#E0A32A]/20" 
          : "bg-gray-100 border-transparent hover:bg-gray-200 text-gray-700"
      )}
    >
      <div 
        className={cn(
          "w-full aspect-[1.6/1] rounded-lg flex items-center justify-center text-2xl overflow-hidden transition-colors",
          isSelected ? "bg-white/20" : "bg-white",
          !customStyle && font.className
        )}
        style={customStyle}
      >
        AaBb
      </div>
      <span className={cn(
        "text-[10px] font-bold truncate w-full text-center px-1 uppercase tracking-tight",
        isSelected ? "text-white" : "text-gray-500"
      )}>
        {font.name}
      </span>
    </div>
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

  const [fontPageIndex, setFontPageIndex] = useState(0);
  const availableFonts = useMemo(() => HANDWRITING_FONTS.filter(f => f.value !== 'custom'), []);
  const fontsPerPage = 4;
  const totalFontPages = Math.ceil(availableFonts.length / fontsPerPage);

  const visibleFonts = useMemo(() => {
    const start = fontPageIndex * fontsPerPage;
    return availableFonts.slice(start, start + fontsPerPage);
  }, [fontPageIndex, availableFonts]);

  const handleNextFonts = () => {
    setFontPageIndex((prev) => (prev + 1) % totalFontPages);
  };

  const handlePrevFonts = () => {
    setFontPageIndex((prev) => (prev - 1 + totalFontPages) % totalFontPages);
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

  const handleDetectLines = async () => {
    if (!currentBackground || lineDetecting) return;
    setLineDetectError(null);
    setLineDetectInfo(null);
    setLineDetecting(true);

    try {
      const expectedLineHeight = pageSettings.customLineSpacing ?? pageSettings.fontSize * settings.lineHeight;
      const result = await detectBackgroundLines(currentBackground, {
        targetWidth: PAGE_WIDTH,
        targetHeight: PAGE_HEIGHT,
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
    } catch (err) {
      setLineDetectError('Failed to analyze background. Please try another image.');
    } finally {
      setLineDetecting(false);
    }
  };

  const updateRandomness = (
    key: keyof HandwritingSettings['randomness'],
    value: number | boolean
  ) => {
    onSettingsChange({
      ...settings,
      randomness: { ...settings.randomness, [key]: value },
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-8">
      {/* General Controls Section */}
      <div>
        <div className="flex items-center gap-2 mb-5">
          <Settings2 className="w-5 h-5 text-[#E0A32A]" />
          <h3 className="font-semibold text-lg">General</h3>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div className="flex flex-col gap-2">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Zoom</Label>
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => onPreviewScaleChange(Number((previewScale - 0.1).toFixed(2)))}
                  className="p-2 rounded-md text-gray-500 hover:text-[#E0A32A] hover:bg-white hover:shadow-sm transition-all"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <div className="flex-1 text-center text-xs font-bold text-gray-700">
                  {Math.round(previewScale * 100)}%
                </div>
                <button
                  onClick={() => onPreviewScaleChange(Number((previewScale + 0.1).toFixed(2)))}
                  className="p-2 rounded-md text-gray-500 hover:text-[#E0A32A] hover:bg-white hover:shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Page Navigation</Label>
            <div className="flex items-center justify-between bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => onCurrentPageChange(Math.max(0, currentPageIndex - 1))}
                disabled={currentPageIndex === 0}
                className="p-2 rounded-md text-gray-500 hover:text-[#E0A32A] hover:bg-white hover:shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-xs font-bold text-gray-700">
                Page {currentPageIndex + 1} of {totalPages}
              </div>
              <button
                onClick={() =>
                  onCurrentPageChange(
                    isPaginationComplete
                      ? Math.min(pages.length - 1, currentPageIndex + 1)
                      : currentPageIndex + 1
                  )
                }
                disabled={isPaginationComplete && currentPageIndex >= pages.length - 1}
                className="p-2 rounded-md text-gray-500 hover:text-[#E0A32A] hover:bg-white hover:shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

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
      </div>

      <Separator />

      <div>
        <div className="flex items-center gap-2 mb-5">
          <Type className="w-5 h-5 text-[#E0A32A]" />
          <h3 className="font-semibold text-lg">Typography</h3>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fonts</Label>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="text-[10px] font-bold text-[#E0A32A] hover:underline transition-colors">See all</button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl bg-white border-gray-200 text-gray-900 p-0 overflow-hidden sm:rounded-2xl shadow-xl">
                  <DialogHeader className="p-6 border-b border-gray-100">
                    <DialogTitle className="text-lg font-bold">All Handwriting Fonts</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-6 max-h-[70vh] overflow-y-auto bg-gray-50">
                    {HANDWRITING_FONTS.filter(f => f.value !== 'custom').map((font) => (
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
                    {settings.customFont && (
                      <FontCard
                        font={{ name: settings.customFont.name, value: 'custom', className: '' }}
                        isSelected={settings.fontFamily === 'custom'}
                        onClick={() => {
                          setCustomFontError(null);
                          updateSetting('fontFamily', 'custom');
                        }}
                        customStyle={{ fontFamily: settings.customFont.family }}
                      />
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="relative group/grid">
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

              {totalFontPages > 1 && (
                <>
                  <button
                    onClick={handlePrevFonts}
                    className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm text-gray-400 hover:text-[#E0A32A] hover:border-[#E0A32A] transition-all opacity-0 group-hover/grid:opacity-100 -translate-x-2 group-hover/grid:translate-x-0"
                    aria-label="Previous fonts"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleNextFonts}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm text-gray-400 hover:text-[#E0A32A] hover:border-[#E0A32A] transition-all opacity-0 group-hover/grid:opacity-100 translate-x-2 group-hover/grid:translate-x-0"
                    aria-label="Next fonts"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
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
                    className="absolute -top-1.5 -right-1.5 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100 shadow-sm z-10"
                    title="Remove custom font"
                    type="button"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full aspect-[1/0.95] border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#E0A32A] hover:bg-[#E0A32A]/5 transition-all group">
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
                </label>
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

          {!hasCustomBackground && (
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
      </div>

      <Separator />

      <div>
        <div className="flex items-center gap-2 mb-5">
          <FileText className="w-5 h-5 text-[#E0A32A]" />
          <h3 className="font-semibold text-lg">Page Layout</h3>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest" htmlFor="paper-style">Paper Style</Label>
            <Select
              value={settings.paperStyle}
              onValueChange={(value) =>
                updateSetting('paperStyle', value as HandwritingSettings['paperStyle'])
              }
            >
              <SelectTrigger id="paper-style" className="bg-gray-100 border-none h-9 text-sm">
                <SelectValue placeholder="Select paper style" />
              </SelectTrigger>
              <SelectContent>
                {PAPER_STYLES.map((style) => (
                  <SelectItem key={style.value} value={style.value}>
                    {style.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

          {settings.paperStyle === 'ruled' && (
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
                          className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
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

              <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-[#E0A32A] hover:bg-gray-100/50 transition-colors">
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
              </label>
              <p className="text-[10px] text-gray-400 text-center italic">
                Image will be used as page background
              </p>
            </div>
          </div>

          {hasCustomBackground && (
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
      </div>

      <Separator />

      <div>
        <div className="flex items-center gap-2 mb-5">
          <Palette className="w-5 h-5 text-[#E0A32A]" />
          <h3 className="font-semibold text-lg">Colors</h3>
        </div>

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

          {settings.paperStyle !== 'blank' && (
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
      </div>

      <Separator />

      <div>
        <div className="flex items-center gap-2 mb-5">
          <Wand2 className="w-5 h-5 text-[#E0A32A]" />
          <h3 className="font-semibold text-lg">Realism Effects</h3>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-2 bg-gray-100 rounded-lg">
            <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest" htmlFor="randomness-toggle">Enable Randomness</Label>
            <Switch
              id="randomness-toggle"
              checked={settings.randomness.enabled}
              onCheckedChange={(checked) => updateRandomness('enabled', checked)}
            />
          </div>

          {settings.randomness.enabled && (
            <div className="space-y-6 pt-2">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Letter Spacing Variation</Label>
                  <div className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                    {settings.randomness.spacing.toFixed(1)}
                  </div>
                </div>
                <Slider
                  value={[settings.randomness.spacing]}
                  onValueChange={([value]) => updateRandomness('spacing', value)}
                  min={0}
                  max={5}
                  step={0.1}
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Baseline Variation</Label>
                  <div className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                    {settings.randomness.baseline.toFixed(1)}
                  </div>
                </div>
                <Slider
                  value={[settings.randomness.baseline]}
                  onValueChange={([value]) => updateRandomness('baseline', value)}
                  min={0}
                  max={3}
                  step={0.1}
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rotation Variation</Label>
                  <div className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                    {settings.randomness.rotation.toFixed(1)}°
                  </div>
                </div>
                <Slider
                  value={[settings.randomness.rotation]}
                  onValueChange={([value]) => updateRandomness('rotation', value)}
                  min={0}
                  max={3}
                  step={0.1}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator />

      <div className="pt-2">
        <button
          onClick={onClearAll}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-all active:scale-95 border border-red-100"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear Everything
        </button>
      </div>
    </div>
  );
}
