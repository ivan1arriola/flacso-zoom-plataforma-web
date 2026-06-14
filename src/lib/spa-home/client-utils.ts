import type { BusyOperationKey, CurrentUser, ZoomPastMonthOption } from "@/src/lib/spa-home/client-types";

export const DEFAULT_ZOOM_PAST_MONTHS_BACK = 1;
export const MAX_ZOOM_PAST_MONTHS_BACK = 12;

export const BUSY_MESSAGES: Record<BusyOperationKey, string[]> = {
  BOOTSTRAP: [
    "Cargando tu espacio de trabajo...",
    "Verificando sesion y permisos...",
    "Preparando informacion inicial..."
  ],
  SUBMIT_SOLICITUD: [
    "Validando datos de la solicitud...",
    "Buscando cuenta Zoom libre...",
    "Reservando horario disponible...",
    "Guardando solicitud en el sistema...",
    "Finalizando registro y notificaciones..."
  ],
  DELETE_SOLICITUD: [
    "Eliminando solicitud...",
    "Desvinculando reunion en Zoom..."
  ],
  CANCEL_SERIE: [
    "Cancelando serie completa...",
    "Actualizando estado de instancias..."
  ],
  CANCEL_INSTANCIA: [
    "Cancelando instancia seleccionada...",
    "Sincronizando cambios..."
  ],
  RESTORE_INSTANCIA: [
    "Descancelando instancia...",
    "Resincronizando Zoom con la app..."
  ],
  UPDATE_ASISTENCIA: [
    "Actualizando asistencia Zoom...",
    "Aplicando cambios en instancias activas..."
  ],
  GENERIC: ["Procesando..."]
};

export async function readJsonSafe<T>(response: Response): Promise<T | null> {
  const text = await response.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function buildZoomPastMonthOptions(
  maxMonthsBack = MAX_ZOOM_PAST_MONTHS_BACK
): ZoomPastMonthOption[] {
  const now = new Date();
  const startOfCurrentMonth = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const formatter = new Intl.DateTimeFormat("es-UY", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });

  return Array.from({ length: maxMonthsBack }, (_unused, index) => {
    const monthDate = new Date(startOfCurrentMonth);
    monthDate.setUTCMonth(monthDate.getUTCMonth() - index);
    const value = `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, "0")}`;
    return {
      value,
      label: formatter.format(monthDate),
      monthsBack: index + 1
    };
  });
}

export function parseEmailLines(raw: string): string[] {
  const unique = new Set<string>();
  for (const line of raw.split(/\r?\n/)) {
    const normalized = line.trim().toLowerCase();
    if (!normalized) continue;
    unique.add(normalized);
  }
  return Array.from(unique.values());
}

export function resolveSnackbarSeverity(
  message: string
): "success" | "info" | "warning" | "error" {
  const normalized = message.trim().toLowerCase();
  if (!normalized) return "info";

  if (
    /(no se pudo|error|fall[oó]|no autenticado|unauthorized|inv[aá]lido|debes|denegad|prohibido|vencido|falta)/i.test(
      normalized
    )
  ) {
    return /(no autenticado|unauthorized|denegad|error|prohibido)/i.test(normalized)
      ? "error"
      : "warning";
  }

  if (
    /(correctamente|enviado|cread|actualizad|registrad|habilitad|sincronizad|listo|eliminad|cancelad|descancelad|resuelto|asignacion)/i.test(
      normalized
    )
  ) {
    return "success";
  }

  return "info";
}

export function resolveUserAccessEmails(
  user?: Pick<CurrentUser, "email" | "emails"> | null
): string[] {
  if (!user) return [];
  const unique = new Set<string>();
  const primary = user.email?.trim().toLowerCase();
  if (primary) unique.add(primary);
  for (const email of user.emails ?? []) {
    const normalized = email.trim().toLowerCase();
    if (!normalized) continue;
    unique.add(normalized);
  }
  return Array.from(unique.values());
}
