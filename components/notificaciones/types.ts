export type NotificationScope = "mine" | "all";
export type NotificationReadFilter = "TODAS" | "LEIDAS" | "NO_LEIDAS";
export type NotificationOrder = "asc" | "desc";
export type NotificationActivityFilter = "TODAS" | "LOGIN" | "ZOOM_RECORDING";
export type NotificationTypeFilter = "" | "EMAIL" | "IN_APP" | "ALERTA_OPERATIVA";
export type NotificationStatusFilter = "" | "PENDIENTE" | "ENVIADA" | "FALLIDA";

export interface NotificacionUsuario {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface Notificacion {
  id: string;
  usuarioId: string;
  tipoNotificacion: "EMAIL" | "IN_APP" | "ALERTA_OPERATIVA";
  canalDestino: string;
  asunto: string;
  cuerpo: string;
  estadoEnvio: "PENDIENTE" | "ENVIADA" | "FALLIDA";
  intentoCount: number;
  ultimoIntentoAt: string | null;
  entidadReferenciaTipo: string | null;
  entidadReferenciaId: string | null;
  leidaAt: string | null;
  createdAt: string;
  updatedAt: string;
  usuario: NotificacionUsuario;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface NotificacionesResponse {
  scope: NotificationScope;
  orden: NotificationOrder;
  actividad?: NotificationActivityFilter;
  notificaciones: Notificacion[];
  unreadCount: number;
  pagination: PaginationInfo;
}

export type NotificationBodyField = {
  label: string;
  value: string;
};

export type SpaTabNotificacionesProps = {
  isAdmin: boolean;
};
