"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import HistoryIcon from "@mui/icons-material/History";
import {
  loadZoomPastMeetingDetails,
  type ZoomPastMeetingDetails,
  type ZoomUpcomingMeeting
} from "@/src/services/zoomApi";
import {
  formatZoomDateTime,
  getZoomAccountColor,
  buildZoomAccountColorMap
} from "@/components/spa-tabs/spa-tabs-utils";
import { RegisterUpcomingMeetingDialog } from "@/components/spa-tabs/proximas-reuniones/RegisterUpcomingMeetingDialog";
import { ZoomMeetingCard } from "@/components/spa-tabs/proximas-reuniones/ZoomMeetingCard";
import type {
  RegisterUpcomingMeetingForm,
  SpaTabProximasReunionesProps,
  ZoomGroupingMode,
  ZoomViewMode
} from "@/components/spa-tabs/proximas-reuniones/types";
import {
  buildRecurrenceCountByMeetingId,
  buildRecurringSeries,
  copyToClipboard,
  getMeetingCardKey,
  groupMeetingsByMonthAndDay,
  groupMeetingsByPeriod,
  summarizeZoomMeetings
} from "@/components/spa-tabs/proximas-reuniones/utils";

export function SpaTabProximasReuniones({
  title = "Próximas reuniones (Zoom)",
  subtitle = "Reuniones listadas desde Zoom para el grupo seleccionado.",
  groupName,
  meetings,
  isLoading,
  onRefresh,
  onRegisterUpcomingMeeting,
  isRegisteringUpcomingMeeting = false,
  programaOptions = [],
  responsableOptions = [],
  defaultResponsableNombre = "",
  enablePastMeetingDetails = false,
  defaultDetailsExpanded = false,
  defaultViewMode = "CALENDAR",
  onLoadMoreBack,
  canLoadMoreBack = false,
  isLoadingMoreBack = false,
  monthOptions = [],
  selectedMonth = "",
  onSelectMonth,
  isLoadingMonthSelection = false
}: SpaTabProximasReunionesProps) {
  const theme = useTheme();
  const [grouping, setGrouping] = useState<ZoomGroupingMode>("MONTH");
  const [viewMode, setViewMode] = useState<ZoomViewMode>(defaultViewMode);
  const [registerDialogMeeting, setRegisterDialogMeeting] = useState<ZoomUpcomingMeeting | null>(null);
  const [registerForm, setRegisterForm] = useState<RegisterUpcomingMeetingForm>({
    responsableNombre: "",
    programaNombre: "",
    modalidadReunion: "VIRTUAL" as "VIRTUAL" | "HIBRIDA",
    requiereAsistencia: false,
    descripcion: ""
  });
  const [copyFeedback, setCopyFeedback] = useState<Record<string, string>>({});

  const handleCopy = async (text: string, key: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopyFeedback(prev => ({ ...prev, [key]: "¡Copiado!" }));
      setTimeout(() => setCopyFeedback(prev => ({ ...prev, [key]: "" })), 2000);
    }
  };

  const [expandedDetailsByMeeting, setExpandedDetailsByMeeting] = useState<Record<string, boolean>>({});
  const [loadingDetailsByMeeting, setLoadingDetailsByMeeting] = useState<Record<string, boolean>>({});
  const [detailsByMeeting, setDetailsByMeeting] = useState<Record<string, ZoomPastMeetingDetails | null>>({});
  const [detailsErrorsByMeeting, setDetailsErrorsByMeeting] = useState<Record<string, string>>({});
  const canSubmitRegisterDialog = Boolean(
    registerDialogMeeting &&
      registerDialogMeeting.meetingId &&
      registerForm.responsableNombre.trim() &&
      registerForm.programaNombre.trim()
  );

  const groupedMeetings = useMemo(
    () => groupMeetingsByPeriod(meetings, grouping),
    [meetings, grouping]
  );
  const groupedMeetingsByMonthAndDay = useMemo(
    () => {
      if (grouping === "MONTH") {
        return groupMeetingsByMonthAndDay(meetings);
      }
      return [];
    },
    [meetings, grouping]
  );
  const accountColorMap = useMemo(
    () =>
      buildZoomAccountColorMap(
        meetings.map((meeting) => `${meeting.accountId}:${meeting.accountEmail}`)
      ),
    [meetings]
  );
  const recurringSeries = useMemo(
    () => buildRecurringSeries(meetings, enablePastMeetingDetails),
    [meetings, enablePastMeetingDetails]
  );
  const recurrenceCountByMeetingId = useMemo(() => buildRecurrenceCountByMeetingId(meetings), [meetings]);
  const visibleMeetings = useMemo(
    () =>
      viewMode === "CALENDAR"
        ? groupedMeetings.flatMap((group) => group.meetings)
        : recurringSeries.flatMap((series) => series.meetings),
    [groupedMeetings, recurringSeries, viewMode]
  );
  const meetingSummary = useMemo(() => summarizeZoomMeetings(meetings), [meetings]);

  async function fetchPastMeetingDetails(meeting: ZoomUpcomingMeeting, meetingKey: string) {
    if (!meeting.meetingId) {
      setDetailsErrorsByMeeting((prev) => ({
        ...prev,
        [meetingKey]: "No hay Meeting ID para consultar detalle."
      }));
      return;
    }

    setLoadingDetailsByMeeting((prev) => ({ ...prev, [meetingKey]: true }));
    setDetailsErrorsByMeeting((prev) => {
      const next = { ...prev };
      delete next[meetingKey];
      return next;
    });

    try {
      const response = await loadZoomPastMeetingDetails({
        meetingId: meeting.meetingId,
        meetingUuid: meeting.meetingUuid
      });

      if (response.error) {
        setDetailsErrorsByMeeting((prev) => ({
          ...prev,
          [meetingKey]: response.error ?? "No se pudo obtener el detalle."
        }));
        return;
      }

      setDetailsByMeeting((prev) => ({
        ...prev,
        [meetingKey]: response.details ?? null
      }));
    } finally {
      setLoadingDetailsByMeeting((prev) => ({ ...prev, [meetingKey]: false }));
    }
  }

  function togglePastMeetingDetails(meeting: ZoomUpcomingMeeting) {
    if (!enablePastMeetingDetails) return;
    const meetingKey = getMeetingCardKey(meeting);
    const hasCustomState = Object.prototype.hasOwnProperty.call(expandedDetailsByMeeting, meetingKey);
    const isOpen = hasCustomState
      ? Boolean(expandedDetailsByMeeting[meetingKey])
      : defaultDetailsExpanded;
    const nextOpen = !isOpen;

    setExpandedDetailsByMeeting((prev) => ({
      ...prev,
      [meetingKey]: nextOpen
    }));

    if (!nextOpen) return;
    if (loadingDetailsByMeeting[meetingKey]) return;
    if (Object.prototype.hasOwnProperty.call(detailsByMeeting, meetingKey)) return;

    void fetchPastMeetingDetails(meeting, meetingKey);
  }

  useEffect(() => {
    if (!enablePastMeetingDetails || !defaultDetailsExpanded) return;
    for (const meeting of visibleMeetings) {
      const meetingKey = getMeetingCardKey(meeting);
      if (!meeting.meetingId) continue;
      if (loadingDetailsByMeeting[meetingKey]) continue;
      if (Object.prototype.hasOwnProperty.call(detailsByMeeting, meetingKey)) continue;
      void fetchPastMeetingDetails(meeting, meetingKey);
    }
  }, [
    defaultDetailsExpanded,
    detailsByMeeting,
    enablePastMeetingDetails,
    loadingDetailsByMeeting,
    visibleMeetings
  ]);

  function openRegisterDialog(meeting: ZoomUpcomingMeeting) {
    if (!onRegisterUpcomingMeeting) return;

    const defaultResponsable =
      defaultResponsableNombre.trim() ||
      responsableOptions[0]?.value ||
      "";
    const defaultPrograma = programaOptions[0] ?? "";

    setRegisterForm({
      responsableNombre: defaultResponsable,
      programaNombre: defaultPrograma,
      modalidadReunion: "VIRTUAL",
      requiereAsistencia: false,
      descripcion: `Registro administrativo desde Zoom (${meeting.accountEmail || "sin cuenta"}).`
    });
    setRegisterDialogMeeting(meeting);
  }

  function closeRegisterDialog() {
    if (isRegisteringUpcomingMeeting) return;
    setRegisterDialogMeeting(null);
  }

  async function submitRegisterDialog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!onRegisterUpcomingMeeting || !registerDialogMeeting || !registerDialogMeeting.meetingId) return;

    const created = await onRegisterUpcomingMeeting({
      meeting: registerDialogMeeting,
      responsableNombre: registerForm.responsableNombre.trim(),
      programaNombre: registerForm.programaNombre.trim(),
      modalidadReunion: registerForm.modalidadReunion,
      requiereAsistencia: registerForm.requiereAsistencia,
      descripcion: registerForm.descripcion.trim() || undefined
    });

    if (created) {
      setRegisterDialogMeeting(null);
    }
  }

  function retryPastMeetingDetails(meeting: ZoomUpcomingMeeting, meetingKey: string) {
    setDetailsByMeeting((prev) => {
      const next = { ...prev };
      delete next[meetingKey];
      return next;
    });
    void fetchPastMeetingDetails(meeting, meetingKey);
  }

  function renderMeetingCard(meeting: ZoomUpcomingMeeting, showTopic = true) {
    return (
      <ZoomMeetingCard
        key={getMeetingCardKey(meeting)}
        meeting={meeting}
        showTopic={showTopic}
        accountColorMap={accountColorMap}
        recurrenceCountByMeetingId={recurrenceCountByMeetingId}
        copyFeedback={copyFeedback}
        detailsByMeeting={detailsByMeeting}
        detailsErrorsByMeeting={detailsErrorsByMeeting}
        loadingDetailsByMeeting={loadingDetailsByMeeting}
        expandedDetailsByMeeting={expandedDetailsByMeeting}
        defaultDetailsExpanded={defaultDetailsExpanded}
        enablePastMeetingDetails={enablePastMeetingDetails}
        canRegisterUpcomingMeeting={Boolean(onRegisterUpcomingMeeting)}
        onCopy={handleCopy}
        onOpenRegisterDialog={openRegisterDialog}
        onToggleDetails={togglePastMeetingDetails}
        onRetryDetails={retryPastMeetingDetails}
      />
    );
  }

  return (
    <Card 
      variant="outlined" 
      sx={{ 
        borderRadius: 5, 
        border: "none",
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
        overflow: "visible" 
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 4 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", sm: "flex-start" }}
          justifyContent="space-between"
          sx={{ mb: 3 }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: "-1.5px", color: "text.primary", mb: 0.5 }}>
              {title}
            </Typography>
            <Typography variant="body1" sx={{ color: "text.secondary", fontWeight: 500, maxWidth: 600 }}>
              {subtitle}
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={1.5} alignItems="center">
            {onSelectMonth && monthOptions.length > 0 && (
              <TextField
                select
                size="small"
                label="Período"
                value={selectedMonth}
                onChange={(event) => onSelectMonth(String(event.target.value))}
                disabled={isLoading || isLoadingMonthSelection}
                sx={{ 
                  minWidth: { xs: 160, sm: 220 },
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    bgcolor: "background.paper",
                    fontWeight: 700
                  }
                }}
              >
                {monthOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value} sx={{ fontWeight: 600 }}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
            
            <Button 
              variant="contained" 
              onClick={onRefresh} 
              disabled={isLoading}
              sx={{ 
                borderRadius: 3, 
                fontWeight: 900, 
                px: 3, 
                boxShadow: theme.shadows[2],
                textTransform: "none"
              }}
            >
              {isLoading ? "Cargando..." : "Actualizar"}
            </Button>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1.2} useFlexGap flexWrap="wrap" sx={{ mb: 4 }}>
          <Chip 
            size="medium" 
            variant="filled" 
            label={`Grupo: ${groupName || "Global"}`} 
            sx={{ fontWeight: 800, bgcolor: alpha(theme.palette.primary.main, 0.1), color: "primary.dark" }}
          />
          <Chip 
            size="medium" 
            variant="filled" 
            label={`Total: ${meetingSummary.total}`} 
            sx={{ fontWeight: 800, bgcolor: "text.primary", color: "background.paper" }}
          />
          <Chip 
            size="medium" 
            color="success" 
            variant="filled" 
            label={`Asociadas: ${meetingSummary.linked}`} 
            sx={{ fontWeight: 800 }}
          />
          <Chip 
            size="medium" 
            color="warning" 
            variant="filled" 
            label={`Pendientes: ${meetingSummary.pending}`} 
            sx={{ fontWeight: 800 }}
          />
          <Chip 
            size="medium" 
            color="info" 
            variant="filled" 
            label={`Recurrentes: ${meetingSummary.recurrent}`} 
            sx={{ fontWeight: 800 }}
          />
          {meetingSummary.overlaps > 0 && (
            <Chip 
              size="medium" 
              color="error" 
              variant="filled" 
              label={`Cruces: ${meetingSummary.overlaps}`} 
              sx={{ fontWeight: 900, animation: "pulse 2s infinite" }}
            />
          )}
        </Stack>

        <Paper 
          variant="outlined" 
          sx={{ 
            p: 2, 
            borderRadius: 4, 
            mb: 4, 
            bgcolor: alpha(theme.palette.primary.main, 0.02),
            border: "1px solid",
            borderColor: alpha(theme.palette.primary.main, 0.1)
          }}
        >
          <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems={{ md: "center" }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 900, color: "text.secondary", textTransform: "uppercase", display: "block", mb: 1, letterSpacing: "0.1em" }}>
                Modo de Vista
              </Typography>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={viewMode}
                onChange={(_event, value: ZoomViewMode | null) => {
                  if (value) setViewMode(value);
                }}
                sx={{ 
                  "& .MuiToggleButton-root": { 
                    px: 3, 
                    fontWeight: 800, 
                    borderRadius: 2,
                    textTransform: "none"
                  } 
                }}
              >
                <ToggleButton value="CALENDAR">Calendario</ToggleButton>
                <ToggleButton value="RECURRENTES">Series Recurrentes</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {viewMode === "CALENDAR" && (
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 900, color: "text.secondary", textTransform: "uppercase", display: "block", mb: 1, letterSpacing: "0.1em" }}>
                  Agrupación Temporal
                </Typography>
                <ToggleButtonGroup
                  size="small"
                  exclusive
                  value={grouping}
                  onChange={(_event, value: ZoomGroupingMode | null) => {
                    if (value) setGrouping(value);
                  }}
                  sx={{ 
                    "& .MuiToggleButton-root": { 
                      px: 3, 
                      fontWeight: 800, 
                      borderRadius: 2,
                      textTransform: "none"
                    } 
                  }}
                >
                  <ToggleButton value="WEEK">Semanas</ToggleButton>
                  <ToggleButton value="MONTH">Meses</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            )}

            {onLoadMoreBack && (
              <Box sx={{ ml: { md: "auto" } }}>
                <Button
                  variant="outlined"
                  onClick={onLoadMoreBack}
                  disabled={isLoading || isLoadingMoreBack || !canLoadMoreBack}
                  startIcon={<HistoryIcon />}
                  sx={{ borderRadius: 3, fontWeight: 700 }}
                >
                  {isLoadingMoreBack ? "Cargando..." : "Historial anterior"}
                </Button>
              </Box>
            )}
          </Stack>
        </Paper>

        {isLoading ? (
          <Box sx={{ py: 8, textAlign: "center" }}>
            <CircularProgress size={40} thickness={4} />
            <Typography variant="body1" sx={{ mt: 2, fontWeight: 600, color: "text.secondary" }}>
              Sincronizando agenda de Zoom...
            </Typography>
          </Box>
        ) : meetings.length === 0 ? (
          <Paper sx={{ py: 8, textAlign: "center", borderRadius: 4, bgcolor: "background.paper", border: "1px dashed", borderColor: "divider" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "text.secondary" }}>
              No hay reuniones reportadas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Intenta actualizar o cambiar el período seleccionado.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={4}>
            {viewMode === "CALENDAR"
              ? grouping === "MONTH"
                ? groupedMeetingsByMonthAndDay.map((monthGroup) => (
                    <Box key={monthGroup.key}>
                      <Typography variant="h5" sx={{ fontWeight: 900, mb: 3, color: "primary.main", letterSpacing: "-0.02em", display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Box sx={{ width: 4, height: 24, bgcolor: "primary.main", borderRadius: 1 }} />
                        {monthGroup.label}
                        <Chip 
                          label={monthGroup.dayGroups.reduce((acc, dg) => acc + dg.meetings.length, 0)} 
                          size="small" 
                          sx={{ fontWeight: 900, bgcolor: alpha(theme.palette.primary.main, 0.1), color: "primary.main" }} 
                        />
                      </Typography>
                      <Stack spacing={3}>
                        {monthGroup.dayGroups.map((dayGroup) => (
                          <Box key={dayGroup.key}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: "text.secondary", textTransform: "capitalize", pl: 0.5 }}>
                              {dayGroup.label} ({dayGroup.meetings.length})
                            </Typography>
                            <Stack spacing={2.5}>
                              {dayGroup.meetings.map((meeting) => renderMeetingCard(meeting, true))}
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  ))
                : groupedMeetings.map((group) => (
                    <Box key={group.key}>
                      <Typography variant="h5" sx={{ fontWeight: 900, mb: 2, color: "primary.main", letterSpacing: "-0.02em" }}>
                        {group.label} ({group.meetings.length})
                      </Typography>
                      <Stack spacing={2.5}>
                        {group.meetings.map((meeting) => renderMeetingCard(meeting, true))}
                      </Stack>
                    </Box>
                  ))
              : recurringSeries.length === 0
                ? (
                  <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                    No hay series recurrentes detectadas.
                  </Typography>
                )
                : recurringSeries.map((series) => {
                  const firstMeeting = series.meetings[0];
                  const lastMeeting = series.meetings[series.meetings.length - 1];
                  const accountKey = firstMeeting
                    ? `${firstMeeting.accountId}:${firstMeeting.accountEmail}`.trim().toLowerCase()
                    : "";
                  const accountColor = accountColorMap.get(accountKey) ?? getZoomAccountColor(accountKey);

                  return (
                    <Paper key={series.key} variant="outlined" sx={{ p: 1.2, borderRadius: 2 }}>
                      <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={1}
                        alignItems={{ xs: "flex-start", md: "center" }}
                        justifyContent="space-between"
                        sx={{ mb: 1 }}
                      >
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            {series.topic}
                          </Typography>
                          <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" sx={{ mt: 0.6 }}>
                            <Chip size="small" color="primary" label="Recurrente" />
                            <Chip size="small" variant="outlined" label={`${series.meetings.length} instancias`} />
                            {series.meetingId ? (
                              <Chip size="small" variant="outlined" label={`Meeting ID ${series.meetingId}`} />
                            ) : null}
                          </Stack>
                          {firstMeeting && lastMeeting ? (
                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                              Rango: {formatZoomDateTime(firstMeeting.startTime)} a {formatZoomDateTime(lastMeeting.startTime)}
                            </Typography>
                          ) : null}
                        </Box>
                        {series.accountEmails.length === 1 ? (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Cuenta
                            </Typography>
                            <Stack direction="row" spacing={0.8} alignItems="center">
                              <Chip
                                size="small"
                                label={series.accountEmails[0]}
                                sx={{
                                  bgcolor: accountColor.background,
                                  color: accountColor.text,
                                  border: `1px solid ${accountColor.border}`,
                                  fontWeight: 700
                                }}
                              />
                            </Stack>
                          </Box>
                        ) : (
                          <Chip size="small" variant="outlined" label={`${series.accountEmails.length} cuentas`} />
                        )}
                      </Stack>

                      <Stack spacing={1}>
                        {series.meetings.map((meeting) => renderMeetingCard(meeting, false))}
                      </Stack>
                    </Paper>
                  );
                })}
          </Stack>
        )}

        <RegisterUpcomingMeetingDialog
          meeting={registerDialogMeeting}
          form={registerForm}
          setForm={setRegisterForm}
          programaOptions={programaOptions}
          responsableOptions={responsableOptions}
          isSubmitting={isRegisteringUpcomingMeeting}
          canSubmit={canSubmitRegisterDialog}
          onClose={closeRegisterDialog}
          onSubmit={submitRegisterDialog}
        />
      </CardContent>
    </Card>
  );
}
