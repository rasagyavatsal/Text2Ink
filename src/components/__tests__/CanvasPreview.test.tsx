import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import CanvasPreview from '../CanvasPreview';
import { DEFAULT_SETTINGS, defaultPageSettingsFromHandwritingSettings } from '@/lib/types';

// Mock UnifiedPagePainter
vi.mock('@/lib/renderer/UnifiedPagePainter', () => ({
  UnifiedPagePainter: {
    paintPage: vi.fn(),
    computeCharacterPositions: vi.fn().mockReturnValue([]),
    paintCursorOverlay: vi.fn(),
    paintSelectionOverlay: vi.fn(),
  },
}));

const defaultProps = {
  lines: [{ text: 'Hello', lineIndex: 0, hasNewline: false }],
  pageSettings: defaultPageSettingsFromHandwritingSettings(DEFAULT_SETTINGS),
  settings: DEFAULT_SETTINGS,
  textFields: [],
  pageIndex: 0,
  previewScale: 1,
  fontFamily: 'Caveat, cursive',
};

describe('CanvasPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a canvas element', () => {
    render(<CanvasPreview {...defaultProps} />);
    const canvas = screen.getByRole('img');
    expect(canvas).toBeDefined();
    expect(canvas.tagName).toBe('CANVAS');
  });

  it('sets the canvas aria-label for accessibility', () => {
    render(<CanvasPreview {...defaultProps} pageIndex={2} />);
    const canvas = screen.getByRole('img');
    expect(canvas.getAttribute('aria-label')).toContain('Page 3');
  });
});
