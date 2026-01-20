'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import HandwritingEditor from '@/components/HandwritingEditor';
import SettingsPanel from '@/components/SettingsPanel';
import ExportPanel from '@/components/ExportPanel';
import { HandwritingSettings, DEFAULT_SETTINGS, TextField, HANDWRITING_FONTS } from '@/lib/types';
import { Settings, Download, ChevronLeft, ChevronRight } from 'lucide-react';

export default function EditorPage() {
  const [isMobileBlocked, setIsMobileBlocked] = useState(false);
  const [text, setText] = useState('');
  const [settings, setSettings] = useState<HandwritingSettings>(DEFAULT_SETTINGS);
  const [activePanel, setActivePanel] = useState<'settings' | 'export'>('settings');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [textFields, setTextFields] = useState<TextField[]>([]);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [previewScale, setPreviewScale] = useState(1);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [fontMetricsVersion, setFontMetricsVersion] = useState(0);

  const clampPreviewScale = (value: number) => Math.min(2, Math.max(0.5, value));

  // Calculate total pages (same logic as HandwritingEditor)
  const totalPages = useMemo(() => {
    const PAGE_WIDTH = 612;
    const PAGE_HEIGHT = 792;
    const contentHeight = PAGE_HEIGHT - settings.marginTop - settings.marginBottom;
    const ruledTextLeft =
      settings.paperStyle === 'ruled' && !settings.customBackgroundImage
        ? settings.marginLeft + settings.ruledMarginLineOffset + 10
        : settings.marginLeft;
    const ruledTextWidth = PAGE_WIDTH - ruledTextLeft - settings.marginRight;
    const baseLineHeightPx = settings.fontSize * settings.lineHeight;
    const lineHeightPx = settings.customBackgroundImage && settings.customLineSpacing
      ? settings.customLineSpacing
      : baseLineHeightPx;
    const linesPerPage = Math.floor(contentHeight / lineHeightPx);

    const approxCharWidth = settings.fontSize * 0.6;
    const maxCharsPerLine = Math.max(1, Math.floor(ruledTextWidth / approxCharWidth));

    const measureTextWidth = (() => {
      const fallback = (s: string) => s.length * approxCharWidth;
      if (typeof document === 'undefined' || typeof window === 'undefined') return fallback;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return fallback;

      const fontClass = (() => {
        if (settings.fontFamily === 'custom' && !settings.customFont) {
          return HANDWRITING_FONTS[0].className;
        }
        const font = HANDWRITING_FONTS.find((f) => f.value === settings.fontFamily);
        return font?.className || HANDWRITING_FONTS[0].className;
      })();

      const customFontFamily =
        settings.fontFamily === 'custom' && settings.customFont
          ? settings.customFont.family
          : null;

      let font = `400 ${settings.fontSize}px cursive`;
      try {
        const probe = document.createElement('span');
        probe.className = fontClass;
        probe.style.position = 'absolute';
        probe.style.visibility = 'hidden';
        probe.style.left = '-9999px';
        probe.style.top = '-9999px';
        probe.style.fontSize = `${settings.fontSize}px`;
        if (customFontFamily) {
          probe.style.fontFamily = `\"${customFontFamily}\", cursive`;
        }
        document.body.appendChild(probe);
        const cs = window.getComputedStyle(probe);
        font = cs.font || font;
        probe.remove();
      } catch { }

      ctx.font = font;
      return (s: string) => ctx.measureText(s).width;
    })();

    const rawLines = text.split('\n');
    let wrappedLineCount = 0;

    const maxWidth = ruledTextWidth;

    const findMaxFittingIndex = (s: string) => {
      if (s.length === 0) return 0;
      if (typeof document === 'undefined' || typeof window === 'undefined') {
        return Math.max(1, Math.min(s.length, maxCharsPerLine));
      }

      let low = 1;
      let high = s.length;
      let best = 1;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const w = measureTextWidth(s.slice(0, mid));
        if (w <= maxWidth) {
          best = mid;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
      return Math.max(1, Math.min(best, s.length));
    };

    for (const raw of rawLines) {
      if (raw.length === 0) {
        wrappedLineCount += 1;
        continue;
      }

      const tokens = raw.match(/\S+|\s+/g) ?? [raw];
      let current = '';

      const flush = () => {
        wrappedLineCount += 1;
        current = '';
      };

      for (const token of tokens) {
        if (token === '') continue;

        const candidate = current + token;
        if (current !== '' && measureTextWidth(candidate) <= maxWidth) {
          current = candidate;
          continue;
        }

        if (current !== '' && measureTextWidth(candidate) > maxWidth) {
          flush();
        }

        if (measureTextWidth(token) <= maxWidth) {
          current += token;
          continue;
        }

        let rest = token;
        while (rest.length > 0 && measureTextWidth(rest) > maxWidth) {
          const fit = findMaxFittingIndex(rest);
          const chunk = rest.slice(0, fit);
          if (chunk.length === 0) break;
          wrappedLineCount += 1;
          rest = rest.slice(fit);
        }

        if (rest.length > 0) {
          current += rest;
        }
      }

      if (current !== '') {
        flush();
      }
    }

    return Math.max(1, Math.ceil(wrappedLineCount / Math.max(1, linesPerPage)));
  }, [
    text,
    settings.marginTop,
    settings.marginBottom,
    settings.marginLeft,
    settings.marginRight,
    settings.fontFamily,
    settings.customFont,
    settings.paperStyle,
    settings.customBackgroundImage,
    settings.customLineSpacing,
    settings.fontSize,
    settings.lineHeight,
    settings.ruledMarginLineOffset,
    fontMetricsVersion,
  ]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const fonts = document.fonts;
    if (!fonts) return;

    let cancelled = false;
    const bump = () => {
      if (cancelled) return;
      setFontMetricsVersion((v) => v + 1);
    };

    fonts.ready.then(bump).catch(() => { });
    fonts.addEventListener('loadingdone', bump);
    fonts.addEventListener('loadingerror', bump);
    return () => {
      cancelled = true;
      fonts.removeEventListener('loadingdone', bump);
      fonts.removeEventListener('loadingerror', bump);
    };
  }, [settings.fontFamily, settings.customFont, settings.fontSize]);

  useEffect(() => {
    const isLikelyMobile = () => {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const uaMobile = /Mobi|Android|iPhone|iPad|iPod|IEMobile|Windows Phone/i.test(ua);
      const smallViewport = typeof window !== 'undefined' ? window.innerWidth < 1024 : false;
      const coarsePointer =
        typeof window !== 'undefined' && typeof window.matchMedia === 'function'
          ? window.matchMedia('(pointer: coarse)').matches
          : false;

      return uaMobile || (smallViewport && coarsePointer);
    };

    const update = () => setIsMobileBlocked(isLikelyMobile());

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  if (isMobileBlocked) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Image
              src="/logo-without-background.png"
              alt="Text2Ink logo"
              width={48}
              height={48}
              className="w-12 h-12"
              priority
            />
            <span className="font-bold text-2xl text-gray-900">Text2Ink</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Editor is desktop-only</h1>
          <p className="text-gray-600 mt-3">
            Please open this page on a desktop/laptop for the best experience.
          </p>
          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center justify-center bg-[#E0A32A] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#c99225] transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-gray-200 shrink-0">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="font-bold text-3xl font-dancing-script hover:text-[#E0A32A] transition-colors">
              <span className="text-[#E0A32A]">Text</span>
              <span className="text-black">2</span>
              <span className="text-[#E0A32A]">Ink</span>
            </Link>
          </div>
          <Link
            href="/"
            className="bg-[#E0A32A] text-white px-5 py-2 rounded-lg font-medium hover:bg-[#c99225] transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 bg-gray-100 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`bg-white border-r border-gray-200 flex flex-col min-h-0 transition-all duration-300 ${sidebarOpen ? 'w-96' : 'w-0'
            } overflow-hidden`}
        >
          {/* Panel Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActivePanel('settings')}
              className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activePanel === 'settings'
                ? 'text-[#E0A32A] border-b-2 border-[#E0A32A] bg-[#E0A32A]/10'
                : 'text-gray-600 hover:text-[#E0A32A] hover:bg-[#E0A32A]/5'
                }`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button
              onClick={() => setActivePanel('export')}
              className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activePanel === 'export'
                ? 'text-[#E0A32A] border-b-2 border-[#E0A32A] bg-[#E0A32A]/10'
                : 'text-gray-600 hover:text-[#E0A32A] hover:bg-[#E0A32A]/5'
                }`}
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            {activePanel === 'settings' ? (
              <SettingsPanel
                settings={settings}
                onSettingsChange={setSettings}
              />
            ) : (
              <ExportPanel
                pageRefs={pageRefs}
                hasContent={text.trim().length > 0}
                settings={settings}
              />
            )}
          </div>
        </div>

        {/* Toggle Sidebar Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`fixed top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 rounded-r-lg p-2.5 shadow-lg hover:shadow-xl transition-all duration-300 group ${sidebarOpen ? 'left-[384px]' : 'left-0'
            }`}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-5 h-5 text-gray-600 group-hover:text-[#E0A32A] transition-colors" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-[#E0A32A] transition-colors" />
          )}
        </button>

        {/* Main Content - Editor */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-gray-200">
          <div className="min-h-full flex justify-center">
            <HandwritingEditor
              text={text}
              onTextChange={setText}
              settings={settings}
              onSettingsChange={setSettings}
              pageRefs={pageRefs}
              previewScale={previewScale}
              onPreviewScaleChange={(value: number) => setPreviewScale(clampPreviewScale(value))}
              textFields={textFields}
              onTextFieldsChange={setTextFields}
              currentPageIndex={currentPageIndex}
              onCurrentPageChange={setCurrentPageIndex}
            />
          </div>
        </div>
      </div>

    </div>
  );
}
