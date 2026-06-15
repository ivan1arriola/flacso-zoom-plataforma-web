import { formatDateTime } from "@/src/lib/spa-home/recurrence";
import { loadSummary, loadAssignmentBoard, loadAssignmentSuggestion, loadNextAssignmentSuggestion, type AssignmentSuggestion, type DashboardSummary } from "@/src/services/dashboardApi";
import { loadAgendaLibre, setInterest as setInterestApi, assignAssistantToEvent as assignAssistantToEventApi, unassignAssistantFromEvent as unassignAssistantFromEventApi, type AgendaEvent } from "@/src/services/agendaApi";
import { updateSolicitudInstanciaAsistencia as updateSolicitudInstanciaAsistenciaApi } from "@/src/services/solicitudesApi";

type AssignmentBoardData = NonNullable<Awaited<ReturnType<typeof loadAssignmentBoard>>>;
type AssignmentBoardEvent = AssignmentBoardData["events"][number];
type AssignableAssistant = AssignmentBoardData["assistants"][number];

type UseSpaAssignmentActionsInput = {
  agendaLibre: AgendaEvent[];
  selectedAssistantByEvent: Record<string, string>;
  suggestionSessionId: string | null;
  setAgendaLibre: (value: AgendaEvent[] | ((current: AgendaEvent[]) => AgendaEvent[])) => void;
  setHasLoadedAgendaLibre: (value: boolean) => void;
  setUpdatingInterestId: (value: string | null) => void;
  setMessage: (value: string) => void;
  setAssignmentBoardEvents: (value: AssignmentBoardEvent[]) => void;
  setAssignableAssistants: (value: AssignableAssistant[]) => void;
  setAssigningEventId: (value: string | null) => void;
  setRemovingAssistanceAssignmentEventId: (value: string | null) => void;
  setSummary: (value: DashboardSummary) => void;
  setSuggestionSessionId: (value: string | null) => void;
  setAssignmentSuggestion: (value: AssignmentSuggestion | null) => void;
  setIsLoadingSuggestion: (value: boolean) => void;
  buildSummaryLoadOptions: () => { includeAdminZoomAlerts: boolean };
  refreshAfterSolicitudMutation: () => Promise<void>;
};

export function useSpaAssignmentActions({
  agendaLibre,
  selectedAssistantByEvent,
  suggestionSessionId,
  setAgendaLibre,
  setHasLoadedAgendaLibre,
  setUpdatingInterestId,
  setMessage,
  setAssignmentBoardEvents,
  setAssignableAssistants,
  setAssigningEventId,
  setRemovingAssistanceAssignmentEventId,
  setSummary,
  setSuggestionSessionId,
  setAssignmentSuggestion,
  setIsLoadingSuggestion,
  buildSummaryLoadOptions,
  refreshAfterSolicitudMutation
}: UseSpaAssignmentActionsInput) {
  async function setInterest(eventoId: string, estadoInteres: "ME_INTERESA" | "NO_ME_INTERESA" | "RETIRADO") {
    setUpdatingInterestId(eventoId);
    const previousAgenda = agendaLibre;
    const optimisticAnsweredAt = new Date().toISOString();
    setAgendaLibre((current) =>
      current.map((event) => {
        if (event.id !== eventoId) return event;
        return {
          ...event,
          intereses: [
            {
              id: event.intereses[0]?.id ?? `temp-${eventoId}`,
              estadoInteres,
              fechaRespuestaAt: optimisticAnsweredAt
            }
          ]
        };
      })
    );

    try {
      const response = await setInterestApi(eventoId, estadoInteres);
      if (!response.success) {
        setAgendaLibre(previousAgenda);
        setMessage(response.error ?? "No se pudo registrar interés.");
        return;
      }
      setMessage("Interés actualizado.");
      const [agendaData, assignmentData] = await Promise.all([loadAgendaLibre(), loadAssignmentBoard()]);
      if (agendaData) setAgendaLibre(agendaData);
      setHasLoadedAgendaLibre(true);
      if (assignmentData) {
        setAssignmentBoardEvents(assignmentData.events ?? []);
        setAssignableAssistants(assignmentData.assistants ?? []);
      }
    } catch (error) {
      setAgendaLibre(previousAgenda);
      setMessage(error instanceof Error ? error.message : "No se pudo registrar interés.");
    } finally {
      setUpdatingInterestId(null);
    }
  }

  async function assignAssistantToEvent(eventoId: string) {
    const asistenteZoomId = selectedAssistantByEvent[eventoId];
    if (!asistenteZoomId) {
      setMessage("Debes seleccionar una persona para asignar.");
      return;
    }

    setAssigningEventId(eventoId);
    try {
      const response = await assignAssistantToEventApi(eventoId, asistenteZoomId);
      if (!response.success) {
        setMessage(response.error ?? "No se pudo asignar asistencia.");
        return;
      }

      setMessage("Asignacion registrada.");
      const [assignmentData, summaryData] = await Promise.all([
        loadAssignmentBoard(),
        loadSummary(buildSummaryLoadOptions())
      ]);
      if (assignmentData) {
        setAssignmentBoardEvents(assignmentData.events ?? []);
        setAssignableAssistants(assignmentData.assistants ?? []);
      }
      if (summaryData) setSummary(summaryData);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo asignar asistencia.");
    } finally {
      setAssigningEventId(null);
    }
  }

  async function removeAssistanceFromAssignmentEvent(input: {
    eventoId: string;
    solicitudId: string;
    titulo: string;
    inicioProgramadoAt: string;
  }) {
    const instanceDateLabel = formatDateTime(input.inicioProgramadoAt);
    const confirmMessage =
      `Se quitara la asistencia Zoom para la reunion ${instanceDateLabel} de "${input.titulo}". Si hay una persona asignada se notificara la cancelacion. ¿Continuar?`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setRemovingAssistanceAssignmentEventId(input.eventoId);
    setMessage("");
    try {
      const response = await updateSolicitudInstanciaAsistenciaApi({
        solicitudId: input.solicitudId,
        eventoId: input.eventoId,
        requiereAsistencia: false
      });

      if (!response.success) {
        setMessage(response.error ?? "No se pudo quitar asistencia de la reunion.");
        return;
      }

      if (response.alreadyDisabled) {
        setMessage("La reunion ya no requeria asistencia.");
      } else {
        const cancelledAssignments = response.cancelledAssignments ?? 0;
        const notifiedAssistants = response.notifiedAssistants ?? 0;
        setMessage(
          `Asistencia removida para la reunion ${instanceDateLabel} (asignaciones canceladas: ${cancelledAssignments}, correos enviados: ${notifiedAssistants}).`
        );
      }

      await refreshAfterSolicitudMutation();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo quitar asistencia de la reunion.");
    } finally {
      setRemovingAssistanceAssignmentEventId(null);
    }
  }

  async function onUnassignAssistantFromEvent(eventoId: string) {
    if (!window.confirm("¿Deseas quitar a la persona asignada? El requerimiento de asistencia se mantendrá y la reunión volverá a Pendientes.")) {
      return;
    }

    setRemovingAssistanceAssignmentEventId(eventoId);
    try {
      const response = await unassignAssistantFromEventApi(eventoId);
      if (!response.success) {
        setMessage(response.error ?? "No se pudo desasignar asistencia.");
        return;
      }

      setMessage("Asistente desasignado. La reunión volvió a Pendientes.");
      await Promise.all([
        loadAssignmentBoard(),
        loadSummary(buildSummaryLoadOptions())
      ]).then(([assignmentData, summaryData]) => {
        if (assignmentData) {
          setAssignmentBoardEvents(assignmentData.events ?? []);
          setAssignableAssistants(assignmentData.assistants ?? []);
        }
        if (summaryData) setSummary(summaryData);
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo desasignar asistencia.");
    } finally {
      setRemovingAssistanceAssignmentEventId(null);
    }
  }

  async function suggestMonthlyAssignment() {
    setIsLoadingSuggestion(true);
    try {
      const response = await loadAssignmentSuggestion();
      if (!response) {
        setMessage("No se pudo generar sugerencias de asignación.");
        return;
      }

      setSuggestionSessionId(response.sessionId);
      setAssignmentSuggestion(response.suggestion ?? null);

      if (!response.suggestion) {
        setMessage(response.message ?? "No se encontró una sugerencia válida para los eventos pendientes.");
        return;
      }
      setMessage(
        `Sugerencia generada (alcance ${response.scopeKey}). Puntaje: ${response.suggestion.score.toFixed(2)}. Revisa y aplica por reunion.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo generar sugerencias de asignación.");
    } finally {
      setIsLoadingSuggestion(false);
    }
  }

  async function suggestNextMonthlyAssignment() {
    if (!suggestionSessionId) {
      setMessage("Primero debes generar una sugerencia inicial.");
      return;
    }

    setIsLoadingSuggestion(true);
    try {
      const response = await loadNextAssignmentSuggestion(suggestionSessionId);
      if (!response) {
        setMessage("No se pudo obtener la siguiente sugerencia.");
        return;
      }

      setSuggestionSessionId(response.sessionId);
      setAssignmentSuggestion(response.suggestion ?? null);

      if (!response.suggestion) {
        setMessage(response.message ?? "No hay más sugerencias equivalentes disponibles.");
        return;
      }
      setMessage(`Alternativa lista. Puntaje: ${response.suggestion.score.toFixed(2)}. Revisa y aplica por reunion.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo obtener la siguiente sugerencia.");
    } finally {
      setIsLoadingSuggestion(false);
    }
  }


  return {
    setInterest,
    assignAssistantToEvent,
    removeAssistanceFromAssignmentEvent,
    onUnassignAssistantFromEvent,
    suggestMonthlyAssignment,
    suggestNextMonthlyAssignment
  };
}
