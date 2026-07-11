"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Skeleton,
  Stack,
  Typography,
  useTheme,
  alpha,
  Paper
} from "@mui/material";
import EventIcon from "@mui/icons-material/Event";
import ScheduleIcon from "@mui/icons-material/Schedule";
import AccessTimeFilledIcon from "@mui/icons-material/AccessTimeFilled";
import PaidIcon from "@mui/icons-material/Paid";
import HistoryIcon from "@mui/icons-material/History";
import LayersIcon from "@mui/icons-material/Layers";
import CommentIcon from "@mui/icons-material/Comment";
import EditNoteIcon from "@mui/icons-material/EditNote";
import HistoryEduIcon from "@mui/icons-material/HistoryEdu";

import { loadPersonHours, type PersonHoursMeeting } from "@/src/services/tarifasApi";
import { reportMeetingDuration } from "@/src/services/agendaApi";
import { updatePastMeeting } from "@/src/services/solicitudesApi";
import { Dialog, DialogTitle, DialogContent, DialogActions, TextField, InputAdornment } from "@mui/material";

interface SpaTabHistoricoAsistenciasProps {
  userId: string;
  role?: string;
}

type MonthlyGroup = {
  monthKey: string;
  monthLabel: string;
  meetings: PersonHoursMeeting[];
  stats: {
    virtualMins: number;
    hibridaMins: number;
    virtualAmount: number;
    hibridaAmount: number;
    totalAmount: number;
  };
};

function formatMinutesAsHHMM(totalMinutes: number): string {
  const normalizedMinutes = Math.max(0, Math.round(totalMinutes));
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getMonthYearLabel(dateIso: string): string {
  const date = new Date(dateIso);
  const label = date.toLocaleDateString("es-UY", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-UY", { 
    style: "currency", 
    currency: "UYU",
    minimumFractionDigits: 2 
  }).format(amount);
}

export function SpaTabHistoricoAsistencias({ userId, role }: SpaTabHistoricoAsistenciasProps) {
  const theme = useTheme();
  const [meetings, setMeetings] = useState<PersonHoursMeeting[]>([]);
  const [rates, setRates] = useState<Record<string, { valorHora: number; moneda: string }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedMeetingForReport, setSelectedMeetingForReport] = useState<PersonHoursMeeting | null>(null);
  const [reportForm, setReportForm] = useState({ minutos: "", comentarios: "" });
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [updatingModalityEventId, setUpdatingModalityEventId] = useState<string | null>(null);
  const isDocente = role === "DOCENTE";
  const isAdmin = role === "ADMINISTRADOR";

  async function refresh() {
    if (!userId) return;
    setIsLoading(true);
    setError("");
    try {
      const payload = await loadPersonHours(userId);

      if (!payload) {
        setError("No se pudo cargar tu histórico.");
        return;
      }
      
      if (payload.rates) {
        setRates(payload.rates);
      }

      const meetingsList = Array.isArray(payload.meetings) ? payload.meetings : [];

      const now = new Date();
      const localYear = now.getFullYear();
      const localMonth = String(now.getMonth() + 1).padStart(2, "0");
      const currentMonthKey = `${localYear}-${localMonth}`;

      // Filter: Show only meetings from PREVIOUS months (strictly < currentMonthKey)
      const historical = meetingsList
        .filter(m => {
          if (!m || !m.inicioAt) return false;
          const meetingMonthKey = m.inicioAt.substring(0, 7);
          return meetingMonthKey < currentMonthKey;
        })
        .sort((a, b) => new Date(b.inicioAt).getTime() - new Date(a.inicioAt).getTime());
      
      setMeetings(historical);
    } catch (err) {
      console.error("Error loading historico:", err);
      setError("Error al cargar los datos.");
    } finally {
      setIsLoading(false);
    }
  }

  function formatMinutesAsHHMM(totalMinutes: number): string {
    const normalizedMinutes = Math.max(0, Math.round(totalMinutes));
    const hours = Math.floor(normalizedMinutes / 60);
    const minutes = normalizedMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  function openReportDialog(meeting: PersonHoursMeeting) {
    setSelectedMeetingForReport(meeting);
    setReportForm({
      minutos: String(meeting.minutosReportados || meeting.minutos),
      comentarios: meeting.comentariosReporte || ""
    });
    setReportDialogOpen(true);
  }

  function closeReportDialog() {
    setReportDialogOpen(false);
    setSelectedMeetingForReport(null);
  }

  async function handleSubmitReport() {
    if (!selectedMeetingForReport) return;
    const mins = parseInt(reportForm.minutos);
    if (isNaN(mins) || mins <= 0) return;

    setIsSubmittingReport(true);
    try {
      if (isDocente) {
        const success = await updatePastMeeting({
          eventoId: selectedMeetingForReport.eventId,
          minutosReales: mins
        });
        if (success) {
          void refresh();
          closeReportDialog();
        } else {
          alert("No se pudo actualizar la duración.");
        }
      } else {
        const res = await reportMeetingDuration(selectedMeetingForReport.eventId, {
          minutosReportados: mins,
          comentariosReporte: reportForm.comentarios.trim() || undefined
        });
        if (res.success) {
          void refresh();
          closeReportDialog();
        } else {
          alert(res.error || "No se pudo enviar el reporte.");
        }
      }
    } catch {
      alert("Error al procesar el cambio.");
    } finally {
      setIsSubmittingReport(false);
    }
  }

  async function toggleModality(meeting: PersonHoursMeeting) {
    if (!isAdmin) return;
    const newModality = meeting.modalidadReunion === "VIRTUAL" ? "HIBRIDA" : "VIRTUAL";
    
    if (!confirm(`¿Cambiar modalidad de "${meeting.titulo}" a ${newModality === "HIBRIDA" ? "HÍBRIDA" : "VIRTUAL"}?`)) return;

    setUpdatingModalityEventId(meeting.eventId);
    try {
      const res = await updatePastMeeting({
        eventoId: meeting.eventId,
        modalidadReunion: newModality
      });
      
      if (res.success) {
        void refresh();
      } else {
        alert(res.error || "No se pudo cambiar la modalidad.");
      }
    } catch (err) {
      alert("Error al cambiar la modalidad.");
    } finally {
      setUpdatingModalityEventId(null);
    }
  }

  useEffect(() => {
    void refresh();
  }, [userId]);

  const monthlyGroups = useMemo<MonthlyGroup[]>(() => {
    const groups: Record<string, MonthlyGroup> = {};
    
    const virtualRate = rates["VIRTUAL"]?.valorHora ?? 0;
    const hibridaRate = rates["HIBRIDA"]?.valorHora ?? 0;

    meetings.forEach((m) => {
      const key = m.inicioAt.substring(0, 7);
      if (!groups[key]) {
        groups[key] = {
          monthKey: key,
          monthLabel: getMonthYearLabel(m.inicioAt),
          meetings: [],
          stats: { virtualMins: 0, hibridaMins: 0, virtualAmount: 0, hibridaAmount: 0, totalAmount: 0 }
        };
      }
      
      const group = groups[key];
      group.meetings.push(m);
      
      if (m.modalidadReunion === "VIRTUAL") {
        group.stats.virtualMins += m.minutos;
      } else {
        group.stats.hibridaMins += m.minutos;
      }
    });

    return Object.values(groups)
      .filter((g) => g.meetings.length > 0)
      .map((g) => {
        g.stats.virtualAmount = (g.stats.virtualMins / 60) * virtualRate;
        g.stats.hibridaAmount = (g.stats.hibridaMins / 60) * hibridaRate;
        g.stats.totalAmount = g.stats.virtualAmount + g.stats.hibridaAmount;
        return g;
      })
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [meetings, rates]);

  return (
    <Box>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between" alignItems="flex-start" sx={{ mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, background: "linear-gradient(45deg, #455a64, #90a4ae)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Histórico de Reuniones
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {role === "DOCENTE" ? "Registro de tus reuniones pasadas." : "Registro de asistencias de meses anteriores."}
          </Typography>
        </Box>
        <Button variant="outlined" onClick={() => void refresh()} disabled={isLoading} sx={{ borderRadius: 2, fontWeight: 700 }}>
          Actualizar
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {isLoading && meetings.length === 0 ? (
        <Stack spacing={2.5}>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 3 }}>
            <Skeleton variant="rounded" height={80} sx={{ borderRadius: 3 }} animation="wave" />
            <Skeleton variant="rounded" height={80} sx={{ borderRadius: 3 }} animation="wave" />
          </Box>
          <Stack spacing={1.5}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Paper
                key={i}
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  borderLeft: "4px solid",
                  borderLeftColor: "divider",
                  bgcolor: alpha(theme.palette.background.paper, 0.5)
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <Box sx={{ minWidth: 45, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <Skeleton variant="text" width={24} height={32} animation="wave" />
                    <Skeleton variant="text" width={32} height={16} animation="wave" />
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="40%" height={24} animation="wave" />
                    <Skeleton variant="text" width="30%" height={16} animation="wave" />
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Skeleton variant="rounded" width={60} height={18} sx={{ borderRadius: 1 }} animation="wave" />
                      <Skeleton variant="rounded" width={50} height={18} sx={{ borderRadius: 1 }} animation="wave" />
                    </Stack>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Stack>
      ) : meetings.length === 0 ? (
        <Paper sx={{ p: 8, textAlign: "center", borderRadius: 4, bgcolor: alpha(theme.palette.primary.main, 0.03), border: "2px dashed", borderColor: alpha(theme.palette.primary.main, 0.1) }}>
          <HistoryIcon sx={{ fontSize: 64, color: "text.disabled", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" fontWeight={700}>
            No se encontraron reuniones de meses pasados.
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={6}>
          {monthlyGroups.map((group) => (
            <Box key={group.monthKey}>
              <Divider textAlign="left" sx={{ mb: 3, "&::before, &::after": { borderColor: alpha(theme.palette.text.primary, 0.1) } }}>
                <Chip 
                  label={group.monthLabel.toUpperCase()} 
                  sx={{ fontWeight: 900, px: 2, bgcolor: alpha(theme.palette.text.primary, 0.08), color: "text.primary", borderRadius: 2 }} 
                />
              </Divider>

              {/* Monthly Stats Cards - Hide for Docentes */}
              {role !== "DOCENTE" && (
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 3 }}>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: alpha(theme.palette.success.main, 0.04), borderColor: alpha(theme.palette.success.main, 0.1) }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <AccessTimeFilledIcon color="success" sx={{ fontSize: 32 }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: "success.dark" }}>VIRTUALES</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900 }}>{formatMinutesAsHHMM(group.stats.virtualMins)}</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "success.dark", display: "flex", alignItems: "center", gap: 0.5 }}>
                          <PaidIcon fontSize="inherit" /> {formatCurrency(group.stats.virtualAmount)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: alpha(theme.palette.info.main, 0.04), borderColor: alpha(theme.palette.info.main, 0.1) }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <AccessTimeFilledIcon color="info" sx={{ fontSize: 32 }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: "info.dark" }}>HÍBRIDAS</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 900 }}>{formatMinutesAsHHMM(group.stats.hibridaMins)}</Typography>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "info.dark", display: "flex", alignItems: "center", gap: 0.5 }}>
                          <PaidIcon fontSize="inherit" /> {formatCurrency(group.stats.hibridaAmount)}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Box>
              )}

              <Stack spacing={1.5}>
                {group.meetings.map((m) => {
                  const isPresencial = m.modalidadReunion === "HIBRIDA";
                  return (
                    <Card
                      key={`${m.assignmentId}-${m.eventId}`}
                      variant="outlined"
                      sx={{
                        borderRadius: 2,
                        borderLeft: "4px solid",
                        borderLeftColor: isPresencial ? "error.main" : "primary.main",
                        bgcolor: alpha(theme.palette.action.disabledBackground, 0.05)
                      }}
                    >
                      <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
                        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                          <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ minWidth: 45, textAlign: "center" }}>
                              <Typography variant="h6" sx={{ fontWeight: 900, lineHeight: 1 }}>{new Date(m.inicioAt).getDate()}</Typography>
                              <Typography variant="caption" sx={{ fontWeight: 800 }}>{new Date(m.inicioAt).toLocaleDateString("es-UY", { month: "short" }).toUpperCase()}</Typography>
                            </Box>
                            <Divider orientation="vertical" flexItem />
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>{m.titulo}</Typography>
                              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5, fontWeight: 600 }}>
                                {role === "DOCENTE" ? `Asistente: ${m.asistenteNombre || "Sin asignar"}` : `Responsable: ${m.responsableNombre || "No definido"}`}
                              </Typography>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Chip 
                                  size="small" 
                                  label={isPresencial ? "Presencial" : "Virtual"} 
                                  color={isPresencial ? "error" : "primary"} 
                                  sx={{ 
                                    fontWeight: 800, 
                                    height: 18, 
                                    fontSize: "0.65rem",
                                    cursor: isAdmin ? "pointer" : "default",
                                    "&:hover": isAdmin ? { opacity: 0.8 } : {}
                                  }} 
                                  onClick={isAdmin ? () => toggleModality(m) : undefined}
                                  disabled={updatingModalityEventId === m.eventId}
                                />
                                <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <ScheduleIcon sx={{ fontSize: 14 }} /> {formatMinutesAsHHMM(m.minutos)}
                                </Typography>
                              </Stack>
                            </Box>
                          </Stack>
                          <Stack direction="row" spacing={1} sx={{ ml: 2 }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<EditNoteIcon />}
                              onClick={() => openReportDialog(m)}
                              sx={{ borderRadius: 1.5, fontSize: "0.7rem", py: 0.2, textTransform: "none" }}
                            >
                              {isDocente ? "Ajustar Duración" : "Informar"}
                            </Button>
                          </Stack>
                        </Stack>
                        {!isDocente && m.comentariosReporte && (
                          <Box sx={{ mt: 1, ml: 6, p: 0.8, borderRadius: 1.2, bgcolor: alpha(theme.palette.text.primary, 0.03), borderLeft: "2px solid", borderLeftColor: "divider" }}>
                            <Typography variant="caption" sx={{ display: "flex", alignItems: "center", gap: 0.5, fontWeight: 600, color: "text.secondary", fontSize: "0.65rem" }}>
                              <CommentIcon sx={{ fontSize: 12 }} /> Reportado: {formatMinutesAsHHMM(m.minutosReportados || 0)} - {m.comentariosReporte}
                            </Typography>
                          </Box>
                        )}
                        {isDocente && m.minutosReportados && (
                          <Box sx={{ mt: 1, ml: 6, p: 0.8, borderRadius: 1.2, bgcolor: alpha(theme.palette.warning.main, 0.05), borderLeft: "2px solid", borderLeftColor: "warning.main" }}>
                            <Typography variant="caption" sx={{ display: "flex", alignItems: "center", gap: 0.5, fontWeight: 700, color: "warning.dark", fontSize: "0.65rem" }}>
                              <HistoryEduIcon sx={{ fontSize: 12 }} /> Asistente reportó {formatMinutesAsHHMM(m.minutosReportados)}: "{m.comentariosReporte}"
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                </Card>
                  );
                })}
              </Stack>
            </Box>
          ))}
        </Stack>
      )}
      <Dialog open={reportDialogOpen} onClose={closeReportDialog} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 800 }}>{isDocente ? "Ajustar Duración Real" : "Reportar Duración Real"}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {isDocente 
              ? "Como docente responsable, puedes ajustar la duración real de la reunión."
              : "Informa a administración si la reunión duró más o menos tiempo de lo programado."
            }
          </Typography>
          
          <Stack spacing={3}>
            <TextField
              label="Duración Real"
              fullWidth
              required
              type="number"
              value={reportForm.minutos}
              onChange={(e) => setReportForm(prev => ({ ...prev, minutos: e.target.value }))}
              InputProps={{
                endAdornment: <InputAdornment position="end">minutos</InputAdornment>,
              }}
              helperText={`Programado: ${formatMinutesAsHHMM(selectedMeetingForReport?.minutos || 0)}`}
              disabled={isSubmittingReport}
            />
            {!isDocente && (
              <TextField
                label="Comentarios / Observaciones"
                fullWidth
                multiline
                rows={3}
                value={reportForm.comentarios}
                onChange={(e) => setReportForm(prev => ({ ...prev, comentarios: e.target.value }))}
                placeholder="Ej: La reunión se extendió 15 min."
                disabled={isSubmittingReport}
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={closeReportDialog} disabled={isSubmittingReport}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={handleSubmitReport} 
            disabled={isSubmittingReport || !reportForm.minutos}
            sx={{ fontWeight: 700, px: 3 }}
          >
            {isDocente ? "Actualizar" : "Enviar Reporte"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
