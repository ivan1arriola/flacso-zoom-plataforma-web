"use client";

import dynamic from "next/dynamic";
import { type ComponentProps, useEffect, useMemo, useRef, useState } from "react";
import { Box } from "@mui/material";
import {
  canAccessTabForRole,
  getDefaultTabForRole,
  resolveEffectiveRoleForUser,
  type ViewRole
} from "@/src/lib/spa-home/navigation";
import {
  loadSummary,
  loadAssignmentBoard
} from "@/src/services/dashboardApi";
import { loadSolicitudes } from "@/src/services/solicitudesApi";
import {
  loadProgramas,
  type Programa
} from "@/src/services/programasApi";
import { loadAgendaLibre } from "@/src/services/agendaApi";
import {
  loadUsers,
  loadGoogleAccountStatus
} from "@/src/services/userApi";
import { loadTarifas } from "@/src/services/tarifasApi";
import { loadManualPendings } from "@/src/services/zoomApi";
import { useSolicitudes } from "@/src/hooks/useSolicitudes";
import { useTarifas, type TarifaModalidad } from "@/src/hooks/useTarifas";
import { useZoomAccounts } from "@/src/hooks/useZoomAccounts";
import { useManagedUsers } from "@/src/hooks/useManagedUsers";
import { useAgendaLibre } from "@/src/hooks/useAgendaLibre";
import { useAssignmentBoard } from "@/src/hooks/useAssignmentBoard";
import { useUserProfile } from "@/src/hooks/useUserProfile";
import { usePastMeetings } from "@/src/hooks/usePastMeetings";
import { useDashboard } from "@/src/hooks/useDashboard";
import { useUIState } from "@/src/hooks/useUIState";
import { useZoomUpcomingMeetings } from "@/src/hooks/useZoomUpcomingMeetings";
import { useZoomPastMeetings } from "@/src/hooks/useZoomPastMeetings";
import type { SpaTabSolicitudes as SpaTabSolicitudesComponent } from "@/components/spa-tabs/SpaTabSolicitudes";
import type { ManualResolutionInput } from "@/components/spa-tabs/SpaTabManual";
import { SpaBusyOverlay } from "@/components/spa-home/SpaBusyOverlay";
import { SpaSnackbar } from "@/components/spa-home/SpaSnackbar";
import { useSpaBusyState } from "@/src/hooks/useSpaBusyState";
import { useSpaAccess } from "@/src/hooks/useSpaAccess";
import { useSpaHomeOptions } from "@/src/hooks/useSpaHomeOptions";
import { useSpaProfileActions } from "@/src/hooks/useSpaProfileActions";
import { useSpaUserActions } from "@/src/hooks/useSpaUserActions";
import { useSpaZoomActions } from "@/src/hooks/useSpaZoomActions";
import { useSpaPastMeetingActions } from "@/src/hooks/useSpaPastMeetingActions";
import { useSpaProgramaActions } from "@/src/hooks/useSpaProgramaActions";
import { useSpaSolicitudActions } from "@/src/hooks/useSpaSolicitudActions";
import { useSpaAssignmentActions } from "@/src/hooks/useSpaAssignmentActions";
import { useSpaTarifaActions } from "@/src/hooks/useSpaTarifaActions";
import type {
  CurrentUser,
  PastMeetingZoomSeed
} from "@/src/lib/spa-home/client-types";
import {
  buildZoomPastMonthOptions,
  readJsonSafe
} from "@/src/lib/spa-home/client-utils";


export type { CurrentUser } from "@/src/lib/spa-home/client-types";

function TabLoadingFallback() {
  return (
    <Box sx={{ py: 4, color: "text.secondary", fontWeight: 600 }}>
      Cargando seccion...
    </Box>
  );
}

const SpaTabDashboard = dynamic(
  () => import("@/components/spa-tabs/SpaTabDashboard").then((module) => module.SpaTabDashboard),
  { loading: TabLoadingFallback }
);
const SpaTabSolicitudes = dynamic(
  () => import("@/components/spa-tabs/SpaTabSolicitudes").then((module) => module.SpaTabSolicitudes),
  { loading: TabLoadingFallback }
);
const SpaTabProgramas = dynamic(
  () => import("@/components/spa-tabs/SpaTabProgramas").then((module) => module.SpaTabProgramas),
  { loading: TabLoadingFallback }
);
const SpaTabAgendaLibre = dynamic(
  () => import("@/components/spa-tabs/SpaTabAgendaLibre").then((module) => module.SpaTabAgendaLibre),
  { loading: TabLoadingFallback }
);
const SpaTabMisReunionesAsignadas = dynamic(
  () => import("@/components/spa-tabs/SpaTabMisReunionesAsignadas").then((module) => module.SpaTabMisReunionesAsignadas),
  { loading: TabLoadingFallback }
);
const SpaTabMisAsistencias = dynamic(
  () => import("@/components/spa-tabs/SpaTabMisAsistencias").then((module) => module.SpaTabMisAsistencias),
  { loading: TabLoadingFallback }
);
const SpaTabHistoricoAsistencias = dynamic(
  () => import("@/components/spa-tabs/SpaTabHistoricoAsistencias").then((module) => module.SpaTabHistoricoAsistencias),
  { loading: TabLoadingFallback }
);
const SpaTabManual = dynamic(
  () => import("@/components/spa-tabs/SpaTabManual").then((module) => module.SpaTabManual),
  { loading: TabLoadingFallback }
);
const SpaTabHistorico = dynamic(
  () => import("@/components/spa-tabs/SpaTabHistorico").then((module) => module.SpaTabHistorico),
  { loading: TabLoadingFallback }
);
const SpaTabTarifas = dynamic(
  () => import("@/components/spa-tabs/SpaTabTarifas").then((module) => module.SpaTabTarifas),
  { loading: TabLoadingFallback }
);
const SpaTabGestionAsistentes = dynamic(
  () => import("@/components/spa-tabs/SpaTabGestionAsistentes").then((module) => module.SpaTabGestionAsistentes),
  { loading: TabLoadingFallback }
);
const SpaTabCuentas = dynamic(
  () => import("@/components/spa-tabs/SpaTabCuentas").then((module) => module.SpaTabCuentas),
  { loading: TabLoadingFallback }
);
const SpaTabProximasReuniones = dynamic(
  () => import("@/components/spa-tabs/SpaTabProximasReuniones").then((module) => module.SpaTabProximasReuniones),
  { loading: TabLoadingFallback }
);
const SpaTabPasadasReunionesZoom = dynamic(
  () => import("@/components/spa-tabs/SpaTabPasadasReunionesZoom").then((module) => module.SpaTabPasadasReunionesZoom),
  { loading: TabLoadingFallback }
);
const SpaTabUsuarios = dynamic(
  () => import("@/components/spa-tabs/SpaTabUsuarios").then((module) => module.SpaTabUsuarios),
  { loading: TabLoadingFallback }
);
const SpaTabLogins = dynamic(
  () => import("@/components/spa-tabs/SpaTabLogins").then((module) => module.SpaTabLogins),
  { loading: TabLoadingFallback }
);
const SpaTabPerfil = dynamic(
  () => import("@/components/spa-tabs/SpaTabPerfil").then((module) => module.SpaTabPerfil),
  { loading: TabLoadingFallback }
);
const SpaTabEstadisticas = dynamic(
  () => import("@/components/spa-tabs/SpaTabEstadisticas").then((module) => module.SpaTabEstadisticas),
  { loading: TabLoadingFallback }
);
const SpaTabAgendaAdmin = dynamic(
  () => import("@/components/spa-tabs/SpaTabAgendaAdmin").then((module) => module.SpaTabAgendaAdmin),
  { loading: TabLoadingFallback }
);
const SpaTabNotificaciones = dynamic(
  () => import("@/components/SpaTabNotificaciones").then((module) => module.SpaTabNotificaciones),
  { loading: TabLoadingFallback }
);

export function SpaHomeScreen() {
  const hasBootstrappedRef = useRef(false);
  const loadedResourceKeysRef = useRef<Set<string>>(new Set());
  const loadingResourcePromisesRef = useRef<Record<string, Promise<void>>>({});
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [isCreatingPrograma, setIsCreatingPrograma] = useState(false);
  const [isRefreshingProgramas, setIsRefreshingProgramas] = useState(false);

  // UI State
  const { tab, setTab, message, setMessage, loading, setLoading, requestedTab } = useUIState();
  
  // Solicitudes & Doctentes
  const {
    solicitudes,
    setSolicitudes,
    setDocenteSolicitudesView,
    isSubmittingSolicitud,
    setIsSubmittingSolicitud,
    deletingSolicitudId,
    setDeletingSolicitudId,
    cancellingSerieSolicitudId,
    setCancellingSerieSolicitudId,
    cancellingInstanciaKey,
    setCancellingInstanciaKey,
    restoringInstanciaKey,
    setRestoringInstanciaKey,
    sendingReminderSolicitudId,
    setSendingReminderSolicitudId,
    form,
    setForm,
    updateForm,
    isLoadingSolicitudes,
    setIsLoadingSolicitudes
  } = useSolicitudes();
  const [addingInstanciaSolicitudId, setAddingInstanciaSolicitudId] = useState<string | null>(null);
  
  // Dashboard
  const { 
    summary, setSummary, 
    isLoadingSummary, setIsLoadingSummary, 
    manualPendings, setManualPendings 
  } = useDashboard();
  const [resolvingManualSolicitudId, setResolvingManualSolicitudId] = useState<string | null>(null);
  
  // Agenda Libre
  const {
    agendaLibre,
    setAgendaLibre,
    updatingInterestId,
    setUpdatingInterestId,
    isLoadingAgendaLibre,
    setIsLoadingAgendaLibre,
    hasLoadedAgendaLibre,
    setHasLoadedAgendaLibre
  } = useAgendaLibre();
  
  // Assignment Board
  const {
    assignmentBoardEvents,
    setAssignmentBoardEvents,
    assignableAssistants,
    setAssignableAssistants,
    isLoadingAssignmentBoard,
    setIsLoadingAssignmentBoard,
    assigningEventId,
    setAssigningEventId,
    selectedAssistantByEvent,
    setSelectedAssistantByEvent,
    assignmentSuggestion,
    setAssignmentSuggestion,
    suggestionSessionId,
    setSuggestionSessionId,
    isLoadingSuggestion,
    setIsLoadingSuggestion
  } = useAssignmentBoard();
  
  // Tarifas
  const {
    setTarifas,
    isSubmittingTarifa,
    setIsSubmittingTarifa,
    tarifaFormByModalidad,
    setTarifaFormByModalidad,
    currentTarifaByModalidad
  } = useTarifas();
  
  // Zoom Accounts
  const { zoomAccounts, setZoomAccounts, zoomGroupName, setZoomGroupName, isLoadingZoomAccounts, setIsLoadingZoomAccounts, expandedZoomAccountId, setExpandedZoomAccountId } = useZoomAccounts();
  const {
    zoomUpcomingMeetings,
    setZoomUpcomingMeetings,
    isLoadingZoomUpcomingMeetings,
    setIsLoadingZoomUpcomingMeetings
  } = useZoomUpcomingMeetings();
  const {
    zoomPastMeetings,
    setZoomPastMeetings,
    isLoadingZoomPastMeetings,
    setIsLoadingZoomPastMeetings
  } = useZoomPastMeetings();
  const zoomPastMonthOptions = useMemo(() => buildZoomPastMonthOptions(), []);
  const [selectedZoomPastMonthKey, setSelectedZoomPastMonthKey] = useState(
    () => zoomPastMonthOptions[0]?.value ?? ""
  );
  
  // Managed Users
  const {
    users,
    setUsers,
    isLoadingUsers,
    setIsLoadingUsers,
    isCreatingUser,
    setIsCreatingUser,
    updatingUserId,
    setUpdatingUserId,
    resendingActivationUserId,
    setResendingActivationUserId,
    createUserForm,
    setCreateUserForm
  } = useManagedUsers();
  const [isSendingSelfActivationLink, setIsSendingSelfActivationLink] = useState(false);
  
  // Past Meetings
  const {
    isSubmittingPastMeeting,
    setIsSubmittingPastMeeting,
    isLoadingPastMeetings,
    setIsLoadingPastMeetings,
    pastMeetings,
    setPastMeetings,
    pastMeetingForm,
    setPastMeetingForm
  } = usePastMeetings();
  const [pastMeetingZoomSeed, setPastMeetingZoomSeed] = useState<PastMeetingZoomSeed | null>(null);
  const [updatingPastMeetingId, setUpdatingPastMeetingId] = useState<string | null>(null);
  const [isRegisteringUpcomingMeeting, setIsRegisteringUpcomingMeeting] = useState(false);
  const [updatingAsistenciaSolicitudId, setUpdatingAsistenciaSolicitudId] = useState<string | null>(null);
  const [updatingAsistenciaInstanciaKey, setUpdatingAsistenciaInstanciaKey] = useState<string | null>(null);
  const [updatingMeetingDurationEventId, setUpdatingMeetingDurationEventId] = useState<string | null>(null);
  const [removingAssistanceAssignmentEventId, setRemovingAssistanceAssignmentEventId] = useState<string | null>(null);
  
  // User Profile & Auth
  const { 
    user, setUser, googleLinked, setGoogleLinked, hasPassword, setHasPassword, 
    isLoadingGoogleStatus, setIsLoadingGoogleStatus, isSyncingGoogleProfile, setIsSyncingGoogleProfile, 
    isUnlinkingGoogleAccount, setIsUnlinkingGoogleAccount, isUpdatingProfile, setIsUpdatingProfile, 
    profileForm, setProfileForm, showProfileForm, setShowProfileForm,
    isUpdatingPassword, setIsUpdatingPassword, passwordForm, setPasswordForm, showPasswordForm, setShowPasswordForm
  } = useUserProfile();

  const {
    effectiveRole,
    canSeeManual,
    canSeePastMeetings,
    canSeeZoomAccounts,
    canSeeUsers,
    canSeeLogins,
    canSeeAgendaLibre,
    canSeeMisReunionesAsignadas,
    canSeeMisAsistencias,
    canSeeHistoricoAsistencias,
    canSeeAsistentesAsignacion,
    canSeeGestionAsistentes,
    canSeeTarifas,
    canSeeEstadisticas,
    canSeeNotificaciones,
    canSeeSolicitudes,
    canSeeAgendaAdmin,
    canSeeProgramas,
    canSendSolicitudReminder,
    canCreateSolicitudShortcut,
    canEditSolicitudAssistance,
    canEditSolicitudDuration,
    canDelegateSolicitudResponsable
  } = useSpaAccess(user);

  const {
    selectedZoomPastMonthsBack,
    requesterResponsibleEmail,
    docenteLinkedEmailOptions,
    responsableOptions,
    docenteOptions,
    monitorOptions,
    programaOptions,
    manualAccountOptions,
    manualMeetingOptionsByAccountId
  } = useSpaHomeOptions({
    effectiveRole,
    user,
    users,
    programas,
    zoomAccounts,
    selectedZoomPastMonthKey,
    zoomPastMonthOptions,
    selectedResponsable: form.responsable
  });

  function buildSummaryLoadOptions(
    role: ViewRole | "" = effectiveRole,
    targetTab: string = tab
  ) {
    return {
      includeAdminZoomAlerts: role === "ADMINISTRADOR" && targetTab === "dashboard"
    };
  }

  const {
    linkGoogleAccount,
    unlinkGoogleAccount,
    syncProfileFromGoogle,
    submitProfile,
    submitPassword
  } = useSpaProfileActions({
    profileForm,
    passwordForm,
    setMessage,
    setUser,
    setProfileForm,
    setGoogleLinked,
    setHasPassword,
    setIsSyncingGoogleProfile,
    setIsUnlinkingGoogleAccount,
    setIsUpdatingProfile,
    setIsUpdatingPassword,
    setShowProfileForm,
    setShowPasswordForm,
    setPasswordForm
  });

  const {
    refreshUsers,
    submitCreateUser,
    updateUserRole,
    resendUserActivationLink,
    sendSelfActivationLinkTest
  } = useSpaUserActions({
    createUserForm,
    setCreateUserForm,
    setUsers,
    setMessage,
    setIsLoadingUsers,
    setIsCreatingUser,
    setUpdatingUserId,
    setResendingActivationUserId,
    setIsSendingSelfActivationLink
  });

  const {
    refreshZoomAccounts,
    refreshZoomUpcomingMeetings,
    registerUpcomingMeetingInSystem,
    refreshZoomPastMeetings,
    selectZoomPastMonth
  } = useSpaZoomActions({
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
  });

  const {
    preloadPastMeetingFormFromZoom,
    refreshPastMeetings,
    updatePastMeetingRecord,
    submitPastMeeting
  } = useSpaPastMeetingActions({
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
  });

  const {
    createProgramaOnDemand,
    refreshProgramasView
  } = useSpaProgramaActions({
    setProgramas,
    setSolicitudes,
    setMessage,
    setIsCreatingPrograma,
    setIsRefreshingProgramas
  });

  const {
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
  } = useSpaSolicitudActions({
    form,
    responsableOptions,
    docenteLinkedEmailOptions,
    canDelegateSolicitudResponsable,
    setMessage,
    setDocenteSolicitudesView,
    onSolicitudCreated: () => setTab("solicitudes"),
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
  });

  const {
    setInterest,
    assignAssistantToEvent,
    removeAssistanceFromAssignmentEvent,
    onUnassignAssistantFromEvent,
    suggestMonthlyAssignment,
    suggestNextMonthlyAssignment
  } = useSpaAssignmentActions({
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
  });

  const { submitTarifaUpdate } = useSpaTarifaActions({
    tarifaFormByModalidad,
    setTarifas,
    setMessage,
    setIsSubmittingTarifa
  });

  const { isGlobalBusy, globalBusyLabel } = useSpaBusyState({
    loading,
    isSubmittingSolicitud,
    deletingSolicitudId,
    cancellingSerieSolicitudId,
    cancellingInstanciaKey,
    restoringInstanciaKey,
    updatingAsistenciaSolicitudId,
    updatingAsistenciaInstanciaKey
  });

  async function loadResourceOnce(key: string, loader: () => Promise<void>) {
    if (loadedResourceKeysRef.current.has(key)) return;

    const pending = loadingResourcePromisesRef.current[key];
    if (pending) {
      await pending;
      return;
    }

    const promise = (async () => {
      try {
        await loader();
        loadedResourceKeysRef.current.add(key);
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Error desconocido.";
        setMessage(`No se pudo cargar la informacion de esta seccion. ${detail}`);
      }
    })();

    loadingResourcePromisesRef.current[key] = promise;
    try {
      await promise;
    } finally {
      delete loadingResourcePromisesRef.current[key];
    }
  }

  function applyAssignmentBoard(data: Awaited<ReturnType<typeof loadAssignmentBoard>>) {
    if (!data) return;
    setAssignmentBoardEvents(data.events ?? []);
    setAssignableAssistants(data.assistants ?? []);
    setSelectedAssistantByEvent((prev) => {
      const next = { ...prev };
      for (const event of data.events ?? []) {
        if (!next[event.id]) {
          next[event.id] =
            event.currentAssignment?.asistenteZoomId ??
            event.interesados[0]?.asistenteZoomId ??
            "";
        }
      }
      return next;
    });
  }

  async function loadSummaryData(options?: {
    force?: boolean;
    role?: ViewRole | "";
    targetTab?: string;
  }) {
    const role = options?.role ?? effectiveRole;
    const targetTab = options?.targetTab ?? tab;
    const key = `summary:${role || "sin-rol"}:${targetTab}`;
    const loader = async () => {
      setIsLoadingSummary(true);
      try {
        const data = await loadSummary(buildSummaryLoadOptions(role, targetTab));
        if (data) setSummary(data);
      } finally {
        setIsLoadingSummary(false);
      }
    };

    if (options?.force) {
      loadedResourceKeysRef.current.delete(key);
      await loader();
      loadedResourceKeysRef.current.add(key);
      return;
    }

    await loadResourceOnce(key, loader);
  }

  async function loadSolicitudesOnce() {
    await loadResourceOnce("solicitudes", async () => {
      setIsLoadingSolicitudes(true);
      try {
        const data = await loadSolicitudes();
        if (data) setSolicitudes(data);
      } finally {
        setIsLoadingSolicitudes(false);
      }
    });
  }

  async function loadProgramasOnce() {
    await loadResourceOnce("programas", async () => {
      const data = await loadProgramas();
      if (data) setProgramas(data);
    });
  }

  async function loadTarifasOnce() {
    await loadResourceOnce("tarifas", async () => {
      const data = await loadTarifas();
      if (data) setTarifas(data);
    });
  }

  async function loadUsersOnce() {
    await loadResourceOnce("users", async () => {
      setIsLoadingUsers(true);
      try {
        const data = await loadUsers();
        if (data) setUsers(data);
      } finally {
        setIsLoadingUsers(false);
      }
    });
  }

  async function loadManualPendingsOnce() {
    await loadResourceOnce("manual-pendings", async () => {
      const data = await loadManualPendings();
      if (data) setManualPendings(data);
    });
  }

  async function loadAgendaLibreOnce() {
    await loadResourceOnce("agenda-libre", async () => {
      setIsLoadingAgendaLibre(true);
      try {
        const data = await loadAgendaLibre();
        if (data) setAgendaLibre(data);
        setHasLoadedAgendaLibre(true);
      } finally {
        setIsLoadingAgendaLibre(false);
      }
    });
  }

  async function loadAssignmentBoardOnce() {
    await loadResourceOnce("assignment-board", async () => {
      setIsLoadingAssignmentBoard(true);
      try {
        const data = await loadAssignmentBoard();
        applyAssignmentBoard(data);
      } finally {
        setIsLoadingAssignmentBoard(false);
      }
    });
  }

  async function loadPastMeetingsOnce() {
    await loadResourceOnce("past-meetings", async () => {
      await refreshPastMeetings();
    });
  }

  useEffect(() => {
    void bootstrap();
  }, []);

  async function bootstrap() {
    setLoading(true);
    try {
      const meRes = await fetch("/api/v1/auth/me", { cache: "no-store" });
      const meJson = (await readJsonSafe<{ user?: CurrentUser; error?: string }>(meRes)) ?? {};
      if (!meRes.ok || !meJson.user) {
        setMessage(meJson.error ?? "No autenticado.");
        return;
      }
      setUser(meJson.user);
      setProfileForm({
        firstName: meJson.user.firstName ?? "",
        lastName: meJson.user.lastName ?? "",
        image: meJson.user.image ?? ""
      });

      const presentationRole = resolveEffectiveRoleForUser(meJson.user.role);
      const initialTab = requestedTab ?? getDefaultTabForRole(presentationRole || "ADMINISTRADOR");
      setTab(initialTab);

      if (initialTab === "dashboard") {
        await loadSummaryData({ role: presentationRole, targetTab: initialTab });
      }
    } finally {
      hasBootstrappedRef.current = true;
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!effectiveRole) return;
    if (canAccessTabForRole(tab, effectiveRole)) return;
    setTab(getDefaultTabForRole(effectiveRole));
  }, [effectiveRole, tab, setTab]);

  useEffect(() => {
    if (!requesterResponsibleEmail) return;
    if (effectiveRole !== "DOCENTE") return;
    setForm((prev) => {
      if (prev.responsable.trim()) {
        return prev;
      }
      return {
        ...prev,
        responsable: requesterResponsibleEmail
      };
    });
  }, [effectiveRole, requesterResponsibleEmail, setForm]);

  useEffect(() => {
    if (effectiveRole !== "ADMINISTRADOR") return;
    if (responsableOptions.length === 0) return;
    setForm((prev) => {
      const current = prev.responsable.trim().toLowerCase();
      if (current && responsableOptions.some((option) => option.value === current)) {
        return prev;
      }
      return {
        ...prev,
        responsable: responsableOptions[0]?.value ?? ""
      };
    });
  }, [effectiveRole, responsableOptions, setForm]);

  useEffect(() => {
    if (docenteLinkedEmailOptions.length === 0) return;
    setForm((prev) => {
      const current = prev.correoVinculado.trim().toLowerCase();
      if (current && docenteLinkedEmailOptions.includes(current)) {
        return prev;
      }
      return {
        ...prev,
        correoVinculado: docenteLinkedEmailOptions[0] ?? ""
      };
    });
  }, [docenteLinkedEmailOptions, setForm]);

  useEffect(() => {
    if (!hasBootstrappedRef.current) return;
    if (tab !== "dashboard") return;
    void loadSummaryData();
    if (effectiveRole === "ASISTENTE_ZOOM" && canSeeAgendaLibre) {
      void loadAgendaLibreOnce();
    }
  }, [tab, effectiveRole, canSeeAgendaLibre]);

  useEffect(() => {
    if (!hasBootstrappedRef.current) return;

    if ((tab === "crear_reunion" || tab === "solicitudes") && canSeeSolicitudes) {
      void loadSolicitudesOnce();
      void loadProgramasOnce();
      if (effectiveRole === "ADMINISTRADOR") {
        void loadUsersOnce();
        void loadAssignmentBoardOnce();
      }
    }

    if (tab === "agenda_admin" && canSeeAgendaAdmin) {
      void loadSolicitudesOnce();
    }

    if (tab === "programas" && canSeeProgramas) {
      void loadProgramasOnce();
      void loadSolicitudesOnce();
    }
  }, [tab, canSeeSolicitudes, canSeeAgendaAdmin, canSeeProgramas, effectiveRole]);

  useEffect(() => {
    if (tab !== "perfil" || !user) return;
    (async () => {
      setIsLoadingGoogleStatus(true);
      try {
        const status = await loadGoogleAccountStatus();
        setGoogleLinked(status.linked);
        setHasPassword(status.hasPassword);
      } finally {
        setIsLoadingGoogleStatus(false);
      }
    })();
  }, [tab, user?.id]);

  useEffect(() => {
    if ((tab !== "cuentas" && tab !== "manual") || !canSeeZoomAccounts) return;
    void refreshZoomAccounts();
  }, [tab, canSeeZoomAccounts]);

  useEffect(() => {
    if (tab !== "manual" || !canSeeManual) return;
    void loadManualPendingsOnce();
  }, [tab, canSeeManual]);

  useEffect(() => {
    if (tab !== "proximas_zoom" || !canSeeZoomAccounts) return;
    void refreshZoomUpcomingMeetings();
  }, [tab, canSeeZoomAccounts]);

  useEffect(() => {
    if (tab !== "pasadas_zoom" || !canSeeZoomAccounts) return;
    void refreshZoomPastMeetings(selectedZoomPastMonthsBack);
  }, [tab, canSeeZoomAccounts, selectedZoomPastMonthsBack]);

  useEffect(() => {
    if ((tab === "usuarios" && canSeeUsers) || (tab === "logins" && canSeeLogins)) {
      void loadUsersOnce();
    }
  }, [tab, canSeeUsers, canSeeLogins]);

  useEffect(() => {
    if (tab !== "agenda_libre" || !canSeeAgendaLibre) return;
    void loadAgendaLibreOnce();
  }, [tab, canSeeAgendaLibre]);

  useEffect(() => {
    if (tab !== "asistentes_asignacion" || !canSeeAsistentesAsignacion) return;
    void loadAssignmentBoardOnce();
  }, [tab, canSeeAsistentesAsignacion]);

  useEffect(() => {
    if (tab !== "tarifas" || !canSeeTarifas) return;
    void loadTarifasOnce();
  }, [tab, canSeeTarifas]);

  useEffect(() => {
    if (tab !== "historico" || !canSeePastMeetings) return;
    void loadPastMeetingsOnce();
  }, [tab, canSeePastMeetings]);

  useEffect(() => {
    if (!requestedTab) return;
    setTab(requestedTab);
  }, [requestedTab]);

  async function refreshSummary() {
    await loadSummaryData({ force: true });
  }

  async function refreshManualPendings() {
    const pendings = await loadManualPendings();
    if (!pendings) {
      setMessage("No se pudieron cargar los pendientes manuales.");
      return;
    }
    setManualPendings(pendings);
    loadedResourceKeysRef.current.add("manual-pendings");
  }

  async function refreshAfterSolicitudMutation() {
    setIsLoadingSolicitudes(true);
    try {
      const refreshes: Array<Promise<void>> = [
        (async () => {
          const summaryData = await loadSummary(buildSummaryLoadOptions());
          if (summaryData) setSummary(summaryData);
        })(),
        (async () => {
          const solicitudesData = await loadSolicitudes();
          if (solicitudesData) setSolicitudes(solicitudesData);
        })()
      ];

      if (canSeeAgendaLibre || loadedResourceKeysRef.current.has("agenda-libre")) {
        refreshes.push(
          (async () => {
            const agendaData = await loadAgendaLibre();
            if (agendaData) setAgendaLibre(agendaData);
            setHasLoadedAgendaLibre(true);
          })()
        );
      }

      if (canSeeAsistentesAsignacion || loadedResourceKeysRef.current.has("assignment-board")) {
        refreshes.push(
          (async () => {
            const assignmentData = await loadAssignmentBoard();
            applyAssignmentBoard(assignmentData);
          })()
        );
      }

      if (canSeeManual || loadedResourceKeysRef.current.has("manual-pendings")) {
        refreshes.push(
          (async () => {
            const manualData = await loadManualPendings();
            if (manualData) setManualPendings(manualData);
          })()
        );
      }

      await Promise.all(refreshes);
      loadedResourceKeysRef.current.add("solicitudes");
    } finally {
      setIsLoadingSolicitudes(false);
    }
  }

  async function resolveManualProvision(input: ManualResolutionInput) {
    setMessage("");
    setResolvingManualSolicitudId(input.solicitudId);
    try {
      const response = await fetch(
        `/api/v1/provision-manual/${encodeURIComponent(input.solicitudId)}/resolver`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cuentaZoomAsignadaId: input.cuentaZoomAsignadaId,
            accionTomada: "ASOCIACION_MANUAL_DESDE_PANEL",
            motivoSistema: "Resolucion manual realizada desde la pestaña Asociacion manual.",
            zoomMeetingIdManual: input.zoomMeetingIdManual,
            zoomJoinUrlManual: input.zoomJoinUrlManual,
            observaciones: input.observaciones
          })
        }
      );
      const data = (await readJsonSafe<{ error?: string }>(response)) ?? {};
      if (!response.ok) {
        setMessage(data.error ?? "No se pudo resolver manualmente la solicitud.");
        return;
      }

      setMessage("Pendiente manual resuelto correctamente.");
      await refreshAfterSolicitudMutation();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo resolver manualmente la solicitud.");
    } finally {
      setResolvingManualSolicitudId(null);
    }
  }

  const solicitudesTabProps: Omit<
    ComponentProps<typeof SpaTabSolicitudesComponent>,
    "docenteSolicitudesView" | "setDocenteSolicitudesView"
  > = {
    solicitudes,
    form,
    updateForm,
    onDeleteSolicitud: deleteSolicitud,
    deletingSolicitudId,
    onCancelSolicitudSerie: cancelSolicitudSerie,
    cancellingSerieSolicitudId,
    onCancelSolicitudInstancia: cancelSolicitudInstancia,
    cancellingInstanciaKey,
    onRestoreSolicitudInstancia: restoreSolicitudInstancia,
    restoringInstanciaKey,
    canAddInstances: canEditSolicitudAssistance,
    addingInstanceSolicitudId: addingInstanciaSolicitudId,
    onAddInstance: addSolicitudInstancia,
    canSendReminder: canSendSolicitudReminder,
    sendingReminderSolicitudId,
    onSendReminder: sendSolicitudReminder,
    canEditMeeting: canEditSolicitudAssistance,
    onEditMeeting: editUpcomingSolicitudMeeting,
    canEditMeetingDuration: canEditSolicitudDuration,
    updatingMeetingDurationEventId,
    onEditMeetingDuration: editSolicitudMeetingDuration,
    canReassignRecurringSolicitud: canDelegateSolicitudResponsable,
    onReassignRecurringSolicitud: reassignRecurringSolicitudResponsable,
    canEditAssistance: canEditSolicitudAssistance,
    updatingAssistanceSolicitudId: updatingAsistenciaSolicitudId,
    updatingAssistanceInstanceKey: updatingAsistenciaInstanciaKey,
    assignableAssistants,
    onEnableAssistance: enableSolicitudAssistance,
    onToggleAssistanceForInstance: updateSolicitudAssistanceForInstance,
    canDeleteSolicitud: canCreateSolicitudShortcut,
    canRestoreInstances: canEditSolicitudAssistance,
    isSubmittingSolicitud,
    canCreateShortcut: canCreateSolicitudShortcut,
    canDelegateResponsable: canDelegateSolicitudResponsable,
    responsableOptions,
    docenteLinkedEmailOptions,
    programaOptions,
    isCreatingPrograma,
    onCreatePrograma: createProgramaOnDemand,
    viewerRole: effectiveRole,
    onSubmit: submitDocenteSolicitud,
    isLoading: isLoadingSolicitudes
  };

  return (
    <Box component="section">
      {tab === "dashboard" && (
        <SpaTabDashboard
          summary={summary}
          isLoadingSummary={isLoadingSummary}
          onRefresh={refreshSummary}
          role={effectiveRole || "ADMINISTRADOR"}
          agendaLibre={agendaLibre}
          hasLoadedAgendaLibre={hasLoadedAgendaLibre}
          onGoToCreateMeeting={() => {
            setTab("crear_reunion");
          }}
          onGoToAssignAssistants={() => {
            setTab("asistentes_asignacion");
          }}
          onGoToAgendaAvailable={() => {
            setTab("agenda_libre");
          }}
          onGoToMyAssignedMeetings={() => {
            setTab("mis_reuniones_asignadas");
          }}
        />
      )}

      {tab === "notificaciones" && canSeeNotificaciones && (
        <SpaTabNotificaciones isAdmin={effectiveRole === "ADMINISTRADOR"} />
      )}

      {tab === "crear_reunion" && canSeeSolicitudes && (
        <SpaTabSolicitudes
          {...solicitudesTabProps}
          docenteSolicitudesView="form"
          setDocenteSolicitudesView={() => {}}
        />
      )}

      {tab === "agenda_admin" && canSeeAgendaAdmin && (
        <SpaTabAgendaAdmin
          solicitudes={solicitudes}
          isLoading={
            isLoadingSolicitudes || !loadedResourceKeysRef.current.has("solicitudes")
          }
        />
      )}

      {tab === "solicitudes" && canSeeSolicitudes && (
        <SpaTabSolicitudes
          {...solicitudesTabProps}
          docenteSolicitudesView="list"
          setDocenteSolicitudesView={() => {}}
        />
      )}

      {tab === "programas" && canSeeProgramas && (
        <SpaTabProgramas
          role={effectiveRole || "ADMINISTRADOR"}
          programas={programas}
          solicitudes={solicitudes}
          isCreatingPrograma={isCreatingPrograma}
          isRefreshing={isRefreshingProgramas}
          onCreatePrograma={createProgramaOnDemand}
          onRefresh={() => {
            void refreshProgramasView();
          }}
        />
      )}

      {tab === "agenda_libre" && canSeeAgendaLibre && (
        <SpaTabAgendaLibre
          agendaLibre={agendaLibre}
          isLoading={isLoadingAgendaLibre}
          updatingInterestId={updatingInterestId}
          onSetInterest={setInterest}
        />
      )}

      {tab === "mis_asistencias" && canSeeMisAsistencias && user?.id && (
        <SpaTabMisAsistencias userId={user.id} role={effectiveRole || "DOCENTE"} />
      )}

      {tab === "historico_asistencias" && canSeeHistoricoAsistencias && user?.id && (
        <SpaTabHistoricoAsistencias userId={user.id} role={effectiveRole || "ADMINISTRADOR"} />
      )}

      {tab === "mis_reuniones_asignadas" && canSeeMisReunionesAsignadas && user?.id && (
        <SpaTabMisReunionesAsignadas userId={user.id} role={effectiveRole || "ADMINISTRADOR"} />
      )}


      {tab === "manual" && canSeeManual && (
        <SpaTabManual
          manualPendings={manualPendings}
          accountOptions={manualAccountOptions}
          meetingOptionsByAccountId={manualMeetingOptionsByAccountId}
          isLoadingAccounts={isLoadingZoomAccounts}
          resolvingSolicitudId={resolvingManualSolicitudId}
          onRefresh={() => {
            void refreshManualPendings();
          }}
          onResolve={resolveManualProvision}
        />
      )}

      {tab === "historico" && canSeePastMeetings && (
        <SpaTabHistorico
          pastMeetings={pastMeetings}
          isLoadingPastMeetings={isLoadingPastMeetings}
          updatingPastMeetingId={updatingPastMeetingId}
          onRefreshPastMeetings={() => {
            void refreshPastMeetings();
          }}
          onUpdatePastMeeting={updatePastMeetingRecord}
          pastMeetingForm={pastMeetingForm}
          setPastMeetingForm={setPastMeetingForm}
          docenteOptions={docenteOptions}
          monitorOptions={monitorOptions}
          programaOptions={programaOptions}
          zoomSeed={pastMeetingZoomSeed}
          onClearZoomSeed={() => setPastMeetingZoomSeed(null)}
          isSubmittingPastMeeting={isSubmittingPastMeeting}
          onSubmit={submitPastMeeting}
        />
      )}

      {(tab === "asistentes_asignacion" || tab === "asistentes_perfiles") && canSeeGestionAsistentes && (
        <SpaTabGestionAsistentes 
          activeSubTab={
            tab === "asistentes_asignacion" ? 0 : 
            tab === "asistentes_perfiles" ? 1 : 0
          }
          onTabChange={(index) => {
            if (index === 0) setTab("asistentes_asignacion");
            else if (index === 1) setTab("asistentes_perfiles");
          }}
          assignmentBoardEvents={assignmentBoardEvents}
          assignableAssistants={assignableAssistants}
          isLoadingAssignmentBoard={isLoadingAssignmentBoard}
          assignmentSuggestion={assignmentSuggestion}
          isLoadingSuggestion={isLoadingSuggestion}
          hasSuggestionSession={Boolean(suggestionSessionId)}
          assigningEventId={assigningEventId}
          removingAssistanceEventId={removingAssistanceAssignmentEventId}
          selectedAssistantByEvent={selectedAssistantByEvent}
          onSelectedAssistantChange={(eventId, assistantId) =>
            setSelectedAssistantByEvent((prev) => ({ ...prev, [eventId]: assistantId }))
          }
          onAssignAssistant={assignAssistantToEvent}
          onRemoveAssistanceForEvent={removeAssistanceFromAssignmentEvent}
          onSuggestMonthly={suggestMonthlyAssignment}
          onSuggestNext={suggestNextMonthlyAssignment}
          onUnassignAssistant={onUnassignAssistantFromEvent}
        />
      )}

      {tab === "tarifas" && canSeeTarifas && (
        <SpaTabTarifas
          tarifaFormByModalidad={tarifaFormByModalidad}
          setTarifaFormByModalidad={setTarifaFormByModalidad}
          isSubmittingTarifa={isSubmittingTarifa}
          currentTarifaByModalidad={{
            HIBRIDA: currentTarifaByModalidad.HIBRIDA ?? undefined,
            VIRTUAL: currentTarifaByModalidad.VIRTUAL ?? undefined
          }}
          showHoursPanel={effectiveRole !== "CONTADURIA"}
          onSubmit={submitTarifaUpdate}
        />
      )}

      {tab === "cuentas" && canSeeZoomAccounts && (
        <SpaTabCuentas
          zoomAccounts={zoomAccounts}
          zoomGroupName={zoomGroupName}
          isLoadingZoomAccounts={isLoadingZoomAccounts}
          expandedZoomAccountId={expandedZoomAccountId}
          setExpandedZoomAccountId={setExpandedZoomAccountId}
          onRefresh={() => {
            void refreshZoomAccounts();
          }}
        />
      )}

      {tab === "proximas_zoom" && canSeeZoomAccounts && (
        <SpaTabProximasReuniones
          groupName={zoomGroupName}
          meetings={zoomUpcomingMeetings}
          isLoading={isLoadingZoomUpcomingMeetings}
          onRefresh={() => {
            void refreshZoomUpcomingMeetings();
          }}
          onRegisterUpcomingMeeting={registerUpcomingMeetingInSystem}
          isRegisteringUpcomingMeeting={isRegisteringUpcomingMeeting}
          programaOptions={programaOptions}
          responsableOptions={responsableOptions}
          defaultResponsableNombre=""
        />
      )}

      {tab === "pasadas_zoom" && canSeeZoomAccounts && (
        <SpaTabPasadasReunionesZoom
          groupName={zoomGroupName}
          meetings={zoomPastMeetings}
          isLoading={isLoadingZoomPastMeetings}
          onRefresh={() => {
            void refreshZoomPastMeetings(selectedZoomPastMonthsBack);
          }}
          monthOptions={zoomPastMonthOptions}
          selectedMonthKey={selectedZoomPastMonthKey}
          onSelectMonthKey={selectZoomPastMonth}
          onCreatePostMeetingRecord={preloadPastMeetingFormFromZoom}
        />
      )}

      {String(tab) === "estadisticas" && canSeeEstadisticas && (
        <SpaTabEstadisticas />
      )}

      {tab === "usuarios" && canSeeUsers && (
        <SpaTabUsuarios
          users={users}
          createUserForm={createUserForm}
          setCreateUserForm={setCreateUserForm}
          isCreatingUser={isCreatingUser}
          updatingUserId={updatingUserId}
          resendingActivationUserId={resendingActivationUserId}
          isSendingSelfActivationLink={isSendingSelfActivationLink}
          isLoadingUsers={isLoadingUsers}
          onSubmit={submitCreateUser}
          onUpdateUserRole={updateUserRole}
          onResendActivationLink={resendUserActivationLink}
          onSendSelfActivationLinkTest={sendSelfActivationLinkTest}
          onRefresh={() => {
            void refreshUsers();
          }}
        />
      )}

      {tab === "logins" && canSeeLogins && (
        <SpaTabLogins
          users={users}
          isLoadingUsers={isLoadingUsers}
          onRefresh={() => {
            void refreshUsers();
          }}
        />
      )}

      {tab === "perfil" && user && (
        <SpaTabPerfil
          user={user}
          showProfileForm={showProfileForm}
          setShowProfileForm={setShowProfileForm}
          profileForm={profileForm}
          setProfileForm={setProfileForm}
          googleLinked={googleLinked}
          hasPassword={hasPassword}
          isLoadingGoogleStatus={isLoadingGoogleStatus}
          isSyncingGoogleProfile={isSyncingGoogleProfile}
          isUnlinkingGoogleAccount={isUnlinkingGoogleAccount}
          isUpdatingProfile={isUpdatingProfile}
          isUpdatingPassword={isUpdatingPassword}
          passwordForm={passwordForm}
          setPasswordForm={setPasswordForm}
          showPasswordForm={showPasswordForm}
          setShowPasswordForm={setShowPasswordForm}
          onLinkGoogleAccount={linkGoogleAccount}
          onUnlinkGoogleAccount={unlinkGoogleAccount}
          onSyncProfileFromGoogle={syncProfileFromGoogle}
          onSubmitPassword={submitPassword}
          onSubmit={submitProfile}
        />
      )}
      <SpaSnackbar message={message} onClose={() => setMessage("")} />
      <SpaBusyOverlay open={isGlobalBusy} label={globalBusyLabel} />
    </Box>
  );
}
