import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Typography,
  Tooltip
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import MarkEmailReadOutlinedIcon from "@mui/icons-material/MarkEmailReadOutlined";
import MarkEmailUnreadOutlinedIcon from "@mui/icons-material/MarkEmailUnreadOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import LaunchIcon from "@mui/icons-material/Launch";
import type { Notificacion, NotificationScope } from "./types";
import {
  formatTime,
  getFieldValue,
  getFieldValueAny,
  getTipoIcon,
  getTipoLabel,
  getUserDisplay,
  isAssistantInterestNotification,
  isLoginNotification,
  isZoomRecordingWebhookNotification,
  splitNotificationBody,
  truncateText
} from "./utils";

type NotificationItemProps = {
  notif: Notificacion;
  scope: NotificationScope;
  isMutating: boolean;
  onMarkAsRead: (ids: string[], leida: boolean) => Promise<void>;
  onDelete: (ids: string[]) => Promise<void>;
  onOpenDetail: (id: string) => void;
};

export function NotificationItem({
  notif,
  scope,
  isMutating,
  onMarkAsRead,
  onDelete,
  onOpenDetail
}: NotificationItemProps) {
  const loginNotification = isLoginNotification(notif);
  const assistantInterestNotification = isAssistantInterestNotification(notif);
  const zoomRecordingNotification = isZoomRecordingWebhookNotification(notif);
  const parsedBody = splitNotificationBody(notif.cuerpo);
  const usuarioValue = getFieldValue(parsedBody.fields, "Usuario");
  const dispositivoValue = getFieldValue(parsedBody.fields, "Dispositivo");
  const proveedorValue = getFieldValue(parsedBody.fields, "Proveedor");
  const ipValue = getFieldValue(parsedBody.fields, "IP");
  const userAgentValue = getFieldValue(parsedBody.fields, "User-Agent");
  const assistantName =
    getFieldValueAny(parsedBody.fields, ["Asistente", "Asistente nombre", "Actor"]) ??
    parsedBody.intro;
  const interestValue = getFieldValueAny(parsedBody.fields, [
    "Interes marcado",
    "Estado interes",
    "EstadoInteres",
    "Interes"
  ]);
  const meetingTitle = getFieldValueAny(parsedBody.fields, [
    "Reunion",
    "Titulo reunion",
    "Titulo",
    "Entidad"
  ]);
  const meetingDate = getFieldValueAny(parsedBody.fields, [
    "Dia y hora",
    "Fecha reunion",
    "Fecha y hora",
    "Fecha"
  ]);

  return (
    <Paper
      key={notif.id}
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 3,
        position: "relative",
        backgroundColor: "background.paper",
        borderColor: notif.leidaAt ? "divider" : "rgba(31, 75, 143, 0.2)",
        borderWidth: notif.leidaAt ? "1px" : "1.5px",
        boxShadow: notif.leidaAt ? "none" : "0 4px 12px rgba(31, 75, 143, 0.05)",
        transition: "all 0.2s ease",
        "&:hover": {
          borderColor: "primary.main",
          transform: "translateY(-2px)",
          boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
          "& .action-buttons": { opacity: 1 }
        }
      }}
    >
      {!notif.leidaAt && (
        <Box
          sx={{
            position: "absolute",
            top: 22,
            left: 10,
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: "#3b82f6",
            boxShadow: "0 0 0 4px rgba(59, 130, 246, 0.1)"
          }}
        />
      )}

      <Stack direction="row" spacing={2} alignItems="flex-start">
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "10px",
            backgroundColor: notif.leidaAt ? "grey.50" : "rgba(31, 75, 143, 0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            mt: 0.5
          }}
        >
          {getTipoIcon(notif.tipoNotificacion)}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
            <Typography
              variant="body1"
              sx={{
                fontWeight: notif.leidaAt ? 600 : 800,
                color: notif.leidaAt ? "text.primary" : "primary.main",
                lineHeight: 1.3
              }}
            >
              {notif.asunto}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, whiteSpace: "nowrap", ml: 2 }}>
              {formatTime(notif.createdAt)}
            </Typography>
          </Stack>

          {loginNotification ? (
            <Box sx={{ mb: 1 }}>
              {parsedBody.intro ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1, fontSize: "0.875rem", opacity: notif.leidaAt ? 0.75 : 0.9 }}
                >
                  {parsedBody.intro}
                </Typography>
              ) : null}
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ mb: userAgentValue ? 0.5 : 0 }}>
                {usuarioValue ? <Chip size="small" label={`Usuario: ${usuarioValue}`} variant="outlined" /> : null}
                {dispositivoValue ? <Chip size="small" label={`Dispositivo: ${dispositivoValue}`} variant="outlined" /> : null}
                {proveedorValue ? <Chip size="small" label={`Proveedor: ${proveedorValue}`} variant="outlined" /> : null}
                {ipValue ? <Chip size="small" label={`IP: ${ipValue}`} variant="outlined" /> : null}
              </Stack>
              {userAgentValue ? (
                <Tooltip title={userAgentValue}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", fontFamily: "monospace", opacity: 0.75 }}
                  >
                    User-Agent: {truncateText(userAgentValue, 110)}
                  </Typography>
                </Tooltip>
              ) : null}
            </Box>
          ) : assistantInterestNotification ? (
            <Box sx={{ mb: 1 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 0.6, fontSize: "0.9rem", fontWeight: 700 }}
              >
                {assistantName || "Asistente"}{interestValue ? ` marco "${interestValue}".` : " actualizo su interes."}
              </Typography>
              <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
                {meetingTitle ? <Chip size="small" label={`Reunion: ${meetingTitle}`} variant="outlined" /> : null}
                {meetingDate ? <Chip size="small" label={`Dia: ${meetingDate}`} variant="outlined" /> : null}
              </Stack>
            </Box>
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                whiteSpace: "pre-wrap",
                mb: 1,
                fontSize: "0.875rem",
                lineHeight: 1.5,
                opacity: notif.leidaAt ? 0.7 : 0.9
              }}
            >
              {notif.cuerpo}
            </Typography>
          )}

          <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
            {scope === "all" && (
              <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary" }}>
                Para: {getUserDisplay(notif.usuario)}
              </Typography>
            )}
            <Chip
              size="small"
              label={getTipoLabel(notif.tipoNotificacion)}
              variant="outlined"
              sx={{
                height: 20,
                fontSize: "0.65rem",
                fontWeight: 800,
                textTransform: "uppercase",
                borderColor: "divider",
                color: "text.secondary"
              }}
            />
            {loginNotification ? (
              <Chip
                size="small"
                label="Inicio sesión"
                color="info"
                variant="outlined"
                sx={{
                  height: 20,
                  fontSize: "0.65rem",
                  fontWeight: 800
                }}
              />
            ) : null}
            {assistantInterestNotification ? (
              <Chip
                size="small"
                label="Interes asistente"
                color="warning"
                variant="outlined"
                sx={{
                  height: 20,
                  fontSize: "0.65rem",
                  fontWeight: 800
                }}
              />
            ) : null}
            {zoomRecordingNotification ? (
              <Chip
                size="small"
                label="Grabaciones Zoom"
                color="secondary"
                variant="outlined"
                sx={{
                  height: 20,
                  fontSize: "0.65rem",
                  fontWeight: 800
                }}
              />
            ) : null}
            {notif.entidadReferenciaTipo === "SolicitudSala" && notif.entidadReferenciaId && (
              <Button
                size="small"
                variant="text"
                startIcon={<LaunchIcon fontSize="inherit" />}
                onClick={() => onOpenDetail(notif.entidadReferenciaId!)}
                sx={{
                  height: 20,
                  fontSize: "0.65rem",
                  fontWeight: 800,
                  textTransform: "none",
                  color: "primary.main",
                  p: 0,
                  minWidth: 0,
                  "&:hover": { backgroundColor: "transparent", textDecoration: "underline" }
                }}
              >
                Ver pedido
              </Button>
            )}
          </Stack>
        </Box>

        <Stack
          className="action-buttons"
          direction="row"
          spacing={0.5}
          sx={{
            opacity: { xs: 1, md: 0 },
            transition: "opacity 0.2s ease",
            alignItems: "center"
          }}
        >
          <Tooltip title={notif.leidaAt ? "Marcar como sin leer" : "Marcar como leída"}>
            <IconButton
              size="small"
              onClick={() => {
                void onMarkAsRead([notif.id], !notif.leidaAt);
              }}
              disabled={isMutating}
              sx={{ color: "text.secondary", "&:hover": { color: "primary.main" } }}
            >
              {notif.leidaAt ? (
                <MarkEmailUnreadOutlinedIcon fontSize="small" />
              ) : (
                <MarkEmailReadOutlinedIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>

          <Tooltip title="Borrar">
            <IconButton
              size="small"
              onClick={() => {
                void onDelete([notif.id]);
              }}
              disabled={isMutating}
              sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <ChevronRightIcon sx={{ color: "grey.300", ml: 0.5, display: { xs: "none", sm: "block" } }} />
        </Stack>
      </Stack>
    </Paper>
  );
}
