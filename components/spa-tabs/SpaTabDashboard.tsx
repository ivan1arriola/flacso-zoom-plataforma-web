"use client";

import type { DashboardSummary } from "@/src/services/dashboardApi";
import type { AgendaEvent } from "@/src/services/agendaApi";
import { AccountingDashboard } from "./dashboard/AccountingDashboard";
import { AdminDashboard } from "./dashboard/AdminDashboard";
import { AssistantDashboard } from "./dashboard/AssistantDashboard";
import { DashboardSkeleton } from "./dashboard/DashboardSkeleton";
import { DocenteDashboard } from "./dashboard/DocenteDashboard";
import { buildRoleConfig } from "./dashboard/dashboardUtils";
import { useCountdown } from "./dashboard/useCountdown";
import type { DashboardRole } from "./dashboard/types";

interface SpaTabDashboardProps {
  summary: DashboardSummary | null;
  isLoadingSummary?: boolean;
  onRefresh?: () => void;
  role: DashboardRole;
  agendaLibre?: AgendaEvent[];
  hasLoadedAgendaLibre?: boolean;
  onGoToCreateMeeting?: () => void;
  onGoToAssignAssistants?: () => void;
  onGoToAgendaAvailable?: () => void;
  onGoToMyAssignedMeetings?: () => void;
}

export function SpaTabDashboard({
  summary,
  role,
  agendaLibre = [],
  hasLoadedAgendaLibre = false,
  onGoToCreateMeeting,
  onGoToAssignAssistants,
  onGoToAgendaAvailable,
  onGoToMyAssignedMeetings,
  onRefresh
}: SpaTabDashboardProps) {
  const countdown = useCountdown(summary?.nextMeeting?.startTime ?? null);

  if (!summary) return <DashboardSkeleton />;

  if (role === "CONTADURIA") return <AccountingDashboard />;

  const config = buildRoleConfig(role, summary);

  if (role === "ASISTENTE_ZOOM") {
    return (
      <AssistantDashboard
        summary={summary}
        config={config}
        agendaLibre={agendaLibre}
        hasLoadedAgendaLibre={hasLoadedAgendaLibre}
        onGoToAgendaAvailable={onGoToAgendaAvailable}
        onGoToMyAssignedMeetings={onGoToMyAssignedMeetings}
      />
    );
  }

  if (role === "DOCENTE") {
    return (
      <DocenteDashboard
        summary={summary}
        config={config}
        countdown={countdown}
        onGoToCreateMeeting={onGoToCreateMeeting}
        onGoToMyAssignedMeetings={onGoToMyAssignedMeetings}
        onRefresh={onRefresh}
      />
    );
  }

  return (
    <AdminDashboard
      summary={summary}
      config={config}
      onGoToCreateMeeting={onGoToCreateMeeting}
      onGoToAssignAssistants={onGoToAssignAssistants}
    />
  );
}
