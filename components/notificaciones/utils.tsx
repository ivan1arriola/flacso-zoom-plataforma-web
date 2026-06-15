import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import {
  NOTIF_ACTIVITY_LOGIN,
  NOTIF_ACTIVITY_ZOOM_RECORDING_WEBHOOK
} from "@/src/lib/notification-activity";
import type { Notificacion, NotificationBodyField, NotificacionUsuario } from "./types";

export const NOTIFICATION_GROUP_ORDER = ["Hoy", "Ayer", "Esta semana", "Anteriores"];

export function getTipoIcon(tipo: Notificacion["tipoNotificacion"]) {
  switch (tipo) {
    case "EMAIL":
      return <EmailOutlinedIcon fontSize="small" color="primary" />;
    case "IN_APP":
      return <NotificationsActiveOutlinedIcon fontSize="small" color="info" />;
    case "ALERTA_OPERATIVA":
      return <WarningAmberOutlinedIcon fontSize="small" color="warning" />;
    default:
      return <NotificationsActiveOutlinedIcon fontSize="small" />;
  }
}

export function getTipoLabel(tipo: Notificacion["tipoNotificacion"]): string {
  switch (tipo) {
    case "EMAIL":
      return "Email";
    case "ALERTA_OPERATIVA":
      return "Alerta";
    case "IN_APP":
    default:
      return "In-App";
  }
}

export function isLoginNotification(notif: Notificacion): boolean {
  if (notif.entidadReferenciaTipo === NOTIF_ACTIVITY_LOGIN) return true;
  return /inicio de sesion/i.test(notif.asunto);
}

export function isAssistantInterestNotification(notif: Notificacion): boolean {
  return /interes asistente actualizado/i.test(notif.asunto);
}

export function isZoomRecordingWebhookNotification(notif: Notificacion): boolean {
  if (notif.entidadReferenciaTipo === NOTIF_ACTIVITY_ZOOM_RECORDING_WEBHOOK) return true;
  return /^Zoom Recording:/i.test(notif.asunto);
}

export function splitNotificationBody(body: string): {
  intro: string;
  fields: NotificationBodyField[];
} {
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return { intro: "", fields: [] };
  }

  const [intro, ...details] = lines;
  const fields = details.reduce<NotificationBodyField[]>((acc, line) => {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex <= 0) return acc;
    const label = line.slice(0, separatorIndex).replace(/^-+\s*/, "").trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!label || !value) return acc;
    acc.push({ label, value });
    return acc;
  }, []);

  return { intro, fields };
}

export function getFieldValue(fields: NotificationBodyField[], label: string): string | null {
  const normalizedLabel = label.trim().toLowerCase();
  const match = fields.find((field) => field.label.trim().toLowerCase() === normalizedLabel);
  return match?.value ?? null;
}

export function getFieldValueAny(fields: NotificationBodyField[], labels: string[]): string | null {
  for (const label of labels) {
    const value = getFieldValue(fields, label);
    if (value) return value;
  }
  return null;
}

export function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}…`;
}

export function getUserDisplay(usuario: NotificacionUsuario): string {
  if (usuario.name) return usuario.name;
  if (usuario.firstName || usuario.lastName) {
    return `${usuario.firstName ?? ""} ${usuario.lastName ?? ""}`.trim();
  }
  return usuario.email;
}

export function formatTime(dateString: string): string {
  return new Intl.DateTimeFormat("es-UY", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(dateString));
}

export function getDateGroupLabel(dateString: string): string {
  const d = new Date(dateString);
  const now = new Date();

  const diffTime = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const isToday = d.getDate() === now.getDate() &&
                  d.getMonth() === now.getMonth() &&
                  d.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.getDate() === yesterday.getDate() &&
                      d.getMonth() === yesterday.getMonth() &&
                      d.getFullYear() === yesterday.getFullYear();

  if (isToday) return "Hoy";
  if (isYesterday) return "Ayer";
  if (diffDays < 7) return "Esta semana";
  return "Anteriores";
}

export function groupNotificationsByDate(notificaciones: Notificacion[]) {
  const groups: Record<string, Notificacion[]> = {};
  notificaciones.forEach((notif) => {
    const label = getDateGroupLabel(notif.createdAt);
    if (!groups[label]) groups[label] = [];
    groups[label].push(notif);
  });
  return groups;
}
