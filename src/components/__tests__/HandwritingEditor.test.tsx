import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import HandwritingEditor from '../HandwritingEditor';
import { HandwritingSettings, DEFAULT_SETTINGS } from '../../lib/types';
import React from 'react';

// Mock the canvas and other browser APIs not available in JSDOM
vi.mock('../../lib/canvasRenderer', () => ({
  renderCanvas: vi.fn(),
}));

vi.mock('../../lib/renderer/UnifiedPagePainter', () => ({
  UnifiedPagePainter: {
    paintPage: vi.fn(),
    computeCharacterPositions: vi.fn().mockReturnValue([]),
    paintCursorOverlay: vi.fn(),
    paintSelectionOverlay: vi.fn(),
  },
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
}));

// Mock Worker
global.Worker = class {
    postMessage = vi.fn();
    terminate = vi.fn();
    addEventListener = vi.fn();
    removeEventListener = vi.fn();
} as any;

describe('HandwritingEditor Positioning', () => {
  it('renders text field container with correct transform', () => {
    const settings: HandwritingSettings = {
      ...DEFAULT_SETTINGS,
      fontSize: 24,
      lineHeight: 1.8,
    };
    
    const textFields = [
      { id: 'tf1', x: 100, y: 100, text: 'Hello', pageIndex: 0 }
    ];

    render(
      <HandwritingEditor
        text=""
        settings={settings}
        onTextChange={() => {}}
        onSettingsChange={() => {}}
        pageSettingsByPage={[]}
        previewScale={1}
        onPreviewScaleChange={() => {}}
        editorMode="write"
        onEditorModeChange={() => {}}
        textFields={textFields}
        onTextFieldsChange={() => {}}
        currentPageIndex={0}
        onCurrentPageChange={() => {}}
        onTotalPagesChange={() => {}}
      />
    );

    const textField = screen.getByLabelText('Text field tf1');
    const style = window.getComputedStyle(textField);
    
    // We expect the transform to have the new correct centered horizontal translation and adjusted vertical translation
    expect(style.transform).toContain('translate(-10px, -14px)');

    // We expect the height to be larger than the base line height (43.2px) to accommodate descenders
    const height = parseFloat(style.minHeight);
    expect(height).toBeGreaterThan(43.2);
    expect(height).toBe(63.2); // 43.2 + 20
  });
});
