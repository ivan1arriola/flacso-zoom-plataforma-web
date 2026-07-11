import type { FormEvent } from "react";
import type { SolicitudFormState } from "@/src/lib/spa-home/solicitud-form";
import type { Solicitud } from "@/src/services/solicitudesApi";
import type { AssignableAssistant } from "@/src/services/dashboardApi";

export interface SpaTabSolicitudesProps {
  solicitudes: Solicitud[];
  form: SolicitudFormState;
  updateForm: <K extends keyof SolicitudFormState>(key: K, value: SolicitudFormState[K]) => void;
  onDeleteSolicitud: (solicitudId: string) => void;
  deletingSolicitudId: string | null;
  onCancelSolicitudSerie: (solicitudId: string, titulo: string) => void;
  cancellingSerieSolicitudId: string | null;
  onCancelSolicitudInstancia: (input: {
    solicitudId: string;
    titulo: string;
    eventoId?: string | null;
    occurrenceId?: string | null;
    startTime: string;
  }) => void;
  cancellingInstanciaKey: string | null;
  onRestoreSolicitudInstancia: (input: {
    solicitudId: string;
    titulo: string;
    eventoId?: string | null;
    startTime: string;
  }) => void;
  restoringInstanciaKey: string | null;
  canAddInstances: boolean;
  addingInstanceSolicitudId: string | null;
  onAddInstance: (input: {
    solicitudId: string;
    titulo: string;
    inicioProgramadoAt: string;
    finProgramadoAt: string;
  }) => Promise<boolean>;
  canSendReminder: boolean;
  sendingReminderSolicitudId: string | null;
  onSendReminder: (input: {
    solicitudId: string;
    toEmail?: string;
    mensaje?: string;
  }) => Promise<boolean>;
  canEditMeeting: boolean;
  onEditMeeting: (input: {
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
  }) => Promise<boolean>;
  canEditMeetingDuration: boolean;
  updatingMeetingDurationEventId: string | null;
  onEditMeetingDuration: (input: {
    eventoId: string;
    titulo: string;
    inicioProgramadoAt: string;
    minutosReales: number;
  }) => Promise<boolean>;
  canReassignRecurringSolicitud: boolean;
  onReassignRecurringSolicitud: (input: {
    solicitudId: string;
    titulo: string;
    responsableNombre: string;
    docenteCreadorNombre: string;
  }) => Promise<boolean>;
  canEditAssistance: boolean;
  updatingAssistanceSolicitudId: string | null;
  updatingAssistanceInstanceKey: string | null;
  assignableAssistants: AssignableAssistant[];
  onEnableAssistance: (input: {
    solicitudId: string;
    titulo: string;
    requiereAsistencia: boolean;
  }) => void;
  onToggleAssistanceForInstance: (input: {
    solicitudId: string;
    titulo: string;
    eventoId?: string | null;
    startTime: string;
    requiereAsistencia: boolean;
    asistenteZoomId?: string;
  }) => void;
  canDeleteSolicitud: boolean;
  canRestoreInstances: boolean;
  isSubmittingSolicitud: boolean;
  canCreateShortcut: boolean;
  canDelegateResponsable: boolean;
  responsableOptions: Array<{ value: string; label: string }>;
  docenteLinkedEmailOptions: string[];
  programaOptions: string[];
  isCreatingPrograma: boolean;
  onCreatePrograma: (nombre: string) => Promise<string | null>;
  docenteSolicitudesView: "form" | "list";
  setDocenteSolicitudesView: (view: "form" | "list") => void;
  viewerRole?: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isLoading?: boolean;
}

export type SolicitudesListScope = "ACTIVAS" | "FINALIZADAS";
export type SolicitudesSortMode = "PROXIMA_INSTANCIA" | "FECHA_SOLICITUD";
export type EditMeetingDialogState = {
  id: string;
  titulo: string;
  eventoId: string;
  isRecurring: boolean;
  selectedInstanceLabel: string;
  targetOccurrenceId?: string;
  targetPreviousStart?: string;
};

export type EditMeetingDurationDialogState = {
  eventoId: string;
  titulo: string;
  inicioProgramadoAt: string;
  fechaLabel: string;
  minutosProgramados: number;
  minutosRealesActuales?: number | null;
};

export type EditMeetingFormState = {
  titulo: string;
  programaNombre: string;
  responsableNombre: string;
  docenteCreadorNombre: string;
  modalidadReunion: string;
  inicioProgramadoAt: string;
  finProgramadoAt: string;
};
