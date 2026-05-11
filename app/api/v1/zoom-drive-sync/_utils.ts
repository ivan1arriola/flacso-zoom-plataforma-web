import { UserRole } from "@prisma/client";
import { getSessionUser } from "@/src/lib/api-auth";
import { env } from "@/src/lib/env";

const SYNC_BACKEND_PROD_URL = "https://zoom-drive-sync-cbty.onrender.com";
const SYNC_BACKEND_LOCAL_URL = "http://localhost:8000";

export type ZoomDriveSyncProxyConnection = {
  apiBaseUrl: string;
  apiKey?: string;
};

export type ZoomDriveSyncProxyConfigInput = {
  zoomGroupId?: string;
};

type ProxyRequestBody = {
  config?: ZoomDriveSyncProxyConfigInput;
};

type ProxyBackendErrorPayload = {
  error: string;
  ok?: boolean;
  settingsPreview?: unknown;
  checks?: unknown[];
  hints?: string[];
  details?: string;
};

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeProxyErrorPayload(payload: Record<string, unknown>): ProxyBackendErrorPayload {
  const detail = payload.detail;
  const detailRecord = detail && typeof detail === "object" ? (detail as Record<string, unknown>) : null;
  const source = detailRecord ?? payload;
  const errorMessage =
    asText(source.message) ||
    asText(source.error) ||
    asText(payload.detail) ||
    asText(payload.error) ||
    asText(payload.message) ||
    "No se pudo completar la solicitud al backend de sincronizacion.";

  const normalized: ProxyBackendErrorPayload = { error: errorMessage };

  if (typeof source.ok === "boolean") {
    normalized.ok = source.ok;
  }
  if (source.settingsPreview && typeof source.settingsPreview === "object") {
    normalized.settingsPreview = source.settingsPreview;
  }
  if (Array.isArray(source.checks)) {
    normalized.checks = source.checks;
  }
  if (Array.isArray(source.hints)) {
    normalized.hints = source.hints;
  }
  const details = asText(source.details);
  if (details) {
    normalized.details = details;
  }

  return normalized;
}

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function isLocalhostUrl(value: string): boolean {
  const normalized = normalizeUrl(value);
  try {
    const url = new URL(normalized);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return normalized.includes("localhost") || normalized.includes("127.0.0.1");
  }
}

export function resolveZoomDriveSyncApiBaseUrl(): string {
  const envDefault = normalizeUrl(env.ZOOM_DRIVE_SYNC_API_BASE_URL ?? "");

  if (env.NODE_ENV === "production") {
    const forcedProdUrl = normalizeUrl(SYNC_BACKEND_PROD_URL);
    if (isLocalhostUrl(forcedProdUrl)) {
      throw new Error("No se permite localhost como backend de sincronizacion en produccion.");
    }
    return forcedProdUrl;
  }

  const fallback = envDefault || normalizeUrl(SYNC_BACKEND_LOCAL_URL);
  if (!fallback) {
    throw new Error("Debes indicar la URL del backend de sincronizacion.");
  }

  return fallback;
}

export async function requireAdminForZoomDriveSync() {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false as const, status: 401, body: { error: "Unauthorized" } };
  }
  if (user.role !== UserRole.ADMINISTRADOR) {
    return { ok: false as const, status: 403, body: { error: "Forbidden" } };
  }
  return { ok: true as const };
}

export async function parseProxyRequestBody(request: Request): Promise<{
  connection: ZoomDriveSyncProxyConnection;
  config: ZoomDriveSyncProxyConfigInput;
}> {
  let body: ProxyRequestBody = {};
  try {
    body = (await request.json()) as ProxyRequestBody;
  } catch {
    body = {};
  }

  const apiBaseUrl = resolveZoomDriveSyncApiBaseUrl();
  const apiKey = cleanString(env.ZOOM_DRIVE_SYNC_API_KEY);
  if (!apiKey) {
    throw new Error(
      "Falta ZOOM_DRIVE_SYNC_API_KEY en variables del servidor web. Debe existir para autenticar contra el backend de sincronizacion."
    );
  }
  return {
    connection: {
      apiBaseUrl,
      apiKey
    },
    config: body.config ?? {}
  };
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function buildBackendSyncConfig(input: ZoomDriveSyncProxyConfigInput): Record<string, unknown> {
  const zoomClientId = cleanString(env.ZOOM_CLIENT_ID);
  const zoomClientSecret = cleanString(env.ZOOM_CLIENT_SECRET);
  const zoomAccountId = cleanString(env.ZOOM_ACCOUNT_ID);
  const driveDestinationId = cleanString(env.DRIVE_DESTINATION_ID);
  const googleServiceAccountEmail = cleanString(env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
  const googlePrivateKey = cleanString(env.GOOGLE_PRIVATE_KEY);
  const googleServiceAccountSubject = cleanString(env.GOOGLE_SERVICE_ACCOUNT_SUBJECT);

  if (!zoomClientId || !zoomClientSecret || !zoomAccountId) {
    throw new Error(
      "Faltan credenciales Zoom en variables del servidor web (ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, ZOOM_ACCOUNT_ID)."
    );
  }

  if (!googleServiceAccountEmail || !googlePrivateKey) {
    throw new Error(
      "Faltan credenciales Google Service Account en variables del servidor web (GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY)."
    );
  }

  if (!driveDestinationId) {
    throw new Error(
      "Falta DRIVE_DESTINATION_ID en variables del servidor web. El destino en Drive se administra solo desde configuracion del servidor."
    );
  }

  const config: Record<string, unknown> = {
    ZOOM_CLIENT_ID: zoomClientId,
    ZOOM_CLIENT_SECRET: zoomClientSecret,
    ZOOM_ACCOUNT_ID: zoomAccountId,
    ZOOM_API_BASE: cleanString(env.ZOOM_API_BASE) || "https://api.zoom.us/v2",
    ZOOM_GROUP_ID: cleanString(input.zoomGroupId) || cleanString(env.ZOOM_GROUP_ID),
    TIMEZONE: cleanString(env.TIMEZONE) || "America/Montevideo",
    DRIVE_DESTINATION_ID: driveDestinationId,
    GOOGLE_SERVICE_ACCOUNT_EMAIL: googleServiceAccountEmail,
    GOOGLE_PRIVATE_KEY: googlePrivateKey,
    GOOGLE_SERVICE_ACCOUNT_SUBJECT: googleServiceAccountSubject
  };

  const compact: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(config)) {
    if (typeof value === "string" && value.trim() === "") continue;
    compact[key] = value;
  }
  return compact;
}

export async function proxyToSyncBackend<T>(
  path: string,
  connection: ZoomDriveSyncProxyConnection,
  config: Record<string, unknown>
): Promise<{
  ok: boolean;
  status: number;
  json: T | { error: string };
}> {
  const base = connection.apiBaseUrl.replace(/\/+$/, "");
  const target = `${base}${path}`;
  try {
    const response = await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(connection.apiKey ? { "X-API-Key": connection.apiKey } : {})
      },
      body: JSON.stringify({ config }),
      cache: "no-store"
    });
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        json: normalizeProxyErrorPayload(payload)
      };
    }
    return {
      ok: true,
      status: response.status,
      json: payload as T
    };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      json: {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo conectar con el backend de sincronizacion."
      }
    };
  }
}
