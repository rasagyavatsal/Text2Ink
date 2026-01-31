describe('firebase', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('getFirebaseApp returns existing app when present', async () => {
    const existingApp = { name: 'existing' };

    const getApps = jest.fn(() => [existingApp]);
    const initializeApp = jest.fn();

    jest.doMock('firebase/app', () => ({
      __esModule: true,
      getApps,
      initializeApp,
    }));

    jest.doMock('firebase/analytics', () => ({
      __esModule: true,
      getAnalytics: jest.fn(),
      isSupported: jest.fn(async () => false),
    }));

    const { getFirebaseApp } = await import('@/lib/firebase');

    expect(getFirebaseApp()).toBe(existingApp);
    expect(initializeApp).not.toHaveBeenCalled();
  });

  it('getFirebaseApp initializes app when none exist', async () => {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'k';
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'd';
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'p';
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 's';
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = 'm';
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = 'a';
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = 'mid';

    const createdApp = { name: 'new' };

    const getApps = jest.fn(() => []);
    const initializeApp = jest.fn(() => createdApp);

    jest.doMock('firebase/app', () => ({
      __esModule: true,
      getApps,
      initializeApp,
    }));

    jest.doMock('firebase/analytics', () => ({
      __esModule: true,
      getAnalytics: jest.fn(),
      isSupported: jest.fn(async () => false),
    }));

    const { getFirebaseApp } = await import('@/lib/firebase');

    expect(getFirebaseApp()).toBe(createdApp);
    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(initializeApp).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'k',
        authDomain: 'd',
        projectId: 'p',
        storageBucket: 's',
        messagingSenderId: 'm',
        appId: 'a',
        measurementId: 'mid',
      })
    );
  });

  it('getFirebaseAnalytics returns null when analytics not supported', async () => {
    const app = { name: 'existing' };

    jest.doMock('firebase/app', () => ({
      __esModule: true,
      getApps: jest.fn(() => [app]),
      initializeApp: jest.fn(),
    }));

    const getAnalytics = jest.fn();
    const isSupported = jest.fn(async () => false);

    jest.doMock('firebase/analytics', () => ({
      __esModule: true,
      getAnalytics,
      isSupported,
    }));

    const { getFirebaseAnalytics } = await import('@/lib/firebase');

    await expect(getFirebaseAnalytics()).resolves.toBeNull();
    expect(isSupported).toHaveBeenCalledTimes(1);
    expect(getAnalytics).not.toHaveBeenCalled();
  });

  it('getFirebaseAnalytics returns analytics when supported', async () => {
    const app = { name: 'existing' };
    const analytics = { name: 'a' };

    jest.doMock('firebase/app', () => ({
      __esModule: true,
      getApps: jest.fn(() => [app]),
      initializeApp: jest.fn(),
    }));

    const getAnalytics = jest.fn(() => analytics);
    const isSupported = jest.fn(async () => true);

    jest.doMock('firebase/analytics', () => ({
      __esModule: true,
      getAnalytics,
      isSupported,
    }));

    const { getFirebaseAnalytics } = await import('@/lib/firebase');

    await expect(getFirebaseAnalytics()).resolves.toBe(analytics);
    expect(getAnalytics).toHaveBeenCalledWith(app);
  });
});
