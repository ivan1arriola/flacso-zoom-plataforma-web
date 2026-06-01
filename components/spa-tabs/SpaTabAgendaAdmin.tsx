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
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from "@mui/material";
import { alpha, useTheme, type Theme } from "@mui/material/styles";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import EventRepeatRoundedIcon from "@mui/icons-material/EventRepeatRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import TimelineRoundedIcon from "@mui/icons-material/TimelineRounded";
import TodayRoundedIcon from "@mui/icons-material/TodayRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import type { Solicitud } from "@/src/services/solicitudesApi";
import {
  buildAgendaMeetings as buildAdminAgendaMeetings,
  resolveRequestStatus,
  type AgendaMeeting
} from "@/src/lib/admin-agenda";
import { renotifyOpenAgenda } from "@/src/services/agendaApi";
import { MeetingAssistantStatusChip } from "@/components/spa-tabs/MeetingAssistantStatusChip";
import {
  formatModalidad,
  formatZoomDateTime,
  formatZoomTime,
  normalizeZoomMeetingId
} from "@/components/spa-tabs/spa-tabs-utils";

type AgendaViewMode = "CALENDAR" | "TIMELINE";
type AgendaScope = "PROXIMAS" | "PASADAS" | "CANCELADAS" | "TODAS";
type AgendaAssistanceFilter =
  | "TODAS"
  | "REQUIEREN_ASISTENCIA"
  | "SIN_ASISTENCIA"
  | "ASIGNADAS"
  | "PENDIENTES";

type CalendarDay = {
  key: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
};

interface SpaTabAgendaAdminProps {
  solicitudes: Solicitud[];
}

function getMonthKey(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getDayKey(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseMonthKey(monthKey: string): Date | null {
  const [yearRaw = "", monthRaw = ""] = monthKey.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  const date = new Date(year, month - 1, 1);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatMonthLabel(monthKey: string): string {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return monthKey;
  return parsed.toLocaleDateString("es-UY", { month: "long", year: "numeric" });
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

function startOfCalendarGrid(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - day);
  return next;
}

function endOfCalendarGrid(date: Date): Date {
  const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  monthEnd.setHours(0, 0, 0, 0);
  const day = (monthEnd.getDay() + 6) % 7;
  monthEnd.setDate(monthEnd.getDate() + (6 - day));
  return monthEnd;
}

function buildCalendarDays(monthKey: string): CalendarDay[] {
  const monthDate = parseMonthKey(monthKey);
  if (!monthDate) return [];

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const start = startOfCalendarGrid(monthDate);
  const end = endOfCalendarGrid(monthDate);
  const days: CalendarDay[] = [];

  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    days.push({
      key,
      dayNumber: cursor.getDate(),
      inCurrentMonth: cursor.getMonth() === monthDate.getMonth(),
      isToday: key === todayKey
    });
  }

  return days;
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
    meeting.zoomMeetingId
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
  if (meeting.isCancelled) return { label: "Cancelada", color: "error" };
  if (meeting.estadoEvento === "FINALIZADO" || meeting.isPast) return { label: "Finalizada", color: "default" };
  if (meeting.estadoEvento === "PROGRAMADO") return { label: "Programada", color: "success" };
  if (meeting.estadoEvento === "CREADO_ZOOM") return { label: "Creada", color: "info" };
  if (meeting.estadoEvento === "ERROR_INTEGRACION") return { label: "Error de integración", color: "error" };
  if (meeting.estadoEvento === "PENDIENTE_CREACION") return { label: "Pendiente", color: "warning" };
  return { label: meeting.estadoEvento || "Sin estado", color: "default" };
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

function compactAssistantLabel(meeting: AgendaMeeting): string {
  if (!meeting.requiresAssistance) return "Sin asistencia";
  return meeting.monitorNombre || meeting.monitorEmail || "Pendiente";
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

function WeekdayHeader() {
  const weekdays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
        gap: 1,
        mb: 1
      }}
    >
      {weekdays.map((weekday) => (
        <Paper
          key={weekday}
          variant="outlined"
          sx={{ py: 1, textAlign: "center", borderRadius: 2, bgcolor: "background.default" }}
        >
          <Typography variant="caption" sx={{ fontWeight: 800, letterSpacing: 0.4 }}>
            {weekday}
          </Typography>
        </Paper>
      ))}
    </Box>
  );
}

export function SpaTabAgendaAdmin({ solicitudes }: SpaTabAgendaAdminProps) {
  const theme = useTheme();
  const [viewMode, setViewMode] = useState<AgendaViewMode>("CALENDAR");
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
  const calendarMonthGroups = useMemo(
    () =>
      Array.from(new Set(visibleMeetings.map((meeting) => getMonthKey(meeting.startTime)).filter(Boolean)))
        .sort((left, right) => left.localeCompare(right)),
    [visibleMeetings]
  );
  const meetingsByDay = useMemo(() => {
    const grouped = new Map<string, AgendaMeeting[]>();
    for (const meeting of visibleMeetings) {
      const dayKey = getDayKey(meeting.startTime);
      if (!dayKey) continue;
      const existing = grouped.get(dayKey);
      if (existing) existing.push(meeting);
      else grouped.set(dayKey, [meeting]);
    }
    for (const meetings of grouped.values()) {
      meetings.sort((left, right) => new Date(left.startTime).getTime() - new Date(right.startTime).getTime());
    }
    return grouped;
  }, [visibleMeetings]);
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
                Vista administrativa de las instancias de reunión ya programadas en el sistema.
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

          {unscheduledRequests > 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Hay {unscheduledRequests} pedido(s) sin instancias Zoom visibles todavía. Esta agenda muestra
              solamente reuniones con fecha concreta.
            </Alert>
          ) : null}

          <Stack direction={{ xs: "column", lg: "row" }} spacing={1.25} useFlexGap>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={viewMode}
              onChange={(_event, value: AgendaViewMode | null) => {
                if (value) setViewMode(value);
              }}
              sx={{ flexWrap: "wrap" }}
            >
              <ToggleButton value="CALENDAR">
                <CalendarMonthRoundedIcon sx={{ fontSize: 18, mr: 0.75 }} />
                Calendario
              </ToggleButton>
              <ToggleButton value="TIMELINE">
                <TimelineRoundedIcon sx={{ fontSize: 18, mr: 0.75 }} />
                Línea de tiempo
              </ToggleButton>
            </ToggleButtonGroup>

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

          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip label={`${summary.meetings} reuniones`} color="primary" variant="outlined" />
            <Chip label={`${summary.programs} programas`} variant="outlined" />
            <Chip label={`${summary.assigned} con asistencia asignada`} color="success" variant="outlined" />
            <Chip label={`${summary.pending} pendientes de asistencia`} color="warning" variant="outlined" />
            {summary.cancelled > 0 ? (
              <Chip label={`${summary.cancelled} canceladas`} color="error" variant="outlined" />
            ) : null}
          </Stack>

          {visibleMeetings.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              No hay reuniones para los filtros seleccionados.
            </Alert>
          ) : null}

          {visibleMeetings.length > 0 && viewMode === "CALENDAR" ? (
            <Box sx={{ overflowX: "auto" }}>
              <Box sx={{ minWidth: 960 }}>
                <Stack spacing={2.5}>
                  {calendarMonthGroups.map((monthKey) => {
                    const calendarDays = buildCalendarDays(monthKey);
                    return (
                      <Box key={monthKey}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
                          <Typography variant="h6" sx={{ fontWeight: 800 }}>
                            {formatMonthLabel(monthKey)}
                          </Typography>
                          <Chip
                            size="small"
                            variant="outlined"
                            label={`${
                              visibleMeetings.filter((meeting) => getMonthKey(meeting.startTime) === monthKey).length
                            } reunión(es)`}
                          />
                        </Stack>

                        <WeekdayHeader />
                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                            gap: 1
                          }}
                        >
                          {calendarDays.map((day) => {
                            const dayMeetings = meetingsByDay.get(day.key) ?? [];
                            return (
                              <Paper
                                key={day.key}
                                variant="outlined"
                                sx={{
                                  minHeight: 180,
                                  p: 1.2,
                                  borderRadius: 2.5,
                                  bgcolor: day.inCurrentMonth
                                    ? theme.palette.background.paper
                                    : alpha(theme.palette.action.disabledBackground, 0.35),
                                  borderColor: day.isToday ? "primary.main" : "divider"
                                }}
                              >
                                <Stack spacing={1}>
                                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                                    <Typography
                                      variant="subtitle2"
                                      sx={{
                                        fontWeight: 800,
                                        color: day.inCurrentMonth ? "text.primary" : "text.disabled"
                                      }}
                                    >
                                      {day.dayNumber}
                                    </Typography>
                                    {day.isToday ? (
                                      <Chip
                                        size="small"
                                        color="primary"
                                        icon={<TodayRoundedIcon sx={{ fontSize: 14 }} />}
                                        label="Hoy"
                                      />
                                    ) : null}
                                  </Stack>

                                  {dayMeetings.length === 0 ? (
                                    <Typography variant="caption" color="text.secondary">
                                      Sin reuniones
                                    </Typography>
                                  ) : (
                                    <Stack spacing={0.8} sx={{ maxHeight: 280, overflowY: "auto", pr: 0.3 }}>
                                      {dayMeetings.map((meeting) => {
                                        const eventTone = resolveEventTone(meeting);
                                        return (
                                          <Paper
                                            key={meeting.key}
                                            variant="outlined"
                                            sx={{
                                              p: 1,
                                              borderRadius: 2,
                                              borderColor: alpha(resolveToneAccent(theme, eventTone.color), 0.35),
                                              bgcolor: alpha(resolveToneAccent(theme, eventTone.color), 0.06)
                                            }}
                                          >
                                            <Stack spacing={0.75}>
                                              <Typography variant="caption" sx={{ fontWeight: 800 }}>
                                                {formatZoomTime(meeting.startTime)} · {meeting.title}
                                              </Typography>
                                              <Typography variant="caption" color="text.secondary">
                                                {meeting.programaNombre || "Sin programa"}
                                              </Typography>
                                              <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap">
                                                <Chip size="small" label={formatModalidad(meeting.modalidadReunion)} variant="outlined" />
                                                <Chip size="small" label={eventTone.label} color={eventTone.color} />
                                                {meeting.totalInstances > 1 ? (
                                                  <Chip
                                                    size="small"
                                                    icon={<EventRepeatRoundedIcon sx={{ fontSize: 14 }} />}
                                                    label={`${meeting.instanceIndex}/${meeting.totalInstances}`}
                                                    variant="outlined"
                                                  />
                                                ) : null}
                                              </Stack>
                                              <Typography variant="caption" color="text.secondary">
                                                {compactAssistantLabel(meeting)}
                                              </Typography>
                                            </Stack>
                                          </Paper>
                                        );
                                      })}
                                    </Stack>
                                  )}
                                </Stack>
                              </Paper>
                            );
                          })}
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              </Box>
            </Box>
          ) : null}

          {visibleMeetings.length > 0 && viewMode === "TIMELINE" ? (
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
                                    Solicitud
                                  </Typography>
                                  <Typography variant="body2">{meeting.solicitudId}</Typography>
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
