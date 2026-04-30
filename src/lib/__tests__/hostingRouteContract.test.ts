import { describe, expect, it } from 'vitest';
import firebaseConfig from '../../../firebase.json';
import { validateHostingRouteContract } from '../hostingRouteContract';

function expectRouteContractToPass(
  contract: Parameters<typeof validateHostingRouteContract>[1],
) {
  expect(validateHostingRouteContract(firebaseConfig.hosting, contract)).toEqual([]);
}

describe('Firebase hosting route contract', () => {
  it('keeps the landing, editor, and contact routes available to static hosting', () => {
    expectRouteContractToPass({
      publicRoutes: ['/', '/editor', '/contact'],
      functionRewrites: {},
      unsupportedRoutes: [],
    });
  });

  it('leaves invalid nested editor paths unhandled so hosting can return not found', () => {
    expectRouteContractToPass({
      publicRoutes: [],
      functionRewrites: {},
      unsupportedRoutes: ['/editor/legacy-preview'],
    });
  });

  it('preserves the feedback function rewrite', () => {
    expectRouteContractToPass({
      publicRoutes: [],
      functionRewrites: {
        '/api/feedback': 'feedback',
      },
      unsupportedRoutes: [],
    });
  });

  it('flags deeply nested editor paths when a wildcard redirect would shadow them', () => {
    expect(
      validateHostingRouteContract(
        {
          redirects: [
            {
              source: '/editor/**',
              destination: '/',
              type: 301,
            },
          ],
        },
        {
          publicRoutes: [],
          functionRewrites: {},
          unsupportedRoutes: ['/editor/legacy/preview'],
        },
      ),
    ).toContain(
      'Expected unsupported route /editor/legacy/preview to remain unhandled by hosting, but it will redirect 301 to /.',
    );
  });
});
