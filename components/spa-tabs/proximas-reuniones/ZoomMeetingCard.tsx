import {
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Typography,
  useTheme
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import Tooltip from "@mui/material/Tooltip";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LinkIcon from "@mui/icons-material/Link";
import SchoolIcon from "@mui/icons-material/School";
import TerminalIcon from "@mui/icons-material/Terminal";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import type { ZoomPastMeetingDetails, ZoomUpcomingMeeting } from "@/src/services/zoomApi";
import {
  formatDurationHoursMinutes,
  formatZoomDateTime,
  getZoomAccountColor,
  normalizeZoomMeetingId
} from "@/components/spa-tabs/spa-tabs-utils";
import { MeetingAssistantStatusChip } from "@/components/spa-tabs/MeetingAssistantStatusChip";
import { ZoomAccountPasswordField } from "@/components/spa-tabs/ZoomAccountPasswordField";
import { MeetingAssociation } from "./MeetingAssociation";
import { formatNullableCount, getMeetingCardKey } from "./utils";

type ZoomAccountColor = ReturnType<typeof getZoomAccountColor>;

type ZoomMeetingCardProps = {
  meeting: ZoomUpcomingMeeting;
  showTopic?: boolean;
  accountColorMap: Map<string, ZoomAccountColor>;
  recurrenceCountByMeetingId: Map<string, number>;
  copyFeedback: Record<string, string>;
  detailsByMeeting: Record<string, ZoomPastMeetingDetails | null>;
  detailsErrorsByMeeting: Record<string, string>;
  loadingDetailsByMeeting: Record<string, boolean>;
  expandedDetailsByMeeting: Record<string, boolean>;
  defaultDetailsExpanded: boolean;
  enablePastMeetingDetails: boolean;
  canRegisterUpcomingMeeting: boolean;
  onCopy: (text: string, key: string) => void;
  onOpenRegisterDialog: (meeting: ZoomUpcomingMeeting) => void;
  onToggleDetails: (meeting: ZoomUpcomingMeeting) => void;
  onRetryDetails: (meeting: ZoomUpcomingMeeting, meetingKey: string) => void;
};

export function ZoomMeetingCard({
  meeting,
  showTopic = true,
  accountColorMap,
  recurrenceCountByMeetingId,
  copyFeedback,
  detailsByMeeting,
  detailsErrorsByMeeting,
  loadingDetailsByMeeting,
  expandedDetailsByMeeting,
  defaultDetailsExpanded,
  enablePastMeetingDetails,
  canRegisterUpcomingMeeting,
  onCopy,
  onOpenRegisterDialog,
  onToggleDetails,
  onRetryDetails
}: ZoomMeetingCardProps) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
    const accountKey = `${meeting.accountId}:${meeting.accountEmail}`.trim().toLowerCase();
    const meetingKey = getMeetingCardKey(meeting);
    const details = detailsByMeeting[meetingKey];
    const detailsError = detailsErrorsByMeeting[meetingKey];
    const detailsLoading = Boolean(loadingDetailsByMeeting[meetingKey]);
    const hasCustomOpenState = Object.prototype.hasOwnProperty.call(
      expandedDetailsByMeeting,
      meetingKey
    );
    const detailsOpen = hasCustomOpenState
      ? Boolean(expandedDetailsByMeeting[meetingKey])
      : defaultDetailsExpanded;
    const accountColor = accountColorMap.get(accountKey) ?? getZoomAccountColor(accountKey);
    const meetingId = normalizeZoomMeetingId(meeting.meetingId) ?? "-";
    const recurringCount = meetingId === "-" ? 1 : recurrenceCountByMeetingId.get(meetingId) ?? 1;
    const hostAccount = meeting.accountEmail?.trim() || meeting.accountName?.trim() || null;
    const joinUrl = meeting.joinUrl?.trim() ?? "";
    const assistantStatus = meeting.association.assistantStatus;
    const requiresAssistance = assistantStatus !== "NO_APLICA";
    const assistantName = assistantStatus === "ASIGNADO" ? meeting.association.assistantName : null;
    const assistantEmail = assistantStatus === "ASIGNADO" ? meeting.association.assistantEmail : null;

    return (
      <Paper
        key={meetingKey}
        variant="outlined"
        sx={{
          p: 2.5,
          borderRadius: 4,
          borderLeft: `6px solid ${accountColor.border}`,
          backgroundColor: meeting.hasAccountOverlap ? (isDarkMode ? alpha(theme.palette.error.main, 0.1) : "error.50") : "background.paper",
          transition: "all 0.2s ease-in-out",
          position: "relative",
          overflow: "hidden",
          "&:hover": {
            boxShadow: theme.shadows[4],
            borderColor: accountColor.border,
            transform: "translateY(-2px)"
          }
        }}
      >
        <Stack spacing={2.5}>
          {/* Top Section: Topic & Primary Actions */}
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
          >
            <Box sx={{ flex: 1 }}>
              {showTopic && (
                <Typography variant="h6" sx={{ fontWeight: 900, mb: 1, letterSpacing: "-0.01em", color: "text.primary" }}>
                  {meeting.topic}
                </Typography>
              )}
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                <Chip
                  size="small"
                  icon={meeting.association.linked ? <CheckIcon /> : undefined}
                  color={meeting.association.linked ? "success" : "warning"}
                  label={meeting.association.linked ? "Asociada" : "Pendiente de vínculo"}
                  sx={{ fontWeight: 800, px: 0.5 }}
                />
                <Chip 
                  size="small" 
                  variant="outlined" 
                  icon={<CalendarTodayIcon sx={{ fontSize: "0.8rem !important" }} />}
                  label={formatZoomDateTime(meeting.startTime)} 
                  sx={{ fontWeight: 700 }}
                />
                <Chip 
                  size="small" 
                  variant="outlined" 
                  icon={<AccessTimeIcon sx={{ fontSize: "0.8rem !important" }} />}
                  label={formatDurationHoursMinutes(meeting.durationMinutes)} 
                  sx={{ fontWeight: 700 }}
                />
                <Chip
                  size="small"
                  variant={meeting.meetingKind === "RECURRENTE" ? "filled" : "outlined"}
                  color={meeting.meetingKind === "RECURRENTE" ? "primary" : "default"}
                  label={meeting.meetingKind === "RECURRENTE" ? "Recurrente" : "Única"}
                  sx={{ fontWeight: 700 }}
                />
                {meeting.hasAccountOverlap && (
                  <Chip 
                    size="small" 
                    color="error" 
                    variant="filled"
                    label={`Conflicto (${meeting.accountOverlapCount})`} 
                    sx={{ fontWeight: 900, animation: "pulse 2s infinite" }}
                  />
                )}
              </Stack>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
              {joinUrl && (
                <Stack direction="row" spacing={0} sx={{ 
                  borderRadius: 3, 
                  overflow: "hidden",
                  border: "1px solid",
                  borderColor: alpha(theme.palette.success.main, 0.3),
                  bgcolor: alpha(theme.palette.success.main, 0.05),
                }}>
                  <Button
                    size="small"
                    component="a"
                    href={joinUrl}
                    target="_blank"
                    rel="noreferrer"
                    startIcon={<OpenInNewIcon />}
                    sx={{ 
                      fontWeight: 900, 
                      color: "success.dark",
                      px: 2,
                      "&:hover": { bgcolor: alpha(theme.palette.success.main, 0.1) }
                    }}
                  >
                    Unirse
                  </Button>
                  <Divider orientation="vertical" flexItem sx={{ borderColor: alpha(theme.palette.success.main, 0.2) }} />
                  <Tooltip title={copyFeedback[meetingKey] || "Copiar link de invitación"}>
                    <IconButton 
                      size="small" 
                      onClick={() => onCopy(joinUrl, meetingKey)}
                      sx={{ 
                        color: "success.main",
                        borderRadius: 0,
                        "&:hover": { bgcolor: alpha(theme.palette.success.main, 0.1) }
                      }}
                    >
                      {copyFeedback[meetingKey] ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </Stack>
              )}
              
              {!meeting.association.linked && canRegisterUpcomingMeeting && (
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => onOpenRegisterDialog(meeting)}
                  disabled={!meeting.meetingId}
                  sx={{ fontWeight: 800, borderRadius: 2.5 }}
                >
                  Vincular
                </Button>
              )}
              
              {enablePastMeetingDetails && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onToggleDetails(meeting)}
                  disabled={!meeting.meetingId}
                  sx={{ fontWeight: 700, borderRadius: 2.5 }}
                >
                  {detailsOpen ? "Ocultar detalles" : "Ver detalles"}
                </Button>
              )}
            </Stack>
          </Stack>

          <Divider />

          {/* Grid Section: Metadata Details */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Stack spacing={0.5}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 0.5 }}>
                  <AccountCircleIcon sx={{ fontSize: 14 }} /> Cuenta Anfitriona
                </Typography>
                <Chip
                  size="small"
                  label={meeting.accountEmail || "-"}
                  sx={{
                    bgcolor: alpha(accountColor.background, 0.6),
                    color: accountColor.text,
                    border: `1px solid ${accountColor.border}`,
                    fontWeight: 800,
                    width: "fit-content",
                    maxWidth: "100%"
                  }}
                />
                <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", ml: 0.5 }}>
                  {meeting.accountName || "-"}
                </Typography>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 2 }}>
              <Stack spacing={0.5}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 0.5 }}>
                  <TerminalIcon sx={{ fontSize: 14 }} /> ID Reunión
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: "monospace", letterSpacing: "0.05em" }}>
                  {meetingId}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                  {recurringCount} {recurringCount === 1 ? "instancia" : "instancias"}
                </Typography>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Stack spacing={0.5}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 0.5 }}>
                  <LinkIcon sx={{ fontSize: 14 }} /> Asistente Zoom
                </Typography>
                <MeetingAssistantStatusChip
                  requiresAssistance={requiresAssistance}
                  assistantName={assistantName}
                  assistantEmail={assistantEmail}
                  pendingLabel={meeting.association.linked ? "Pendiente" : "Falta vínculo"}
                />
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Stack spacing={0.5}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 0.5 }}>
                  <SchoolIcon sx={{ fontSize: 14 }} /> Programa / Vínculo
                </Typography>
                <Box><MeetingAssociation meeting={meeting} /></Box>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Box sx={{ 
                p: 1.5, 
                borderRadius: 2, 
                bgcolor: isDarkMode ? alpha(theme.palette.warning.main, 0.05) : alpha(theme.palette.warning.main, 0.02),
                border: "1px dashed",
                borderColor: alpha(theme.palette.warning.main, 0.2)
              }}>
                <ZoomAccountPasswordField
                  hostAccount={hostAccount}
                  label="Contraseña de la cuenta Zoom"
                />
              </Box>
            </Grid>
          </Grid>
        </Stack>

        {enablePastMeetingDetails && detailsOpen ? (
          <Paper
            variant="outlined"
            sx={{
              mt: 1.1,
              p: 1,
              borderRadius: 1.2,
              backgroundColor: "action.hover"
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Datos extra de Zoom
            </Typography>

            {detailsLoading ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Cargando detalle...
              </Typography>
            ) : detailsError ? (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <Typography variant="body2" color="error.main">
                  {detailsError}
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => onRetryDetails(meeting, meetingKey)}
                >
                  Reintentar
                </Button>
              </Stack>
            ) : !details ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                No hay datos adicionales disponibles para esta reunion.
              </Typography>
            ) : (
              <Box
                sx={{
                  mt: 0.7,
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, minmax(0, 1fr))",
                    lg: "repeat(3, minmax(0, 1fr))"
                  },
                  gap: 0.8
                }}
              >
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Asistencias registradas
                  </Typography>
                  <Typography variant="body2">
                    {formatNullableCount(details.participantsCount)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Asistentes unicos
                  </Typography>
                  <Typography variant="body2">
                    {formatNullableCount(details.uniqueParticipantsCount)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Instancias detectadas
                  </Typography>
                  <Typography variant="body2">
                    {formatNullableCount(details.pastInstancesCount)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Preguntas Q&A
                  </Typography>
                  <Typography variant="body2">
                    {formatNullableCount(details.qaQuestionsCount)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Duracion real
                  </Typography>
                  <Typography variant="body2">
                    {details.durationMinutes === null
                      ? "-"
                      : formatDurationHoursMinutes(details.durationMinutes)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Estado reportado
                  </Typography>
                  <Typography variant="body2">{details.status || "-"}</Typography>
                </Box>
              </Box>
            )}
          </Paper>
        ) : null}
      </Paper>
    );
  }