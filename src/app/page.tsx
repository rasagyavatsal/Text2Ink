'use client';

import React, { useState, useRef } from 'react';
import HandwritingEditor from '@/components/HandwritingEditor';
import SettingsPanel from '@/components/SettingsPanel';
import ExportPanel from '@/components/ExportPanel';
import { HandwritingSettings, DEFAULT_SETTINGS } from '@/lib/types';
import { PenLine, Settings, Download, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Home() {
  const [text, setText] = useState('');
  const [settings, setSettings] = useState<HandwritingSettings>(DEFAULT_SETTINGS);
  const [activePanel, setActivePanel] = useState<'settings' | 'export'>('settings');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <div
        className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'w-80' : 'w-0'
        } overflow-hidden`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <PenLine className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-gray-900">Text2Ink</h1>
              <p className="text-xs text-gray-500">Text to Handwriting</p>
            </div>
          </div>
        </div>

        {/* Panel Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActivePanel('settings')}
            className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activePanel === 'settings'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
          <button
            onClick={() => setActivePanel('export')}
            className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activePanel === 'export'
                ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
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
            <ExportPanel pageRefs={pageRefs} />
          )}
        </div>
      </div>

      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-gray-200 rounded-r-lg p-2 shadow-md hover:bg-gray-50 transition-all"
        style={{ left: sidebarOpen ? '318px' : '0' }}
      >
        {sidebarOpen ? (
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-600" />
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
          />
        </div>
      </div>
    </div>
  );
}
