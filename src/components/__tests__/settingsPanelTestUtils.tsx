import React from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import SettingsPanel from '../SettingsPanel';
import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '@/lib/types';

export function createSettingsPanelCallbacks() {
  return {
    onSettingsChange: vi.fn(),
    onPageSettingsChange: vi.fn(),
    onPreviewScaleChange: vi.fn(),
    onCurrentPageChange: vi.fn(),
    onClearAll: vi.fn(),
    onApplyToAllPages: vi.fn(),
  };
}

export function createSettingsPanelProps(overrides: Record<string, any> = {}) {
  const settings = overrides.hasOwnProperty('settings') ? overrides.settings : DEFAULT_SETTINGS;
  const pageSettings = overrides.hasOwnProperty('pageSettings') ? overrides.pageSettings : defaultPageSettingsFromHandwritingSettings(settings);

  return {
    settings,
    pageSettings,
    currentPageIndex: 0,
    previewScale: 1,
    totalPages: 1,
    isPaginationComplete: true,
    pages: [[]] as any,
    ...createSettingsPanelCallbacks(),
    ...overrides,
  };
}

export function renderSettingsPanel(overrides: Record<string, any> = {}) {
  const props = createSettingsPanelProps(overrides);
  const renderResult = render(<SettingsPanel {...(props as any)} />);
  return {
    ...renderResult,
    props,
  };
}
