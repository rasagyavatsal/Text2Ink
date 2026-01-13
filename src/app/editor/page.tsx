'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import HandwritingEditor from '@/components/HandwritingEditor';
import SettingsPanel from '@/components/SettingsPanel';
import ExportPanel from '@/components/ExportPanel';
import { HandwritingSettings, DEFAULT_SETTINGS, TextField } from '@/lib/types';
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

  const clampPreviewScale = (value: number) => Math.min(2, Math.max(0.5, value));

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
            <span className="font-bold text-3xl font-dancing-script">
              <span className="text-[#E0A32A]">Text</span>
              <span className="text-black">2</span>
              <span className="text-[#E0A32A]">Ink</span>
            </span>
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
          className={`bg-white border-r border-gray-200 flex flex-col min-h-0 transition-all duration-300 ${
            sidebarOpen ? 'w-96' : 'w-0'
          } overflow-hidden`}
        >
          {/* Panel Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActivePanel('settings')}
              className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activePanel === 'settings'
                  ? 'text-[#E0A32A] border-b-2 border-[#E0A32A] bg-[#E0A32A]/10'
                  : 'text-gray-600 hover:text-[#E0A32A] hover:bg-[#E0A32A]/5'
              }`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
            <button
              onClick={() => setActivePanel('export')}
              className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activePanel === 'export'
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
              <SettingsPanel settings={settings} onSettingsChange={setSettings} />
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
          className={`fixed top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 rounded-r-lg p-2.5 shadow-lg hover:shadow-xl transition-all duration-300 group ${
            sidebarOpen ? 'left-[384px]' : 'left-0'
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
              pageRefs={pageRefs}
              previewScale={previewScale}
              onPreviewScaleChange={(value: number) => setPreviewScale(clampPreviewScale(value))}
              textFields={textFields}
              onTextFieldsChange={setTextFields}
            />
          </div>
        </div>
      </div>

          </div>
  );
}
