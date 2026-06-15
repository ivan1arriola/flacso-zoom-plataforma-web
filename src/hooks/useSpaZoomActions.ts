import {
  loadZoomAccounts,
  loadZoomPastMeetings,
  loadZoomUpcomingMeetings,
  registerUpcomingMeetingInSystem as registerUpcomingMeetingInSystemApi,
  type ZoomAccount,
  type ZoomPastMeeting,
  type ZoomUpcomingMeeting
} from "@/src/services/zoomApi";

type RegisterUpcomingMeetingInput = {
  meeting: ZoomUpcomingMeeting;
  responsableNombre: string;
  programaNombre: string;
  modalidadReunion: "VIRTUAL" | "HIBRIDA";
  requiereAsistencia: boolean;
  descripcion?: string;
};

type UseSpaZoomActionsInput = {
  selectedZoomPastMonthsBack: number;
  setMessage: (value: string) => void;
  setZoomGroupName: (value: string) => void;
  setZoomAccounts: (value: ZoomAccount[]) => void;
  setIsLoadingZoomAccounts: (value: boolean) => void;
  setZoomUpcomingMeetings: (value: ZoomUpcomingMeeting[]) => void;
  setIsLoadingZoomUpcomingMeetings: (value: boolean) => void;
  setIsRegisteringUpcomingMeeting: (value: boolean) => void;
  setZoomPastMeetings: (value: ZoomPastMeeting[]) => void;
  setIsLoadingZoomPastMeetings: (value: boolean) => void;
  setSelectedZoomPastMonthKey: (value: string) => void;
  refreshAfterSolicitudMutation: () => Promise<void>;
};

export function useSpaZoomActions({
  selectedZoomPastMonthsBack,
  setMessage,
  setZoomGroupName,
  setZoomAccounts,
  setIsLoadingZoomAccounts,
  setZoomUpcomingMeetings,
  setIsLoadingZoomUpcomingMeetings,
  setIsRegisteringUpcomingMeeting,
  setZoomPastMeetings,
  setIsLoadingZoomPastMeetings,
  setSelectedZoomPastMonthKey,
  refreshAfterSolicitudMutation
}: UseSpaZoomActionsInput) {
  async function refreshZoomAccounts() {
    setIsLoadingZoomAccounts(true);
    try {
      const result = await loadZoomAccounts();
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setZoomGroupName(result.groupName);
      setZoomAccounts(result.accounts);
    } finally {
      setIsLoadingZoomAccounts(false);
    }
  }

  async function refreshZoomUpcomingMeetings() {
    setIsLoadingZoomUpcomingMeetings(true);
    try {
      const result = await loadZoomUpcomingMeetings();
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setZoomGroupName(result.groupName);
      setZoomUpcomingMeetings(result.meetings);
    } finally {
      setIsLoadingZoomUpcomingMeetings(false);
    }
  }

  async function registerUpcomingMeetingInSystem(input: RegisterUpcomingMeetingInput): Promise<boolean> {
    setMessage("");
    setIsRegisteringUpcomingMeeting(true);
    try {
      const response = await registerUpcomingMeetingInSystemApi({
        titulo: input.meeting.topic || "Sin titulo",
        responsableNombre: input.responsableNombre,
        programaNombre: input.programaNombre,
        modalidadReunion: input.modalidadReunion,
        inicioProgramadoAt: input.meeting.startTime,
        finProgramadoAt: input.meeting.endTime,
        timezone: input.meeting.timezone || "America/Montevideo",
        zoomMeetingId: input.meeting.meetingId ?? undefined,
        zoomJoinUrl: input.meeting.joinUrl || undefined,
        zoomAccountId: input.meeting.accountId || undefined,
        zoomAccountEmail: input.meeting.accountEmail || undefined,
        requiereAsistencia: input.requiereAsistencia,
        descripcion: input.descripcion
      });
      if (!response.success) {
        setMessage(response.error ?? "No se pudo registrar la reunion en sistema.");
        return false;
      }

      setMessage("Reunion registrada en sistema correctamente.");
      await Promise.all([refreshAfterSolicitudMutation(), refreshZoomUpcomingMeetings()]);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo registrar la reunion en sistema.");
      return false;
    } finally {
      setIsRegisteringUpcomingMeeting(false);
    }
  }

  async function refreshZoomPastMeetings(monthsBack = selectedZoomPastMonthsBack) {
    setIsLoadingZoomPastMeetings(true);
    try {
      const result = await loadZoomPastMeetings({ monthsBack });
      if (result.error) {
        setMessage(result.error);
        return;
      }
      setZoomGroupName(result.groupName);
      setZoomPastMeetings(result.meetings);
    } finally {
      setIsLoadingZoomPastMeetings(false);
    }
  }

  function selectZoomPastMonth(monthKey: string) {
    setSelectedZoomPastMonthKey(monthKey);
  }

  return {
    refreshZoomAccounts,
    refreshZoomUpcomingMeetings,
    registerUpcomingMeetingInSystem,
    refreshZoomPastMeetings,
    selectZoomPastMonth
  };
}
