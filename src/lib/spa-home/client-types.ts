export type CurrentUser = {
  id: string;
  email: string;
  emails?: string[];
  role: string;
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
};

export type PastMeetingZoomSeed = {
  meetingId: string;
  topic: string;
  startTime: string;
  endTime: string;
  joinUrl: string;
  accountEmail: string;
};

export type DocenteOption = {
  value: string;
  label: string;
  nombre: string;
};

export type MonitorOption = {
  value: string;
  label: string;
  nombre: string;
};

export type BusyOperationKey =
  | "BOOTSTRAP"
  | "SUBMIT_SOLICITUD"
  | "DELETE_SOLICITUD"
  | "CANCEL_SERIE"
  | "CANCEL_INSTANCIA"
  | "RESTORE_INSTANCIA"
  | "UPDATE_ASISTENCIA"
  | "GENERIC";

export type ZoomPastMonthOption = {
  value: string;
  label: string;
  monthsBack: number;
};
