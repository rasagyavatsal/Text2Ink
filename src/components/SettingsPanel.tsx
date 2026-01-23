'use client';

import React, { useState } from 'react';
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
import { Separator } from '@/components/ui/separator';
import {
  HandwritingSettings,
  PageSettings,
  HANDWRITING_FONTS,
  PAPER_STYLES,
  INK_COLORS,
  PAPER_COLORS,
} from '@/lib/types';
import { Type, Palette, FileText, Wand2, Upload, X } from 'lucide-react';

interface SettingsPanelProps {
  settings: HandwritingSettings;
  onSettingsChange: (settings: HandwritingSettings) => void;
  pageSettings: PageSettings;
  onPageSettingsChange: (pageSettings: PageSettings) => void;
  currentPageIndex: number;
}

export default function SettingsPanel({
  settings,
  onSettingsChange,
  pageSettings,
  onPageSettingsChange,
  currentPageIndex,
}: SettingsPanelProps) {
  const [customFontError, setCustomFontError] = useState<string | null>(null);

  const hasCustomBackground =
    (settings.customBackgroundImages?.length ?? 0) > 0 || !!settings.customBackgroundImage;

  const effectiveBackgroundImages =
    (settings.customBackgroundImages?.length ?? 0) > 0
      ? settings.customBackgroundImages
      : settings.customBackgroundImage
        ? [settings.customBackgroundImage]
        : [];



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
    <div className="p-6 space-y-8">

      <div className="text-xs text-muted-foreground">
        Editing page {currentPageIndex + 1}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-5">
          <Type className="w-5 h-5 text-[#E0A32A]" />
          <h3 className="font-semibold text-lg">Typography</h3>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="font">Handwriting Style</Label>
            <Select
              value={settings.fontFamily}
              onValueChange={(value) => {
                setCustomFontError(null);
                updateSetting('fontFamily', value);
              }}
            >
              <SelectTrigger id="font">
                <SelectValue placeholder="Select font" />
              </SelectTrigger>
              <SelectContent>
                {HANDWRITING_FONTS.map((font) => (
                  <SelectItem
                    key={font.value}
                    value={font.value}
                    className={font.className}
                  >
                    {font.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Custom Font</Label>
            <div className="space-y-2">
              {settings.customFont ? (
                <div className="relative">
                  <div className="rounded-lg border border-input px-3 py-2">
                    <div className="text-sm font-medium truncate">
                      {settings.customFont.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {settings.customFont.format.toUpperCase()}
                    </div>
                  </div>
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
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    title="Remove custom font"
                    type="button"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#E0A32A] hover:bg-[#E0A32A]/5 transition-colors">
                  <Upload className="w-6 h-6 text-gray-400 mb-1" />
                  <span className="text-sm text-gray-500">Upload TTF or OTF</span>
                  <input
                    type="file"
                    accept=".ttf,.otf,font/ttf,font/otf,application/x-font-ttf,application/x-font-opentype"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;

                      setCustomFontError(null);

                      const lowerName = file.name.toLowerCase();
                      const format = lowerName.endsWith('.ttf')
                        ? ('truetype' as const)
                        : lowerName.endsWith('.otf')
                          ? ('opentype' as const)
                          : null;

                      if (!format) {
                        setCustomFontError('Please upload a .ttf or .otf font file.');
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

                        const safeBase = file.name
                          .replace(/\.(ttf|otf)$/i, '')
                          .replace(/[^a-z0-9_-]/gi, '')
                          .slice(0, 30);
                        const family = `Text2InkCustom-${safeBase || 'Font'}-${Date.now()}`;

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
                <p className="text-xs text-red-600">{customFontError}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Upload a custom handwriting font (.ttf or .otf). It will be available in the Handwriting Style dropdown.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Font Size</Label>
              <span className="text-sm text-muted-foreground">
                {pageSettings.fontSize}px
              </span>
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
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Line Height</Label>
                <span className="text-sm text-muted-foreground">
                  {settings.lineHeight.toFixed(1)}
                </span>
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

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Line Tilt</Label>
              <span className="text-sm text-muted-foreground">
                {pageSettings.lineTilt}°
              </span>
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

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="paper-style">Paper Style</Label>
            <Select
              value={settings.paperStyle}
              onValueChange={(value) =>
                updateSetting('paperStyle', value as HandwritingSettings['paperStyle'])
              }
            >
              <SelectTrigger id="paper-style">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Top Margin</Label>
                <span className="text-sm text-muted-foreground">
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

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Bottom Margin</Label>
                <span className="text-sm text-muted-foreground">
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

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Left Margin</Label>
                <span className="text-sm text-muted-foreground">
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

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Right Margin</Label>
                <span className="text-sm text-muted-foreground">
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
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Margin Line Offset</Label>
                <span className="text-sm text-muted-foreground">
                  {settings.ruledMarginLineOffset}px
                </span>
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

          <div className="space-y-2">
            <Label>Custom Background Image</Label>
            <div className="space-y-2">
              {effectiveBackgroundImages.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    {effectiveBackgroundImages.map((src, idx) => (
                      <div key={`${idx}-${src.slice(0, 30)}`} className="relative">
                        <NextImage
                          src={src}
                          alt={`Custom background ${idx + 1}`}
                          width={256}
                          height={128}
                          className="w-full h-16 object-cover rounded border border-input"
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
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
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
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove all
                  </button>
                </div>
              )}

              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#E0A32A] hover:bg-[#E0A32A]/5 transition-colors">
                <Upload className="w-6 h-6 text-gray-400 mb-1" />
                <span className="text-sm text-gray-500">Upload PNG or JPG</span>
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = '';
                    if (files.length === 0) return;

                    const readAsDataURL = (file: File) =>
                      new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onerror = () => reject(new Error('Failed to read image'));
                        reader.onload = (event) => resolve(event.target?.result as string);
                        reader.readAsDataURL(file);
                      });

                    Promise.all(files.map(readAsDataURL))
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
              <p className="text-xs text-muted-foreground">
                Image will be used as page background
              </p>
            </div>
          </div>

          {hasCustomBackground && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Line Offset (Y Position)</Label>
                  <span className="text-sm text-muted-foreground">
                    {pageSettings.customLineOffset}px
                  </span>
                </div>
                <Slider
                  value={[pageSettings.customLineOffset]}
                  onValueChange={([value]) => updatePageSetting('customLineOffset', value)}
                  min={-50}
                  max={50}
                  step={1}
                />
                <p className="text-xs text-muted-foreground">
                  Adjust vertical position of text to match background lines
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Custom Line Spacing</Label>
                  <span className="text-sm text-muted-foreground">
                    {pageSettings.customLineSpacing ?? 'Auto'}
                  </span>
                </div>
                <Slider
                  value={[pageSettings.customLineSpacing ?? Math.round(pageSettings.fontSize * settings.lineHeight)]}
                  onValueChange={([value]) => updatePageSetting('customLineSpacing', value)}
                  min={20}
                  max={80}
                  step={1}
                />
                <button
                  onClick={() => updatePageSetting('customLineSpacing', null)}
                  className="text-xs text-[#E0A32A] hover:underline"
                >
                  Reset to auto
                </button>
                <p className="text-xs text-muted-foreground">
                  Match spacing between lines in your background image
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <Separator />

      <div>
        <div className="flex items-center gap-2 mb-5">
          <Palette className="w-5 h-5 text-[#E0A32A]" />
          <h3 className="font-semibold text-lg">Colors</h3>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Ink Color</Label>
            <div className="flex flex-wrap gap-2">
              {INK_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => updateSetting('inkColor', color.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${settings.inkColor === color.value
                    ? 'border-[#E0A32A] scale-110 shadow-md'
                    : 'border-transparent hover:scale-105'
                    }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Paper Color</Label>
            <div className="flex flex-wrap gap-2">
              {PAPER_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => updateSetting('paperColor', color.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${settings.paperColor === color.value
                    ? 'border-primary scale-110 shadow-md'
                    : 'border-gray-300 hover:scale-105'
                    }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {settings.paperStyle !== 'blank' && (
            <div className="space-y-2">
              <Label>Line Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.lineColor}
                  onChange={(e) => updateSetting('lineColor', e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-input"
                />
                <span className="text-sm text-muted-foreground">
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

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <Label htmlFor="randomness-toggle">Enable Randomness</Label>
            <Switch
              id="randomness-toggle"
              checked={settings.randomness.enabled}
              onCheckedChange={(checked) => updateRandomness('enabled', checked)}
            />
          </div>

          {settings.randomness.enabled && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Letter Spacing Variation</Label>
                  <span className="text-sm text-muted-foreground">
                    {settings.randomness.spacing.toFixed(1)}
                  </span>
                </div>
                <Slider
                  value={[settings.randomness.spacing]}
                  onValueChange={([value]) => updateRandomness('spacing', value)}
                  min={0}
                  max={5}
                  step={0.1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Baseline Variation</Label>
                  <span className="text-sm text-muted-foreground">
                    {settings.randomness.baseline.toFixed(1)}
                  </span>
                </div>
                <Slider
                  value={[settings.randomness.baseline]}
                  onValueChange={([value]) => updateRandomness('baseline', value)}
                  min={0}
                  max={3}
                  step={0.1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Rotation Variation</Label>
                  <span className="text-sm text-muted-foreground">
                    {settings.randomness.rotation.toFixed(1)}°
                  </span>
                </div>
                <Slider
                  value={[settings.randomness.rotation]}
                  onValueChange={([value]) => updateRandomness('rotation', value)}
                  min={0}
                  max={3}
                  step={0.1}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
