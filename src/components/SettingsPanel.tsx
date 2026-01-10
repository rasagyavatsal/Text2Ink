'use client';

import React from 'react';
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
} from '@/lib/types';
import { Type, Palette, FileText, Sparkles } from 'lucide-react';

interface SettingsPanelProps {
  settings: HandwritingSettings;
  onSettingsChange: (settings: HandwritingSettings) => void;
}

export default function SettingsPanel({
  settings,
  onSettingsChange,
}: SettingsPanelProps) {
  const updateSetting = <K extends keyof HandwritingSettings>(
    key: K,
    value: HandwritingSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
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
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Type className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Typography</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="font">Handwriting Style</Label>
            <Select
              value={settings.fontFamily}
              onValueChange={(value) => updateSetting('fontFamily', value)}
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
        </div>
      </div>

      <Separator />

      <div>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Page Layout</h3>
        </div>

        <div className="space-y-4">
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
        </div>
      </div>

      <Separator />

      <div>
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Colors</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Ink Color</Label>
            <div className="flex flex-wrap gap-2">
              {INK_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => updateSetting('inkColor', color.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    settings.inkColor === color.value
                      ? 'border-primary scale-110 shadow-md'
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
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    settings.paperColor === color.value
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
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Realism Effects</h3>
        </div>

        <div className="space-y-4">
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
