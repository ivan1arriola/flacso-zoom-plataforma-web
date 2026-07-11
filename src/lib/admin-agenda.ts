import type { Solicitud } from "@/src/services/solicitudesApi";
import { normalizeZoomMeetingId, resolveZoomJoinUrl } from "@/components/spa-tabs/spa-tabs-utils";

export type AgendaMeeting = {
  key: string;
  solicitudId: string;
  solicitudTitulo: string;
  solicitudEstado: string;
  eventId: string | null;
  occurrenceId: string | null;
  title: string;
  programaNombre: string | null;
  responsableNombre: string | null;
  docenteNombre: string | null;
  docenteEmail: string | null;
  modalidadReunion: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: string | null;
  estadoEvento: string | null;
  estadoCobertura: string | null;
  joinUrl: string | null;
  zoomMeetingId: string | null;
  zoomHostAccount: string | null;
  requiresAssistance: boolean;
  monitorNombre: string | null;
  monitorEmail: string | null;
  totalInstances: number;
  instanceIndex: number;
  isCancelled: boolean;
  isPast: boolean;
};

function normalizeText(value?: string | null): string {
  return (value ?? "").trim();
}

function resolveMeetingDurationMinutes(startTime: string, endTime?: string | null, fallback = 0): number {
  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime ?? "").getTime();
  if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs) {
    return Math.max(1, Math.round((endMs - startMs) / 60_000));
  }
  return Math.max(0, Math.round(fallback));
}

function extractZoomMeetingIdFromUrl(joinUrl?: string | null): string | null {
  if (!joinUrl) return null;
  try {
    const url = new URL(joinUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    const roomTypeIndex = parts.findIndex((part) => part === "j" || part === "w");
    if (roomTypeIndex < 0 || !parts[roomTypeIndex + 1]) return null;
    return normalizeZoomMeetingId(parts[roomTypeIndex + 1]);
  } catch {
    return null;
  }
}

function isCancelledStatus(status?: string | null): boolean {
  return status === "CANCELADO" || status === "deleted";
}

export function resolveRequestStatus(solicitud: Solicitud): string {
  return solicitud.estadoSolicitudVista ?? solicitud.estadoSolicitud;
}

export function buildAgendaMeetings(solicitudes: Solicitud[]): AgendaMeeting[] {
  const nowMs = Date.now();
  const items: AgendaMeeting[] = [];

  for (const solicitud of solicitudes) {
    const instances = [...(solicitud.zoomInstances ?? [])].sort(
      (left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime()
    );
    const totalInstances = instances.length;
    const docenteNombre = normalizeText(solicitud.requestedBy?.name) || null;
    const docenteEmail = normalizeText(solicitud.requestedBy?.email) || null;
    const requestStatus = resolveRequestStatus(solicitud);

    for (const [index, instance] of instances.entries()) {
      const startMs = new Date(instance.startTime).getTime();
      if (!Number.isFinite(startMs)) continue;

      const isCancelled =
        isCancelledStatus(instance.estadoEvento) ||
        isCancelledStatus(instance.status) ||
        requestStatus === "CANCELADA_ADMIN" ||
        requestStatus === "CANCELADA_DOCENTE";
      const endMs = new Date(instance.endTime ?? "").getTime();
      const isPast = isCancelled
        ? false
        : Number.isFinite(endMs)
          ? endMs < nowMs
          : startMs < nowMs;
      const durationMinutes = resolveMeetingDurationMinutes(
        instance.startTime,
        instance.endTime,
        instance.durationMinutes
      );
      const zoomMeetingId =
        normalizeZoomMeetingId(instance.meetingId) ??
        normalizeZoomMeetingId(solicitud.meetingPrincipalId) ??
        extractZoomMeetingIdFromUrl(instance.joinUrl ?? solicitud.zoomJoinUrl ?? null);
      const zoomHostAccount =
        normalizeText(instance.hostAccount) ||
        normalizeText(solicitud.zoomHostAccount) ||
        normalizeText(solicitud.cuentaZoomAsignada?.ownerEmail) ||
        normalizeText(solicitud.cuentaZoomAsignada?.nombreCuenta) ||
        null;
      const joinUrl = resolveZoomJoinUrl(
        instance.joinUrl ?? solicitud.zoomJoinUrl ?? null,
        zoomMeetingId
      );
      const requiresAssistance =
        typeof instance.requiereAsistencia === "boolean"
          ? instance.requiereAsistencia
          : Boolean(solicitud.requiereAsistencia ?? solicitud.requiresAsistencia);

      items.push({
        key: `${solicitud.id}:${instance.eventId ?? index}:${instance.startTime}`,
        solicitudId: solicitud.id,
        solicitudTitulo: solicitud.titulo,
        solicitudEstado: requestStatus,
        eventId: instance.eventId ?? null,
        occurrenceId: instance.occurrenceId ?? null,
        title: normalizeText(solicitud.titulo) || "Reunión sin título",
        programaNombre: normalizeText(solicitud.programaNombre) || null,
        responsableNombre: normalizeText(solicitud.responsableNombre) || null,
        docenteNombre,
        docenteEmail,
        modalidadReunion: instance.modalidadReunion ?? solicitud.modalidadReunion,
        startTime: instance.startTime,
        endTime: instance.endTime ?? instance.startTime,
        durationMinutes,
        status: instance.status ?? null,
        estadoEvento: instance.estadoEvento ?? null,
        estadoCobertura: instance.estadoCobertura ?? null,
        joinUrl,
        zoomMeetingId,
        zoomHostAccount,
        requiresAssistance,
        monitorNombre: normalizeText(instance.monitorNombre) || null,
        monitorEmail: normalizeText(instance.monitorEmail) || null,
        totalInstances,
        instanceIndex: index + 1,
        isCancelled,
        isPast
      });
    }
  }

  return items.sort(
    (left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime()
  );
}
