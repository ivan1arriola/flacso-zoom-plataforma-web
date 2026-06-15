import { loadTarifas, submitTarifaUpdate as submitTarifaUpdateApi } from "@/src/services/tarifasApi";
import type { TarifaModalidad } from "@/src/hooks/useTarifas";

type TarifaForm = {
  valorHora: string;
  moneda: string;
};

type UseSpaTarifaActionsInput = {
  tarifaFormByModalidad: Record<TarifaModalidad, TarifaForm>;
  setTarifas: (value: NonNullable<Awaited<ReturnType<typeof loadTarifas>>>) => void;
  setMessage: (value: string) => void;
  setIsSubmittingTarifa: (value: boolean) => void;
};

export function useSpaTarifaActions({
  tarifaFormByModalidad,
  setTarifas,
  setMessage,
  setIsSubmittingTarifa
}: UseSpaTarifaActionsInput) {
  async function submitTarifaUpdate(modalidad: TarifaModalidad) {
    setMessage("");

    const form = tarifaFormByModalidad[modalidad];
    const parsedValue = Number(form.valorHora.replace(",", "."));
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      setMessage("Valor hora invalido.");
      return;
    }

    setIsSubmittingTarifa(true);
    try {
      const response = await submitTarifaUpdateApi({
        modalidadReunion: modalidad,
        valorHora: parsedValue,
        moneda: form.moneda.trim() || "UYU"
      });
      if (!response.success) {
        setMessage(response.error ?? "No se pudo actualizar la tarifa.");
        return;
      }
      setMessage(`Tarifa actualizada para ${modalidad}.`);
      const tarifas = await loadTarifas();
      if (tarifas) setTarifas(tarifas);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar la tarifa.");
    } finally {
      setIsSubmittingTarifa(false);
    }
  }

  return { submitTarifaUpdate };
}
