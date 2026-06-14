"use client";

import type { ReactNode } from "react";
import { Box, Card, CardContent, Grid, Paper, Stack, Typography, alpha, useTheme } from "@mui/material";
import BuildCircleIcon from "@mui/icons-material/BuildCircle";
import Groups2Icon from "@mui/icons-material/Groups2";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import type { DashboardSummary } from "@/src/services/dashboardApi";
import { formatZoomDateTime } from "../spa-tabs-utils";
import type { DashboardRoleConfig } from "./types";
import { buildZoomCancellationDetectionLabel } from "./dashboardUtils";
import { DashboardHeader } from "./DashboardHeader";
import { MetricCards } from "./MetricCards";

type AdminDashboardProps = {
  summary: DashboardSummary;
  config: DashboardRoleConfig;
  onGoToCreateMeeting?: () => void;
  onGoToAssignAssistants?: () => void;
};

export function AdminDashboard({
  summary,
  config,
  onGoToCreateMeeting,
  onGoToAssignAssistants
}: AdminDashboardProps) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const toneColor = (color: "error" | "warning" | "success" | "info") =>
    isDarkMode ? `${color}.light` : `${color}.dark`;
  const manualTotal = (summary.manualPendings || 0) + (summary.solicitudesNoResueltas || 0);
  const hasAttention =
    (summary.reunionesCanceladasEnZoom || 0) > 0 ||
    (summary.colisionesZoom7d || 0) > 0 ||
    (summary.eventosSinAsistencia7d || 0) > 0 ||
    (manualTotal > 0 && manualTotal !== 1);

  return (
    <Stack spacing={2.2}>
      <DashboardHeader
        config={config}
        showActions
        onGoToCreateMeeting={onGoToCreateMeeting}
        onGoToAssignAssistants={onGoToAssignAssistants}
      />

      {hasAttention ? (
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5, px: 0.5 }}>
            Atención requerida
          </Typography>
          <Grid container spacing={2}>
            {(summary.reunionesCanceladasEnZoom || 0) > 0 ? (
              <Grid size={{ xs: 12, lg: 6 }}>
                <Card
                  variant="outlined"
                  sx={{
                    height: "100%",
                    borderColor: "error.main",
                    bgcolor: isDarkMode ? alpha(theme.palette.error.main, 0.16) : alpha(theme.palette.error.main, 0.08),
                    borderRadius: 3,
                    borderLeft: "8px solid",
                    borderLeftColor: "error.main"
                  }}
                >
                  <CardContent>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box sx={{ p: 1, borderRadius: 2, bgcolor: "error.main", color: "white" }}>
                        <WarningAmberIcon />
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: toneColor("error") }}>
                          Canceladas desde Zoom
                        </Typography>
                        <Typography variant="h3" sx={{ fontWeight: 900, color: "error.main" }}>
                          {summary.reunionesCanceladasEnZoom}
                        </Typography>
                      </Box>
                    </Stack>
                    <Typography variant="body2" sx={{ mt: 1.5, color: toneColor("error"), fontWeight: 500 }}>
                      Reuniones futuras que siguen activas en la app pero ya no están disponibles en Zoom.
                    </Typography>
                    {(summary.alertasReunionesCanceladasEnZoom ?? []).length > 0 ? (
                      <Stack spacing={1} sx={{ mt: 1.8 }}>
                        {summary.alertasReunionesCanceladasEnZoom?.map((alert) => (
                          <Paper
                            key={`${alert.eventId}:${alert.startTime}`}
                            variant="outlined"
                            sx={{
                              p: 1.2,
                              borderRadius: 2,
                              borderColor: alpha(theme.palette.error.main, 0.22),
                              bgcolor: alpha(theme.palette.background.paper, isDarkMode ? 0.22 : 0.9)
                            }}
                          >
                            <Stack spacing={0.4}>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {alert.titulo}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatZoomDateTime(alert.startTime)}
                              </Typography>
                              {alert.programaNombre ? (
                                <Typography variant="caption" color="text.secondary">
                                  Programa: {alert.programaNombre}
                                </Typography>
                              ) : null}
                              {alert.zoomMeetingId ? (
                                <Typography variant="caption" color="text.secondary">
                                  Meeting ID: {alert.zoomMeetingId}
                                </Typography>
                              ) : null}
                              <Typography variant="caption" sx={{ color: toneColor("error"), fontWeight: 600 }}>
                                {buildZoomCancellationDetectionLabel(alert)}
                              </Typography>
                            </Stack>
                          </Paper>
                        ))}
                      </Stack>
                    ) : null}
                  </CardContent>
                </Card>
              </Grid>
            ) : null}

            {(summary.colisionesZoom7d || 0) > 0 ? (
              <AttentionCard
                icon={<WarningAmberIcon />}
                color="error"
                title="Conflictos detectados"
                value={summary.colisionesZoom7d || 0}
                description="Colisiones de horario en Zoom detectadas para los próximos 7 días."
              />
            ) : null}

            {(summary.eventosSinAsistencia7d || 0) > 0 ? (
              <AttentionCard
                icon={<Groups2Icon />}
                color="warning"
                title="Asistencia pendiente"
                value={summary.eventosSinAsistencia7d || 0}
                description="Reuniones con asistencia requerida sin personal asignado en los próximos 7 días."
              />
            ) : null}

            {manualTotal > 0 && manualTotal !== 1 ? (
              <AttentionCard
                icon={<BuildCircleIcon />}
                color="info"
                title="Gestión manual"
                value={manualTotal}
                description="Pedidos pendientes o no resueltos que requieren intervención."
              />
            ) : null}
          </Grid>
        </Box>
      ) : null}

      <MetricCards metrics={config.metrics} summary={summary} />
    </Stack>
  );
}

type AttentionCardProps = {
  icon: ReactNode;
  color: "error" | "warning" | "info";
  title: string;
  value: number;
  description: string;
};

function AttentionCard({ icon, color, title, value, description }: AttentionCardProps) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const tone = isDarkMode ? `${color}.light` : `${color}.dark`;

  return (
    <Grid size={{ xs: 12, md: 4 }}>
      <Card
        variant="outlined"
        sx={{
          height: "100%",
          borderColor: `${color}.main`,
          bgcolor: alpha(theme.palette[color].main, isDarkMode ? 0.14 : 0.08),
          borderRadius: 3,
          borderLeft: "8px solid",
          borderLeftColor: `${color}.main`
        }}
      >
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${color}.main`, color: "white" }}>{icon}</Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: tone }}>
                {title}
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900, color: `${color}.main` }}>
                {value}
              </Typography>
            </Box>
          </Stack>
          <Typography variant="body2" sx={{ mt: 1.5, color: tone, fontWeight: 500 }}>
            {description}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );
}
