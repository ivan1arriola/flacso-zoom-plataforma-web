import { useMemo } from "react";
import { formatDateTime } from "@/src/lib/spa-home/recurrence";
import { normalizeAssistantRole, type ViewRole } from "@/src/lib/spa-home/navigation";
import { DEFAULT_ZOOM_PAST_MONTHS_BACK } from "@/src/lib/spa-home/client-utils";
import { resolveUserAccessEmails } from "@/src/lib/spa-home/client-utils";
import type { CurrentUser, DocenteOption, MonitorOption, ZoomPastMonthOption } from "@/src/lib/spa-home/client-types";
import type { ManagedUser } from "@/src/services/userApi";
import type { Programa } from "@/src/services/programasApi";
import type { ZoomAccount } from "@/src/services/zoomApi";

export type ManualMeetingOption = {
  id: string;
  zoomMeetingId: string;
  zoomJoinUrl?: string;
  label: string;
};

type ResponsableOption = {
  value: string;
  label: string;
};

type UseSpaHomeOptionsInput = {
  effectiveRole: ViewRole | "";
  user: CurrentUser | null;
  users: ManagedUser[];
  programas: Programa[];
  zoomAccounts: ZoomAccount[];
  selectedZoomPastMonthKey: string;
  zoomPastMonthOptions: ZoomPastMonthOption[];
  selectedResponsable: string;
};

function addPersonEmailOptions(
  addOption: (firstName: string | null | undefined, lastName: string | null | undefined, email: string) => void,
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  primaryEmail: string | null | undefined,
  emails: string[] | null | undefined
) {
  const normalizedEmails = new Set<string>();
  if (primaryEmail) {
    const normalizedPrimary = primaryEmail.trim().toLowerCase();
    if (normalizedPrimary) normalizedEmails.add(normalizedPrimary);
  }
  for (const alias of emails ?? []) {
    const normalizedAlias = alias.trim().toLowerCase();
    if (!normalizedAlias) continue;
    normalizedEmails.add(normalizedAlias);
  }
  for (const email of normalizedEmails) {
    addOption(firstName, lastName, email);
  }
}

export function useSpaHomeOptions({
  effectiveRole,
  user,
  users,
  programas,
  zoomAccounts,
  selectedZoomPastMonthKey,
  zoomPastMonthOptions,
  selectedResponsable
}: UseSpaHomeOptionsInput) {
  const selectedZoomPastMonthsBack = useMemo(() => {
    const selectedOption = zoomPastMonthOptions.find(
      (option) => option.value === selectedZoomPastMonthKey
    );
    return selectedOption?.monthsBack ?? DEFAULT_ZOOM_PAST_MONTHS_BACK;
  }, [selectedZoomPastMonthKey, zoomPastMonthOptions]);

  const requesterAccessEmails = useMemo(() => resolveUserAccessEmails(user), [user]);
  const requesterResponsibleEmail = useMemo(
    () => requesterAccessEmails[0] ?? user?.email?.trim().toLowerCase() ?? "",
    [requesterAccessEmails, user?.email]
  );

  const responsableOptions = useMemo<ResponsableOption[]>(() => {
    const map = new Map<string, ResponsableOption>();

    const addOption = (
      firstName: string | null | undefined,
      lastName: string | null | undefined,
      email: string
    ) => {
      const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) return;
      if (map.has(normalizedEmail)) return;
      const label = fullName ? `${fullName} (${normalizedEmail})` : normalizedEmail;
      map.set(normalizedEmail, { value: normalizedEmail, label });
    };

    for (const managedUser of users) {
      if (managedUser.role !== "DOCENTE") continue;
      addPersonEmailOptions(
        addOption,
        managedUser.firstName,
        managedUser.lastName,
        managedUser.email,
        managedUser.emails
      );
    }

    if (effectiveRole === "DOCENTE") {
      addPersonEmailOptions(addOption, user?.firstName, user?.lastName, user?.email, user?.emails);
    }

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [effectiveRole, users, user]);

  const docenteLinkedEmailOptions = useMemo(() => {
    if (effectiveRole !== "ADMINISTRADOR") {
      return requesterAccessEmails;
    }

    const selectedResponsibleEmail = selectedResponsable.trim().toLowerCase();
    if (!selectedResponsibleEmail) return [];

    const matchingDocente = users.find((managedUser) => {
      if (managedUser.role !== "DOCENTE") return false;
      const candidateEmails = new Set(
        [managedUser.email, ...(managedUser.emails ?? [])]
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean)
      );
      return candidateEmails.has(selectedResponsibleEmail);
    });
    if (!matchingDocente) {
      return [selectedResponsibleEmail];
    }

    return Array.from(
      new Set(
        [matchingDocente.email, ...(matchingDocente.emails ?? [])]
          .map((email) => email.trim().toLowerCase())
          .filter(Boolean)
      )
    );
  }, [effectiveRole, selectedResponsable, requesterAccessEmails, users]);

  const docenteOptions = useMemo<DocenteOption[]>(() => {
    const map = new Map<string, DocenteOption>();

    const addDocente = (
      email: string | null | undefined,
      firstName: string | null | undefined,
      lastName: string | null | undefined,
      name: string | null | undefined
    ) => {
      const normalizedEmail = (email ?? "").trim().toLowerCase();
      if (!normalizedEmail) return;
      if (map.has(normalizedEmail)) return;

      const computedName =
        (name ?? "").trim() ||
        [firstName, lastName].filter(Boolean).join(" ").trim() ||
        normalizedEmail;

      map.set(normalizedEmail, {
        value: normalizedEmail,
        label: `${computedName} (${normalizedEmail})`,
        nombre: computedName
      });
    };

    for (const managedUser of users) {
      if (managedUser.role !== "DOCENTE") continue;
      const candidateEmails = new Set<string>([
        managedUser.email,
        ...(managedUser.emails ?? [])
      ]);
      for (const candidateEmail of candidateEmails) {
        addDocente(candidateEmail, managedUser.firstName, managedUser.lastName, null);
      }
    }

    if (effectiveRole === "DOCENTE") {
      const currentUserEmails = new Set<string>([user?.email ?? "", ...(user?.emails ?? [])]);
      for (const candidateEmail of currentUserEmails) {
        addDocente(candidateEmail, user?.firstName, user?.lastName, null);
      }
    }

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [effectiveRole, users, user]);

  const monitorOptions = useMemo<MonitorOption[]>(() => {
    const map = new Map<string, MonitorOption>();

    const addMonitor = (
      email: string | null | undefined,
      firstName: string | null | undefined,
      lastName: string | null | undefined
    ) => {
      const normalizedEmail = (email ?? "").trim().toLowerCase();
      if (!normalizedEmail) return;
      if (map.has(normalizedEmail)) return;

      const computedName = [firstName, lastName].filter(Boolean).join(" ").trim() || normalizedEmail;
      map.set(normalizedEmail, {
        value: normalizedEmail,
        label: `${computedName} (${normalizedEmail})`,
        nombre: computedName
      });
    };

    for (const managedUser of users) {
      if (normalizeAssistantRole(managedUser.role) !== "ASISTENTE_ZOOM") continue;
      const candidateEmails = new Set<string>([
        managedUser.email,
        ...(managedUser.emails ?? [])
      ]);
      for (const candidateEmail of candidateEmails) {
        addMonitor(candidateEmail, managedUser.firstName, managedUser.lastName);
      }
    }

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [users]);

  const programaOptions = useMemo(
    () => programas.map((programa) => programa.nombre),
    [programas]
  );

  const manualAccountOptions = useMemo(
    () =>
      zoomAccounts.map((account) => ({
        id: account.id,
        label: account.email || [account.firstName, account.lastName].filter(Boolean).join(" ").trim() || account.id
      })),
    [zoomAccounts]
  );

  const manualMeetingOptionsByAccountId = useMemo<Record<string, ManualMeetingOption[]>>(() => {
    const byAccountId: Record<string, ManualMeetingOption[]> = {};
    for (const account of zoomAccounts) {
      const byMeetingId = new Map<
        string,
        {
          zoomMeetingId: string;
          zoomJoinUrl?: string;
          topic: string;
          firstStartTime: string;
          instancesCount: number;
        }
      >();

      for (const event of account.pendingEvents) {
        const zoomMeetingId = (event.meetingId ?? "").trim();
        if (!zoomMeetingId) continue;

        const existing = byMeetingId.get(zoomMeetingId);
        if (existing) {
          existing.instancesCount += 1;
          continue;
        }

        byMeetingId.set(zoomMeetingId, {
          zoomMeetingId,
          zoomJoinUrl: event.joinUrl || undefined,
          topic: event.topic || "Sin titulo",
          firstStartTime: event.startTime,
          instancesCount: 1
        });
      }

      const options = Array.from(byMeetingId.values()).map((meeting) => ({
        id: meeting.zoomMeetingId,
        zoomMeetingId: meeting.zoomMeetingId,
        zoomJoinUrl: meeting.zoomJoinUrl,
        label:
          meeting.instancesCount > 1
            ? `ID ${meeting.zoomMeetingId} | ${meeting.topic} | ${meeting.instancesCount} instancias`
            : `ID ${meeting.zoomMeetingId} | ${meeting.topic} | ${formatDateTime(meeting.firstStartTime)}`
      }));

      byAccountId[account.id] = options;
    }
    return byAccountId;
  }, [zoomAccounts]);

  return {
    selectedZoomPastMonthsBack,
    requesterAccessEmails,
    requesterResponsibleEmail,
    docenteLinkedEmailOptions,
    responsableOptions,
    docenteOptions,
    monitorOptions,
    programaOptions,
    manualAccountOptions,
    manualMeetingOptionsByAccountId
  };
}
