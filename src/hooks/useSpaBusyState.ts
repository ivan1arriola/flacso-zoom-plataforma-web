import { useEffect, useMemo, useState } from "react";
import type { BusyOperationKey } from "@/src/lib/spa-home/client-types";
import { BUSY_MESSAGES } from "@/src/lib/spa-home/client-utils";

type UseSpaBusyStateInput = {
  loading: boolean;
  isSubmittingSolicitud: boolean;
  deletingSolicitudId: string | null;
  cancellingSerieSolicitudId: string | null;
  cancellingInstanciaKey: string | null;
  restoringInstanciaKey: string | null;
  updatingAsistenciaSolicitudId: string | null;
  updatingAsistenciaInstanciaKey: string | null;
};

export function useSpaBusyState(input: UseSpaBusyStateInput) {
  const isGlobalBusy = useMemo(
    () =>
      input.loading ||
      input.isSubmittingSolicitud ||
      Boolean(input.deletingSolicitudId) ||
      Boolean(input.cancellingSerieSolicitudId) ||
      Boolean(input.cancellingInstanciaKey) ||
      Boolean(input.restoringInstanciaKey) ||
      Boolean(input.updatingAsistenciaSolicitudId) ||
      Boolean(input.updatingAsistenciaInstanciaKey),
    [
      input.loading,
      input.isSubmittingSolicitud,
      input.deletingSolicitudId,
      input.cancellingSerieSolicitudId,
      input.cancellingInstanciaKey,
      input.restoringInstanciaKey,
      input.updatingAsistenciaSolicitudId,
      input.updatingAsistenciaInstanciaKey
    ]
  );

  const activeBusyOperation = useMemo<BusyOperationKey>(() => {
    if (input.loading) return "BOOTSTRAP";
    if (input.isSubmittingSolicitud) return "SUBMIT_SOLICITUD";
    if (input.deletingSolicitudId) return "DELETE_SOLICITUD";
    if (input.cancellingSerieSolicitudId) return "CANCEL_SERIE";
    if (input.cancellingInstanciaKey) return "CANCEL_INSTANCIA";
    if (input.restoringInstanciaKey) return "RESTORE_INSTANCIA";
    if (input.updatingAsistenciaSolicitudId || input.updatingAsistenciaInstanciaKey) {
      return "UPDATE_ASISTENCIA";
    }
    return "GENERIC";
  }, [
    input.loading,
    input.isSubmittingSolicitud,
    input.deletingSolicitudId,
    input.cancellingSerieSolicitudId,
    input.cancellingInstanciaKey,
    input.restoringInstanciaKey,
    input.updatingAsistenciaSolicitudId,
    input.updatingAsistenciaInstanciaKey
  ]);

  const [busyMessageIndex, setBusyMessageIndex] = useState(0);
  const busyMessageSequence = useMemo(
    () => BUSY_MESSAGES[activeBusyOperation] ?? BUSY_MESSAGES.GENERIC,
    [activeBusyOperation]
  );
  const globalBusyLabel = useMemo(
    () => busyMessageSequence[busyMessageIndex] ?? busyMessageSequence[0] ?? "Procesando...",
    [busyMessageSequence, busyMessageIndex]
  );

  useEffect(() => {
    setBusyMessageIndex(0);
    if (!isGlobalBusy) return;
    if (busyMessageSequence.length <= 1) return;

    const intervalId = window.setInterval(() => {
      setBusyMessageIndex((prev) => (prev + 1) % busyMessageSequence.length);
    }, 2500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isGlobalBusy, busyMessageSequence]);

  return {
    activeBusyOperation,
    globalBusyLabel,
    isGlobalBusy
  };
}
