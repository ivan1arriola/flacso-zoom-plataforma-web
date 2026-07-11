"use client";

import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Link,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from "@mui/material";
import { alpha, useTheme, type Theme } from "@mui/material/styles";
import EventRepeatRoundedIcon from "@mui/icons-material/EventRepeatRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import type { Solicitud } from "@/src/services/solicitudesApi";
import {
  buildAgendaMeetings as buildAdminAgendaMeetings,
  resolveRequestStatus,
  type AgendaMeeting
} from "@/src/lib/admin-agenda";
import { renotifyOpenAgenda } from "@/src/services/agendaApi";
import { MeetingAssistantStatusChip } from "@/components/spa-tabs/MeetingAssistantStatusChip";
import { ZoomAccountPasswordField } from "@/components/spa-tabs/ZoomAccountPasswordField";
import { resolveMeetingDisplayState } from "@/src/lib/meeting-display";
import {
  formatModalidad,
  formatZoomDateTime,
  formatZoomTime,
  normalizeZoomMeetingId
} from "@/components/spa-tabs/spa-tabs-utils";

type AgendaScope = "PROXIMAS" | "PASADAS" | "CANCELADAS" | "TODAS";
type AgendaAssistanceFilter =
  | "TODAS"
  | "REQUIEREN_ASISTENCIA"
  | "SIN_ASISTENCIA"
  | "ASIGNADAS"
  | "PENDIENTES";

interface SpaTabAgendaAdminProps {
  solicitudes: Solicitud[];
  isLoading?: boolean;
}

function getDayKey(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDayLabel(dayKey: string): string {
  const [yearRaw = "", monthRaw = "", dayRaw = ""] = dayKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return dayKey;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("es-UY", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}


function matchesScope(meeting: AgendaMeeting, scope: AgendaScope): boolean {
  if (scope === "TODAS") return true;
  if (scope === "CANCELADAS") return meeting.isCancelled;
  if (scope === "PASADAS") return !meeting.isCancelled && meeting.isPast;
  return !meeting.isCancelled && !meeting.isPast;
}

function matchesSearch(meeting: AgendaMeeting, query: string): boolean {
  if (!query) return true;
  const haystack = [
    meeting.title,
    meeting.programaNombre,
    meeting.responsableNombre,
    meeting.docenteNombre,
    meeting.docenteEmail,
    meeting.monitorNombre,
    meeting.monitorEmail,
    meeting.zoomMeetingId,
    meeting.zoomHostAccount
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function matchesAssistanceFilter(
  meeting: AgendaMeeting,
  assistanceFilter: AgendaAssistanceFilter
): boolean {
  if (assistanceFilter === "TODAS") return true;
  if (assistanceFilter === "REQUIEREN_ASISTENCIA") return meeting.requiresAssistance;
  if (assistanceFilter === "SIN_ASISTENCIA") return !meeting.requiresAssistance;
  if (assistanceFilter === "ASIGNADAS") {
    return meeting.requiresAssistance && Boolean(meeting.monitorNombre || meeting.monitorEmail);
  }
  return meeting.requiresAssistance && !meeting.monitorNombre && !meeting.monitorEmail;
}

function renderDocenteInfo(nombre?: string | null, email?: string | null) {
  const displayName = (nombre ?? "").trim();
  const displayEmail = (email ?? "").trim();

  if (!displayName && !displayEmail) {
    return <Typography variant="body2">-</Typography>;
  }

  if (!displayName || displayName.toLowerCase() === displayEmail.toLowerCase()) {
    return <Typography variant="body2">{displayEmail || displayName}</Typography>;
  }

  return (
    <Stack spacing={0.15}>
      <Typography variant="body2">{displayName}</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-word" }}>
        {displayEmail}
      </Typography>
    </Stack>
  );
}

function resolveEventTone(meeting: AgendaMeeting): {
  label: string;
  color: "default" | "info" | "success" | "warning" | "error";
} {
  const state = resolveMeetingDisplayState({
    requestStatus: meeting.solicitudEstado,
    eventStatus: meeting.estadoEvento,
    zoomStatus: meeting.status,
    coverageStatus: meeting.estadoCobertura,
    requiresAssistance: meeting.requiresAssistance,
    isPast: meeting.isPast
  });
  return { label: state.label, color: state.tone };
}

function resolveCoverageTone(meeting: AgendaMeeting): {
  label: string;
  color: "default" | "info" | "success" | "warning" | "error";
} | null {
  const coverage = meeting.estadoCobertura;
  if (!coverage) return null;
  if (coverage === "NO_REQUIERE") return { label: "Sin asistencia", color: "default" };
  if (coverage === "CONFIRMADO") return { label: "Cobertura confirmada", color: "success" };
  if (coverage === "ASIGNADO") return { label: "Asistencia asignada", color: "info" };
  if (coverage === "REQUERIDO_SIN_ASIGNAR") return { label: "Sin asignar", color: "warning" };
  if (coverage === "CANCELADO") return { label: "Cobertura cancelada", color: "error" };
  return { label: coverage, color: "default" };
}

function resolveToneAccent(
  theme: Theme,
  color: "default" | "info" | "success" | "warning" | "error"
): string {
  switch (color) {
    case "info":
      return theme.palette.info.main;
    case "success":
      return theme.palette.success.main;
    case "warning":
      return theme.palette.warning.main;
    case "error":
      return theme.palette.error.main;
    default:
      return theme.palette.grey[500];
  }
}

function formatDurationLabel(totalMinutes: number): string {
  const normalized = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

function buildMeetingSummary(meetings: AgendaMeeting[]) {
  const programs = new Set<string>();
  let assigned = 0;
  let pending = 0;
  let cancelled = 0;

  for (const meeting of meetings) {
    if (meeting.programaNombre) programs.add(meeting.programaNombre);
    if (meeting.isCancelled) {
      cancelled += 1;
      continue;
    }
    if (!meeting.requiresAssistance) continue;
    if (meeting.monitorNombre || meeting.monitorEmail) assigned += 1;
    else pending += 1;
  }

  return {
    meetings: meetings.length,
    programs: programs.size,
    assigned,
    pending,
    cancelled
  };
}

function buildDayGroups(meetings: AgendaMeeting[]): Array<{ key: string; label: string; meetings: AgendaMeeting[] }> {
  const grouped = new Map<string, AgendaMeeting[]>();
  for (const meeting of meetings) {
    const dayKey = getDayKey(meeting.startTime);
    if (!dayKey) continue;
    const existing = grouped.get(dayKey);
    if (existing) existing.push(meeting);
    else grouped.set(dayKey, [meeting]);
  }

  return Array.from(grouped.entries())
    .map(([key, value]) => ({
      key,
      label: formatDayLabel(key),
      meetings: [...value].sort(
        (left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime()
      )
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

export function SpaTabAgendaAdmin({ solicitudes, isLoading = false }: SpaTabAgendaAdminProps) {
  const theme = useTheme();
  const [scope, setScope] = useState<AgendaScope>("PROXIMAS");
  const [assistanceFilter, setAssistanceFilter] = useState<AgendaAssistanceFilter>("TODAS");
  const [search, setSearch] = useState("");
  const [isRenotifying, setIsRenotifying] = useState(false);
  const [renotifyMessage, setRenotifyMessage] = useState("");

  const handleRenotify = async () => {
    setIsRenotifying(true);
    setRenotifyMessage("");
    const res = await renotifyOpenAgenda();
    setIsRenotifying(false);
    if (res.success) {
      setRenotifyMessage(res.result?.message || "Notificaciones enviadas.");
    } else {
      setRenotifyMessage(res.error || "Error al renotificar.");
    }
  };

  const agendaMeetings = useMemo(() => buildAdminAgendaMeetings(solicitudes), [solicitudes]);
  const visibleByScope = useMemo(
    () => agendaMeetings.filter((meeting) => matchesScope(meeting, scope)),
    [agendaMeetings, scope]
  );

  const searchQuery = search.trim().toLowerCase();
  const visibleMeetings = useMemo(() => {
    return visibleByScope.filter((meeting) => {
      return (
        matchesAssistanceFilter(meeting, assistanceFilter) &&
        matchesSearch(meeting, searchQuery)
      );
    });
  }, [assistanceFilter, searchQuery, visibleByScope]);
  const summary = useMemo(() => buildMeetingSummary(visibleMeetings), [visibleMeetings]);
  const timelineGroups = useMemo(() => buildDayGroups(visibleMeetings), [visibleMeetings]);
  const unscheduledRequests = useMemo(
    () =>
      solicitudes.filter((solicitud) => {
        const status = resolveRequestStatus(solicitud);
        if (status === "CANCELADA_ADMIN" || status === "CANCELADA_DOCENTE") return false;
        return (solicitud.zoomInstances?.length ?? 0) === 0;
      }).length,
    [solicitudes]
  );

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="flex-start" spacing={2}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                Agenda general
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Línea de tiempo administrativa de las reuniones programadas en el sistema.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="primary"
              size="small"
              startIcon={<NotificationsActiveRoundedIcon />}
              onClick={handleRenotify}
              disabled={isRenotifying}
              sx={{ flexShrink: 0 }}
            >
              Renotificar Agenda Abierta
            </Button>
          </Stack>

          {renotifyMessage ? (
            <Alert severity={renotifyMessage.includes("Error") ? "error" : "success"} onClose={() => setRenotifyMessage("")}>
              {renotifyMessage}
            </Alert>
          ) : null}

          {!isLoading && unscheduledRequests > 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Hay {unscheduledRequests} pedido(s) sin instancias Zoom visibles todavía. Esta agenda muestra
              solamente reuniones con fecha concreta.
            </Alert>
          ) : null}

          <Stack direction={{ xs: "column", lg: "row" }} spacing={1.25} useFlexGap>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={scope}
              onChange={(_event, value: AgendaScope | null) => {
                if (value) setScope(value);
              }}
              sx={{ flexWrap: "wrap" }}
            >
              <ToggleButton value="PROXIMAS">Próximas</ToggleButton>
              <ToggleButton value="PASADAS">Pasadas</ToggleButton>
              <ToggleButton value="CANCELADAS">Canceladas</ToggleButton>
              <ToggleButton value="TODAS">Todas</ToggleButton>
            </ToggleButtonGroup>

            <TextField
              select
              size="small"
              label="Asistencia"
              value={assistanceFilter}
              onChange={(event) =>
                setAssistanceFilter(event.target.value as AgendaAssistanceFilter)
              }
              sx={{ minWidth: { xs: "100%", sm: 220 } }}
            >
              <MenuItem value="TODAS">Todas</MenuItem>
              <MenuItem value="REQUIEREN_ASISTENCIA">Requieren asistencia</MenuItem>
              <MenuItem value="SIN_ASISTENCIA">Sin asistencia</MenuItem>
              <MenuItem value="ASIGNADAS">Asistencia asignada</MenuItem>
              <MenuItem value="PENDIENTES">Pendientes de asignación</MenuItem>
            </TextField>

            <TextField
              size="small"
              label="Buscar reunión"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Título, programa, docente, asistente..."
              sx={{ flex: 1, minWidth: { xs: "100%", lg: 280 } }}
              InputProps={{
                startAdornment: <SearchRoundedIcon sx={{ fontSize: 18, color: "text.secondary", mr: 1 }} />
              }}
            />
          </Stack>

          {isLoading ? (
            <Stack spacing={2} aria-label="Cargando agenda general">
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Skeleton variant="rounded" width={130} height={32} />
                <Skeleton variant="rounded" width={120} height={32} />
                <Skeleton variant="rounded" width={190} height={32} />
              </Stack>
              {[0, 1, 2].map((item) => (
                <Box
                  key={item}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "120px 1fr" },
                    gap: 1.2
                  }}
                >
                  <Skeleton variant="rounded" height={76} />
                  <Skeleton variant="rounded" height={220} />
                </Box>
              ))}
            </Stack>
          ) : null}

          {!isLoading ? <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip label={`${summary.meetings} reuniones`} color="primary" variant="outlined" />
            <Chip label={`${summary.programs} programas`} variant="outlined" />
            <Chip label={`${summary.assigned} con asistencia asignada`} color="success" variant="outlined" />
            <Chip label={`${summary.pending} pendientes de asistencia`} color="warning" variant="outlined" />
            {summary.cancelled > 0 ? (
              <Chip label={`${summary.cancelled} canceladas`} color="error" variant="outlined" />
            ) : null}
          </Stack> : null}

          {!isLoading && visibleMeetings.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              No hay reuniones para los filtros seleccionados.
            </Alert>
          ) : null}

          {!isLoading && visibleMeetings.length > 0 ? (
            <Stack spacing={2}>
              {timelineGroups.map((group) => (
                <Box key={group.key}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {group.label}
                    </Typography>
                    <Chip size="small" variant="outlined" label={`${group.meetings.length} reunión(es)`} />
                  </Stack>

                  <Stack spacing={1.25}>
                    {group.meetings.map((meeting) => {
                      const eventTone = resolveEventTone(meeting);
                      const coverageTone = resolveCoverageTone(meeting);
                      return (
                        <Box
                          key={meeting.key}
                          sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", md: "120px 1fr" },
                            gap: 1.2,
                            alignItems: "start"
                          }}
                        >
                          <Paper
                            variant="outlined"
                            sx={{
                              p: 1.2,
                              borderRadius: 2,
                              bgcolor: alpha(theme.palette.primary.main, 0.05)
                            }}
                          >
                            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                              {formatZoomTime(meeting.startTime)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDurationLabel(meeting.durationMinutes)}
                            </Typography>
                          </Paper>

                          <Paper
                            variant="outlined"
                            sx={{
                              p: 1.5,
                              borderRadius: 2.5,
                              borderLeft: "4px solid",
                              borderLeftColor: alpha(resolveToneAccent(theme, eventTone.color), 0.9)
                            }}
                          >
                            <Stack spacing={1.1}>
                              <Stack
                                direction={{ xs: "column", lg: "row" }}
                                spacing={1}
                                justifyContent="space-between"
                                alignItems={{ xs: "flex-start", lg: "center" }}
                              >
                                <Box>
                                  <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                    {meeting.title}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {formatZoomDateTime(meeting.startTime)} a {formatZoomTime(meeting.endTime)}
                                  </Typography>
                                </Box>
                                {meeting.joinUrl ? (
                                  <Link
                                    href={meeting.joinUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    underline="none"
                                    sx={{ fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 0.5 }}
                                  >
                                    Abrir Zoom <OpenInNewRoundedIcon sx={{ fontSize: 16 }} />
                                  </Link>
                                ) : null}
                              </Stack>

                              <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                                <Chip size="small" label={formatModalidad(meeting.modalidadReunion)} variant="outlined" />
                                <Chip size="small" label={eventTone.label} color={eventTone.color} />
                                {coverageTone ? (
                                  <Chip size="small" label={coverageTone.label} color={coverageTone.color} variant="outlined" />
                                ) : null}
                                {meeting.totalInstances > 1 ? (
                                  <Chip
                                    size="small"
                                    icon={<EventRepeatRoundedIcon sx={{ fontSize: 14 }} />}
                                    label={`Instancia ${meeting.instanceIndex} de ${meeting.totalInstances}`}
                                    variant="outlined"
                                  />
                                ) : null}
                                {meeting.zoomMeetingId ? (
                                  <Chip size="small" label={`ID ${meeting.zoomMeetingId}`} variant="outlined" />
                                ) : null}
                              </Stack>

                              <Divider />

                              <Box
                                sx={{
                                  display: "grid",
                                  gridTemplateColumns: {
                                    xs: "1fr",
                                    md: "repeat(2, minmax(0, 1fr))",
                                    xl: "repeat(4, minmax(0, 1fr))"
                                  },
                                  gap: 1.25
                                }}
                              >
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    Programa
                                  </Typography>
                                  <Typography variant="body2">{meeting.programaNombre || "-"}</Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    Responsable
                                  </Typography>
                                  <Typography variant="body2">{meeting.responsableNombre || "-"}</Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    Docente
                                  </Typography>
                                  {renderDocenteInfo(meeting.docenteNombre, meeting.docenteEmail)}
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    Cuenta Zoom
                                  </Typography>
                                  <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                                    {meeting.zoomHostAccount || "-"}
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    ID de reunión Zoom
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
                                    {meeting.zoomMeetingId || "-"}
                                  </Typography>
                                </Box>
                                <Box sx={{ gridColumn: { xs: "1 / -1", lg: "span 2" } }}>
                                  <ZoomAccountPasswordField
                                    hostAccount={meeting.zoomHostAccount}
                                    label="Contraseña de la cuenta Zoom"
                                  />
                                </Box>
                                <Box sx={{ gridColumn: { xs: "1 / -1", lg: "span 2" } }}>
                                  <Typography variant="caption" color="text.secondary">
                                    Asistencia
                                  </Typography>
                                  <Box sx={{ mt: 0.4 }}>
                                    <MeetingAssistantStatusChip
                                      requiresAssistance={meeting.requiresAssistance}
                                      assistantName={meeting.monitorNombre}
                                      assistantEmail={meeting.monitorEmail}
                                      pendingLabel="Pendiente"
                                      noAssistanceLabel="No requerida"
                                    />
                                  </Box>
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="text.secondary">
                                    Estado solicitud
                                  </Typography>
                                  <Typography variant="body2">{meeting.solicitudEstado}</Typography>
                                </Box>
                              </Box>
                            </Stack>
                          </Paper>
                        </Box>
                      );
                    })}
                  </Stack>
                </Box>
              ))}
            </Stack>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
