"use client";

import type { ReactNode } from "react";
import {
  Alert,
  Backdrop,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme
} from "@mui/material";
import LinkIcon from "@mui/icons-material/Link";
import {
  formatAccountingModalidad,
  formatDateTime24,
  formatHours,
  formatMoney,
  formatMonthKey,
  groupMonthlyAccountingPreview,
  MONTHLY_ACCOUNTING_DRIVE_FOLDER_URL
} from "./dashboardUtils";
import { useAccountingDashboard } from "./useAccountingDashboard";

export function AccountingDashboard() {
  const theme = useTheme();
  const accounting = useAccountingDashboard(true);

  return (
    <>
      <Stack spacing={2}>
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1}
              alignItems={{ xs: "flex-start", md: "center" }}
              justifyContent="space-between"
            >
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>
                  Horas por asistente
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Contaduría: horas ejecutadas del mes, separadas entre virtual y presencial/híbrida.
                </Typography>
              </Box>
              <Chip
                size="small"
                color={accounting.totals.assistantsWithActivity > 0 ? "success" : "warning"}
                label={accounting.totals.assistantsWithActivity > 0 ? "Con actividad" : "Sin actividad"}
              />
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1}
              alignItems={{ xs: "stretch", md: "center" }}
              justifyContent="space-between"
              sx={{ mb: 1.2 }}
            >
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Resumen mensual por asistente
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField
                  size="small"
                  select
                  label="Mes cerrado"
                  value={accounting.availableReportMonths.includes(accounting.selectedMonthKey) ? accounting.selectedMonthKey : ""}
                  onChange={(event) => accounting.setSelectedMonthKey(String(event.target.value))}
                  sx={{ minWidth: { sm: 180 } }}
                  helperText={
                    accounting.availableReportMonths.length > 0
                      ? "Solo meses cerrados con registros."
                      : "No hay meses cerrados con registros disponibles."
                  }
                >
                  {accounting.availableReportMonths.map((monthKey) => (
                    <MenuItem key={monthKey} value={monthKey}>
                      {formatMonthKey(monthKey)}
                    </MenuItem>
                  ))}
                </TextField>
                <Button variant="outlined" disabled={accounting.isLoadingPersonHours} onClick={() => void accounting.refreshAccountingData()}>
                  Actualizar
                </Button>
                <Button variant="outlined" disabled={accounting.isLoadingReportPreviews} onClick={() => void accounting.refreshAllMonthlyReportPreviews()}>
                  {accounting.isLoadingReportPreviews ? "Cargando previas..." : "Previsualizar informes"}
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  disabled={accounting.isUploadingReport || !accounting.selectedMonthKey || accounting.availableReportMonths.length === 0}
                  onClick={() => void accounting.uploadSelectedMonthlyReport()}
                >
                  {accounting.isUploadingReport ? "Subiendo..." : "Subir informe y obtener link"}
                </Button>
                <Button
                  variant="outlined"
                  color="info"
                  startIcon={<LinkIcon />}
                  href={MONTHLY_ACCOUNTING_DRIVE_FOLDER_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir carpeta de Drive
                </Button>
              </Stack>
            </Stack>

            {accounting.personHoursError ? <Alert severity="error" sx={{ mb: 1.2 }}>{accounting.personHoursError}</Alert> : null}
            {accounting.uploadReportError ? <Alert severity="error" sx={{ mb: 1.2 }}>{accounting.uploadReportError}</Alert> : null}
            {accounting.reportPreviewsError ? <Alert severity="error" sx={{ mb: 1.2 }}>{accounting.reportPreviewsError}</Alert> : null}
            {accounting.uploadReportSuccess ? (
              <Alert
                severity="success"
                sx={{ mb: 1.2 }}
                action={
                  accounting.uploadReportLink ? (
                    <Button color="inherit" size="small" href={accounting.uploadReportLink} target="_blank" rel="noreferrer">
                      Abrir en Drive
                    </Button>
                  ) : undefined
                }
              >
                {accounting.uploadReportSuccess}
              </Alert>
            ) : null}

            <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" sx={{ mb: 1.2 }}>
              <Chip variant="outlined" label={accounting.selectedMonthLabel} />
              <Chip variant="outlined" label={`${accounting.assistantCards.length} asistentes`} />
              <Chip variant="outlined" label={`${accounting.totals.assistantsWithActivity} con actividad`} />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Tarifas actuales: {accounting.ratesLabel}
            </Typography>
          </CardContent>
        </Card>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
            gap: 1.2
          }}
        >
          <SummaryCard label="Horas virtuales" value={formatHours(Math.round(accounting.totals.virtualHours * 100) / 100)} />
          <SummaryCard label="Horas presenciales" value={formatHours(Math.round(accounting.totals.hibridaHours * 100) / 100)} />
          <SummaryCard label="Horas totales" value={formatHours(Math.round(accounting.totals.totalHours * 100) / 100)} />
          <SummaryCard label="Estimado total" value={formatMoney(Math.round(accounting.totals.totalEstimated * 100) / 100, accounting.paymentCurrency)} />
        </Box>

        {accounting.mixedCurrency ? (
          <Alert severity="warning">
            Las tarifas tienen monedas distintas entre virtual e híbrida. Revisa conversión antes de liquidar.
          </Alert>
        ) : null}

        <ReportPreviewsCard accounting={accounting} />

        <Stack spacing={1.2}>
          {accounting.monthlyCards.map((card) => (
            <Card key={card.person.userId} variant="outlined" sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={1}
                  alignItems={{ xs: "flex-start", md: "center" }}
                  justifyContent="space-between"
                  sx={{ mb: 1.2 }}
                >
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {card.person.nombre}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {card.person.email}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    color={card.totalMinutes > 0 ? "success" : "warning"}
                    label={card.totalMinutes > 0 ? `${card.monthMeetings.length} reuniones` : "Sin actividad"}
                  />
                </Stack>

                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" }, gap: 1 }}>
                  <SmallMetric label="Virtual" value={formatHours(card.virtualHours)} />
                  <SmallMetric label="Híbrida" value={formatHours(card.hibridaHours)} />
                  <SmallMetric label="Total mes" value={formatHours(card.totalHours)} />
                  <SmallMetric label="Estimado" value={formatMoney(Math.round(card.estimatedPayment * 100) / 100, accounting.paymentCurrency)} />
                </Box>

                <Box sx={{ mt: 1.2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.8 }}>
                    Reuniones asistidas del mes
                  </Typography>
                  {card.monthMeetings.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No hay reuniones cumplidas para este asistente en el mes seleccionado.
                    </Typography>
                  ) : (
                    <Stack spacing={0.8}>
                      {card.monthMeetings.map((meeting) => (
                        <Box
                          key={meeting.assignmentId}
                          sx={{
                            p: 1,
                            borderRadius: 1.5,
                            border: "1px solid",
                            borderColor: "divider",
                            display: "grid",
                            gridTemplateColumns: { xs: "1fr", md: "minmax(260px, 2fr) repeat(3, minmax(120px, 1fr))" },
                            gap: 1
                          }}
                        >
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {meeting.titulo}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Programa: {meeting.programaNombre || "Sin programa"}
                            </Typography>
                          </Box>
                          <MeetingField label="Fecha" value={new Date(meeting.inicioAt).toLocaleString("es-UY", { dateStyle: "short", timeStyle: "short" })} />
                          <MeetingField label="Modalidad" value={meeting.modalidadReunion} />
                          <MeetingField label="Tiempo liquidable" value={formatHours(Math.round((meeting.minutos / 60) * 100) / 100)} strong />
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Stack>

      <Backdrop
        open={accounting.isLoadingPersonHours}
        sx={{
          color: "#fff",
          zIndex: theme.zIndex.drawer + 200,
          backdropFilter: "blur(2px)",
          backgroundColor: "rgba(12, 28, 56, 0.38)"
        }}
      >
        <Stack spacing={1.2} alignItems="center">
          <CircularProgress color="inherit" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Actualizando...
          </Typography>
        </Stack>
      </Backdrop>
    </>
  );
}

type AccountingHook = ReturnType<typeof useAccountingDashboard>;

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: 1.2 }}>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

function MeetingField({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: strong ? 700 : 400 }}>
        {value}
      </Typography>
    </Box>
  );
}

function ReportPreviewsCard({ accounting }: { accounting: AccountingHook }) {
  const theme = useTheme();

  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          alignItems={{ xs: "flex-start", md: "center" }}
          justifyContent="space-between"
          sx={{ mb: 1.2 }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Previsualización de informes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Vista previa de meses cerrados con registros antes de subir a Drive.
            </Typography>
          </Box>
          <Chip size="small" color={accounting.reportPreviews.length > 0 ? "success" : "warning"} label={`${accounting.reportPreviews.length} meses`} />
        </Stack>

        {accounting.isLoadingReportPreviews ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Cargando previsualizaciones...
          </Typography>
        ) : null}

        {!accounting.isLoadingReportPreviews && accounting.reportPreviews.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No hay previsualizaciones disponibles aún.
          </Typography>
        ) : null}

        <Stack spacing={1}>
          {accounting.reportPreviews.map((previewItem) => {
            if (!previewItem.ok) {
              return (
                <Card key={previewItem.monthKey} variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ p: 1.2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.6 }}>
                      {formatMonthKey(previewItem.monthKey)}
                    </Typography>
                    <Alert severity="error" sx={{ py: 0.2 }}>
                      {previewItem.error}
                    </Alert>
                  </CardContent>
                </Card>
              );
            }

            const assistantGroups = groupMonthlyAccountingPreview(previewItem);

            return (
              <Card key={previewItem.monthKey} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 1.2 }}>
                  <Stack direction={{ xs: "column", lg: "row" }} spacing={1} alignItems={{ xs: "flex-start", lg: "center" }} justifyContent="space-between" sx={{ mb: 1 }}>
                    <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                      <Chip variant="outlined" label={formatMonthKey(previewItem.monthKey)} />
                      <Chip variant="outlined" label={`${previewItem.totals.meetingsCount} reuniones`} />
                      <Chip variant="outlined" label={`${previewItem.totals.assistantsWithActivity} asistentes`} />
                      <Chip variant="outlined" label={`${formatHours(previewItem.totals.totalHours)} totales`} />
                    </Stack>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      Total: {formatMoney(previewItem.totals.totalAmount, previewItem.totals.currency)}
                    </Typography>
                  </Stack>

                  <Typography variant="caption" color="text.secondary">
                    Tarifas: Virtual {formatMoney(previewItem.rates.VIRTUAL.valorHora, previewItem.rates.VIRTUAL.moneda)} | Hibrida {formatMoney(previewItem.rates.HIBRIDA.valorHora, previewItem.rates.HIBRIDA.moneda)}
                  </Typography>

                  <Stack spacing={1.2} sx={{ mt: 1.2 }}>
                    {assistantGroups.map(({ assistant, rows }) => (
                      <Card key={`${previewItem.monthKey}-${assistant.assistantId}`} variant="outlined" sx={{ borderRadius: 2, background: alpha(theme.palette.primary.main, 0.03) }}>
                        <CardContent sx={{ p: 1.2 }}>
                          <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ xs: "flex-start", md: "center" }} justifyContent="space-between" sx={{ mb: 1 }}>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                                {assistant.assistantName}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {assistant.assistantEmail || "Sin email"}
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              Total: {formatMoney(assistant.montoTotal, previewItem.totals.currency)}
                            </Typography>
                          </Stack>

                          <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap" sx={{ mb: 1 }}>
                            <Chip size="small" variant="outlined" label={`${rows.length} encuentros`} />
                            <Chip size="small" variant="outlined" label={`Virtual ${formatHours(assistant.horasVirtuales)}`} />
                            <Chip size="small" variant="outlined" label={`Hibrida ${formatHours(assistant.horasHibridas)}`} />
                            <Chip size="small" variant="outlined" label={`Total ${formatHours(assistant.horasTotales)}`} />
                          </Stack>

                          <Box sx={{ overflowX: "auto" }}>
                            <Box component="table" sx={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                              <Box component="thead">
                                <Box component="tr">
                                  {["Programa", "Encuentro", "Inicio", "Modalidad", "Horas", "Tarifa", "Importe"].map((label) => (
                                    <Box key={label} component="th" sx={{ textAlign: "left", py: 0.7, px: 0.8, borderBottom: "1px solid", borderColor: "divider", whiteSpace: "nowrap" }}>
                                      {label}
                                    </Box>
                                  ))}
                                </Box>
                              </Box>
                              <Box component="tbody">
                                {rows.map((row, index) => (
                                  <Box component="tr" key={`${previewItem.monthKey}-${assistant.assistantId}-${index}`}>
                                    <AccountingCell>{row.programaNombre}</AccountingCell>
                                    <AccountingCell>{row.titulo}</AccountingCell>
                                    <AccountingCell nowrap>{formatDateTime24(row.inicio)}</AccountingCell>
                                    <AccountingCell>{formatAccountingModalidad(row.modalidad)}</AccountingCell>
                                    <AccountingCell nowrap>{formatHours(row.horas)}</AccountingCell>
                                    <AccountingCell nowrap>{formatMoney(row.tarifaHora, row.moneda)}</AccountingCell>
                                    <AccountingCell nowrap>{formatMoney(row.importe, row.moneda)}</AccountingCell>
                                  </Box>
                                ))}
                              </Box>
                            </Box>
                          </Box>

                          <Divider sx={{ my: 1 }} />
                          <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
                            <Chip size="small" color="success" variant="outlined" label={`Virtual: ${formatHours(assistant.horasVirtuales)} · ${formatMoney(assistant.montoVirtual, previewItem.rates.VIRTUAL.moneda)}`} />
                            <Chip size="small" color="success" variant="outlined" label={`Hibrida: ${formatHours(assistant.horasHibridas)} · ${formatMoney(assistant.montoHibrida, previewItem.rates.HIBRIDA.moneda)}`} />
                            <Chip size="small" color="success" label={`Total: ${formatHours(assistant.horasTotales)} · ${formatMoney(assistant.montoTotal, previewItem.totals.currency)}`} />
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}

function AccountingCell({ children, nowrap = false }: { children: ReactNode; nowrap?: boolean }) {
  return (
    <Box component="td" sx={{ py: 0.7, px: 0.8, borderBottom: "1px solid", borderColor: "divider", whiteSpace: nowrap ? "nowrap" : "normal" }}>
      {children}
    </Box>
  );
}
