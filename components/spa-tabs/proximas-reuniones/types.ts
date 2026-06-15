import type { ZoomUpcomingMeeting } from "@/src/services/zoomApi";

export type ZoomGroupingMode = "WEEK" | "MONTH";
export type ZoomViewMode = "CALENDAR" | "RECURRENTES";

export type ZoomMeetingGroup = {
  key: string;
  label: string;
  meetings: ZoomUpcomingMeeting[];
};

export type ZoomMeetingGroupByDay = {
  key: string;
  label: string;
  meetings: ZoomUpcomingMeeting[];
};

export type ZoomMeetingsByMonthAndDay = {
  key: string;
  label: string;
  dayGroups: ZoomMeetingGroupByDay[];
};

export type ZoomRecurringSeries = {
  key: string;
  meetingId: string | null;
  topic: string;
  meetings: ZoomUpcomingMeeting[];
  accountEmails: string[];
};

export type MonthOption = {
  value: string;
  label: string;
};

export type RegisterUpcomingMeetingInput = {
  meeting: ZoomUpcomingMeeting;
  responsableNombre: string;
  programaNombre: string;
  modalidadReunion: "VIRTUAL" | "HIBRIDA";
  requiereAsistencia: boolean;
  descripcion?: string;
};

export type RegisterUpcomingMeetingForm = {
  responsableNombre: string;
  programaNombre: string;
  modalidadReunion: "VIRTUAL" | "HIBRIDA";
  requiereAsistencia: boolean;
  descripcion: string;
};

export interface SpaTabProximasReunionesProps {
  title?: string;
  subtitle?: string;
  groupName: string;
  meetings: ZoomUpcomingMeeting[];
  isLoading: boolean;
  onRefresh: () => void;
  onCreatePostMeetingRecord?: (meeting: ZoomUpcomingMeeting) => void;
  onRegisterUpcomingMeeting?: (input: RegisterUpcomingMeetingInput) => Promise<boolean>;
  isRegisteringUpcomingMeeting?: boolean;
  programaOptions?: string[];
  responsableOptions?: Array<{ value: string; label: string }>;
  defaultResponsableNombre?: string;
  enablePastMeetingDetails?: boolean;
  defaultDetailsExpanded?: boolean;
  defaultViewMode?: ZoomViewMode;
  onLoadMoreBack?: () => void;
  canLoadMoreBack?: boolean;
  isLoadingMoreBack?: boolean;
  monthOptions?: MonthOption[];
  selectedMonth?: string;
  onSelectMonth?: (monthKey: string) => void;
  isLoadingMonthSelection?: boolean;
}
