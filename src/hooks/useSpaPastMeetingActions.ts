import { type FormEvent } from "react";
import type { DocenteOption, MonitorOption, PastMeetingZoomSeed } from "@/src/lib/spa-home/client-types";
import type { Tab } from "@/src/lib/spa-home/navigation";
import {
  loadPastMeetings,
  loadSolicitudes,
  submitPastMeeting as submitPastMeetingApi,
  updatePastMeeting as updatePastMeetingApi,
  type PastMeeting,
  type Solicitud
} from "@/src/services/solicitudesApi";
import { loadSummary, type DashboardSummary } from "@/src/services/dashboardApi";
import type { ZoomUpcomingMeeting } from "@/src/services/zoomApi";

type PastMeetingForm = {
  titulo: string;
  modalidadReunion: string;
  docenteEmail: string;
  responsableEmail: string;
  monitorEmail: string;
  zoomMeetingId: string;
  inicioRealAt: string;
  finRealAt: string;
  programaNombre: string;
  descripcion: string;
  zoomJoinUrl: string;
};

type UseSpaPastMeetingActionsInput = {
  pastMeetingForm: PastMeetingForm;
  pastMeetingZoomSeed: PastMeetingZoomSeed | null;
  docenteOptions: DocenteOption[];
  monitorOptions: MonitorOption[];
  buildSummaryLoadOptions: () => { includeAdminZoomAlerts: boolean };
  setMessage: (value: string) => void;
  setTab: (value: Tab) => void;
  setPastMeetingForm: (value: PastMeetingForm) => void;
  setPastMeetingZoomSeed: (value: PastMeetingZoomSeed | null) => void;
  setIsLoadingPastMeetings: (value: boolean) => void;
  setIsSubmittingPastMeeting: (value: boolean) => void;
  setUpdatingPastMeetingId: (value: string | null) => void;
  setPastMeetings: (value: PastMeeting[]) => void;
  setSolicitudes: (value: Solicitud[]) => void;
  setSummary: (value: DashboardSummary) => void;
};

const EMPTY_PAST_MEETING_FORM: PastMeetingForm = {
  titulo: "",
  modalidadReunion: "VIRTUAL",
  docenteEmail: "",
  responsableEmail: "",
  monitorEmail: "",
  zoomMeetingId: "",
  inicioRealAt: "",
  finRealAt: "",
  programaNombre: "",
  descripcion: "",
  zoomJoinUrl: ""
};

function toDateTimeLocalInput(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export function useSpaPastMeetingActions({
  pastMeetingForm,
  pastMeetingZoomSeed,
  docenteOptions,
  monitorOptions,
  buildSummaryLoadOptions,
  setMessage,
  setTab,
  setPastMeetingForm,
  setPastMeetingZoomSeed,
  setIsLoadingPastMeetings,
  setIsSubmittingPastMeeting,
  setUpdatingPastMeetingId,
  setPastMeetings,
  setSolicitudes,
  setSummary
}: UseSpaPastMeetingActionsInput) {
  function preloadPastMeetingFormFromZoom(meeting: ZoomUpcomingMeeting) {
    const seed: PastMeetingZoomSeed | null =
      meeting.meetingId && meeting.startTime && meeting.endTime
        ? {
            meetingId: meeting.meetingId,
            topic: meeting.topic || "Sin titulo",
            startTime: meeting.startTime,
            endTime: meeting.endTime,
            joinUrl: meeting.joinUrl || "",
            accountEmail: meeting.accountEmail || "sin cuenta"
          }
        : null;

    setPastMeetingZoomSeed(seed);
    setPastMeetingForm({
      titulo: meeting.topic || "",
      modalidadReunion: "VIRTUAL",
      docenteEmail: "",
      responsableEmail: "",
      monitorEmail: "",
      zoomMeetingId: meeting.meetingId ?? "",
      inicioRealAt: toDateTimeLocalInput(meeting.startTime),
      finRealAt: toDateTimeLocalInput(meeting.endTime),
      programaNombre: "",
      descripcion: `Registro importado desde Zoom (${meeting.accountEmail || "sin cuenta"}).`,
      zoomJoinUrl: meeting.joinUrl || ""
    });
    setTab("historico");
    setMessage(
      seed
        ? "Registro asistido: datos base bloqueados segun Zoom. Completa solo los campos faltantes."
        : "Formulario de reunion pasada precargado con datos de Zoom."
    );
  }

  async function refreshPastMeetings() {
    setIsLoadingPastMeetings(true);
    try {
      const meetings = await loadPastMeetings();
      if (!meetings) {
        setMessage("No se pudo cargar la lista de reuniones pasadas.");
        return;
      }
      setPastMeetings(meetings);
    } finally {
      setIsLoadingPastMeetings(false);
    }
  }

  async function updatePastMeetingRecord(input: {
    eventoId: string;
    programaNombre: string;
    monitorEmail?: string;
    minutosReales?: number;
  }): Promise<boolean> {
    setMessage("");
    setUpdatingPastMeetingId(input.eventoId);
    try {
      const response = await updatePastMeetingApi({
        eventoId: input.eventoId,
        programaNombre: input.programaNombre,
        monitorEmail: input.monitorEmail,
        minutosReales: input.minutosReales
      });
      if (!response.success) {
        setMessage(response.error ?? "No se pudo actualizar la reunion.");
        return false;
      }

      const meetings = await loadPastMeetings();
      if (!meetings) {
        setMessage("Reunion actualizada, pero no se pudo refrescar la lista.");
        return true;
      }
      setPastMeetings(meetings);
      setMessage("Reunion actualizada correctamente.");
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la reunion.");
      return false;
    } finally {
      setUpdatingPastMeetingId(null);
    }
  }

  async function submitPastMeeting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmittingPastMeeting(true);
    try {
      const normalizedPrograma = pastMeetingForm.programaNombre.trim();
      if (!normalizedPrograma) {
        setMessage("Programa es obligatorio.");
        return;
      }

      const normalizedDocenteEmail = pastMeetingForm.docenteEmail.trim().toLowerCase();
      if (!normalizedDocenteEmail) {
        setMessage("Debes seleccionar el docente.");
        return;
      }
      const docenteOption = docenteOptions.find((option) => option.value === normalizedDocenteEmail);
      if (!docenteOption) {
        setMessage("Debes seleccionar un docente valido desde la lista.");
        return;
      }
      const normalizedResponsableEmail = pastMeetingForm.responsableEmail.trim().toLowerCase();
      if (!normalizedResponsableEmail) {
        setMessage("Debes seleccionar la persona responsable.");
        return;
      }
      const responsableOption = docenteOptions.find(
        (option) => option.value === normalizedResponsableEmail
      );
      if (!responsableOption) {
        setMessage("Debes seleccionar una persona responsable valida desde la lista.");
        return;
      }
      const normalizedMonitorEmail = pastMeetingForm.monitorEmail.trim().toLowerCase();
      if (!normalizedMonitorEmail) {
        setMessage("Debes asignar un Asistente Zoom para registrar la reunion pasada.");
        return;
      }
      const monitorOption = monitorOptions.find((option) => option.value === normalizedMonitorEmail);
      if (!monitorOption) {
        setMessage("Debes seleccionar un Asistente Zoom valido desde la lista.");
        return;
      }
      const lockedTitle = pastMeetingZoomSeed?.topic?.trim() || pastMeetingForm.titulo.trim();
      const lockedMeetingId = pastMeetingZoomSeed?.meetingId?.trim() || pastMeetingForm.zoomMeetingId.trim();
      const lockedStartIso = pastMeetingZoomSeed?.startTime
        ? new Date(pastMeetingZoomSeed.startTime).toISOString()
        : new Date(pastMeetingForm.inicioRealAt).toISOString();
      const lockedEndIso = pastMeetingZoomSeed?.endTime
        ? new Date(pastMeetingZoomSeed.endTime).toISOString()
        : new Date(pastMeetingForm.finRealAt).toISOString();
      const lockedJoinUrl =
        (pastMeetingZoomSeed?.joinUrl?.trim() || "") || pastMeetingForm.zoomJoinUrl.trim() || undefined;

      const response = await submitPastMeetingApi({
        titulo: lockedTitle,
        modalidadReunion: pastMeetingForm.modalidadReunion,
        docenteEmail: normalizedDocenteEmail,
        monitorEmail: normalizedMonitorEmail,
        zoomMeetingId: lockedMeetingId || undefined,
        inicioRealAt: lockedStartIso,
        finRealAt: lockedEndIso,
        programaNombre: normalizedPrograma,
        responsableEmail: normalizedResponsableEmail,
        descripcion: pastMeetingForm.descripcion.trim() || undefined,
        zoomJoinUrl: lockedJoinUrl
      });

      if (!response.success) {
        setMessage(response.error ?? "No se pudo registrar la reunion pasada.");
        return;
      }

      setPastMeetingForm(EMPTY_PAST_MEETING_FORM);
      setPastMeetingZoomSeed(null);
      setMessage(`Reunion registrada correctamente: ${response.solicitudId ?? ""}`);
      const [solicitudesData, summaryData, meetingsData] = await Promise.all([
        loadSolicitudes(),
        loadSummary(buildSummaryLoadOptions()),
        loadPastMeetings()
      ]);
      if (solicitudesData) setSolicitudes(solicitudesData);
      if (summaryData) setSummary(summaryData);
      if (meetingsData) setPastMeetings(meetingsData);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo registrar la reunion pasada.");
    } finally {
      setIsSubmittingPastMeeting(false);
    }
  }

  return {
    preloadPastMeetingFormFromZoom,
    refreshPastMeetings,
    updatePastMeetingRecord,
    submitPastMeeting
  };
}
