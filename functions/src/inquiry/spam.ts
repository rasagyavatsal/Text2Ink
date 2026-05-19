export const ALLOWED_ORIGINS: string[] = (
  process.env.ALLOWED_ORIGINS ||
  "https://text2ink.com,https://text2ink.web.app,http://localhost:3000,http://localhost:9000"
)
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean)

export function checkHoneypot(value: string | undefined): boolean {
  return !!value && value.length > 0
}

export function checkOrigin(origin: string | undefined): boolean {
  if (!origin) return false
  return ALLOWED_ORIGINS.includes(origin)
}
