import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render } from '@testing-library/react';
import FirebaseAnalytics, { ANALYTICS_START_DELAY_MS } from '../firebase-analytics';
import { getFirebaseAnalytics } from '@/lib/firebase';

vi.mock('@/lib/firebase', () => ({
  getFirebaseAnalytics: vi.fn(),
}));

describe('FirebaseAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    document.head.querySelectorAll('script[src="https://t.contentsquare.net/uxa/ea250cc30afee.js"]').forEach((script) => {
      script.remove();
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('defers analytics until user intent or the fallback delay', () => {
    render(<FirebaseAnalytics />);

    expect(getFirebaseAnalytics).not.toHaveBeenCalled();
    expect(document.head.querySelector('script[src="https://t.contentsquare.net/uxa/ea250cc30afee.js"]')).toBeNull();

    fireEvent.pointerDown(window);

    expect(getFirebaseAnalytics).toHaveBeenCalledTimes(1);
    expect(document.head.querySelector('script[src="https://t.contentsquare.net/uxa/ea250cc30afee.js"]')).toBeInTheDocument();

    fireEvent.keyDown(window);
    act(() => {
      vi.advanceTimersByTime(ANALYTICS_START_DELAY_MS);
    });

    expect(getFirebaseAnalytics).toHaveBeenCalledTimes(1);
  });

  it('starts analytics after the fallback delay when there is no user intent', () => {
    render(<FirebaseAnalytics />);

    act(() => {
      vi.advanceTimersByTime(ANALYTICS_START_DELAY_MS - 1);
    });

    expect(getFirebaseAnalytics).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(getFirebaseAnalytics).toHaveBeenCalledTimes(1);
  });
});
