"use client";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
  alpha,
  useTheme
} from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LockIcon from "@mui/icons-material/Lock";
import ScheduleIcon from "@mui/icons-material/Schedule";
import TimerIcon from "@mui/icons-material/Timer";
import type { DashboardSummary } from "@/src/services/dashboardApi";
import { MeetingAssistantStatusChip } from "@/components/spa-tabs/MeetingAssistantStatusChip";
import { formatZoomDateTime } from "../spa-tabs-utils";
import type { DashboardRoleConfig } from "./types";
import { metricValue } from "./dashboardUtils";
import { MetricCards } from "./MetricCards";

type DocenteDashboardProps = {
  summary: DashboardSummary;
  config: DashboardRoleConfig;
  countdown: string;
  onGoToCreateMeeting?: () => void;
  onGoToMyAssignedMeetings?: () => void;
  onRefresh?: () => void;
};

export function DocenteDashboard({
  summary,
  config,
  countdown,
  onGoToCreateMeeting,
  onGoToMyAssignedMeetings,
  onRefresh
}: DocenteDashboardProps) {
  const theme = useTheme();
  const sessionsWithoutZoom = metricValue(summary, "proximasReuniones") - metricValue(summary, "reunionesConZoom");

  return (
    <Stack spacing={4} sx={{ mt: 2 }}>
      <Box
        sx={{
          p: 4,
          borderRadius: 5,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: "white",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 20px 40px rgba(31, 75, 143, 0.25)"
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -50,
            right: -50,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.1)",
            filter: "blur(40px)"
          }}
        />
        <Grid container spacing={3} alignItems="center">
          <Grid size={{ xs: 12, md: 8 }}>
            <Typography variant="h4" sx={{ fontWeight: 900, mb: 1, letterSpacing: "-1px" }}>
              ¡Hola de nuevo!
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9, mb: 3, maxWidth: 500 }}>
              Tienes todo listo para tus próximas sesiones. Aquí tienes un resumen rápido de tu actividad académica.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Button
                variant="contained"
                onClick={() => onGoToMyAssignedMeetings?.()}
                sx={{
                  bgcolor: "white",
                  color: "primary.main",
                  fontWeight: 800,
                  px: 3,
                  borderRadius: 3,
                  "&:hover": { bgcolor: alpha("#fff", 0.9) }
                }}
              >
                Ver mis reuniones
              </Button>
              <Button
                variant="outlined"
                onClick={() => onGoToCreateMeeting?.()}
                sx={{
                  borderColor: "white",
                  color: "white",
                  fontWeight: 800,
                  px: 3,
                  borderRadius: 3,
                  "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" }
                }}
              >
                Nuevo pedido
              </Button>
            </Stack>
          </Grid>

          {summary.nextMeeting ? (
            <Grid size={{ xs: 12, md: 4 }}>
              <Paper
                sx={{
                  p: 2.5,
                  borderRadius: 4,
                  bgcolor: "rgba(255,255,255,0.12)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "white"
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 800, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Tu próxima sesión
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, mt: 1, mb: 0.5, lineHeight: 1.2 }}>
                  {summary.nextMeeting.titulo}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  <CalendarMonthIcon sx={{ fontSize: 16, opacity: 0.8 }} />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {formatZoomDateTime(summary.nextMeeting.startTime)}
                  </Typography>
                </Stack>
                <Chip
                  label={summary.nextMeeting.modalidad}
                  size="small"
                  sx={{ bgcolor: "white", color: "primary.main", fontWeight: 800, height: 24 }}
                />
              </Paper>
            </Grid>
          ) : null}
        </Grid>
      </Box>

      <MetricCards
        metrics={config.metrics}
        summary={summary}
        elevated
        columns={{ xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }}
      />

      {sessionsWithoutZoom > 0 ? (
        <Alert severity="warning" variant="outlined" sx={{ borderRadius: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {sessionsWithoutZoom} sesión(es) aún sin link de Zoom asignado.
          </Typography>
        </Alert>
      ) : null}

      {summary.nextMeeting ? (
        <DocenteNextMeetingCard summary={summary} countdown={countdown} onRefresh={onRefresh} />
      ) : (
        <Card variant="outlined" sx={{ borderRadius: 4, borderLeft: "8px solid", borderLeftColor: "primary.main" }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 900 }}>
              No tienes próximas sesiones programadas
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Cuando se genere una nueva reunión, aparecerá aquí con su información de acceso.
            </Typography>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}

function DocenteNextMeetingCard({
  summary,
  countdown,
  onRefresh
}: Pick<DocenteDashboardProps, "summary" | "countdown" | "onRefresh">) {
  const theme = useTheme();
  const meeting = summary.nextMeeting;
  if (!meeting) return null;

  const durationMinutes = Math.round((new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime()) / 60000);

  return (
    <Card variant="outlined" sx={{ borderRadius: 4, overflow: "hidden", borderColor: "divider" }}>
      <Box sx={{ p: 2, bgcolor: alpha(theme.palette.primary.main, 0.04), borderBottom: "1px solid", borderColor: "divider" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap">
          <Stack direction="row" spacing={1} alignItems="center">
            <ScheduleIcon color="primary" sx={{ fontSize: 20 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "primary.main", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Próxima sesión
            </Typography>
            {meeting.totalInstances && meeting.totalInstances > 1 ? (
              <Chip
                label={`Instancia ${meeting.instanceIndex} de ${meeting.totalInstances}`}
                size="small"
                sx={{ height: 20, fontSize: "0.65rem", fontWeight: 700, bgcolor: "primary.main", color: "white" }}
              />
            ) : null}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <TimerIcon sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary" }}>
              Faltan: {countdown}
            </Typography>
          </Stack>
        </Stack>
      </Box>

      <CardContent sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5, lineHeight: 1.2 }}>
              {meeting.titulo}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 2 }}>
              {meeting.programaNombre || "Sin programa asignado"}
            </Typography>
            <Stack direction="row" spacing={3} flexWrap="wrap">
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", display: "block", mb: 0.5 }}>
                  FECHA
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {new Date(meeting.startTime).toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit", year: "numeric" })}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", display: "block", mb: 0.5 }}>
                  INICIO
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {new Date(meeting.startTime).toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" })} hs
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", display: "block", mb: 0.5 }}>
                  FIN / DURACIÓN
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {new Date(meeting.endTime).toLocaleTimeString("es-UY", { hour: "2-digit", minute: "2-digit" })} hs ({durationMinutes} min)
                </Typography>
              </Box>
            </Stack>

            {meeting.hostAccount ? (
              <Box sx={{ p: 1.5, bgcolor: "action.hover", borderRadius: 2, border: "1px dashed", borderColor: "divider", mt: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AccountCircleIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", display: "block", fontSize: "0.6rem" }}>
                          CUENTA HOST
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.8rem", wordBreak: "break-all" }}>
                          {meeting.hostAccount}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <LockIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", display: "block", fontSize: "0.6rem" }}>
                          CONTRASEÑA
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.8rem" }}>
                          {meeting.hostPassword || "******"}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>
                </Grid>
              </Box>
            ) : null}
          </Grid>

          <Grid size={{ xs: 12, md: 0.5 }} sx={{ display: { xs: "none", md: "flex" }, justifyContent: "center" }}>
            <Divider orientation="vertical" flexItem />
          </Grid>

          <Grid size={{ xs: 12, md: 6.5 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", display: "block", mb: 1 }}>
                  LINK DE ACCESO ZOOM
                </Typography>
                {meeting.zoomJoinUrl ? (
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }}>
                    <Box
                      sx={{
                        p: 1,
                        px: 2,
                        bgcolor: alpha(theme.palette.primary.main, 0.05),
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: alpha(theme.palette.primary.main, 0.2),
                        flex: 1,
                        overflow: "hidden"
                      }}
                    >
                      <Typography variant="body2" sx={{ color: "primary.main", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {meeting.zoomJoinUrl}
                      </Typography>
                    </Box>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        navigator.clipboard.writeText(meeting.zoomJoinUrl ?? "");
                        onRefresh?.();
                      }}
                      startIcon={<ContentCopyIcon />}
                      sx={{ borderRadius: 2, height: 40, minWidth: 100 }}
                    >
                      Copiar
                    </Button>
                    <Button variant="contained" size="small" href={meeting.zoomJoinUrl} target="_blank" sx={{ borderRadius: 2, height: 40, px: 3 }}>
                      Entrar
                    </Button>
                  </Stack>
                ) : (
                  <Alert severity="warning">La reunión aún no tiene link asignado.</Alert>
                )}
              </Box>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", display: "block", mb: 1 }}>
                    ASISTENTE ZOOM
                  </Typography>
                  {meeting.asistente ? (
                    <Stack spacing={1}>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {meeting.asistente.nombre}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {meeting.asistente.email}
                      </Typography>
                      <MeetingAssistantStatusChip
                        requiresAssistance={meeting.requiresAssistance}
                        assistantName={meeting.asistente.nombre}
                        assistantEmail={meeting.asistente.email}
                      />
                    </Stack>
                  ) : meeting.requiresAssistance ? (
                    <Typography variant="body2" sx={{ fontWeight: 800 }}>
                      Sin asistente asignado
                    </Typography>
                  ) : (
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
                      No requiere asistencia
                    </Typography>
                  )}
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", display: "block", mb: 1 }}>
                    MODALIDAD Y ESTADO
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip label={meeting.modalidad} size="small" />
                    <Chip
                      label={meeting.requiresAssistance ? "Requiere asistencia" : "Sin asistencia"}
                      size="small"
                      color={meeting.requiresAssistance ? "warning" : "default"}
                    />
                  </Stack>
                </Grid>
              </Grid>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
