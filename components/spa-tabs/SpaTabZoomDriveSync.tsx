"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import {
  loadZoomDriveSyncBootstrap,
  loadStoredDriveRecordings,
  loadZoomGroups,
  runZoomDriveSyncWithProgress,
  type StoredDriveRecording,
  type ZoomDriveSyncApiErrorDetails,
  type ZoomDriveSyncBootstrapResponse,
  type ZoomDriveSyncConfigInput,
  type ZoomDriveSyncProgressEvent,
  type ZoomDriveSyncRunResponse,
  type ZoomDriveSyncValidationCheck,
  validateZoomDriveSyncConfig,
  type ZoomDriveSyncValidationResponse,
  type ZoomGroup
} from "@/src/services/zoomDriveSyncApi";

type ZoomDriveSyncForm = {
  zoomGroupId: string;
};


const defaultForm: ZoomDriveSyncForm = {
  zoomGroupId: ""
};

function formFromBootstrap(payload: ZoomDriveSyncBootstrapResponse): Partial<ZoomDriveSyncForm> {
  return {
    zoomGroupId: payload.defaults.zoomGroupId || ""
  };
}

function toPayloadConfig(form: ZoomDriveSyncForm): ZoomDriveSyncConfigInput {
  return {
    zoomGroupId: form.zoomGroupId.trim()
  };
}

function formatEventLine(event: NonNullable<ZoomDriveSyncRunResponse["eventsTail"]>[number]): string {
  const labelMap: Record<string, string> = {
    sync_started: "Sincronizacion iniciada",
    meeting_started: "Reunion detectada",
    meeting_prepared: "Reunion preparada",
    file_transfer_started: "Transferencia iniciada",
    file_transfer_progress: "Subiendo archivo",
    file_uploaded: "Archivo subido",
    file_error: "Error de transferencia",
    meeting_deleted_in_zoom: "Reunion eliminada en Zoom",
    sync_completed: "Sincronizacion completada",
    sync_failed: "Sincronizacion fallida"
  };
  const label = labelMap[event.event] || event.event || "evento";
  const topic = event.topic ? ` | ${event.topic}` : "";
  const file = event.fileName ? ` | ${event.fileName}` : "";
  const progress =
    event.event === "file_transfer_progress" && typeof event.progressPercent === "number"
      ? ` | ${event.progressPercent}%`
      : "";
  const error = event.error ? ` | ERROR: ${event.error}` : "";
  return `${label}${topic}${file}${progress}${error}`;
}

function formatZoomGroupLabel(group: ZoomGroup): string {
  return `${group.name} - ${group.totalMembers} integrante${group.totalMembers === 1 ? "" : "s"} en Zoom`;
}

function formatDateTime(value: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-UY", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatBytes(value: number | null): string {
  if (value === null || value < 0) return "-";
  if (value < 1024) return `${value} B`;
  const kb = value / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(2)} GB`;
}

function recordingTypeLabel(item: StoredDriveRecording): string {
  return item.mimeType === "application/vnd.google-apps.folder" ? "Carpeta" : "Archivo";
}

export function SpaTabZoomDriveSync() {
  const [form, setForm] = useState<ZoomDriveSyncForm>(defaultForm);
  const [boot, setBoot] = useState<ZoomDriveSyncBootstrapResponse | null>(null);
  const [zoomGroups, setZoomGroups] = useState<ZoomGroup[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [validation, setValidation] = useState<ZoomDriveSyncValidationResponse | null>(null);
  const [validationErrorDetails, setValidationErrorDetails] = useState<ZoomDriveSyncApiErrorDetails | null>(null);
  const [syncResult, setSyncResult] = useState<ZoomDriveSyncRunResponse | null>(null);
  const [progressEvents, setProgressEvents] = useState<ZoomDriveSyncProgressEvent[]>([]);
  const [storedRecordings, setStoredRecordings] = useState<StoredDriveRecording[]>([]);
  const [isLoadingRecordings, setIsLoadingRecordings] = useState(false);
  const [recordingsNextPageToken, setRecordingsNextPageToken] = useState<string | undefined>(undefined);
  const [recordingsFolderId, setRecordingsFolderId] = useState("");
  const driveDestinationPreview = boot?.driveDestinationPreview;
  const lockedDriveDestinationId =
    driveDestinationPreview?.id?.trim() || boot?.defaults.driveDestinationId?.trim() || "";
  const lockedDriveDestinationName = driveDestinationPreview?.name?.trim() || "";

  useEffect(() => {
    void initialize();
  }, []);

  async function initialize() {
    setStatusError("");
    setIsLoadingGroups(true);
    try {
      const [bootstrapRes, groupsRes] = await Promise.all([
        loadZoomDriveSyncBootstrap(),
        loadZoomGroups()
      ]);

      const bootstrapData = bootstrapRes.data;
      if (bootstrapRes.success && bootstrapData) {
        setBoot(bootstrapData);
        setForm((current) => ({
          ...current,
          ...formFromBootstrap(bootstrapData)
        }));
      } else if (!bootstrapRes.success) {
        setStatusError(bootstrapRes.error ?? "No se pudo cargar la configuracion inicial.");
      }

      const groupsData = groupsRes.data;
      if (groupsRes.success && groupsData) {
        setZoomGroups(groupsData.groups);
        const selectedGroupId = groupsData.selectedGroupId;
        if (selectedGroupId) {
          setForm((current) =>
            current.zoomGroupId
              ? current
              : { ...current, zoomGroupId: selectedGroupId }
          );
        }
      } else if (!groupsRes.success) {
        setStatusError((prev) =>
          prev
            ? `${prev} ${groupsRes.error ?? ""}`.trim()
            : (groupsRes.error ?? "No se pudieron cargar los grupos Zoom.")
        );
      }
    } finally {
      setIsLoadingGroups(false);
    }
  }

  async function refreshZoomGroups() {
    setIsLoadingGroups(true);
    const response = await loadZoomGroups();
    if (!response.success || !response.data) {
      setStatusError(response.error ?? "No se pudieron cargar los grupos Zoom.");
      setIsLoadingGroups(false);
      return;
    }
    setZoomGroups(response.data.groups);
    setStatusMessage("Grupos Zoom actualizados.");
    setStatusError("");
    setIsLoadingGroups(false);
  }

  const configPayload = useMemo(() => toPayloadConfig(form), [form]);
  const latestProgress = progressEvents.length > 0 ? progressEvents[progressEvents.length - 1] : null;
  const validationChecks: ZoomDriveSyncValidationCheck[] =
    validation?.checks || validationErrorDetails?.checks || [];
  const validationSettingsPreview =
    validation?.settingsPreview || validationErrorDetails?.settingsPreview;

  async function loadSavedRecordings(append = false) {
    setStatusError("");
    setIsLoadingRecordings(true);
    try {
      const response = await loadStoredDriveRecordings({
        pageToken: append ? recordingsNextPageToken : undefined,
        pageSize: 50
      });
      if (!response.success || !response.data) {
        setStatusError(response.error ?? "No se pudieron cargar las grabaciones guardadas.");
        return;
      }
      const data = response.data;
      setRecordingsFolderId(data.driveDestinationId);
      setRecordingsNextPageToken(data.nextPageToken);
      setStoredRecordings((current) =>
        append ? [...current, ...data.items] : data.items
      );
      setStatusMessage(
        append
          ? "Se cargaron mas grabaciones desde Drive."
          : `Grabaciones cargadas desde Drive (${data.items.length}).`
      );
    } finally {
      setIsLoadingRecordings(false);
    }
  }

  async function validateConfig() {
    setStatusError("");
    setStatusMessage("");
    setValidation(null);
    setValidationErrorDetails(null);
    setIsValidating(true);

    try {
      const response = await validateZoomDriveSyncConfig(configPayload);
      if (!response.success) {
        setValidationErrorDetails(response.errorDetails ?? null);
        setStatusError(response.error ?? "No se pudo validar la configuracion.");
        return;
      }
      setValidation(response.data ?? null);
      setValidationErrorDetails(null);
      setStatusMessage(response.data?.message ?? "Configuracion valida.");
    } finally {
      setIsValidating(false);
    }
  }

  async function executeSync() {
    setStatusError("");
    setStatusMessage("");
    setSyncResult(null);
    setProgressEvents([]);
    setIsSyncing(true);

    try {
      const response = await runZoomDriveSyncWithProgress(configPayload, {
        onStarted: (message) => {
          setStatusMessage(message);
        },
        onProgress: (event) => {
          setProgressEvents((current) => {
            const next = [...current, event];
            if (next.length <= 200) return next;
            return next.slice(next.length - 200);
          });
        }
      });
      if (!response.success) {
        setStatusError(response.error ?? "No se pudo ejecutar la sincronizacion.");
        return;
      }
      setSyncResult(response.data ?? null);
      setStatusMessage(response.data?.message ?? "Sincronizacion finalizada.");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={1}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Descargar grabaciones a Google Drive
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Google Service Account, backend sync, API key y carpeta destino se resuelven en backend.
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Desde esta vista solo se selecciona el grupo Zoom para acotar alcance.
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Conexion API
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 1.2
              }}
            >
              <TextField
                label="Backend sync (automatico)"
                value={boot?.defaults.apiBaseUrl || "-"}
                disabled
                helperText="Se resuelve automaticamente en servidor segun el entorno de ejecucion."
              />
              <TextField
                label="API key backend"
                value={boot?.zoomConfig.hasSyncApiKey ? "Configurada en servidor" : "Falta configurar en servidor"}
                disabled
                helperText="No se edita desde esta pantalla."
              />
            </Box>

            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Zoom
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip label={`Credenciales Zoom: ${boot?.zoomConfig.hasZoomClientId && boot?.zoomConfig.hasZoomClientSecret && boot?.zoomConfig.hasZoomAccountId ? "listas" : "incompletas"}`} />
              <Chip label={`ZOOM_API_BASE: ${boot?.zoomConfig.zoomApiBase || "-"}`} />
              <Chip label={`Grupos cargados: ${zoomGroups.length}`} />
              <Chip label={`Google SA en Vercel: ${boot?.zoomConfig.hasGoogleServiceAccountEmail && boot?.zoomConfig.hasGooglePrivateKey ? "lista" : "incompleta"}`} />
              <Chip label={`API key backend: ${boot?.zoomConfig.hasSyncApiKey ? "lista" : "incompleta"}`} />
              <Chip label={`Carpeta destino: ${lockedDriveDestinationName || lockedDriveDestinationId || "-"}`} />
            </Stack>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 1.2
              }}
            >
              <TextField
                select
                label="Grupo Zoom"
                value={form.zoomGroupId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, zoomGroupId: String(event.target.value) }))
                }
                disabled={isLoadingGroups}
                helperText="Se usa para acotar la sincronizacion al grupo seleccionado. El numero mostrado es la cantidad de integrantes reportada por Zoom."
              >
                <MenuItem value="">Sin grupo (usa alcance de cuenta)</MenuItem>
                {zoomGroups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {formatZoomGroupLabel(group)}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                variant="outlined"
                onClick={() => {
                  void refreshZoomGroups();
                }}
                disabled={isLoadingGroups}
              >
                {isLoadingGroups ? "Cargando grupos..." : "Actualizar grupos Zoom"}
              </Button>
            </Stack>

            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Configuracion
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 1.2
              }}
            >
              <TextField
                label="DRIVE_DESTINATION_ID"
                value={lockedDriveDestinationId}
                disabled
                helperText="Destino bloqueado por configuracion del servidor. Para cambiarlo se actualiza DRIVE_DESTINATION_ID en variables del entorno."
              />
              <TextField
                label="DRIVE_DESTINATION_NAME"
                value={lockedDriveDestinationName || "(sin nombre disponible)"}
                disabled
                helperText={
                  driveDestinationPreview?.accessible
                    ? "Nombre validado leyendo metadatos reales desde Google Drive."
                    : `No se pudo validar en Drive: ${driveDestinationPreview?.error || "sin acceso"}`
                }
              />
            </Box>
            {driveDestinationPreview?.webViewLink ? (
              <Typography variant="caption" color="text.secondary">
                Carpeta destino:{" "}
                <a href={driveDestinationPreview.webViewLink} target="_blank" rel="noreferrer">
                  abrir en Google Drive
                </a>
              </Typography>
            ) : null}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                variant="outlined"
                onClick={() => {
                  void validateConfig();
                }}
                disabled={isValidating || isSyncing}
              >
                {isValidating ? "Validando..." : "Validar configuracion"}
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  void executeSync();
                }}
                disabled={isSyncing || isValidating}
              >
                {isSyncing ? "Sincronizando..." : "Ejecutar sincronizacion"}
              </Button>
              <Button
                variant="text"
                onClick={() => {
                  setForm({
                    ...defaultForm,
                    ...(boot ? formFromBootstrap(boot) : {})
                  });
                  setStatusError("");
                  setStatusMessage("");
                  setValidation(null);
                  setValidationErrorDetails(null);
                  setSyncResult(null);
                  setProgressEvents([]);
                  setStoredRecordings([]);
                  setRecordingsNextPageToken(undefined);
                  setRecordingsFolderId("");
                }}
                disabled={isValidating || isSyncing}
              >
                Limpiar
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  void loadSavedRecordings(false);
                }}
                disabled={isLoadingRecordings || isValidating || isSyncing}
              >
                {isLoadingRecordings ? "Cargando grabaciones..." : "Ver grabaciones guardadas"}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {statusError ? (
        <Alert severity="error" sx={{ whiteSpace: "pre-line" }}>
          {statusError}
        </Alert>
      ) : null}
      {statusMessage ? <Alert severity="success">{statusMessage}</Alert> : null}

      {isSyncing || progressEvents.length > 0 ? (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Progreso en vivo
            </Typography>
            {latestProgress ? (
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.2 }}>
                <Chip variant="outlined" label={`${latestProgress.meetingsSeen} reuniones vistas`} />
                <Chip color="success" label={`${latestProgress.filesUploaded} subidos`} />
                <Chip variant="outlined" label={`${latestProgress.filesDownloaded} descargados`} />
                <Chip variant="outlined" label={`${latestProgress.filesSkipped} omitidos`} />
                <Chip variant="outlined" label={`${latestProgress.zoomDeleted} eliminados en Zoom`} />
                {typeof latestProgress.progressPercent === "number" && latestProgress.progressPercent > 0 ? (
                  <Chip color="info" variant="outlined" label={`Archivo actual: ${latestProgress.progressPercent}%`} />
                ) : null}
              </Stack>
            ) : null}
            <Box
              sx={{
                p: 1.2,
                borderRadius: 2,
                border: (theme) => `1px solid ${theme.palette.divider}`,
                bgcolor: "background.paper",
                maxHeight: 260,
                overflow: "auto"
              }}
            >
              {progressEvents.length > 0 ? (
                <Stack spacing={0.4}>
                  {progressEvents.map((event, index) => (
                    <Typography key={`${event.timestamp}-${index}`} variant="caption" color="text.secondary">
                      {formatEventLine(event)}
                    </Typography>
                  ))}
                </Stack>
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Esperando eventos de avance...
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>
      ) : null}

      {validation || validationErrorDetails ? (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Validacion
            </Typography>
            <Stack spacing={1.2}>
              {validationChecks.map((check) => (
                <Alert key={check.id} severity={check.ok ? "success" : "error"}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {check.label}
                  </Typography>
                  <Typography variant="body2">{check.message}</Typography>
                  {check.hint ? (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.3 }}>
                      Sugerencia: {check.hint}
                    </Typography>
                  ) : null}
                  {check.details ? (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.3 }}>
                      Detalle tecnico: {check.details}
                    </Typography>
                  ) : null}
                </Alert>
              ))}

              {validationErrorDetails?.hints && validationErrorDetails.hints.length > 0 ? (
                <Alert severity="info">
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Recomendaciones
                  </Typography>
                  {validationErrorDetails.hints.map((hint, index) => (
                    <Typography key={`${hint}-${index}`} variant="body2">
                      {index + 1}. {hint}
                    </Typography>
                  ))}
                </Alert>
              ) : null}

              {validationErrorDetails?.details ? (
                <Alert severity="warning">
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Detalle tecnico extendido
                  </Typography>
                  <Typography variant="body2">{validationErrorDetails.details}</Typography>
                </Alert>
              ) : null}

              {validationSettingsPreview ? (
                <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                  <Chip label={`Scope: ${validationSettingsPreview.scope || "-"}`} />
                  <Chip label={`Timezone: ${validationSettingsPreview.timezone || "-"}`} />
                  <Chip label={`Drive: ${validationSettingsPreview.driveDestinationId || "-"}`} />
                  {typeof validationSettingsPreview.parallelWorkers === "number" ? (
                    <Chip label={`Workers backend: ${validationSettingsPreview.parallelWorkers}`} />
                  ) : null}
                  {typeof validationSettingsPreview.mediaWorkers === "number" ? (
                    <Chip label={`Media workers backend: ${validationSettingsPreview.mediaWorkers}`} />
                  ) : null}
                  {typeof validationSettingsPreview.deleteFromZoom === "boolean" ? (
                    <Chip label={`Eliminar en Zoom (backend): ${validationSettingsPreview.deleteFromZoom ? "si" : "no"}`} />
                  ) : null}
                </Stack>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      ) : null}

      {syncResult?.result ? (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              Resultado de sincronizacion
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 1.2 }}>
              <Chip color="primary" label={`${syncResult.result.meetingsSeen} reuniones`} />
              <Chip color="success" label={`${syncResult.result.filesUploaded} subidos`} />
              <Chip variant="outlined" label={`${syncResult.result.filesDownloaded} descargados`} />
              <Chip variant="outlined" label={`${syncResult.result.filesSkipped} omitidos`} />
              <Chip variant="outlined" label={`${syncResult.result.zoomDeleted} eliminados en Zoom`} />
              <Chip variant="outlined" label={`${syncResult.elapsedSeconds ?? 0}s`} />
            </Stack>
            {syncResult.eventsTail && syncResult.eventsTail.length > 0 ? (
              <Box
                sx={{
                  p: 1.2,
                  borderRadius: 2,
                  border: (theme) => `1px solid ${theme.palette.divider}`,
                  bgcolor: "background.paper"
                }}
              >
                <Typography variant="subtitle2" sx={{ mb: 0.8 }}>
                  Ultimos eventos
                </Typography>
                <Stack spacing={0.4}>
                  {syncResult.eventsTail.map((event, index) => (
                    <Typography key={`${event.timestamp}-${index}`} variant="caption" color="text.secondary">
                      {formatEventLine(event)}
                    </Typography>
                  ))}
                </Stack>
              </Box>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {storedRecordings.length > 0 || recordingsFolderId ? (
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mb: 1.2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Grabaciones guardadas en Drive
              </Typography>
              <Chip
                variant="outlined"
                label={`Destino: ${lockedDriveDestinationName || recordingsFolderId || lockedDriveDestinationId || "-"}`}
              />
              <Chip variant="outlined" label={`Items: ${storedRecordings.length}`} />
            </Stack>
            <Box
              sx={{
                p: 1.2,
                borderRadius: 2,
                border: (theme) => `1px solid ${theme.palette.divider}`,
                bgcolor: "background.paper",
                maxHeight: 340,
                overflow: "auto"
              }}
            >
              <Stack spacing={0.8}>
                {storedRecordings.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                      borderRadius: 1.5,
                      p: 1
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {recordingTypeLabel(item)} | Modificado: {formatDateTime(item.modifiedTime)} | Tamano: {formatBytes(item.size)}
                    </Typography>
                    {item.webViewLink ? (
                      <Box sx={{ mt: 0.6 }}>
                        <a href={item.webViewLink} target="_blank" rel="noreferrer">
                          Abrir en Drive
                        </a>
                      </Box>
                    ) : null}
                  </Box>
                ))}
              </Stack>
            </Box>
            {recordingsNextPageToken ? (
              <Stack direction="row" sx={{ mt: 1.2 }}>
                <Button
                  variant="text"
                  onClick={() => {
                    void loadSavedRecordings(true);
                  }}
                  disabled={isLoadingRecordings}
                >
                  Cargar mas
                </Button>
              </Stack>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}
