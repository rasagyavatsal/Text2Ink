const FIREBASE_PREVIEW_ORIGIN_PATTERN = "https://text2ink--preview-*.web.app"
const FIREBASE_PREVIEW_HOST_PREFIX = "text2ink--preview-"
const FIREBASE_PREVIEW_HOST_SUFFIX = ".web.app"
const DEFAULT_ALLOWED_ORIGINS = [
  "https://text2ink.com",
  "https://text2ink.web.app",
  FIREBASE_PREVIEW_ORIGIN_PATTERN,
  "http://localhost:3000",
  "http://localhost:9000",
].join(",")

export const ALLOWED_ORIGINS: string[] = (
  process.env.ALLOWED_ORIGINS ||
  DEFAULT_ALLOWED_ORIGINS
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean)

export function checkHoneypot(value: string | undefined): boolean {
  return !!value && value.length > 0
}

export function checkOrigin(origin: string | undefined): boolean {
  if (!origin) return false

  const parsedOrigin = parseUrl(origin)
  if (!parsedOrigin) return false

  return ALLOWED_ORIGINS.some((allowedOrigin) =>
    matchesAllowedOrigin(parsedOrigin, allowedOrigin)
  )
}

function matchesAllowedOrigin(origin: URL, allowedOrigin: string): boolean {
  if (allowedOrigin === FIREBASE_PREVIEW_ORIGIN_PATTERN) {
    return matchesFirebasePreviewOrigin(origin)
  }

  const parsedAllowedOrigin = parseUrl(allowedOrigin)
  return !!parsedAllowedOrigin && origin.origin === parsedAllowedOrigin.origin
}

function matchesFirebasePreviewOrigin(origin: URL): boolean {
  if (origin.protocol !== "https:" || origin.port) return false

  const hostname = origin.hostname
  if (
    !hostname.startsWith(FIREBASE_PREVIEW_HOST_PREFIX) ||
    !hostname.endsWith(FIREBASE_PREVIEW_HOST_SUFFIX)
  ) {
    return false
  }

  const previewId = hostname.slice(
    FIREBASE_PREVIEW_HOST_PREFIX.length,
    -FIREBASE_PREVIEW_HOST_SUFFIX.length
  )
  return /^[a-z0-9-]+$/.test(previewId)
}

function parseUrl(value: string): URL | undefined {
  try {
    return new URL(value)
  } catch {
    return undefined
  }
}
