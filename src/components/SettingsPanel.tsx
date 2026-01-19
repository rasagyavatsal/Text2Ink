'use client';

import React, { useState } from 'react';
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
  HANDWRITING_FONTS,
  PAPER_STYLES,
  INK_COLORS,
  PAPER_COLORS,
  PageSettings,
} from '@/lib/types';
import { Type, Palette, FileText, Wand2, Upload, X } from 'lucide-react';

interface SettingsPanelProps {
  settings: HandwritingSettings;
  onSettingsChange: (settings: HandwritingSettings) => void;
  currentPageIndex: number;
  totalPages: number;
}

export default function SettingsPanel({
  settings,
  onSettingsChange,
  currentPageIndex,
  totalPages,
}: SettingsPanelProps) {
  const [customFontError, setCustomFontError] = useState<string | null>(null);

  // Get effective settings for the current page
  const getCurrentPageSettings = (): PageSettings => {
    const pageOverrides = settings.perPageSettings[currentPageIndex] || {};
    return {
      paperColor: pageOverrides.paperColor ?? settings.paperColor,
      customBackgroundImage: pageOverrides.customBackgroundImage !== undefined
        ? pageOverrides.customBackgroundImage
        : settings.customBackgroundImage,
      customLineOffset: pageOverrides.customLineOffset ?? settings.customLineOffset,
      customLineSpacing: pageOverrides.customLineSpacing !== undefined
        ? pageOverrides.customLineSpacing
        : settings.customLineSpacing,
      inkColor: pageOverrides.inkColor ?? settings.inkColor,
      lineColor: pageOverrides.lineColor ?? settings.lineColor,
      paperStyle: pageOverrides.paperStyle ?? settings.paperStyle,
    };
  };

  const currentPageSettings = getCurrentPageSettings();

  const updateSetting = <K extends keyof HandwritingSettings>(
    key: K,
    value: HandwritingSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const updateSettings = (patch: Partial<HandwritingSettings>) => {
    onSettingsChange({ ...settings, ...patch });
  };

  // Update a per-page setting for the current page
  const updatePageSetting = <K extends keyof PageSettings>(
    key: K,
    value: PageSettings[K]
  ) => {
    const newPerPageSettings = { ...settings.perPageSettings };
    if (!newPerPageSettings[currentPageIndex]) {
      newPerPageSettings[currentPageIndex] = {};
    }
    newPerPageSettings[currentPageIndex] = {
      ...newPerPageSettings[currentPageIndex],
      [key]: value,
    };
    onSettingsChange({ ...settings, perPageSettings: newPerPageSettings });
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
      {/* Page Settings Header */}
      <div className="bg-gradient-to-r from-[#E0A32A]/10 to-[#E0A32A]/5 rounded-lg p-4 border border-[#E0A32A]/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#E0A32A]" />
            <span className="font-semibold text-gray-900">
              Page {currentPageIndex + 1} of {totalPages}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-600 mb-3">
          Settings below apply to the current page in preview. Use the navigation buttons in the toolbar to switch pages.
        </p>
      </div>

      <Separator />

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
                {settings.fontSize}px
              </span>
            </div>
            <Slider
              value={[settings.fontSize]}
              onValueChange={([value]) => updateSetting('fontSize', value)}
              min={14}
              max={48}
              step={1}
            />
          </div>

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

          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Line Tilt</Label>
              <span className="text-sm text-muted-foreground">
                {settings.lineTilt}°
              </span>
            </div>
            <Slider
              value={[settings.lineTilt]}
              onValueChange={([value]) => updateSetting('lineTilt', value)}
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
                  {settings.marginTop}px
                </span>
              </div>
              <Slider
                value={[settings.marginTop]}
                onValueChange={([value]) => updateSetting('marginTop', value)}
                min={20}
                max={120}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Bottom Margin</Label>
                <span className="text-sm text-muted-foreground">
                  {settings.marginBottom}px
                </span>
              </div>
              <Slider
                value={[settings.marginBottom]}
                onValueChange={([value]) => updateSetting('marginBottom', value)}
                min={20}
                max={120}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Left Margin</Label>
                <span className="text-sm text-muted-foreground">
                  {settings.marginLeft}px
                </span>
              </div>
              <Slider
                value={[settings.marginLeft]}
                onValueChange={([value]) => updateSetting('marginLeft', value)}
                min={20}
                max={120}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Right Margin</Label>
                <span className="text-sm text-muted-foreground">
                  {settings.marginRight}px
                </span>
              </div>
              <Slider
                value={[settings.marginRight]}
                onValueChange={([value]) => updateSetting('marginRight', value)}
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
              {settings.customBackgroundImage ? (
                <div className="relative">
                  <img
                    src={settings.customBackgroundImage}
                    alt="Custom background"
                    className="w-full h-24 object-cover rounded border border-input"
                  />
                  <button
                    onClick={() => updateSetting('customBackgroundImage', null)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    title="Remove background image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#E0A32A] hover:bg-[#E0A32A]/5 transition-colors">
                  <Upload className="w-6 h-6 text-gray-400 mb-1" />
                  <span className="text-sm text-gray-500">Upload PNG or JPG</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const result = event.target?.result as string;
                          updateSetting('customBackgroundImage', result);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              )}
              <p className="text-xs text-muted-foreground">
                Image will be used as page background
              </p>
            </div>
          </div>

          {settings.customBackgroundImage && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Line Offset (Y Position)</Label>
                  <span className="text-sm text-muted-foreground">
                    {settings.customLineOffset}px
                  </span>
                </div>
                <Slider
                  value={[settings.customLineOffset]}
                  onValueChange={([value]) => updateSetting('customLineOffset', value)}
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
                    {settings.customLineSpacing ?? 'Auto'}
                  </span>
                </div>
                <Slider
                  value={[settings.customLineSpacing ?? Math.round(settings.fontSize * settings.lineHeight)]}
                  onValueChange={([value]) => updateSetting('customLineSpacing', value)}
                  min={20}
                  max={80}
                  step={1}
                />
                <button
                  onClick={() => updateSetting('customLineSpacing', null)}
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
          <span className="text-xs text-gray-500 ml-auto">(per page)</span>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Ink Color</Label>
            <div className="flex flex-wrap gap-2">
              {INK_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => updatePageSetting('inkColor', color.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${currentPageSettings.inkColor === color.value
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
                  onClick={() => updatePageSetting('paperColor', color.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${currentPageSettings.paperColor === color.value
                    ? 'border-primary scale-110 shadow-md'
                    : 'border-gray-300 hover:scale-105'
                    }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {currentPageSettings.paperStyle !== 'blank' && (
            <div className="space-y-2">
              <Label>Line Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={currentPageSettings.lineColor}
                  onChange={(e) => updatePageSetting('lineColor', e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-input"
                />
                <span className="text-sm text-muted-foreground">
                  {currentPageSettings.lineColor}
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
