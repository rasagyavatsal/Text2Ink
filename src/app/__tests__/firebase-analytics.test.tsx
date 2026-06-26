import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import SiteFooter from '@/components/patterns/SiteFooter';
import {
  ANALYTICS_CONSENT_STORAGE_KEY,
  CONTENTSQUARE_SCRIPT_SRC,
  PRIVACY_SETTINGS_EVENT,
} from '@/lib/privacyConsent';
import FirebaseAnalytics from '../firebase-analytics';
import { getFirebaseAnalytics } from '@/lib/firebase';

vi.mock('@/lib/firebase', () => ({
  getFirebaseAnalytics: vi.fn(),
}));

vi.mock('@/components/Version', () => ({
  default: () => <span data-testid="version">v1.23.4</span>,
}));

describe('FirebaseAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.head.querySelectorAll(`script[src="${CONTENTSQUARE_SCRIPT_SRC}"]`).forEach((script) => {
      script.remove();
    });
  });

  it('does not start analytics before consent', () => {
    render(<FirebaseAnalytics />);

    expect(screen.getByRole('dialog', { name: /privacy settings/i })).toBeInTheDocument();
    expect(getFirebaseAnalytics).not.toHaveBeenCalled();
    expect(document.head.querySelector(`script[src="${CONTENTSQUARE_SCRIPT_SRC}"]`)).toBeNull();

    fireEvent.pointerDown(window);
    fireEvent.keyDown(window);

    expect(getFirebaseAnalytics).not.toHaveBeenCalled();
    expect(document.head.querySelector(`script[src="${CONTENTSQUARE_SCRIPT_SRC}"]`)).toBeNull();
  });

  it('starts Firebase Analytics and Contentsquare once when analytics is accepted', () => {
    render(<FirebaseAnalytics />);

    fireEvent.click(screen.getByRole('button', { name: /allow analytics/i }));

    expect(localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)).toBe('accepted');
    expect(getFirebaseAnalytics).toHaveBeenCalledTimes(1);
    expect(document.head.querySelectorAll(`script[src="${CONTENTSQUARE_SCRIPT_SRC}"]`)).toHaveLength(1);

    fireEvent.keyDown(window);
    act(() => {
      window.dispatchEvent(new Event(PRIVACY_SETTINGS_EVENT));
    });
    fireEvent.click(screen.getByRole('button', { name: /allow analytics/i }));

    expect(getFirebaseAnalytics).toHaveBeenCalledTimes(1);
    expect(document.head.querySelectorAll(`script[src="${CONTENTSQUARE_SCRIPT_SRC}"]`)).toHaveLength(1);
  });

  it('stores rejection and prevents analytics script injection', () => {
    render(<FirebaseAnalytics />);

    fireEvent.click(screen.getByRole('button', { name: /reject analytics/i }));

    expect(localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY)).toBe('rejected');
    expect(screen.queryByRole('dialog', { name: /privacy settings/i })).not.toBeInTheDocument();
    expect(getFirebaseAnalytics).not.toHaveBeenCalled();

    fireEvent.pointerDown(window);
    fireEvent.keyDown(window);

    expect(getFirebaseAnalytics).not.toHaveBeenCalled();
    expect(document.head.querySelector(`script[src="${CONTENTSQUARE_SCRIPT_SRC}"]`)).toBeNull();
  });

  it('lets the footer privacy settings control reopen the consent UI', () => {
    localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, 'rejected');

    render(
      <>
        <FirebaseAnalytics />
        <SiteFooter />
      </>
    );

    expect(screen.queryByRole('dialog', { name: /privacy settings/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /privacy settings/i }));

    expect(screen.getByRole('dialog', { name: /privacy settings/i })).toBeInTheDocument();
  });
});
