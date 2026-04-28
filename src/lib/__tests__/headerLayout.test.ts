import { describe, expect, it } from 'vitest';
import { getGlobalHeaderGutterClassName, HEADER_LAYOUT_POLICY } from '@/lib/headerLayout';

describe('header layout policy', () => {
  it('keeps app and utility pages on the same full-width gutter contract', () => {
    expect(HEADER_LAYOUT_POLICY.maxWidthClassName).toBe('max-w-full');
    expect(getGlobalHeaderGutterClassName()).toContain('max-w-full');
    expect(getGlobalHeaderGutterClassName()).toContain('px-4');
    expect(getGlobalHeaderGutterClassName()).toContain('sm:px-6');
  });
});
