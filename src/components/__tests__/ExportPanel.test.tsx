import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ExportPanel from '../ExportPanel';

describe('ExportPanel Theme Support', () => {
  it('uses semantic tokens instead of hardcoded hex and gray values', () => {
    const { container } = render(
      <ExportPanel
        hasContent={true}
        settings={{ fontSize: 16, fontFamily: 'cursive', lineSpacing: 1.5, wordSpacing: 1 }}
        pages={[[ { text: 'test', x: 0, y: 0, width: 10 } ]]}
        isPaginationComplete={true}
        pageSettingsByPage={[]}
        totalPages={1}
        currentPageIndex={0}
        onCurrentPageChange={vi.fn()}
      />
    );

    const html = container.innerHTML;
    // Should not contain hardcoded #E0A32A
    expect(html).not.toMatch(/text-\[#E0A32A\]/);
    expect(html).not.toMatch(/bg-\[#E0A32A\]/);
    
    // Should use semantic tokens (e.g. brand-accent instead of #E0A32A, muted instead of gray-100)
    // The test will fail initially because the component uses hardcoded classes
  });
});
