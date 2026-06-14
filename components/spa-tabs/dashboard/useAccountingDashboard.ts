"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadAllMonthlyAccountingReportPreviews,
  loadPersonHours,
  loadTarifas,
  uploadMonthlyAccountingReportToDrive
} from "@/src/services/tarifasApi";
import type {
  AssistantCard,
  MonthlyReportPreviewResult,
  TarifasByModalidad
} from "./types";
import {
  buildAssistantMonthlyCards,
  calculateAccountingTotals,
  compareMonthKeysDesc,
  formatMoney,
  formatMonthKey,
  getCurrentMonthKey,
  getPreviousMonthKey
} from "./dashboardUtils";

export function useAccountingDashboard(isEnabled: boolean) {
  const [assistantCards, setAssistantCards] = useState<AssistantCard[]>([]);
  const [isLoadingPersonHours, setIsLoadingPersonHours] = useState(false);
  const [personHoursError, setPersonHoursError] = useState("");
  const [selectedMonthKey, setSelectedMonthKey] = useState(getPreviousMonthKey());
  const [availableReportMonths, setAvailableReportMonths] = useState<string[]>([]);
  const [isUploadingReport, setIsUploadingReport] = useState(false);
  const [uploadReportError, setUploadReportError] = useState("");
  const [uploadReportSuccess, setUploadReportSuccess] = useState("");
  const [uploadReportLink, setUploadReportLink] = useState<string | null>(null);
  const [isLoadingReportPreviews, setIsLoadingReportPreviews] = useState(false);
  const [reportPreviewsError, setReportPreviewsError] = useState("");
  const [reportPreviews, setReportPreviews] = useState<MonthlyReportPreviewResult[]>([]);
  const [tarifasByModalidad, setTarifasByModalidad] = useState<TarifasByModalidad>({
    VIRTUAL: null,
    HIBRIDA: null
  });

  const refreshAllMonthlyReportPreviews = useCallback(async () => {
    setIsLoadingReportPreviews(true);
    setReportPreviewsError("");
    try {
      const result = await loadAllMonthlyAccountingReportPreviews();
      if (!result.success) {
        setReportPreviews([]);
        setReportPreviewsError(result.error ?? "No se pudieron cargar las previsualizaciones de informes.");
        return;
      }

      setReportPreviews(
        (result.reports ?? []).sort((left, right) => compareMonthKeysDesc(left.monthKey, right.monthKey))
      );
    } finally {
      setIsLoadingReportPreviews(false);
    }
  }, []);

  const refreshAccountingData = useCallback(async () => {
    setIsLoadingPersonHours(true);
    setPersonHoursError("");
    try {
      const payload = await loadPersonHours();
      if (!payload) {
        setPersonHoursError("No se pudo cargar el detalle de horas por persona.");
        setAssistantCards([]);
        return;
      }

      const currentMonthKey = getCurrentMonthKey();
      const closedMonthsWithRecords = (payload.availableMonthKeys ?? [])
        .filter((monthKey) => monthKey && monthKey < currentMonthKey)
        .sort(compareMonthKeysDesc);

      setAvailableReportMonths(closedMonthsWithRecords);

      const preferredMonthKey = getPreviousMonthKey();
      setSelectedMonthKey((currentValue) => {
        if (currentValue && closedMonthsWithRecords.includes(currentValue)) return currentValue;
        if (closedMonthsWithRecords.includes(preferredMonthKey)) return preferredMonthKey;
        return closedMonthsWithRecords[0] ?? preferredMonthKey;
      });

      void refreshAllMonthlyReportPreviews();

      const detailPayloads = await Promise.all(
        (payload.people ?? []).map(async (person) => {
          const detail = await loadPersonHours(person.userId);
          return {
            person,
            meetings: detail?.meetings ?? []
          };
        })
      );

      setAssistantCards(detailPayloads.sort((left, right) => left.person.nombre.localeCompare(right.person.nombre, "es")));
    } finally {
      setIsLoadingPersonHours(false);
    }
  }, [refreshAllMonthlyReportPreviews]);

  const refreshTarifasForEstimate = useCallback(async () => {
    const rates = await loadTarifas();
    if (!rates) return;

    const next: TarifasByModalidad = { VIRTUAL: null, HIBRIDA: null };
    for (const rate of rates) {
      if (rate.modalidadReunion === "VIRTUAL" || rate.modalidadReunion === "HIBRIDA") {
        if (!next[rate.modalidadReunion]) next[rate.modalidadReunion] = rate;
      }
    }

    setTarifasByModalidad(next);
  }, []);

  const uploadSelectedMonthlyReport = useCallback(async () => {
    setUploadReportError("");
    setUploadReportSuccess("");
    setUploadReportLink(null);
    setIsUploadingReport(true);
    try {
      const result = await uploadMonthlyAccountingReportToDrive({
        monthKey: selectedMonthKey || getPreviousMonthKey()
      });
      if (!result.success) {
        setUploadReportError(result.error ?? "No se pudo subir el informe mensual a Google Drive.");
        return;
      }
      setUploadReportSuccess(`Informe ${result.fileName ?? ""} subido correctamente a Drive.`);
      setUploadReportLink(result.driveWebViewLink ?? null);
    } finally {
      setIsUploadingReport(false);
    }
  }, [selectedMonthKey]);

  useEffect(() => {
    if (!isEnabled) return;
    void refreshAccountingData();
    void refreshTarifasForEstimate();
  }, [isEnabled, refreshAccountingData, refreshTarifasForEstimate]);

  const virtualRate = Number(tarifasByModalidad.VIRTUAL?.valorHora ?? 0);
  const hibridaRate = Number(tarifasByModalidad.HIBRIDA?.valorHora ?? 0);
  const virtualCurrency = tarifasByModalidad.VIRTUAL?.moneda ?? "";
  const hibridaCurrency = tarifasByModalidad.HIBRIDA?.moneda ?? "";
  const mixedCurrency = Boolean(virtualCurrency && hibridaCurrency && virtualCurrency !== hibridaCurrency);
  const paymentCurrency = !mixedCurrency ? virtualCurrency || hibridaCurrency || "" : "";

  const monthlyCards = useMemo(
    () => buildAssistantMonthlyCards({ assistantCards, selectedMonthKey, virtualRate, hibridaRate }),
    [assistantCards, selectedMonthKey, virtualRate, hibridaRate]
  );

  const totals = useMemo(() => calculateAccountingTotals(monthlyCards), [monthlyCards]);

  const selectedMonthLabel =
    selectedMonthKey && availableReportMonths.includes(selectedMonthKey) ? formatMonthKey(selectedMonthKey) : "Sin datos";

  const ratesLabel = `Virtual ${formatMoney(virtualRate, virtualCurrency)} | Hibrida ${formatMoney(
    hibridaRate,
    hibridaCurrency
  )}`;

  return {
    assistantCards,
    availableReportMonths,
    hibridaCurrency,
    hibridaRate,
    isLoadingPersonHours,
    isLoadingReportPreviews,
    isUploadingReport,
    mixedCurrency,
    monthlyCards,
    paymentCurrency,
    personHoursError,
    ratesLabel,
    refreshAccountingData,
    refreshAllMonthlyReportPreviews,
    reportPreviews,
    reportPreviewsError,
    selectedMonthKey,
    selectedMonthLabel,
    setSelectedMonthKey,
    tarifasByModalidad,
    totals,
    uploadReportError,
    uploadReportLink,
    uploadReportSuccess,
    uploadSelectedMonthlyReport,
    virtualCurrency,
    virtualRate
  };
}
