// Prefer the configured base URL so old tabs or alternate ports can't leak in.
export function getBaseUrl() {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (env) return env;                       // use .env first
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}
