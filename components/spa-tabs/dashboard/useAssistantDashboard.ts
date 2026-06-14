"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AgendaEvent } from "@/src/services/agendaApi";
import { loadPersonHours, type PersonHoursMeeting } from "@/src/services/tarifasApi";
import {
  calculateAssistantStats,
  compareMeetingByStartAsc,
  copyTextToClipboard,
  formatTimeUntil,
  isFutureAssignedMeeting,
  resolveMeetingAccount,
  resolveMeetingId,
  resolveMeetingJoinUrl
} from "./dashboardUtils";

export function useAssistantDashboard(isEnabled: boolean, agendaLibre: AgendaEvent[]) {
  const [assistantUpcomingMeetings, setAssistantUpcomingMeetings] = useState<PersonHoursMeeting[]>([]);
  const [allAssistantMeetings, setAllAssistantMeetings] = useState<PersonHoursMeeting[]>([]);
  const [isLoadingAssistantPanel, setIsLoadingAssistantPanel] = useState(false);
  const [assistantPanelError, setAssistantPanelError] = useState("");
  const [assistantNowMs, setAssistantNowMs] = useState(() => Date.now());
  const [copyLinkFeedback, setCopyLinkFeedback] = useState("");

  const refreshAssistantPanelData = useCallback(async () => {
    if (!isEnabled) return;

    setIsLoadingAssistantPanel(true);
    setAssistantPanelError("");
    try {
      const payload = await loadPersonHours();
      if (!payload) {
        setAssistantUpcomingMeetings([]);
        setAssistantPanelError("No se pudo cargar el detalle de tus reuniones asignadas.");
        return;
      }

      const nowMs = Date.now();
      setAssistantUpcomingMeetings(
        payload.meetings.filter((meeting) => isFutureAssignedMeeting(meeting, nowMs)).sort(compareMeetingByStartAsc)
      );
      setAllAssistantMeetings(payload.meetings);
    } finally {
      setIsLoadingAssistantPanel(false);
    }
  }, [isEnabled]);

  useEffect(() => {
    if (!isEnabled) return;
    void refreshAssistantPanelData();
  }, [isEnabled, refreshAssistantPanelData]);

  useEffect(() => {
    if (!isEnabled) return;
    setAssistantNowMs(Date.now());
    const timer = window.setInterval(() => setAssistantNowMs(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, [isEnabled]);

  const assistantAgendaOpen = useMemo(
    () =>
      [...agendaLibre].sort(
        (left, right) => new Date(left.inicioProgramadoAt).getTime() - new Date(right.inicioProgramadoAt).getTime()
      ),
    [agendaLibre]
  );

  const assistantStats = useMemo(
    () => calculateAssistantStats(allAssistantMeetings, assistantNowMs),
    [allAssistantMeetings, assistantNowMs]
  );

  const nextMeeting = assistantUpcomingMeetings[0] ?? null;
  const nextMeetingId = nextMeeting ? resolveMeetingId(nextMeeting) : null;
  const nextMeetingJoinUrl = nextMeeting ? resolveMeetingJoinUrl(nextMeeting) : null;
  const nextMeetingAccount = nextMeeting ? resolveMeetingAccount(nextMeeting) : null;
  const recurrenceCountByMeetingId = useMemo(() => {
    const map = new Map<string, number>();
    for (const meeting of assistantUpcomingMeetings) {
      const meetingId = resolveMeetingId(meeting);
      if (!meetingId) continue;
      map.set(meetingId, (map.get(meetingId) ?? 0) + 1);
    }
    return map;
  }, [assistantUpcomingMeetings]);

  const nextMeetingRecurrenceCount = nextMeetingId ? recurrenceCountByMeetingId.get(nextMeetingId) ?? 1 : 1;
  const nextMeetingCountdown = nextMeeting ? formatTimeUntil(nextMeeting.inicioProgramadoAt, assistantNowMs) : "Sin próximas reuniones";

  const copyNextMeetingLink = useCallback(async () => {
    if (!nextMeetingJoinUrl) return;

    const copied = await copyTextToClipboard(nextMeetingJoinUrl);
    setCopyLinkFeedback(copied ? "Link copiado" : "No se pudo copiar");
    window.setTimeout(() => setCopyLinkFeedback(""), 2200);
  }, [nextMeetingJoinUrl]);

  return {
    allAssistantMeetings,
    assistantAgendaOpen,
    assistantAgendaPreview: assistantAgendaOpen.slice(0, 3),
    assistantAgendaToAssignCount: assistantAgendaOpen.length,
    assistantNowMs,
    assistantPanelError,
    assistantStats,
    assistantUpcomingMeetings,
    copyLinkFeedback,
    copyNextMeetingLink,
    isLoadingAssistantPanel,
    nextMeeting,
    nextMeetingAccount,
    nextMeetingCountdown,
    nextMeetingId,
    nextMeetingJoinUrl,
    nextMeetingRecurrenceCount,
    refreshAssistantPanelData
  };
}
