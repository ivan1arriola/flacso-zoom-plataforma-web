export const CURRENT_SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Secure-flacsozoom.session-token"
    : "flacsozoom.session-token";

export const LEGACY_SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token"
] as const;

export const SESSION_COOKIE_NAMES = [
  CURRENT_SESSION_COOKIE_NAME,
  ...LEGACY_SESSION_COOKIE_NAMES
] as const;

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production"
};

export function isSessionCookieName(name: string): boolean {
  return SESSION_COOKIE_NAMES.some(
    (cookieName) => name === cookieName || name.startsWith(`${cookieName}.`)
  );
}

export function normalizeSessionCookieName(name: string): string {
  if (
    name === CURRENT_SESSION_COOKIE_NAME ||
    name.startsWith(`${CURRENT_SESSION_COOKIE_NAME}.`)
  ) {
    return name;
  }

  for (const legacyName of LEGACY_SESSION_COOKIE_NAMES) {
    if (name === legacyName) {
      return CURRENT_SESSION_COOKIE_NAME;
    }
    if (name.startsWith(`${legacyName}.`)) {
      return `${CURRENT_SESSION_COOKIE_NAME}${name.slice(legacyName.length)}`;
    }
  }

  return name;
}
