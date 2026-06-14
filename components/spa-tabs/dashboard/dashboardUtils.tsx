"use client";

import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import EventNoteIcon from "@mui/icons-material/EventNote";
import GroupIcon from "@mui/icons-material/Group";
import Groups2Icon from "@mui/icons-material/Groups2";
import PaymentsIcon from "@mui/icons-material/Payments";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import ScheduleIcon from "@mui/icons-material/Schedule";
import SchoolIcon from "@mui/icons-material/School";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import type { DashboardSummary } from "@/src/services/dashboardApi";
import type { MonthlyAccountingPreview, PersonHoursMeeting } from "@/src/services/tarifasApi";
import type {
  AccountingTotals,
  AssistantCard,
  AssistantMonthlyCard,
  AssistantStats,
  DashboardMetricKey,
  DashboardRole,
  DashboardRoleConfig,
  DashboardStatus,
  MetricCardItem,
  MonthlyAccountingAssistantGroup,
  SemanticMetricColor
} from "./types";

export const SEMANTIC_METRIC_COLORS: Record<SemanticMetricColor, string> = {
  info: "#0288D1",
  success: "#2E7D32",
  warning: "#ED6C02",
  error: "#D32F2F"
};

export const MONTHLY_ACCOUNTING_DRIVE_FOLDER_URL =
  "https://drive.google.com/drive/folders/1cclS5bIINgXsrOtwbL1uo5tbvkAlf9jz?usp=drive_link";

export function resolveMetricSemanticColor(metric: MetricCardItem, value: number): SemanticMetricColor {
  if (value === 0 && (metric.semanticColor === "warning" || metric.semanticColor === "error")) {
    return "info";
  }
  return metric.semanticColor;
}

export function metricValue(summary: DashboardSummary, key: DashboardMetricKey): number {
  return typeof summary[key] === "number" ? Number(summary[key]) : 0;
}

export function formatHours(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1).replace(".", ",")} h`;
}

export function formatMonthKey(monthKey: string): string {
  const [yearRaw = "0", monthRaw = "1"] = monthKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return monthKey;
  const date = new Date(Date.UTC(year, Math.max(0, month - 1), 1));
  return date.toLocaleDateString("es-UY", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function compareMonthKeysDesc(left: string, right: string): number {
  const [leftYearRaw = "0", leftMonthRaw = "0"] = left.split("-");
  const [rightYearRaw = "0", rightMonthRaw = "0"] = right.split("-");
  const leftYear = Number(leftYearRaw);
  const leftMonth = Number(leftMonthRaw);
  const rightYear = Number(rightYearRaw);
  const rightMonth = Number(rightMonthRaw);

  if (!Number.isFinite(leftYear) || !Number.isFinite(leftMonth)) return 1;
  if (!Number.isFinite(rightYear) || !Number.isFinite(rightMonth)) return -1;
  if (leftYear !== rightYear) return rightYear - leftYear;
  return rightMonth - leftMonth;
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function getPreviousMonthKey(): string {
  const [yearRaw = "0", monthRaw = "1"] = getCurrentMonthKey().split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const previousYear = month === 1 ? year - 1 : year;
  const previousMonth = month === 1 ? 12 : month - 1;
  return `${previousYear}-${String(previousMonth).padStart(2, "0")}`;
}

export function toMonthKey(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMoney(value: number, currency: string): string {
  const rounded = Math.round(value * 100) / 100;
  const amount = rounded.toFixed(2).replace(".", ",");
  return currency ? `${currency} ${amount}` : amount;
}

export function formatDateTime24(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-UY", {
    dateStyle: "short",
    timeStyle: "short",
    hour12: false
  });
}

export function formatAccountingModalidad(value: string): string {
  if (value === "VIRTUAL") return "Virtual";
  if (value === "HIBRIDA") return "Hibrida";
  return value;
}

export function groupMonthlyAccountingPreview(preview: MonthlyAccountingPreview): MonthlyAccountingAssistantGroup[] {
  const rowsByAssistant = new Map<string, MonthlyAccountingPreview["rows"]>();
  for (const row of preview.rows) {
    const existing = rowsByAssistant.get(row.assistantId);
    if (existing) {
      existing.push(row);
    } else {
      rowsByAssistant.set(row.assistantId, [row]);
    }
  }

  return preview.assistants.map((assistant) => ({
    assistant,
    rows: rowsByAssistant.get(assistant.assistantId) ?? []
  }));
}

export type InterestState = "ME_INTERESA" | "NO_ME_INTERESA" | "RETIRADO" | "SIN_RESPUESTA";

export function resolveInterestState(value?: string | null): InterestState {
  if (value === "ME_INTERESA") return "ME_INTERESA";
  if (value === "RETIRADO") return "RETIRADO";
  if (value === "NO_ME_INTERESA") return "NO_ME_INTERESA";
  return "SIN_RESPUESTA";
}

export function normalizeZoomMeetingId(value?: string | null): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  if (!digits) return null;
  return /^\d{9,13}$/.test(digits) ? digits : null;
}

export function extractZoomMeetingIdFromJoinUrl(joinUrl?: string | null): string | null {
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

export function resolveMeetingId(meeting: PersonHoursMeeting): string | null {
  return normalizeZoomMeetingId(meeting.zoomMeetingId) ?? extractZoomMeetingIdFromJoinUrl(meeting.zoomJoinUrl);
}

export function resolveMeetingJoinUrl(meeting: PersonHoursMeeting): string | null {
  const explicit = (meeting.zoomJoinUrl ?? "").trim();
  if (explicit) return explicit;
  const meetingId = resolveMeetingId(meeting);
  return meetingId ? `https://zoom.us/j/${meetingId}` : null;
}

export function resolveMeetingAccount(meeting: PersonHoursMeeting): string | null {
  const candidates = [meeting.zoomHostAccount, meeting.zoomAccountEmail, meeting.zoomAccountName];
  for (const candidate of candidates) {
    const normalized = (candidate ?? "").trim();
    if (normalized) return normalized;
  }
  return null;
}

export function isFutureAssignedMeeting(meeting: PersonHoursMeeting, nowMs: number): boolean {
  if (!["ASIGNADO", "ACEPTADO"].includes(meeting.estadoAsignacion)) return false;
  if (meeting.estadoEvento === "CANCELADO") return false;
  if (meeting.isCompleted) return false;

  const start = new Date(meeting.inicioAt).getTime();
  const endRaw = new Date(meeting.finAt).getTime();
  const end = Number.isFinite(endRaw) ? endRaw : start;
  return Number.isFinite(end) && end >= nowMs;
}

export function compareMeetingByStartAsc(left: PersonHoursMeeting, right: PersonHoursMeeting): number {
  return new Date(left.inicioAt).getTime() - new Date(right.inicioAt).getTime();
}

export function formatTimeUntil(targetIso: string, nowMs: number): string {
  const targetMs = new Date(targetIso).getTime();
  if (!Number.isFinite(targetMs)) return "Sin horario";

  const diffMs = targetMs - nowMs;
  if (diffMs <= 0) return "Comienza ahora";

  const totalMinutes = Math.ceil(diffMs / 60000);
  if (totalMinutes < 60) return `En ${totalMinutes} min`;

  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;
  if (totalHours < 24) return `En ${totalHours} h ${remainingMinutes} min`;

  const days = Math.floor(totalHours / 24);
  const remainingHours = totalHours % 24;
  return `En ${days} d ${remainingHours} h`;
}

export async function copyTextToClipboard(value: string): Promise<boolean> {
  if (!value) return false;

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      return false;
    }
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  } catch {
    return false;
  }
}

export function deriveAdminStatus(summary: DashboardSummary): DashboardStatus {
  const reunionesCanceladasEnZoom = metricValue(summary, "reunionesCanceladasEnZoom");
  const manualPendings = metricValue(summary, "manualPendings");
  const solicitudesNoResueltas = metricValue(summary, "solicitudesNoResueltas");
  const colisionesZoom7d = metricValue(summary, "colisionesZoom7d");
  const eventosSinAsistencia7d = metricValue(summary, "eventosSinAsistencia7d");
  const totalManual = manualPendings + solicitudesNoResueltas;

  if (reunionesCanceladasEnZoom > 0) {
    return {
      label: "Crítico",
      color: "error",
      message: `Hay ${reunionesCanceladasEnZoom} reunión(es) activa(s) en la app que ya fueron canceladas o eliminadas en Zoom.`
    };
  }

  if (colisionesZoom7d > 0) {
    return {
      label: "Conflicto",
      color: "error",
      message: `Hay ${colisionesZoom7d} colisiones de Zoom detectadas en los próximos 7 días.`
    };
  }

  if (eventosSinAsistencia7d > 0) {
    return {
      label: "Incompleto",
      color: "warning",
      message: `Hay ${eventosSinAsistencia7d} reuniones sin personal asignado próximamente.`
    };
  }

  if (totalManual > 0 && totalManual !== 1) {
    return {
      label: "Gestión",
      color: "warning",
      message: `Tienes ${totalManual} pedidos que requieren intervención manual.`
    };
  }

  return {
    label: "Operativo",
    color: "success",
    message: "El sistema se encuentra operando normalmente sin bloqueos críticos."
  };
}

export function buildZoomCancellationDetectionLabel(
  alert: NonNullable<DashboardSummary["alertasReunionesCanceladasEnZoom"]>[number]
): string {
  return alert.detection === "MEETING_NOT_FOUND"
    ? "El meeting ya no existe en Zoom."
    : "La fecha fue eliminada dentro de la recurrencia en Zoom.";
}

export function deriveAssistantStatus(summary: DashboardSummary): DashboardStatus {
  const agendaDisponible = metricValue(summary, "agendaDisponible");
  const misPostulaciones = metricValue(summary, "misPostulaciones");
  const misAsignacionesProximas = metricValue(summary, "misAsignacionesProximas");
  const workload = agendaDisponible * 2 + misPostulaciones + misAsignacionesProximas * 3;

  if (misAsignacionesProximas >= 4 || workload >= 18) {
    return {
      label: "Alta demanda",
      color: "error",
      message: "Tu carga operativa es alta. Conviene revisar agenda y próximas coberturas."
    };
  }

  if (agendaDisponible > 0 || misPostulaciones > 0 || misAsignacionesProximas > 0) {
    return {
      label: "En curso",
      color: "warning",
      message: "Tienes actividad abierta entre agenda, postulaciones o reuniones asignadas."
    };
  }

  return {
    label: "Libre",
    color: "success",
    message: "No tienes pendientes inmediatos de asistencia."
  };
}

export function deriveAccountingStatus(summary: DashboardSummary): DashboardStatus {
  const reunionesCompletadasMes = metricValue(summary, "reunionesCompletadasMes");
  const horasCompletadasMes = metricValue(summary, "horasCompletadasMes");
  const personasActivasMes = metricValue(summary, "personasActivasMes");

  if (reunionesCompletadasMes >= 25 || horasCompletadasMes >= 80) {
    return {
      label: "Alta carga",
      color: "warning",
      message: "El mes acumula bastante ejecución. Conviene revisar cierres y consistencia."
    };
  }

  if (reunionesCompletadasMes > 0 || personasActivasMes > 0) {
    return {
      label: "Con movimiento",
      color: "success",
      message: "Ya hay actividad ejecutada para control y liquidación."
    };
  }

  return {
    label: "Sin cierres",
    color: "warning",
    message: "Todavía no hay actividad ejecutada en el periodo actual."
  };
}

export function deriveDocenteStatus(summary: DashboardSummary): DashboardStatus {
  const solicitudesTotales = metricValue(summary, "solicitudesTotales");
  const solicitudesActivas = metricValue(summary, "solicitudesActivas");
  const proximasReuniones = metricValue(summary, "proximasReuniones");

  if (solicitudesTotales <= 0) {
    return {
      label: "Sin actividad",
      color: "warning",
      message: "Todavía no tienes pedidos registrados."
    };
  }

  if (solicitudesActivas > 0 || proximasReuniones > 0) {
    return {
      label: "En seguimiento",
      color: "success",
      message: "Tus pedidos y reuniones próximas están bajo seguimiento."
    };
  }

  return {
    label: "Al día",
    color: "success",
    message: "No hay gestiones pendientes visibles en este momento."
  };
}

export function buildRoleConfig(role: DashboardRole, summary: DashboardSummary): DashboardRoleConfig {
  if (role === "DOCENTE") {
    return {
      title: "Mi actividad académica",
      subtitle: "Gestión centralizada de tus sesiones y pedidos de Zoom.",
      headerIcon: <SchoolIcon fontSize="small" />,
      background: "linear-gradient(135deg, rgba(23,95,161,0.10) 0%, rgba(56,132,255,0.12) 100%)",
      metrics: [
        {
          key: "solicitudesTotales",
          title: "Mis pedidos",
          description: "Total de programas o pedidos creados.",
          semanticColor: "info",
          icon: <AssignmentTurnedInIcon fontSize="small" />
        },
        {
          key: "proximasReuniones",
          title: "Próximas sesiones",
          description: "Cantidad de encuentros sincrónicos.",
          semanticColor: "success",
          icon: <ScheduleIcon fontSize="small" />
        }
      ],
      status: deriveDocenteStatus(summary),
      priorityItems:
        metricValue(summary, "solicitudesTotales") > 0
          ? [
              `${metricValue(summary, "proximasReuniones")} sesión(es) futura(s) calendarizada(s).`,
              `${metricValue(summary, "reunionesConZoom")} sesión(es) con link de Zoom generado.`
            ]
          : ["No hay pedidos registrados en tu perfil.", "Crea un nuevo pedido para iniciar la gestión de tu reunión."]
    };
  }

  if (role === "ASISTENTE_ZOOM") {
    const misHorasVirtualesMes = metricValue(summary, "misHorasVirtualesMes");
    const misHorasPresencialesMes = metricValue(summary, "misHorasPresencialesMes");
    const misHorasVirtualesMesAnterior = metricValue(summary, "misHorasVirtualesMesAnterior");
    const misHorasPresencialesMesAnterior = metricValue(summary, "misHorasPresencialesMesAnterior");

    return {
      title: "Mi panel de asistencia",
      subtitle: "Priorizado para tu próxima reunión y para tomar reuniones disponibles sin asignar.",
      headerIcon: <SupportAgentIcon fontSize="small" />,
      background: "linear-gradient(135deg, rgba(10,93,72,0.10) 0%, rgba(56,161,105,0.14) 100%)",
      metrics: [
        {
          key: "agendaDisponible",
          title: "Reuniones disponibles",
          description: "Eventos abiertos que todavía pueden tomarse.",
          semanticColor: "success",
          icon: <EventAvailableIcon fontSize="small" />
        },
        {
          key: "misPostulaciones",
          title: "Mis postulaciones",
          description: "Eventos donde marcaste interés.",
          semanticColor: "warning",
          icon: <PendingActionsIcon fontSize="small" />
        },
        {
          key: "misAsignacionesProximas",
          title: "Mis próximas reuniones",
          description: "Reuniones futuras ya asignadas a tu perfil.",
          semanticColor: "info",
          icon: <ScheduleIcon fontSize="small" />
        },
        {
          key: "misHorasMes",
          title: "Horas del mes",
          description: `Virtual ${formatHours(misHorasVirtualesMes)} | Presencial ${formatHours(misHorasPresencialesMes)}.`,
          semanticColor: "success",
          icon: <ScheduleIcon fontSize="small" />,
          formatValue: formatHours
        },
        {
          key: "misHorasMesAnterior",
          title: "Horas del mes pasado",
          description: `Virtual ${formatHours(misHorasVirtualesMesAnterior)} | Presencial ${formatHours(misHorasPresencialesMesAnterior)}.`,
          semanticColor: "info",
          icon: <EventNoteIcon fontSize="small" />,
          formatValue: formatHours
        }
      ],
      status: deriveAssistantStatus(summary),
      priorityItems: []
    };
  }

  if (role === "CONTADURIA") {
    return {
      title: "Seguimiento contable",
      subtitle: "Vista enfocada en ejecución del periodo y volumen a revisar para liquidación.",
      headerIcon: <PaymentsIcon fontSize="small" />,
      background: "linear-gradient(135deg, rgba(126,77,13,0.10) 0%, rgba(214,158,46,0.14) 100%)",
      metrics: [
        {
          key: "reunionesCompletadasMes",
          title: "Reuniones ejecutadas",
          description: "Eventos ejecutados en el mes actual.",
          semanticColor: "warning",
          icon: <EventNoteIcon fontSize="small" />
        },
        {
          key: "horasCompletadasMes",
          title: "Horas ejecutadas",
          description: "Horas de asistencia acumuladas en el mes.",
          semanticColor: "info",
          icon: <ScheduleIcon fontSize="small" />,
          formatValue: formatHours
        },
        {
          key: "personasActivasMes",
          title: "Personas con actividad",
          description: "Asistentes con reuniones ejecutadas en el mes.",
          semanticColor: "success",
          icon: <GroupIcon fontSize="small" />
        }
      ],
      status: deriveAccountingStatus(summary),
      priorityItems: []
    };
  }

  return {
    title: "Panel de Gestión Administrativa",
    subtitle: "Vista priorizada de la operación crítica y el pulso del sistema.",
    headerIcon: <AssignmentTurnedInIcon fontSize="small" />,
    background: "linear-gradient(135deg, rgba(15,23,42,0.08) 0%, rgba(56,189,248,0.1) 100%)",
    metrics: [
      {
        key: "solicitudesActivas",
        title: "Pedidos vigentes",
        description: "En curso o programadas para el futuro.",
        semanticColor: "success",
        icon: <PendingActionsIcon fontSize="small" />
      },
      {
        key: "proximasReuniones",
        title: "Agenda hoy y mañana",
        description: "Carga operativa inmediata del sistema.",
        semanticColor: "info",
        icon: <EventNoteIcon fontSize="small" />
      },
      {
        key: "personasActivasMes",
        title: "Asistentes activos",
        description: "Personal con actividad en el mes actual.",
        semanticColor: "info",
        icon: <Groups2Icon fontSize="small" />
      }
    ],
    status: deriveAdminStatus(summary),
    priorityItems: []
  };
}

export function buildAssistantMonthlyCards(input: {
  assistantCards: AssistantCard[];
  selectedMonthKey: string;
  virtualRate: number;
  hibridaRate: number;
}): AssistantMonthlyCard[] {
  return input.assistantCards.map(({ person, meetings }) => {
    const monthMeetings = meetings
      .filter((meeting) => meeting.isCompleted && (!input.selectedMonthKey || toMonthKey(meeting.inicioAt) === input.selectedMonthKey))
      .sort((left, right) => new Date(right.inicioAt).getTime() - new Date(left.inicioAt).getTime());

    const virtualMinutes = monthMeetings.reduce(
      (acc, meeting) => (meeting.modalidadReunion === "VIRTUAL" ? acc + meeting.minutos : acc),
      0
    );
    const hibridaMinutes = monthMeetings.reduce(
      (acc, meeting) => (meeting.modalidadReunion === "HIBRIDA" ? acc + meeting.minutos : acc),
      0
    );
    const totalMinutes = virtualMinutes + hibridaMinutes;
    const virtualHours = Math.round((virtualMinutes / 60) * 100) / 100;
    const hibridaHours = Math.round((hibridaMinutes / 60) * 100) / 100;
    const totalHours = Math.round((totalMinutes / 60) * 100) / 100;

    return {
      person,
      meetings,
      monthMeetings,
      virtualHours,
      hibridaHours,
      totalHours,
      totalMinutes,
      estimatedPayment: virtualHours * input.virtualRate + hibridaHours * input.hibridaRate
    };
  });
}

export function calculateAccountingTotals(cards: AssistantMonthlyCard[]): AccountingTotals {
  return cards.reduce(
    (acc, card) => ({
      virtualHours: acc.virtualHours + card.virtualHours,
      hibridaHours: acc.hibridaHours + card.hibridaHours,
      totalHours: acc.totalHours + card.totalHours,
      totalEstimated: acc.totalEstimated + card.estimatedPayment,
      assistantsWithActivity: acc.assistantsWithActivity + (card.totalMinutes > 0 ? 1 : 0)
    }),
    {
      virtualHours: 0,
      hibridaHours: 0,
      totalHours: 0,
      totalEstimated: 0,
      assistantsWithActivity: 0
    }
  );
}

export function calculateAssistantStats(meetings: PersonHoursMeeting[], nowMs: number): AssistantStats {
  const now = new Date(nowMs);
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const stats: AssistantStats = {
    prevMonthVirtual: 0,
    prevMonthHibrida: 0,
    currentMonthPastVirtual: 0,
    currentMonthPastHibrida: 0,
    currentMonthFutureVirtual: 0,
    currentMonthFutureHibrida: 0
  };

  for (const meeting of meetings) {
    const start = new Date(meeting.inicioAt);
    const time = start.getTime();
    if (!Number.isFinite(time)) continue;

    const monthKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
    const hours = meeting.minutos / 60;
    const isVirtual = meeting.modalidadReunion === "VIRTUAL";
    const isHibrida = meeting.modalidadReunion === "HIBRIDA";

    if (monthKey === prevMonthKey) {
      if (isVirtual) stats.prevMonthVirtual += hours;
      if (isHibrida) stats.prevMonthHibrida += hours;
    } else if (monthKey === currentMonthKey) {
      if (time < nowMs) {
        if (isVirtual) stats.currentMonthPastVirtual += hours;
        if (isHibrida) stats.currentMonthPastHibrida += hours;
      } else {
        if (isVirtual) stats.currentMonthFutureVirtual += hours;
        if (isHibrida) stats.currentMonthFutureHibrida += hours;
      }
    }
  }

  return stats;
}
