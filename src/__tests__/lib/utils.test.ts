import { cn } from '@/lib/utils';

describe('cn', () => {
  it('joins string classnames', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy classnames', () => {
    expect(cn('a', false && 'b', undefined, null, '')).toBe('a');
  });

  it('tailwind-merges conflicting utilities', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});
