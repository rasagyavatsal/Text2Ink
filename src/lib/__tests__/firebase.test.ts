import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getFirebaseApp, getFirebaseAnalytics } from '../firebase';
import * as firebaseApp from 'firebase/app';
import * as firebaseAnalytics from 'firebase/analytics';

vi.mock('firebase/app', () => ({
  getApps: vi.fn(),
  initializeApp: vi.fn(),
}));

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(),
  isSupported: vi.fn(),
}));

describe('firebase helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getFirebaseApp reuses existing app', () => {
    const mockApp = {} as firebaseApp.FirebaseApp;
    vi.mocked(firebaseApp.getApps).mockReturnValue([mockApp]);
    
    const app = getFirebaseApp();
    expect(app).toBe(mockApp);
    expect(firebaseApp.initializeApp).not.toHaveBeenCalled();
  });

  it('getFirebaseApp initializes app when needed', () => {
    vi.mocked(firebaseApp.getApps).mockReturnValue([]);
    const mockApp = {} as firebaseApp.FirebaseApp;
    vi.mocked(firebaseApp.initializeApp).mockReturnValue(mockApp);
    
    const app = getFirebaseApp();
    expect(app).toBe(mockApp);
    expect(firebaseApp.initializeApp).toHaveBeenCalled();
  });

  it('getFirebaseAnalytics returns null when window is undefined', async () => {
    const originalWindow = globalThis.window;
    // @ts-ignore
    delete globalThis.window;
    
    const analytics = await getFirebaseAnalytics();
    expect(analytics).toBeNull();
    
    globalThis.window = originalWindow;
  });

  it('getFirebaseAnalytics returns null when not supported', async () => {
    vi.mocked(firebaseAnalytics.isSupported).mockResolvedValue(false);
    
    const analytics = await getFirebaseAnalytics();
    expect(analytics).toBeNull();
  });

  it('getFirebaseAnalytics returns analytics instance when supported', async () => {
    vi.mocked(firebaseAnalytics.isSupported).mockResolvedValue(true);
    const mockAnalytics = {} as firebaseAnalytics.Analytics;
    vi.mocked(firebaseAnalytics.getAnalytics).mockReturnValue(mockAnalytics);
    vi.mocked(firebaseApp.getApps).mockReturnValue([{} as firebaseApp.FirebaseApp]);
    
    const analytics = await getFirebaseAnalytics();
    expect(analytics).toBe(mockAnalytics);
  });

  it('getFirebaseAnalytics returns null when analytics initialization throws', async () => {
    vi.mocked(firebaseAnalytics.isSupported).mockResolvedValue(true);
    vi.mocked(firebaseAnalytics.getAnalytics).mockImplementation(() => {
      throw new Error('Analytics unavailable');
    });
    vi.mocked(firebaseApp.getApps).mockReturnValue([{} as firebaseApp.FirebaseApp]);

    const analytics = await getFirebaseAnalytics();
    expect(analytics).toBeNull();
  });
});
