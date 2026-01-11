'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import HandwritingEditor from '@/components/HandwritingEditor';
import SettingsPanel from '@/components/SettingsPanel';
import ExportPanel from '@/components/ExportPanel';
import { HandwritingSettings, DEFAULT_SETTINGS, TextField } from '@/lib/types';
import { PenLine, Settings, Download, ChevronLeft, ChevronRight } from 'lucide-react';

export default function EditorPage() {
  const [text, setText] = useState('');
  const [settings, setSettings] = useState<HandwritingSettings>(DEFAULT_SETTINGS);
  const [activePanel, setActivePanel] = useState<'settings' | 'export'>('settings');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [textFields, setTextFields] = useState<TextField[]>([]);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [previewScale, setPreviewScale] = useState(1);

  const clampPreviewScale = (value: number) => Math.min(2, Math.max(0.5, value));

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#E0A32A] rounded-xl flex items-center justify-center">
              <PenLine className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">Text2Ink</span>
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
      <div className="flex-1 flex bg-gray-100 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
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
          <div className="flex-1 overflow-hidden">
            {activePanel === 'settings' ? (
              <SettingsPanel settings={settings} onSettingsChange={setSettings} />
            ) : (
              <ExportPanel pageRefs={pageRefs} hasContent={text.trim().length > 0} />
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
        <div className="flex-1 overflow-auto bg-gray-200">
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

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#E0A32A] rounded-lg flex items-center justify-center">
              <PenLine className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">Text2Ink</span>
          </div>
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Text2Ink. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
