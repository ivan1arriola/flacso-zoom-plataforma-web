export type MeetingDisplayTone = "default" | "info" | "success" | "warning" | "error";

export type MeetingDisplayState = {
  label: string;
  tone: MeetingDisplayTone;
};

export function resolveMeetingDisplayState(input: {
  requestStatus?: string | null;
  eventStatus?: string | null;
  zoomStatus?: string | null;
  coverageStatus?: string | null;
  requiresAssistance?: boolean | null;
  isPast?: boolean;
}): MeetingDisplayState {
  const requestStatus = input.requestStatus ?? "";
  const eventStatus = input.eventStatus ?? "";
  const zoomStatus = input.zoomStatus ?? "";

  if (
    requestStatus === "CANCELADA_ADMIN" ||
    requestStatus === "CANCELADA_DOCENTE" ||
    eventStatus === "CANCELADO" ||
    zoomStatus === "deleted"
  ) {
    return { label: "Cancelada", tone: "error" };
  }
  if (eventStatus === "ERROR_INTEGRACION" || requestStatus === "SIN_CAPACIDAD_ZOOM") {
    return { label: "Requiere intervención", tone: "error" };
  }
  if (eventStatus === "FINALIZADO" || input.isPast) {
    return { label: "Finalizada", tone: "default" };
  }
  if (
    input.requiresAssistance &&
    (input.coverageStatus === "REQUERIDO_SIN_ASIGNAR" || !input.coverageStatus)
  ) {
    return { label: "Requiere asistente", tone: "warning" };
  }
  if (
    input.requiresAssistance &&
    (input.coverageStatus === "ASIGNADO" || input.coverageStatus === "CONFIRMADO")
  ) {
    return { label: "Asistente asignado", tone: "info" };
  }
  if (eventStatus === "PROGRAMADO" || eventStatus === "CREADO_ZOOM" || requestStatus === "PROVISIONADA") {
    return { label: "Programada", tone: "success" };
  }
  return { label: "Pendiente", tone: "warning" };
}
