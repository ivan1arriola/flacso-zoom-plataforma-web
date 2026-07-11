import { type FormEvent } from "react";
import { formatDateTime } from "@/src/lib/spa-home/recurrence";
import { normalizeDocentesCorreosByLine } from "@/src/lib/spa-home/validation";
import type { SolicitudFormState } from "@/src/lib/spa-home/solicitud-form";
import { buildDocenteSolicitudPayload } from "@/components/spa-tabs/solicitud-payload-builder";
import {
  submitDocenteSolicitud as submitDocenteSolicitudApi,
  deleteSolicitud as deleteSolicitudApi,
  cancelSolicitudSerie as cancelSolicitudSerieApi,
  cancelSolicitudInstancia as cancelSolicitudInstanciaApi,
  restoreSolicitudInstancia as restoreSolicitudInstanciaApi,
  addSolicitudInstancia as addSolicitudInstanciaApi,
  sendSolicitudReminder as sendSolicitudReminderApi,
  updatePastMeeting as updatePastMeetingApi,
  enableSolicitudAsistencia as enableSolicitudAsistenciaApi,
  updateSolicitudInstanciaAsistencia as updateSolicitudInstanciaAsistenciaApi,
  reassignRecurringSolicitudResponsable as reassignRecurringSolicitudResponsableApi
} from "@/src/services/solicitudesApi";
import { updateUpcomingZoomEvent as updateUpcomingZoomEventApi } from "@/src/services/agendaApi";

type Option = { value: string; label?: string };

type UseSpaSolicitudActionsInput = {
  form: SolicitudFormState;
  responsableOptions: Option[];
  docenteLinkedEmailOptions: string[];
  canDelegateSolicitudResponsable: boolean;
  setMessage: (value: string) => void;
  setDocenteSolicitudesView: (value: "form" | "list") => void;
  onSolicitudCreated?: () => void;
  setIsSubmittingSolicitud: (value: boolean) => void;
  setDeletingSolicitudId: (value: string | null) => void;
  setCancellingSerieSolicitudId: (value: string | null) => void;
  setCancellingInstanciaKey: (value: string | null) => void;
  setRestoringInstanciaKey: (value: string | null) => void;
  setAddingInstanciaSolicitudId: (value: string | null) => void;
  setSendingReminderSolicitudId: (value: string | null) => void;
  setUpdatingMeetingDurationEventId: (value: string | null) => void;
  setUpdatingAsistenciaSolicitudId: (value: string | null) => void;
  setUpdatingAsistenciaInstanciaKey: (value: string | null) => void;
  refreshAfterSolicitudMutation: () => Promise<void>;
};

export function useSpaSolicitudActions({
  form,
  responsableOptions,
  docenteLinkedEmailOptions,
  canDelegateSolicitudResponsable,
  setMessage,
  setDocenteSolicitudesView,
  onSolicitudCreated,
  setIsSubmittingSolicitud,
  setDeletingSolicitudId,
  setCancellingSerieSolicitudId,
  setCancellingInstanciaKey,
  setRestoringInstanciaKey,
  setAddingInstanciaSolicitudId,
  setSendingReminderSolicitudId,
  setUpdatingMeetingDurationEventId,
  setUpdatingAsistenciaSolicitudId,
  setUpdatingAsistenciaInstanciaKey,
  refreshAfterSolicitudMutation
}: UseSpaSolicitudActionsInput) {
  async function submitDocenteSolicitud(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (!form.tema.trim()) {
      setMessage("Debes completar el tema.");
      return;
    }

    setIsSubmittingSolicitud(true);
    try {
      const normalizedResponsable = form.responsable.trim().toLowerCase();
      if (!normalizedResponsable) {
        setMessage("Debes seleccionar la persona a cargo.");
        return;
      }
      if (canDelegateSolicitudResponsable) {
        const isValidResponsable = responsableOptions.some((option) => option.value === normalizedResponsable);
        if (!isValidResponsable) {
          setMessage("Debes seleccionar un docente válido como persona a cargo.");
          return;
        }
      }

      const metadata = [
        `Responsable: ${normalizedResponsable || "No especificado"}`,
        form.grabacion === "DEFINIR" ? "Grabación: A definir en clase" : undefined
      ]
        .filter(Boolean)
        .join("\n");

      const linkedDocenteEmail = form.correoVinculado.trim().toLowerCase();
      if (!linkedDocenteEmail) {
        setMessage("Debes seleccionar el correo vinculado de la reunion.");
        return;
      }
      if (!docenteLinkedEmailOptions.includes(linkedDocenteEmail)) {
        setMessage("El correo vinculado debe pertenecer al docente a cargo.");
        return;
      }

      const normalizedAdditionalDocenteCopies = normalizeDocentesCorreosByLine(form.correosDocentes);
      const normalizedDocentesCorreos = Array.from(
        new Set([
          linkedDocenteEmail,
          ...(normalizedAdditionalDocenteCopies
            ? normalizedAdditionalDocenteCopies.split("\n").filter(Boolean)
            : [])
        ])
      ).join("\n");
      const payload = buildDocenteSolicitudPayload({
        form: {
          ...form,
          responsable: normalizedResponsable
        },
        metadata,
        normalizedDocentesCorreos,
        timezone: "America/Montevideo"
      });

      const response = await submitDocenteSolicitudApi(payload);
      if (!response.success) {
        setMessage(response.error ?? "No se pudo crear la solicitud.");
        return;
      }

      setMessage(`Solicitud creada correctamente: ${response.requestId}`);
      setDocenteSolicitudesView("list");
      onSolicitudCreated?.();
      await refreshAfterSolicitudMutation();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear la solicitud.");
    } finally {
      setIsSubmittingSolicitud(false);
    }
  }

  async function deleteSolicitud(solicitudId: string) {
    if (!window.confirm("Se eliminara la solicitud y tambien la reunion en Zoom. ¿Continuar?")) {
      return;
    }

    setDeletingSolicitudId(solicitudId);
    setMessage("");

    try {
      const response = await deleteSolicitudApi(solicitudId);
      if (!response.success) {
        setMessage(response.error ?? "No se pudo eliminar la solicitud.");
        return;
      }

      const zoomMessage = response.zoomMeetingId
        ? response.deletedInZoom
          ? ` Reunión Zoom ${response.zoomMeetingId} eliminada.`
          : ` Zoom no reportó eliminación para ${response.zoomMeetingId} (puede ya no existir).`
        : "";
      setMessage(`Solicitud eliminada correctamente.${zoomMessage}`);

      await refreshAfterSolicitudMutation();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo eliminar la solicitud.");
    } finally {
      setDeletingSolicitudId(null);
    }
  }

  async function cancelSolicitudSerie(solicitudId: string, titulo: string) {
    if (!window.confirm(`Se cancelara toda la serie de "${titulo}" en Zoom y en el sistema. ¿Continuar?`)) {
      return;
    }

    setCancellingSerieSolicitudId(solicitudId);
    setMessage("");

    try {
      const response = await cancelSolicitudSerieApi(solicitudId);
      if (!response.success) {
        setMessage(response.error ?? "No se pudo cancelar la serie.");
        return;
      }

      const zoomMessage = response.result?.zoomMeetingId
        ? response.result?.cancelledInZoom
          ? ` Serie Zoom ${response.result.zoomMeetingId} cancelada.`
          : ` Zoom no reportó cancelación para ${response.result.zoomMeetingId} (puede ya no existir).`
        : "";
      setMessage(`Serie cancelada correctamente.${zoomMessage}`);
      await refreshAfterSolicitudMutation();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cancelar la serie.");
    } finally {
      setCancellingSerieSolicitudId(null);
    }
  }

  async function cancelSolicitudInstancia(input: {
    solicitudId: string;
    titulo: string;
    eventoId?: string | null;
    occurrenceId?: string | null;
    startTime: string;
  }) {
    const instanceDateLabel = formatDateTime(input.startTime);
    if (!window.confirm(`Se cancelara la instancia ${instanceDateLabel} de "${input.titulo}". ¿Continuar?`)) {
      return;
    }

    const instanceKey = `${input.solicitudId}:${input.eventoId ?? input.occurrenceId ?? input.startTime}`;
    setCancellingInstanciaKey(instanceKey);
    setMessage("");

    try {
      const response = await cancelSolicitudInstanciaApi({
        solicitudId: input.solicitudId,
        eventoId: input.eventoId ?? undefined,
        occurrenceId: input.occurrenceId ?? undefined,
        inicioProgramadoAt: input.startTime
      });

      if (!response.success) {
        setMessage(response.error ?? "No se pudo cancelar la instancia.");
        return;
      }

      const zoomMessage = response.result?.zoomMeetingId
        ? response.result?.cancelledInZoom
          ? ` Instancia cancelada en Zoom (${response.result.zoomMeetingId}).`
          : ` Zoom no reportó cancelación (ID ${response.result.zoomMeetingId}).`
        : "";
      setMessage(`Instancia cancelada correctamente.${zoomMessage}`);
      await refreshAfterSolicitudMutation();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cancelar la instancia.");
    } finally {
      setCancellingInstanciaKey(null);
    }
  }

  async function restoreSolicitudInstancia(input: {
    solicitudId: string;
    titulo: string;
    eventoId?: string | null;
    startTime: string;
  }) {
    const instanceDateLabel = formatDateTime(input.startTime);
    if (
      !window.confirm(
        `Se descancelara la instancia ${instanceDateLabel} de "${input.titulo}" y se sincronizara Zoom con lo registrado en la app. ¿Continuar?`
      )
    ) {
      return;
    }

    const instanceKey = `${input.solicitudId}:${input.eventoId ?? input.startTime}`;
    setRestoringInstanciaKey(instanceKey);
    setMessage("");

    try {
      const response = await restoreSolicitudInstanciaApi({
        solicitudId: input.solicitudId,
        eventoId: input.eventoId ?? undefined,
        inicioProgramadoAt: input.startTime
      });

      if (!response.success) {
        setMessage(response.error ?? "No se pudo descancelar la instancia.");
        return;
      }

      const source = response.result?.source ?? "";
      const sourceLabel =
        source === "RECURRENCIA_PRINCIPAL"
          ? "recurrencia principal"
          : source === "MEETING_DEDICADO_EXISTENTE"
            ? "meeting dedicado existente"
            : source === "MEETING_DEDICADO"
              ? "meeting dedicado nuevo"
              : "Zoom";
      const meetingIdLabel = response.result?.zoomMeetingId ? ` (${response.result.zoomMeetingId})` : "";
      setMessage(`Instancia descancelada y sincronizada con ${sourceLabel}${meetingIdLabel}.`);
      await refreshAfterSolicitudMutation();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo descancelar la instancia.");
    } finally {
      setRestoringInstanciaKey(null);
    }
  }

  async function addSolicitudInstancia(input: {
    solicitudId: string;
    titulo: string;
    inicioProgramadoAt: string;
    finProgramadoAt: string;
  }): Promise<boolean> {
    setMessage("");
    setAddingInstanciaSolicitudId(input.solicitudId);

    try {
      const response = await addSolicitudInstanciaApi({
        solicitudId: input.solicitudId,
        inicioProgramadoAt: input.inicioProgramadoAt,
        finProgramadoAt: input.finProgramadoAt
      });

      if (!response.success) {
        setMessage(response.error ?? "No se pudo agregar la instancia.");
        return false;
      }

      const usedPrimaryMeeting = response.result?.usaMeetingPrincipal !== false;
      const resolvedMeetingId = (response.result?.zoomMeetingId ?? "").trim();
      if (usedPrimaryMeeting) {
        setMessage(
          resolvedMeetingId
            ? `Instancia agregada en "${input.titulo}" usando el mismo ID (${resolvedMeetingId}).`
            : `Instancia agregada en "${input.titulo}" usando el mismo ID.`
        );
      } else {
        setMessage(
          resolvedMeetingId
            ? `Instancia agregada en "${input.titulo}" con nuevo ID (${resolvedMeetingId}) por superposición de horario.`
            : `Instancia agregada en "${input.titulo}" con nuevo ID por superposición de horario.`
        );
      }
      await refreshAfterSolicitudMutation();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo agregar la instancia.");
      return false;
    } finally {
      setAddingInstanciaSolicitudId(null);
    }
  }

  async function sendSolicitudReminder(input: {
    solicitudId: string;
    toEmail?: string;
    mensaje?: string;
  }): Promise<boolean> {
    setMessage("");
    setSendingReminderSolicitudId(input.solicitudId);
    try {
      const response = await sendSolicitudReminderApi({
        solicitudId: input.solicitudId,
        toEmail: input.toEmail,
        mensaje: input.mensaje
      });
      if (!response.success) {
        setMessage(response.error ?? "No se pudo enviar el recordatorio.");
        return false;
      }
      setMessage(
        response.sentTo
          ? `Recordatorio enviado a ${response.sentTo}.`
          : "Recordatorio enviado correctamente."
      );
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo enviar el recordatorio.");
      return false;
    } finally {
      setSendingReminderSolicitudId(null);
    }
  }

  async function editSolicitudMeetingDuration(input: {
    eventoId: string;
    titulo: string;
    inicioProgramadoAt: string;
    minutosReales: number;
  }): Promise<boolean> {
    setMessage("");
    setUpdatingMeetingDurationEventId(input.eventoId);

    try {
      const normalizedMinutes = Math.floor(input.minutosReales);
      if (!Number.isFinite(normalizedMinutes) || normalizedMinutes < 1 || normalizedMinutes > 1440) {
        setMessage("La duración real debe estar entre 1 y 1440 minutos.");
        return false;
      }

      const response = await updatePastMeetingApi({
        eventoId: input.eventoId,
        minutosReales: normalizedMinutes
      });
      if (!response.success) {
        setMessage(response.error ?? "No se pudo actualizar la duración de la reunión.");
        return false;
      }

      const fechaLabel = new Date(input.inicioProgramadoAt).toLocaleString("es-UY", {
        dateStyle: "short",
        timeStyle: "short"
      });
      setMessage(`Duración real actualizada (${normalizedMinutes} min) en "${input.titulo}" (${fechaLabel}).`);
      await refreshAfterSolicitudMutation();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la duración de la reunión.");
      return false;
    } finally {
      setUpdatingMeetingDurationEventId(null);
    }
  }

  async function editUpcomingSolicitudMeeting(input: {
    solicitudId: string;
    eventoId: string;
    titulo: string;
    programaNombre: string;
    responsableNombre?: string;
    docenteCreadorNombre?: string;
    isRecurring?: boolean;
    inicioProgramadoAt?: string;
    finProgramadoAt?: string;
    modalidadReunion?: string;
    targetOccurrenceId?: string;
    targetPreviousStart?: string;
  }): Promise<boolean> {
    setMessage("");

    try {
      const normalizedTitle = input.titulo.trim();
      const normalizedProgram = input.programaNombre.trim();
      const normalizedResponsible = input.responsableNombre?.trim() ?? "";
      const normalizedCreator = input.docenteCreadorNombre?.trim().toLowerCase() ?? "";

      if (!normalizedTitle) {
        setMessage("Debes completar el tema de la reunión.");
        return false;
      }
      if (!normalizedProgram) {
        setMessage("Debes completar el programa.");
        return false;
      }
      const updateMeetingResponse = await updateUpcomingZoomEventApi(input.eventoId, {
        titulo: normalizedTitle,
        programaNombre: normalizedProgram,
        responsableNombre: normalizedResponsible || undefined,
        inicioProgramadoAt: input.inicioProgramadoAt,
        finProgramadoAt: input.finProgramadoAt,
        modalidadReunion: input.modalidadReunion,
        targetOccurrenceId: input.targetOccurrenceId,
        targetPreviousStart: input.targetPreviousStart
      });

      if (!updateMeetingResponse.success) {
        setMessage(updateMeetingResponse.error ?? "No se pudo actualizar la reunión.");
        return false;
      }
      const meetingUpdated = Boolean(updateMeetingResponse.result?.updated);

      let creatorUpdated = false;
      const canUpdateCreatorFromEdit =
        canDelegateSolicitudResponsable && input.isRecurring && normalizedCreator;

      if (canUpdateCreatorFromEdit) {
        if (!normalizedResponsible) {
          setMessage("Debes seleccionar la persona a cargo para actualizar el docente creador.");
          return false;
        }
        const reassignResponse = await reassignRecurringSolicitudResponsableApi({
          solicitudId: input.solicitudId,
          responsableNombre: normalizedResponsible,
          docenteCreadorNombre: normalizedCreator
        });
        if (!reassignResponse.success) {
          setMessage(reassignResponse.error ?? "No se pudo actualizar el docente creador.");
          return false;
        }
        creatorUpdated = Boolean(reassignResponse.updated);
      }

      if (!meetingUpdated && !creatorUpdated) {
        setMessage("No se detectaron cambios para guardar.");
        return true;
      }

      if (meetingUpdated && creatorUpdated) {
        setMessage("Recurrencia actualizada correctamente (incluye docente creador).");
      } else if (creatorUpdated) {
        setMessage("Docente creador actualizado correctamente.");
      } else {
        setMessage("Reunión actualizada correctamente.");
      }

      await refreshAfterSolicitudMutation();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la reunión.");
      return false;
    }
  }

  async function reassignRecurringSolicitudResponsable(input: {
    solicitudId: string;
    titulo: string;
    responsableNombre: string;
    docenteCreadorNombre: string;
  }): Promise<boolean> {
    setMessage("");

    try {
      const nextResponsible = input.responsableNombre.trim().toLowerCase();
      if (!nextResponsible) {
        setMessage("Debes seleccionar el nuevo docente a cargo.");
        return false;
      }
      const nextCreator = input.docenteCreadorNombre.trim().toLowerCase();
      if (!nextCreator) {
        setMessage("Debes seleccionar el nuevo docente creador.");
        return false;
      }

      const response = await reassignRecurringSolicitudResponsableApi({
        solicitudId: input.solicitudId,
        responsableNombre: nextResponsible,
        docenteCreadorNombre: nextCreator
      });
      if (!response.success) {
        setMessage(response.error ?? "No se pudo actualizar el pedido recurrente.");
        return false;
      }

      if (response.updated === false) {
        setMessage("El pedido ya tenía ese docente a cargo y creador.");
        return true;
      }

      setMessage(`Pedido recurrente "${input.titulo}" actualizado correctamente.`);
      await refreshAfterSolicitudMutation();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el pedido recurrente.");
      return false;
    }
  }

  async function enableSolicitudAssistance(input: {
    solicitudId: string;
    titulo: string;
    requiereAsistencia: boolean;
  }) {
    const nextRequiresAssistance = !input.requiereAsistencia;
    const confirmMessage = nextRequiresAssistance
      ? `Se habilitara asistencia Zoom para "${input.titulo}" en sus instancias activas. ¿Continuar?`
      : `Se quitara la asistencia Zoom para "${input.titulo}". Si hay asistentes asignados, recibiran un correo de cancelacion. ¿Continuar?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setMessage("");
    setUpdatingAsistenciaSolicitudId(input.solicitudId);

    try {
      const response = await enableSolicitudAsistenciaApi({
        solicitudId: input.solicitudId,
        requiereAsistencia: nextRequiresAssistance
      });
      if (!response.success) {
        setMessage(
          response.error ??
            (nextRequiresAssistance
              ? "No se pudo habilitar asistencia Zoom."
              : "No se pudo deshabilitar asistencia Zoom.")
        );
        return;
      }

      if (nextRequiresAssistance) {
        if (response.alreadyEnabled) {
          setMessage("La solicitud ya tenia asistencia Zoom habilitada.");
        } else {
          const updatedCount = response.updatedEvents ?? 0;
          setMessage(
            updatedCount > 0
              ? `Asistencia Zoom habilitada. Se actualizaron ${updatedCount} instancia(s).`
              : "Asistencia Zoom habilitada."
          );
        }
      } else if (response.alreadyDisabled) {
        setMessage("La solicitud ya tenia asistencia Zoom deshabilitada.");
      } else {
        const updatedCount = response.updatedEvents ?? 0;
        const cancelledAssignments = response.cancelledAssignments ?? 0;
        const notifiedAssistants = response.notifiedAssistants ?? 0;
        const details = [
          `instancia(s) actualizadas: ${updatedCount}`,
          `asignacion(es) canceladas: ${cancelledAssignments}`,
          `correo(s) enviados: ${notifiedAssistants}`
        ];
        setMessage(`Asistencia Zoom deshabilitada (${details.join(", ")}).`);
      }

      await refreshAfterSolicitudMutation();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : nextRequiresAssistance
            ? "No se pudo habilitar asistencia Zoom."
            : "No se pudo deshabilitar asistencia Zoom."
      );
    } finally {
      setUpdatingAsistenciaSolicitudId(null);
    }
  }

  async function updateSolicitudAssistanceForInstance(input: {
    solicitudId: string;
    titulo: string;
    eventoId?: string | null;
    startTime: string;
    requiereAsistencia: boolean;
  }) {
    const instanceDateLabel = formatDateTime(input.startTime);
    const confirmMessage = input.requiereAsistencia
      ? `Se habilitara asistencia Zoom solo para la instancia ${instanceDateLabel} de "${input.titulo}". ¿Continuar?`
      : `Se quitara la asistencia Zoom solo para la instancia ${instanceDateLabel} de "${input.titulo}". Si habia una persona asignada recibira correo de cancelacion. ¿Continuar?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    const instanceKey = `${input.solicitudId}:${input.eventoId ?? input.startTime}`;
    setMessage("");
    setUpdatingAsistenciaInstanciaKey(instanceKey);

    try {
      const response = await updateSolicitudInstanciaAsistenciaApi({
        solicitudId: input.solicitudId,
        eventoId: input.eventoId ?? undefined,
        inicioProgramadoAt: input.startTime,
        requiereAsistencia: input.requiereAsistencia
      });

      if (!response.success) {
        setMessage(response.error ?? "No se pudo actualizar asistencia Zoom para la instancia.");
        return;
      }

      if (input.requiereAsistencia) {
        if (response.alreadyEnabled) {
          setMessage("La instancia ya tenia asistencia Zoom habilitada.");
        } else {
          setMessage(`Asistencia Zoom habilitada para la instancia ${instanceDateLabel}.`);
        }
      } else {
        if (response.alreadyDisabled) {
          setMessage("La instancia ya tenia asistencia Zoom deshabilitada.");
        } else {
          const cancelledAssignments = response.cancelledAssignments ?? 0;
          const notifiedAssistants = response.notifiedAssistants ?? 0;
          setMessage(
            `Asistencia Zoom deshabilitada para la instancia ${instanceDateLabel} (asignaciones canceladas: ${cancelledAssignments}, correos enviados: ${notifiedAssistants}).`
          );
        }
      }

      await refreshAfterSolicitudMutation();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo habilitar asistencia Zoom para la instancia."
      );
    } finally {
      setUpdatingAsistenciaInstanciaKey(null);
    }
  }


  return {
    submitDocenteSolicitud,
    deleteSolicitud,
    cancelSolicitudSerie,
    cancelSolicitudInstancia,
    restoreSolicitudInstancia,
    addSolicitudInstancia,
    sendSolicitudReminder,
    editSolicitudMeetingDuration,
    editUpcomingSolicitudMeeting,
    reassignRecurringSolicitudResponsable,
    enableSolicitudAssistance,
    updateSolicitudAssistanceForInstance
  };
}
