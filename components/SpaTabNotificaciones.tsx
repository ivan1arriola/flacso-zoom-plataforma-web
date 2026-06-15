"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Pagination,
  CircularProgress
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import MarkEmailReadOutlinedIcon from "@mui/icons-material/MarkEmailReadOutlined";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

import { usePushNotifications } from "@/src/hooks/usePushNotifications";
import { SolicitudDetailDialog } from "@/components/spa-tabs/SolicitudDetailDialog";
import { NotificationItem } from "@/components/notificaciones/NotificationItem";
import type {
  Notificacion,
  NotificacionesResponse,
  NotificationActivityFilter,
  NotificationOrder,
  NotificationReadFilter,
  NotificationScope,
  NotificationStatusFilter,
  NotificationTypeFilter,
  PaginationInfo,
  SpaTabNotificacionesProps
} from "@/components/notificaciones/types";
import {
  groupNotificationsByDate,
  NOTIFICATION_GROUP_ORDER
} from "@/components/notificaciones/utils";

export function SpaTabNotificaciones({ isAdmin }: SpaTabNotificacionesProps) {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 30,
    total: 0,
    pages: 1
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [scope, setScope] = useState<NotificationScope>("mine");
  const [lecturaFiltro, setLecturaFiltro] = useState<NotificationReadFilter>("TODAS");
  const [ordenFiltro, setOrdenFiltro] = useState<NotificationOrder>("desc");
  const [tipoFiltro, setTipoFiltro] = useState<NotificationTypeFilter>("");
  const [actividadFiltro, setActividadFiltro] = useState<NotificationActivityFilter>("TODAS");
  const [estadoFiltro, setEstadoFiltro] = useState<NotificationStatusFilter>("");
  const [error, setError] = useState("");
  const [isTestingPush, setIsTestingPush] = useState(false);
  const [pushTestMessage, setPushTestMessage] = useState("");
  const [pushTestError, setPushTestError] = useState("");
  const { 
    permission: pushPermission, 
    isSubscribed, 
    isLoading: isPushLoading, 
    lastError: pushSubscribeError,
    subscribe: subscribePush, 
    unsubscribe: unsubscribePush 
  } = usePushNotifications();

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedSolicitudId, setSelectedSolicitudId] = useState<string | null>(null);

  const openDetail = (id: string) => {
    setSelectedSolicitudId(id);
    setDetailOpen(true);
  };

  async function fetchNotificaciones(page: number = 1) {
    setIsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "30");
      params.set("lectura", lecturaFiltro);
      params.set("orden", ordenFiltro);
      if (tipoFiltro) params.set("tipo", tipoFiltro);
      if (actividadFiltro !== "TODAS") params.set("actividad", actividadFiltro);
      if (estadoFiltro) params.set("estado", estadoFiltro);
      if (isAdmin) params.set("scope", scope);

      const response = await fetch(`/api/v1/notificaciones?${params.toString()}`, {
        cache: "no-store"
      });
      const data = (await response.json()) as NotificacionesResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Error al cargar notificaciones");
      }

      setNotificaciones(data.notificaciones);
      setPagination(data.pagination);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "No se pudo cargar notificaciones.");
    } finally {
      setIsLoading(false);
    }
  }

  async function markAsRead(ids: string[], leida: boolean) {
    if (ids.length === 0) return;
    setIsMutating(true);
    setError("");
    try {
      const response = await fetch("/api/v1/notificaciones", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ids,
          leida,
          scope
        })
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "No se pudo actualizar la notificacion.");
      }
      await fetchNotificaciones(pagination.page);
    } catch (patchError) {
      setError(
        patchError instanceof Error ? patchError.message : "No se pudo actualizar la notificacion."
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function deleteNotificaciones(ids: string[]) {
    if (ids.length === 0) return;
    setIsMutating(true);
    setError("");
    try {
      const response = await fetch("/api/v1/notificaciones", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ids,
          scope
        })
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "No se pudo borrar la notificacion.");
      }
      const targetPage = notificaciones.length === 1 && pagination.page > 1 ? pagination.page - 1 : pagination.page;
      await fetchNotificaciones(targetPage);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "No se pudo borrar la notificacion."
      );
    } finally {
      setIsMutating(false);
    }
  }

  async function testBrowserNotification() {
    setPushTestError("");
    setPushTestMessage("");
    setIsTestingPush(true);

    try {
      if (pushPermission === "unsupported") {
        setPushTestError("Este navegador no soporta notificaciones push.");
        return;
      }

      if (!isSubscribed) {
        const subscribed = await subscribePush();
        if (!subscribed) {
          setPushTestError(
            pushSubscribeError || "No se pudo activar la suscripcion push en este navegador."
          );
          return;
        }
      }

      const sendTestPush = () =>
        fetch("/api/v1/notificaciones/push/test", {
          method: "POST"
        });

      let response = await sendTestPush();
      let data = (await response.json()) as { error?: string; message?: string };

      if (
        !response.ok &&
        response.status === 400 &&
        typeof data.error === "string" &&
        data.error.includes("suscripciones push activas")
      ) {
        await unsubscribePush();
        const resubscribed = await subscribePush();
        if (!resubscribed) {
          setPushTestError(
            pushSubscribeError || "No se pudo reparar la suscripcion push en este navegador."
          );
          return;
        }

        response = await sendTestPush();
        data = (await response.json()) as { error?: string; message?: string };
      }

      if (!response.ok) {
        setPushTestError(data.error ?? "No se pudo enviar la notificacion de prueba.");
        return;
      }

      setPushTestMessage(
        data.message ??
          "Notificacion de prueba enviada. Si no aparece de inmediato, revisa permisos del navegador."
      );
    } catch {
      setPushTestError("Ocurrio un error al probar la notificacion del navegador.");
    } finally {
      setIsTestingPush(false);
    }
  }

  useEffect(() => {
    void fetchNotificaciones(1);
  }, [scope, lecturaFiltro, ordenFiltro, tipoFiltro, actividadFiltro, estadoFiltro]);

  const currentPageUnreadIds = useMemo(
    () => notificaciones.filter((item) => !item.leidaAt).map((item) => item.id),
    [notificaciones]
  );

  const groupedNotificaciones = useMemo(() => groupNotificationsByDate(notificaciones), [notificaciones]);

  return (
    <Card variant="outlined" sx={{ borderRadius: 3.5, border: "none", backgroundColor: "transparent" }}>
      <CardContent sx={{ p: { xs: 0, sm: 1 } }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3, px: { xs: 1.5, sm: 2 } }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Notificaciones
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Historial de alertas y mensajes del sistema.
            </Typography>
          </Box>
          <IconButton
            size="medium"
            onClick={() => {
              void fetchNotificaciones(pagination.page);
            }}
            disabled={isLoading || isMutating}
            sx={{ 
              backgroundColor: "background.paper", 
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              "&:hover": { backgroundColor: "grey.100" }
            }}
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 3, px: { xs: 1.5, sm: 2 } }}>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 1.5, 
              borderRadius: 3, 
              flex: 1, 
              display: "flex", 
              alignItems: "center", 
              gap: 2,
              backgroundColor: "background.paper",
              border: "1px solid",
              borderColor: "divider"
            }}
          >
            <Box 
              sx={{ 
                width: 44, 
                height: 44, 
                borderRadius: "12px", 
                backgroundColor: "rgba(31, 75, 143, 0.08)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center" 
              }}
            >
              <NotificationsActiveOutlinedIcon sx={{ color: "primary.main" }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block" }}>
                Sin leer
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {unreadCount}
              </Typography>
            </Box>
          </Paper>

          <Paper 
            variant="outlined" 
            sx={{ 
              p: 1.5, 
              borderRadius: 3, 
              flex: 1, 
              display: "flex", 
              alignItems: "center", 
              gap: 2,
              backgroundColor: "background.paper",
              border: "1px solid",
              borderColor: "divider"
            }}
          >
            <Box 
              sx={{ 
                width: 44, 
                height: 44, 
                borderRadius: "12px", 
                backgroundColor: "rgba(0, 0, 0, 0.04)", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center" 
              }}
            >
              <AccessTimeIcon sx={{ color: "text.secondary" }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, display: "block" }}>
                Total filtrado
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {pagination.total}
              </Typography>
            </Box>
          </Paper>

          <Paper 
            variant="outlined" 
            sx={{ 
              p: 1.5, 
              borderRadius: 3, 
              flex: 1.2, 
              display: "flex", 
              flexDirection: "column",
              justifyContent: "center",
              backgroundColor: isSubscribed ? "success.main" : "primary.main",
              color: "white",
              border: "none",
              cursor: (pushPermission === "unsupported" || isPushLoading) ? "default" : "pointer",
              transition: "all 0.2s ease",
              "&:hover": {
                backgroundColor: isSubscribed ? "success.dark" : "primary.dark",
                opacity: (pushPermission === "unsupported" || isPushLoading) ? 1 : 0.9
              }
            }}
            onClick={() => {
              if (isPushLoading || pushPermission === "unsupported") return;
              if (isSubscribed) {
                void unsubscribePush();
              } else {
                void subscribePush();
              }
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600, opacity: 0.9 }}>
              Notificaciones Push
            </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {isPushLoading 
                  ? "Cargando..." 
                  : pushPermission === "unsupported"
                    ? "No soportado"
                  : isSubscribed 
                    ? "Activadas (PWA/Push)" 
                    : "Activar en este dispositivo"}
              </Typography>
              <Button
                size="small"
                variant="outlined"
                onClick={(event) => {
                  event.stopPropagation();
                  void testBrowserNotification();
                }}
                disabled={isPushLoading || isTestingPush || pushPermission === "unsupported"}
                sx={{
                  mt: 1,
                  alignSelf: "flex-start",
                  textTransform: "none",
                  fontWeight: 700,
                  borderColor: "rgba(255,255,255,0.7)",
                  color: "white",
                  "&:hover": {
                    borderColor: "white",
                    backgroundColor: "rgba(255,255,255,0.12)"
                  }
                }}
              >
                {isTestingPush ? "Probando..." : "Probar notificacion"}
              </Button>
              {pushTestMessage ? (
                <Typography variant="caption" sx={{ mt: 0.8, display: "block", opacity: 0.9 }}>
                  {pushTestMessage}
                </Typography>
              ) : null}
              {pushTestError ? (
                <Typography variant="caption" sx={{ mt: 0.8, display: "block", color: "#ffebee" }}>
                  {pushTestError}
                </Typography>
              ) : null}
              {!pushTestError && pushSubscribeError ? (
                <Typography variant="caption" sx={{ mt: 0.8, display: "block", color: "#ffebee" }}>
                  {pushSubscribeError}
                </Typography>
              ) : null}
            </Paper>
        </Stack>

        <Paper 
          variant="outlined" 
          sx={{ 
            mx: { xs: 1.5, sm: 2 }, 
            mb: 3, 
            p: 1, 
            borderRadius: 3, 
            backgroundColor: "rgba(0,0,0,0.02)",
            border: "1px solid rgba(0,0,0,0.05)"
          }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} useFlexGap>
            <Box sx={{ flex: 1, minWidth: 140 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5, ml: 1, fontWeight: 700 }}>
                LECTURA
              </Typography>
              <ToggleButtonGroup
                size="small"
                fullWidth
                value={lecturaFiltro}
                exclusive
                onChange={(_event, value: NotificationReadFilter | null) => {
                  if (!value) return;
                  setLecturaFiltro(value);
                }}
                sx={{ 
                  backgroundColor: "background.paper",
                  "& .MuiToggleButton-root": {
                    border: "none",
                    borderRadius: "8px !important",
                    mx: 0.2,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "none",
                    "&.Mui-selected": {
                      backgroundColor: "primary.main",
                      color: "primary.contrastText",
                      "&:hover": { backgroundColor: "primary.dark" }
                    }
                  }
                }}
              >
                <ToggleButton value="TODAS">Todas</ToggleButton>
                <ToggleButton value="NO_LEIDAS">Sin leer</ToggleButton>
                <ToggleButton value="LEIDAS">Leídas</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box sx={{ flex: 1, minWidth: 160 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5, ml: 1, fontWeight: 700 }}>
                TIPO
              </Typography>
              <ToggleButtonGroup
                size="small"
                fullWidth
                value={tipoFiltro}
                exclusive
                onChange={(_event, value: NotificationTypeFilter | null) => {
                  if (value === null) return;
                  setTipoFiltro(value);
                }}
                sx={{ 
                  backgroundColor: "background.paper",
                  "& .MuiToggleButton-root": {
                    border: "none",
                    borderRadius: "8px !important",
                    mx: 0.2,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "none",
                    "&.Mui-selected": {
                      backgroundColor: "primary.main",
                      color: "primary.contrastText",
                      "&:hover": { backgroundColor: "primary.dark" }
                    }
                  }
                }}
              >
                <ToggleButton value="">Todos</ToggleButton>
                <ToggleButton value="IN_APP">App</ToggleButton>
                <ToggleButton value="ALERTA_OPERATIVA">Alertas</ToggleButton>
                <ToggleButton value="EMAIL">Email</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box sx={{ flex: 1, minWidth: 190 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5, ml: 1, fontWeight: 700 }}>
                ACTIVIDAD
              </Typography>
              <ToggleButtonGroup
                size="small"
                fullWidth
                value={actividadFiltro}
                exclusive
                onChange={(_event, value: NotificationActivityFilter | null) => {
                  if (!value) return;
                  setActividadFiltro(value);
                }}
                sx={{
                  backgroundColor: "background.paper",
                  "& .MuiToggleButton-root": {
                    border: "none",
                    borderRadius: "8px !important",
                    mx: 0.2,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "none",
                    "&.Mui-selected": {
                      backgroundColor: "primary.main",
                      color: "primary.contrastText",
                      "&:hover": { backgroundColor: "primary.dark" }
                    }
                  }
                }}
              >
                <ToggleButton value="TODAS">Todas</ToggleButton>
                <ToggleButton value="LOGIN">Inicio sesión</ToggleButton>
                <ToggleButton value="ZOOM_RECORDING">Grabaciones Zoom</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {isAdmin && (
              <Box sx={{ flex: 1, minWidth: 140 }}>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5, ml: 1, fontWeight: 700 }}>
                  ALCANCE
                </Typography>
                <ToggleButtonGroup
                  size="small"
                  fullWidth
                  value={scope}
                  exclusive
                  onChange={(_event, value: NotificationScope | null) => {
                    if (!value) return;
                    setScope(value);
                  }}
                  sx={{ 
                    backgroundColor: "background.paper",
                    "& .MuiToggleButton-root": {
                      border: "none",
                      borderRadius: "8px !important",
                      mx: 0.2,
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      textTransform: "none",
                      "&.Mui-selected": {
                        backgroundColor: "primary.main",
                        color: "primary.contrastText",
                        "&:hover": { backgroundColor: "primary.dark" }
                      }
                    }
                  }}
                >
                  <ToggleButton value="mine">Mías</ToggleButton>
                  <ToggleButton value="all">Todas</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            )}

            <Box sx={{ display: "flex", alignItems: "flex-end", pb: 0.2 }}>
              <Button
                size="small"
                variant="text"
                startIcon={<MarkEmailReadOutlinedIcon fontSize="small" />}
                onClick={() => {
                  void markAsRead(currentPageUnreadIds, true);
                }}
                disabled={isLoading || isMutating || currentPageUnreadIds.length === 0}
                sx={{ 
                  textTransform: "none", 
                  fontWeight: 700, 
                  height: 36, 
                  borderRadius: 2,
                  px: 2
                }}
              >
                Leer todas
              </Button>
            </Box>
          </Stack>
        </Paper>

        {error ? (
          <Alert severity="error" sx={{ mx: 2, mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        ) : null}

        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress thickness={5} size={40} sx={{ color: "primary.main", opacity: 0.5 }} />
          </Box>
        ) : notificaciones.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 10, px: 2 }}>
            <Box 
              sx={{ 
                width: 80, 
                height: 80, 
                borderRadius: "50%", 
                backgroundColor: "grey.50", 
                display: "inline-flex", 
                alignItems: "center", 
                justifyContent: "center",
                mb: 2
              }}
            >
              <NotificationsActiveOutlinedIcon sx={{ fontSize: 40, color: "grey.300" }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "text.secondary" }}>
              Bandeja vacía
            </Typography>
            <Typography variant="body2" color="text.secondary">
              No se encontraron notificaciones con los filtros actuales.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ px: { xs: 0, sm: 2 }, pb: 4 }}>
            {NOTIFICATION_GROUP_ORDER.map((group) => {
              const groupNotifs = groupedNotificaciones[group];
              if (!groupNotifs || groupNotifs.length === 0) return null;

              return (
                <Box key={group} sx={{ mb: 4 }}>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      display: "block", 
                      mb: 1.5, 
                      ml: 1, 
                      fontWeight: 800, 
                      color: "text.secondary", 
                      letterSpacing: "0.05em",
                      textTransform: "uppercase"
                    }}
                  >
                    {group}
                  </Typography>
                  <Stack spacing={1}>
                    {groupNotifs.map((notif) => (
                      <NotificationItem
                        key={notif.id}
                        notif={notif}
                        scope={scope}
                        isMutating={isMutating}
                        onMarkAsRead={markAsRead}
                        onDelete={deleteNotificaciones}
                        onOpenDetail={openDetail}
                      />
                    ))}
                  </Stack>
                </Box>
              );
            })}

            {pagination.pages > 1 && (
              <Stack direction="row" justifyContent="center" sx={{ mt: 6 }}>
                <Pagination
                  count={pagination.pages}
                  page={pagination.page}
                  onChange={(_event, page) => {
                    void fetchNotificaciones(page);
                  }}
                  disabled={isLoading || isMutating}
                  size="large"
                  sx={{
                    "& .MuiPaginationItem-root": {
                      fontWeight: 700,
                      borderRadius: 2
                    }
                  }}
                />
              </Stack>
            )}
          </Box>
        )}
      </CardContent>

      <SolicitudDetailDialog
        solicitudId={selectedSolicitudId}
        open={detailOpen}
        onClose={() => {
          setDetailOpen(false);
          setSelectedSolicitudId(null);
        }}
      />
    </Card>
  );
}
