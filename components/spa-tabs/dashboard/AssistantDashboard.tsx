"use client";

import type { ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Stack,
  Typography,
  alpha,
  useTheme
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import EventNoteIcon from "@mui/icons-material/EventNote";
import ScheduleIcon from "@mui/icons-material/Schedule";
import TimerIcon from "@mui/icons-material/Timer";
import type { DashboardSummary } from "@/src/services/dashboardApi";
import { ZoomAccountPasswordField } from "@/components/spa-tabs/ZoomAccountPasswordField";
import type { DashboardRoleConfig } from "./types";
import {
  formatDateTime24,
  formatHours,
  metricValue,
  resolveInterestState
} from "./dashboardUtils";
import { MetricCards } from "./MetricCards";
import { useAssistantDashboard } from "./useAssistantDashboard";
import type { AgendaEvent } from "@/src/services/agendaApi";

type AssistantDashboardProps = {
  summary: DashboardSummary;
  config: DashboardRoleConfig;
  agendaLibre: AgendaEvent[];
  hasLoadedAgendaLibre: boolean;
  onGoToAgendaAvailable?: () => void;
  onGoToMyAssignedMeetings?: () => void;
};

export function AssistantDashboard({
  summary,
  config,
  agendaLibre,
  hasLoadedAgendaLibre,
  onGoToAgendaAvailable,
  onGoToMyAssignedMeetings
}: AssistantDashboardProps) {
  const theme = useTheme();
  const assistant = useAssistantDashboard(true, agendaLibre);
  const pendingResponsesFromAgenda = agendaLibre.filter(
    (item) => resolveInterestState(item.intereses[0]?.estadoInteres) === "SIN_RESPUESTA"
  ).length;
  const answeredResponsesFromAgenda = agendaLibre.filter(
    (item) => resolveInterestState(item.intereses[0]?.estadoInteres) !== "SIN_RESPUESTA"
  ).length;
  const pendingResponsesCount = hasLoadedAgendaLibre ? pendingResponsesFromAgenda : metricValue(summary, "misPendientesAgenda");
  const answeredResponsesCount = hasLoadedAgendaLibre ? answeredResponsesFromAgenda : metricValue(summary, "misRespuestasAgenda");

  return (
    <Stack spacing={2.2}>
      {assistant.assistantPanelError ? <Alert severity="error">{assistant.assistantPanelError}</Alert> : null}

      <Card
        variant="outlined"
        sx={{
          borderRadius: 4,
          background: config.background,
          borderLeft: "8px solid",
          borderLeftColor: assistant.nextMeeting ? "success.main" : "warning.main"
        }}
      >
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }}>
            <Box>
              <Typography variant="overline" sx={{ fontWeight: 900, color: "text.secondary" }}>
                Próxima cobertura
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 900 }}>
                {assistant.nextMeeting?.titulo ?? "Sin próximas reuniones asignadas"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {assistant.nextMeeting
                  ? `${formatDateTime24(assistant.nextMeeting.inicioProgramadoAt)} · ${assistant.nextMeetingCountdown}`
                  : "Puedes revisar la agenda disponible para tomar nuevas coberturas."}
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button variant="contained" onClick={onGoToMyAssignedMeetings} disabled={!onGoToMyAssignedMeetings}>
                Mis reuniones
              </Button>
              <Button variant="outlined" onClick={onGoToAgendaAvailable} disabled={!onGoToAgendaAvailable}>
                Agenda disponible
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <MetricCards
        metrics={config.metrics}
        summary={summary}
        columns={{ xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(5, 1fr)" }}
      />

      <Grid container spacing={2}>
        <AssistantStatCard
          color="warning"
          icon={<EventAvailableIcon />}
          title="Pendientes de respuesta"
          value={pendingResponsesCount}
          description="Reuniones disponibles todavía sin respuesta."
        />
        <AssistantStatCard
          color="success"
          icon={<EventNoteIcon />}
          title="Respondidas"
          value={answeredResponsesCount}
          description="Eventos donde ya registraste interés o rechazo."
        />
        <AssistantHoursCard
          title="Mes pasado"
          icon={<CalendarMonthIcon />}
          virtual={assistant.assistantStats.prevMonthVirtual}
          hibrida={assistant.assistantStats.prevMonthHibrida}
        />
        <AssistantHoursCard
          title="Mes actual"
          icon={<AccessTimeIcon />}
          virtual={assistant.assistantStats.currentMonthPastVirtual + assistant.assistantStats.currentMonthFutureVirtual}
          hibrida={assistant.assistantStats.currentMonthPastHibrida + assistant.assistantStats.currentMonthFutureHibrida}
        />
      </Grid>

      {assistant.isLoadingAssistantPanel ? (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={18} />
          <Typography variant="body2" color="text.secondary">
            Actualizando panel de asistencia...
          </Typography>
        </Stack>
      ) : null}

      {assistant.nextMeeting ? (
        <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: "8px solid", borderLeftColor: "primary.main" }}>
          <CardContent>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" sx={{ mb: 2 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  Detalle de próxima reunión
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Información útil para ingresar y asistir la sesión.
                </Typography>
              </Box>
              <Chip icon={<TimerIcon />} color="primary" label={assistant.nextMeetingCountdown} sx={{ fontWeight: 800 }} />
            </Stack>

            <Grid container spacing={2}>
              <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Modalidad
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {assistant.nextMeeting.modalidadReunion}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Duración
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {Math.round(assistant.nextMeeting.minutosProgramados || assistant.nextMeeting.minutos)} minutos
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Inicio
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatDateTime24(assistant.nextMeeting.inicioProgramadoAt)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 6, md: 3 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Fin
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatDateTime24(assistant.nextMeeting.finProgramadoAt)}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Divider />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Meeting ID
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: "monospace", fontWeight: 600 }}>
                  {assistant.nextMeetingId || "Pendiente"}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Cuenta host
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {assistant.nextMeetingAccount || "Pendiente"}
                </Typography>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Divider />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700}>
                  Link de Zoom
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ xs: "stretch", sm: "center" }} sx={{ mt: 0.5 }}>
                  <Typography variant="body2" sx={{ wordBreak: "break-all", flex: 1 }}>
                    {assistant.nextMeetingJoinUrl || "Pendiente"}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ContentCopyIcon />}
                    onClick={() => void assistant.copyNextMeetingLink()}
                    disabled={!assistant.nextMeetingJoinUrl}
                  >
                    Copiar
                  </Button>
                  {assistant.nextMeetingJoinUrl ? (
                    <Button variant="contained" size="small" href={assistant.nextMeetingJoinUrl} target="_blank">
                      Entrar
                    </Button>
                  ) : null}
                </Stack>
                {assistant.copyLinkFeedback ? (
                  <Typography variant="caption" color="success.main" fontWeight={700}>
                    {assistant.copyLinkFeedback}
                  </Typography>
                ) : null}
              </Grid>

              <Grid size={{ xs: 12 }}>
                <ZoomAccountPasswordField hostAccount={assistant.nextMeetingAccount} label="Contraseña Host" />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      ) : null}

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 900 }}>
                Agenda disponible
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {assistant.assistantAgendaToAssignCount} reunión(es) abiertas para tomar o responder.
              </Typography>
            </Box>
            <Button variant="outlined" onClick={onGoToAgendaAvailable} disabled={!onGoToAgendaAvailable}>
              Ver agenda completa
            </Button>
          </Stack>

          {assistant.assistantAgendaPreview.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No hay eventos disponibles para tomar en este momento.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {assistant.assistantAgendaPreview.map((event) => (
                <Box
                  key={event.id}
                  sx={{
                    p: 1.2,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: alpha(theme.palette.primary.main, 0.03)
                  }}
                >
                  <Stack direction={{ xs: "column", md: "row" }} spacing={1} justifyContent="space-between">
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {event.solicitud.titulo}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime24(event.inicioProgramadoAt)} · {event.solicitud.programaNombre || "Sin programa"}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      icon={<ScheduleIcon />}
                      label={event.solicitud.modalidadReunion || "Modalidad no definida"}
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}

type AssistantStatCardProps = {
  color: "success" | "warning" | "info" | "primary";
  icon: ReactNode;
  title: string;
  value: number;
  description: string;
};

function AssistantStatCard({ color, icon, title, value, description }: AssistantStatCardProps) {
  const theme = useTheme();
  return (
    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
      <Card variant="outlined" sx={{ borderRadius: 3, borderColor: `${color}.main`, bgcolor: alpha(theme.palette[color].main, theme.palette.mode === "dark" ? 0.14 : 0.05) }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: `${color}.main`, display: "flex", alignItems: "center", gap: 0.5 }}>
            {icon} {title}
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 900, color: `${color}.main`, mt: 1 }}>
            {value}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5, lineHeight: 1.2 }}>
            {description}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}

type AssistantHoursCardProps = {
  title: string;
  icon: ReactNode;
  virtual: number;
  hibrida: number;
};

function AssistantHoursCard({ title, icon, virtual, hibrida }: AssistantHoursCardProps) {
  const theme = useTheme();
  return (
    <Grid size={{ xs: 12, sm: 6, md: 3 }}>
      <Card variant="outlined" sx={{ borderRadius: 3, borderColor: "primary.main", bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.14 : 0.08) }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main", display: "flex", alignItems: "center", gap: 0.5 }}>
            {icon} {title}
          </Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900, color: "primary.main" }}>
                {formatHours(virtual)}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                Virtual
              </Typography>
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900, color: "primary.main" }}>
                {formatHours(hibrida)}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                Híbrida
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );
}
