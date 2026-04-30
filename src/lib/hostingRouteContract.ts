type FirebaseRedirect = {
  source: string;
  destination: string;
  type: number;
};

type FirebaseRewrite = {
  source: string;
  function?: string;
  destination?: string;
};

export type FirebaseHostingConfig = {
  redirects?: FirebaseRedirect[];
  rewrites?: FirebaseRewrite[];
};

export type HostingRouteContract = {
  publicRoutes: readonly string[];
  functionRewrites: Readonly<Record<string, string>>;
  unsupportedRoutes: readonly string[];
};

type HostingHandling =
  | { kind: 'redirect'; destination: string; type: number }
  | { kind: 'rewrite'; functionName?: string; destination?: string }
  | { kind: 'passthrough' };

function normalizePath(path: string): string {
  if (path === '/') {
    return path;
  }

  return path.replace(/\/+$/, '');
}

function escapeRegex(value: string): string {
  return value.replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function matchesHostingSource(source: string, path: string): boolean {
  const normalizedSource = normalizePath(source);
  const normalizedPath = normalizePath(path);
  const doubleStarToken = '__DOUBLE_STAR__';
  const expression = `^${escapeRegex(normalizedSource)
    .replace(/\*\*/g, doubleStarToken)
    .replace(/\*/g, '[^/]*')
    .split(doubleStarToken)
    .join('.*')}$`;

  return new RegExp(expression).test(normalizedPath);
}

function resolveHostingHandling(config: FirebaseHostingConfig, path: string): HostingHandling {
  const redirect = config.redirects?.find((rule) => matchesHostingSource(rule.source, path));

  if (redirect) {
    return {
      kind: 'redirect',
      destination: redirect.destination,
      type: redirect.type,
    };
  }

  const rewrite = config.rewrites?.find((rule) => matchesHostingSource(rule.source, path));

  if (rewrite) {
    return {
      kind: 'rewrite',
      functionName: rewrite.function,
      destination: rewrite.destination,
    };
  }

  return { kind: 'passthrough' };
}

function describeHandling(handling: HostingHandling): string {
  if (handling.kind === 'redirect') {
    return `redirect ${handling.type} to ${handling.destination}`;
  }

  if (handling.kind === 'rewrite') {
    if (handling.functionName) {
      return `rewrite to function ${handling.functionName}`;
    }

    return `rewrite to ${handling.destination}`;
  }

  return 'pass through to static hosting';
}

export function validateHostingRouteContract(
  config: FirebaseHostingConfig,
  contract: HostingRouteContract,
): string[] {
  const errors: string[] = [];

  for (const route of contract.publicRoutes) {
    const handling = resolveHostingHandling(config, route);

    if (handling.kind !== 'passthrough') {
      errors.push(`Expected public route ${route} to pass through to static hosting, but it will ${describeHandling(handling)}.`);
    }
  }

  for (const [route, functionName] of Object.entries(contract.functionRewrites)) {
    const handling = resolveHostingHandling(config, route);

    if (handling.kind !== 'rewrite' || handling.functionName !== functionName) {
      errors.push(`Expected ${route} to rewrite to function ${functionName}, but it will ${describeHandling(handling)}.`);
    }
  }

  for (const route of contract.unsupportedRoutes) {
    const handling = resolveHostingHandling(config, route);

    if (handling.kind !== 'passthrough') {
      errors.push(`Expected unsupported route ${route} to remain unhandled by hosting, but it will ${describeHandling(handling)}.`);
    }
  }

  return errors;
}
