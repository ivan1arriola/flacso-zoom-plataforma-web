import { useMemo } from "react";
import {
  canAccessTabForRole,
  resolveEffectiveRoleForUser,
  type Tab,
  type ViewRole
} from "@/src/lib/spa-home/navigation";

type UserLike = {
  role?: string | null;
} | null | undefined;

export function useSpaAccess(user: UserLike) {
  const effectiveRole = useMemo<ViewRole | "">(
    () => resolveEffectiveRoleForUser(user?.role),
    [user?.role]
  );

  const access = useMemo(() => {
    const canSeeAsistentesAsignacion = canAccessTabForRole("asistentes_asignacion", effectiveRole);
    const canSeeAsistentesPerfiles = canAccessTabForRole("asistentes_perfiles", effectiveRole);

    return {
      canSeeManual: canAccessTabForRole("manual", effectiveRole),
      canSeePastMeetings: canAccessTabForRole("historico", effectiveRole),
      canSeeZoomAccounts: canAccessTabForRole("cuentas", effectiveRole),
      canSeeUsers: canAccessTabForRole("usuarios", effectiveRole),
      canSeeLogins: canAccessTabForRole("logins", effectiveRole),
      canSeeAgendaLibre: canAccessTabForRole("agenda_libre", effectiveRole),
      canSeeMisReunionesAsignadas: canAccessTabForRole("mis_reuniones_asignadas", effectiveRole),
      canSeeMisAsistencias: canAccessTabForRole("mis_asistencias", effectiveRole),
      canSeeHistoricoAsistencias: canAccessTabForRole("historico_asistencias", effectiveRole),
      canSeeAsistentesAsignacion,
      canSeeAsistentesPerfiles,
      canSeeGestionAsistentes:
        canSeeAsistentesAsignacion || canSeeAsistentesPerfiles,
      canSeeTarifas: canAccessTabForRole("tarifas", effectiveRole),
      canSeeEstadisticas: canAccessTabForRole("estadisticas", effectiveRole),
      canSeeNotificaciones: canAccessTabForRole("notificaciones", effectiveRole),
      canSeeSolicitudes: canAccessTabForRole("solicitudes", effectiveRole),
      canSeeAgendaAdmin: canAccessTabForRole("agenda_admin", effectiveRole),
      canSeeProgramas: canAccessTabForRole("programas", effectiveRole),
      canSendSolicitudReminder: ["DOCENTE", "ADMINISTRADOR"].includes(effectiveRole),
      canCreateSolicitudShortcut: ["DOCENTE", "ADMINISTRADOR"].includes(effectiveRole),
      canEditSolicitudAssistance: ["DOCENTE", "ADMINISTRADOR"].includes(effectiveRole),
      canEditSolicitudDuration: ["DOCENTE", "ADMINISTRADOR"].includes(effectiveRole),
      canDelegateSolicitudResponsable: effectiveRole === "ADMINISTRADOR"
    };
  }, [effectiveRole]);

  return {
    effectiveRole,
    ...access
  };
}

export function canAccessCurrentTab(tab: Tab, role: ViewRole | "") {
  return canAccessTabForRole(tab, role);
}
