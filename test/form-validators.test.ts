import { describe, expect, it } from "vitest";

import {
  combineDateAndTimeToIso,
  resolveEndByTimeOrDuration,
  toIso,
  validatePastMeetingRequired,
  validateSolicitudTema,
  validateTarifaUpdate,
  validateUserCreation
} from "@/components/spa-tabs/form-validators";

function localIso(day: string, time: string): string {
  return new Date(`${day}T${time}`).toISOString();
}

describe("form validators", () => {
  describe("toIso / combineDateAndTimeToIso", () => {
    it("combina fecha y hora local en ISO para enviar al backend", () => {
      expect(combineDateAndTimeToIso("2026-06-10", "09:30", "inicio")).toBe(
        localIso("2026-06-10", "09:30")
      );
    });

    it("rechaza fechas incompletas o invalidas con mensajes accionables", () => {
      expect(() => combineDateAndTimeToIso("", "09:30", "dia y hora de inicio")).toThrow(
        "Debes completar dia y hora de inicio."
      );
      expect(() => toIso("no-es-fecha", "fecha")).toThrow("fecha invalida.");
    });
  });

  describe("resolveEndByTimeOrDuration", () => {
    it("prioriza la hora de fin cuando esta presente", () => {
      const startIso = localIso("2026-06-10", "09:00");

      expect(resolveEndByTimeOrDuration(startIso, "10:30", "45", "la reunion")).toEqual({
        endIso: localIso("2026-06-10", "10:30"),
        durationMinutes: 90
      });
    });

    it("calcula fin por duracion y normaliza decimales con coma", () => {
      const startIso = localIso("2026-06-10", "09:00");

      expect(resolveEndByTimeOrDuration(startIso, "", "75,9", "la reunion")).toEqual({
        endIso: new Date(new Date(startIso).getTime() + 75 * 60_000).toISOString(),
        durationMinutes: 75
      });
    });

    it("rechaza fin anterior, duracion ausente y duracion invalida", () => {
      const startIso = localIso("2026-06-10", "09:00");

      expect(() => resolveEndByTimeOrDuration(startIso, "08:59", "", "la reunion")).toThrow(
        "La hora de fin debe ser posterior al inicio en la reunion."
      );
      expect(() => resolveEndByTimeOrDuration(startIso, "", "", "la reunion")).toThrow(
        "Debes completar hora de fin o duracion para la reunion."
      );
      expect(() => resolveEndByTimeOrDuration(startIso, "", "0", "la reunion")).toThrow(
        "Duracion de la reunion invalida."
      );
    });
  });

  describe("validadores de campos requeridos", () => {
    it("valida campos minimos de solicitud, reunion pasada, tarifa y usuario", () => {
      expect(() => validateSolicitudTema("   ")).toThrow("Debes completar el tema.");
      expect(() => validatePastMeetingRequired("", "docente@flacso.edu.uy", "2026-06-10T09:00", "2026-06-10T10:00")).toThrow(
        "Debes completar el titulo."
      );
      expect(() => validatePastMeetingRequired("Clase", "", "2026-06-10T09:00", "2026-06-10T10:00")).toThrow(
        "Debes completar el email del docente."
      );
      expect(() => validateTarifaUpdate("", "100")).toThrow("Debes seleccionar una modalidad.");
      expect(() => validateTarifaUpdate("VIRTUAL", "-1")).toThrow("El valor por hora debe ser un número válido.");
      expect(() => validateUserCreation("   ")).toThrow("Debes completar el email.");
    });
  });
});
