import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import FirebaseAnalytics from '../firebase-analytics';
import { getFirebaseAnalytics } from '@/lib/firebase';

vi.mock('@/lib/firebase', () => ({
  getFirebaseAnalytics: vi.fn(),
}));

describe('FirebaseAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls getFirebaseAnalytics once on mount', () => {
    render(<FirebaseAnalytics />);
    expect(getFirebaseAnalytics).toHaveBeenCalledTimes(1);
  });
});
