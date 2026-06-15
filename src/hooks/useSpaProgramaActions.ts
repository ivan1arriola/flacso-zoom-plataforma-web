import {
  createPrograma as createProgramaApi,
  loadProgramas,
  type Programa
} from "@/src/services/programasApi";
import { loadSolicitudes, type Solicitud } from "@/src/services/solicitudesApi";

type UseSpaProgramaActionsInput = {
  setProgramas: (updater: Programa[] | ((prev: Programa[]) => Programa[])) => void;
  setSolicitudes: (value: Solicitud[]) => void;
  setMessage: (value: string) => void;
  setIsCreatingPrograma: (value: boolean) => void;
  setIsRefreshingProgramas: (value: boolean) => void;
};

export function useSpaProgramaActions({
  setProgramas,
  setSolicitudes,
  setMessage,
  setIsCreatingPrograma,
  setIsRefreshingProgramas
}: UseSpaProgramaActionsInput) {
  async function createProgramaOnDemand(nombre: string): Promise<string | null> {
    setIsCreatingPrograma(true);
    try {
      const response = await createProgramaApi(nombre);
      if (!response.success || !response.programa) {
        setMessage(response.error ?? "No se pudo crear el programa.");
        return null;
      }

      setProgramas((prev) => {
        const exists = prev.some((item) => item.id === response.programa?.id);
        const next = exists ? prev : [...prev, response.programa as Programa];
        return [...next].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      });
      setMessage(`Programa listo: ${response.programa.nombre}`);
      return response.programa.nombre;
    } finally {
      setIsCreatingPrograma(false);
    }
  }

  async function refreshProgramasView() {
    setIsRefreshingProgramas(true);
    try {
      const [loadedProgramas, loadedSolicitudes] = await Promise.all([
        loadProgramas(),
        loadSolicitudes()
      ]);
      if (loadedProgramas) setProgramas(loadedProgramas);
      if (loadedSolicitudes) setSolicitudes(loadedSolicitudes);
      if (!loadedProgramas && !loadedSolicitudes) {
        setMessage("No se pudo actualizar la vista de programas.");
      }
    } finally {
      setIsRefreshingProgramas(false);
    }
  }

  return {
    createProgramaOnDemand,
    refreshProgramasView
  };
}
