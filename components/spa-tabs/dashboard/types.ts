import type { ReactNode } from "react";
import type { DashboardSummary } from "@/src/services/dashboardApi";
import type {
  MonthlyAccountingPreview,
  PersonHoursMeeting,
  PersonHoursPerson,
  Tarifa
} from "@/src/services/tarifasApi";

export type DashboardRole = "ADMINISTRADOR" | "DOCENTE" | "ASISTENTE_ZOOM" | "CONTADURIA";
export type DashboardMetricKey = Exclude<keyof DashboardSummary, "scope">;
export type SemanticMetricColor = "info" | "success" | "warning" | "error";

export type MetricCardItem = {
  key: DashboardMetricKey;
  title: string;
  description: string;
  semanticColor: SemanticMetricColor;
  icon: ReactNode;
  formatValue?: (value: number) => string;
};

export type DashboardStatus = {
  label: string;
  color: "success" | "warning" | "error";
  message: string;
};

export type DashboardRoleConfig = {
  title: string;
  subtitle: string;
  headerIcon: ReactNode;
  background: string;
  metrics: MetricCardItem[];
  status: DashboardStatus;
  priorityItems: string[];
};

export type MonthlyReportPreviewResult =
  | ({ ok: true } & MonthlyAccountingPreview)
  | { ok: false; monthKey: string; error: string };

export type MonthlyAccountingAssistantGroup = {
  assistant: MonthlyAccountingPreview["assistants"][number];
  rows: MonthlyAccountingPreview["rows"];
};

export type AssistantCard = {
  person: PersonHoursPerson;
  meetings: PersonHoursMeeting[];
};

export type AssistantMonthlyCard = AssistantCard & {
  monthMeetings: PersonHoursMeeting[];
  virtualHours: number;
  hibridaHours: number;
  totalHours: number;
  totalMinutes: number;
  estimatedPayment: number;
};

export type AccountingTotals = {
  virtualHours: number;
  hibridaHours: number;
  totalHours: number;
  totalEstimated: number;
  assistantsWithActivity: number;
};

export type TarifasByModalidad = Record<"VIRTUAL" | "HIBRIDA", Tarifa | null>;

export type AssistantStats = {
  prevMonthVirtual: number;
  prevMonthHibrida: number;
  currentMonthPastVirtual: number;
  currentMonthPastHibrida: number;
  currentMonthFutureVirtual: number;
  currentMonthFutureHibrida: number;
};
