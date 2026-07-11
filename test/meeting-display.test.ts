import { describe, expect, it } from "vitest";
import { resolveMeetingDisplayState } from "@/src/lib/meeting-display";

describe("resolveMeetingDisplayState", () => {
  it("prioriza cancelaciones sobre otros estados", () => {
    expect(resolveMeetingDisplayState({ eventStatus: "CANCELADO", requiresAssistance: true })).toEqual({
      label: "Cancelada",
      tone: "error"
    });
  });

  it("distingue cobertura pendiente y asignada", () => {
    expect(resolveMeetingDisplayState({ requiresAssistance: true, coverageStatus: "REQUERIDO_SIN_ASIGNAR" }).label)
      .toBe("Requiere asistente");
    expect(resolveMeetingDisplayState({ requiresAssistance: true, coverageStatus: "ASIGNADO" }).label)
      .toBe("Asistente asignado");
  });

  it("presenta reuniones provisionadas como programadas", () => {
    expect(resolveMeetingDisplayState({ requestStatus: "PROVISIONADA" })).toEqual({
      label: "Programada",
      tone: "success"
    });
  });
});
