import { formatDateTime } from "@/src/lib/spa-home/recurrence";
import type { Solicitud } from "@/src/services/solicitudesApi";
import type { EditMeetingFormState } from "./types";

export function buildEmptyEditMeetingForm(): EditMeetingFormState {
  return {
    titulo: "",
    programaNombre: "",
    responsableNombre: "",
    docenteCreadorNombre: "",
    modalidadReunion: "VIRTUAL",
    inicioProgramadoAt: "",
    finProgramadoAt: ""
  };
}

export const CREATE_PROGRAMA_VALUE = "__create_programa__";

export const zoomWeekdayOptionsFull: Array<{ value: string; label: string }> = [
  { value: "1", label: "Domingo" },
  { value: "2", label: "Lunes" },
  { value: "3", label: "Martes" },
  { value: "4", label: "Miercoles" },
  { value: "5", label: "Jueves" },
  { value: "6", label: "Viernes" },
  { value: "7", label: "Sabado" }
];

export const ZOOM_ACCOUNT_COLOR_PALETTE = [
  "#0D9488",
  "#0284C7",
  "#2563EB",
  "#1D4ED8",
  "#0F766E",
  "#15803D",
  "#65A30D",
  "#CA8A04",
  "#EA580C",
  "#DC2626",
  "#BE185D",
  "#C2410C",
  "#6D28D9",
  "#5B21B6",
  "#334155",
  "#4D7C0F",
  "#0369A1",
  "#7C2D12",
  "#9F1239",
  "#166534"
];

export const ADD_INSTANCE_BUSY_MESSAGES = [
  "Guardando fecha de reunión en el sistema...",
  "Sincronizando fecha de reunión con Zoom...",
  "Actualizando datos del pedido..."
];

export function hashLabel(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getZoomAccountColor(accountLabel: string): string {
  const normalized = accountLabel.trim().toLowerCase();
  if (!normalized || normalized === "-") {
    return "#64748B";
  }
  const paletteIndex = hashLabel(normalized) % ZOOM_ACCOUNT_COLOR_PALETTE.length;
  return ZOOM_ACCOUNT_COLOR_PALETTE[paletteIndex];
}

export function parseTimeToMinutes(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function parseDurationToMinutes(value: string): number | null {
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

export function minutesToTime(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value >= 24 * 60) return "";
  const hours = Math.floor(value / 60);
  const minutes = value % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export type SpecificDateDetail = {
  horaInicio: string;
  horaFin: string;
  duracionMinutos?: string;
};

export type SpecificDateDetailMap = Record<string, SpecificDateDetail>;

export function parseSpecificDateDetails(rawInput: string): SpecificDateDetailMap {
  if (!rawInput.trim()) return {};
  try {
    const parsed = JSON.parse(rawInput) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const result: SpecificDateDetailMap = {};
    for (const [dateIso, value] of Object.entries(parsed)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) continue;
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      const horaInicio =
        typeof (value as { horaInicio?: unknown }).horaInicio === "string"
          ? (value as { horaInicio: string }).horaInicio.trim()
          : "";
      const horaFin =
        typeof (value as { horaFin?: unknown }).horaFin === "string"
          ? (value as { horaFin: string }).horaFin.trim()
          : "";
      const duracionMinutos =
        typeof (value as { duracionMinutos?: unknown }).duracionMinutos === "string"
          ? (value as { duracionMinutos: string }).duracionMinutos.trim()
          : "";
      if (!horaInicio) continue;
      result[dateIso] = {
        horaInicio,
        horaFin,
        duracionMinutos: duracionMinutos || undefined
      };
    }
    return result;
  } catch {
    return {};
  }
}

export function serializeSpecificDateDetails(details: SpecificDateDetailMap): string {
  const orderedEntries = Object.entries(details)
    .filter(([dateIso]) => /^\d{4}-\d{2}-\d{2}$/.test(dateIso))
    .sort((left, right) => left[0].localeCompare(right[0], "es"));

  const normalized: Record<string, SpecificDateDetail> = {};
  for (const [dateIso, value] of orderedEntries) {
    normalized[dateIso] = value;
  }
  return JSON.stringify(normalized);
}

export function normalizeEmailInputAsLines(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[;,]+/g, "\n")
    .replace(/\n[ \t]+/g, "\n");
}

export function toDateTimeLocalInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function extractLocalDatePart(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) return null;
  const rawDate = normalized.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return rawDate;

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());
}

export function toUtcCalendarStamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  const second = String(date.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n/g, "\\n")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

export function slugifyForFileName(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return normalized || "actividad";
}

export function parseZoomMeetingIdFromJoinUrl(joinUrl?: string | null): string | null {
  if (!joinUrl) return null;
  try {
    const parsed = new URL(joinUrl);
    const pieces = parsed.pathname.split("/").filter(Boolean);
    const roomTypeIndex = pieces.findIndex((piece) => piece === "j" || piece === "w");
    if (roomTypeIndex < 0) return null;
    const rawId = pieces[roomTypeIndex + 1] ?? "";
    const meetingId = rawId.replace(/\D/g, "");
    return meetingId || null;
  } catch {
    return null;
  }
}

export function resolveInstanceEndIso(
  instance: NonNullable<Solicitud["zoomInstances"]>[number]
): string {
  const explicitEnd = (instance.endTime ?? "").trim();
  if (explicitEnd) return explicitEnd;

  const startDate = new Date(instance.startTime);
  if (Number.isNaN(startDate.getTime())) return instance.startTime;
  const durationMinutes = Number.isFinite(instance.durationMinutes) && instance.durationMinutes > 0
    ? instance.durationMinutes
    : 60;
  return new Date(startDate.getTime() + durationMinutes * 60_000).toISOString();
}

export function buildSolicitudInstanceIcsContent(input: {
  solicitud: Pick<Solicitud, "id" | "titulo" | "programaNombre" | "meetingPrincipalId">;
  instance: NonNullable<Solicitud["zoomInstances"]>[number];
}): string {
  const startIso = input.instance.startTime;
  const endIso = resolveInstanceEndIso(input.instance);
  const dtStamp = toUtcCalendarStamp(new Date().toISOString());
  const dtStart = toUtcCalendarStamp(startIso);
  const dtEnd = toUtcCalendarStamp(endIso);
  const joinUrl = input.instance.joinUrl ?? null;
  const meetingId = parseZoomMeetingIdFromJoinUrl(joinUrl) ?? input.solicitud.meetingPrincipalId ?? "-";
  const summary = escapeIcsText(input.solicitud.titulo || "Actividad Zoom");
  const detailsLines = [
    `Solicitud: ${input.solicitud.id}`,
    `Programa: ${input.solicitud.programaNombre || "Sin programa"}`,
    `Meeting ID: ${meetingId}`,
    joinUrl ? `Zoom: ${joinUrl}` : null
  ].filter(Boolean) as string[];
  const description = escapeIcsText(detailsLines.join("\n"));

  const uidSeed = input.instance.eventId ?? input.instance.occurrenceId ?? startIso;
  const uid = `${input.solicitud.id}-${uidSeed}@flacso-uruguay`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FLACSO Uruguay//Plataforma Zoom//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    "LOCATION:Zoom",
    "END:VEVENT",
    "END:VCALENDAR"
  ];

  if (joinUrl) {
    lines.splice(lines.length - 2, 0, `URL:${escapeIcsText(joinUrl)}`);
  }

  return lines.join("\r\n");
}

export function downloadSolicitudInstanceIcs(input: {
  solicitud: Pick<Solicitud, "id" | "titulo" | "programaNombre" | "meetingPrincipalId">;
  instance: NonNullable<Solicitud["zoomInstances"]>[number];
}): void {
  const content = buildSolicitudInstanceIcsContent(input);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const dateLabel = input.instance.startTime.slice(0, 10).replace(/[^0-9]/g, "");
  const uidSeed = input.instance.eventId ?? input.instance.occurrenceId ?? "instancia";
  const fileName = `${slugifyForFileName(input.solicitud.titulo || "actividad")}-${dateLabel}-${uidSeed}.ics`;

  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export function formatFullInstanceDateTime(instance: NonNullable<Solicitud["zoomInstances"]>[number]): string {
  const startDate = new Date(instance.startTime);
  const endDate = new Date(resolveInstanceEndIso(instance));

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    // Fallback to basic date-time if parsing fails
    return formatDateTime(instance.startTime);
  }

  const weekday = new Intl.DateTimeFormat("es-UY", { weekday: "long" }).format(startDate);
  const date = new Intl.DateTimeFormat("es-UY", { day: "2-digit", month: "2-digit", year: "numeric" }).format(startDate);
  const startTime = new Intl.DateTimeFormat("es-UY", { hour: "2-digit", minute: "2-digit", hour12: false }).format(startDate);
  const endTime = new Intl.DateTimeFormat("es-UY", { hour: "2-digit", minute: "2-digit", hour12: false }).format(endDate);

  return `${weekday}, ${date} ${startTime} - ${endTime}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
