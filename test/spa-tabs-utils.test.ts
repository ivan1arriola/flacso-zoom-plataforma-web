import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildZoomAccountColorMap,
  formatDurationHoursMinutes,
  formatDurationHuman,
  formatHours,
  getAssignedPerson,
  getEncargado,
  getPreparacionDisplay,
  getZoomAccountColor,
  isMeetingStartingSoon,
  normalizeZoomMeetingId,
  resolveZoomJoinUrl
} from "@/components/spa-tabs/spa-tabs-utils";

describe("spa-tabs utilities", () => {
  describe("Zoom account colors", () => {
    it("devuelve colores deterministas y evita colisiones mientras haya paleta disponible", () => {
      expect(getZoomAccountColor(" WEB@FLACSO.EDU.UY ")).toEqual(getZoomAccountColor("web@flacso.edu.uy"));

      const colorMap = buildZoomAccountColorMap([
        "web@flacso.edu.uy",
        "WEB@FLACSO.EDU.UY",
        "admin@flacso.edu.uy",
        null,
        ""
      ]);

      expect([...colorMap.keys()]).toEqual(["admin@flacso.edu.uy", "web@flacso.edu.uy"]);
      expect(new Set([...colorMap.values()].map((color) => color.background)).size).toBe(2);
    });
  });

  describe("Zoom meeting URLs", () => {
    it("normaliza IDs validos desde textos y URLs de Zoom", () => {
      expect(normalizeZoomMeetingId("123 456 7890")).toBe("1234567890");
      expect(normalizeZoomMeetingId("abc")).toBeNull();
      expect(resolveZoomJoinUrl("https://us02web.zoom.us/j/1234567890?pwd=secret", null)).toBe(
        "https://zoom.us/j/1234567890"
      );
      expect(resolveZoomJoinUrl(null, "987 654 3210")).toBe("https://zoom.us/j/9876543210");
    });

    it("rechaza URLs no Zoom y meeting ids fuera de rango", () => {
      expect(resolveZoomJoinUrl("https://example.test/j/1234567890", null)).toBeNull();
      expect(resolveZoomJoinUrl(null, "123")).toBeNull();
    });
  });

  describe("formatos y heuristicas de UI", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-06-10T12:00:00.000Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("detecta reuniones dentro de las proximas 24 horas", () => {
      expect(isMeetingStartingSoon("2026-06-10T12:00:00.000Z")).toBe(true);
      expect(isMeetingStartingSoon("2026-06-11T12:00:00.000Z")).toBe(true);
      expect(isMeetingStartingSoon("2026-06-11T12:00:01.000Z")).toBe(false);
      expect(isMeetingStartingSoon("2026-06-10T11:59:59.000Z")).toBe(false);
      expect(isMeetingStartingSoon("not-a-date")).toBe(false);
    });

    it("formatea duraciones, horas y preparacion hibrida", () => {
      expect(formatDurationHoursMinutes(95.9)).toBe("01:35");
      expect(formatDurationHoursMinutes(-10)).toBe("00:00");
      expect(formatDurationHuman("2026-06-10T09:00:00Z", "2026-06-10T10:30:00Z")).toBe(
        "1 hora y 30 minutos"
      );
      expect(formatHours(2)).toBe("2h");
      expect(formatHours(2.5)).toBe("2.5h");
      expect(
        getPreparacionDisplay({
          solicitud: {
            modalidadReunion: "HIBRIDA",
            patronRecurrencia: { preparacionMinutos: 75 }
          }
        })
      ).toBe("01:15");
      expect(
        getPreparacionDisplay({
          solicitud: {
            modalidadReunion: "VIRTUAL",
            patronRecurrencia: { preparacionMinutos: 75 }
          }
        })
      ).toBe("");
    });

    it("resuelve nombres de personas con fallback a nombre compuesto o email", () => {
      expect(
        getAssignedPerson({
          asignaciones: [
            {
              asistente: {
                usuario: {
                  firstName: "Ana",
                  lastName: "Perez",
                  email: "ana@flacso.edu.uy"
                }
              }
            }
          ]
        })
      ).toBe("Ana Perez");
      expect(
        getEncargado({
          solicitud: {
            docente: {
              usuario: {
                name: null,
                firstName: null,
                lastName: null,
                email: "docente@flacso.edu.uy"
              }
            }
          }
        })
      ).toBe("docente@flacso.edu.uy");
    });
  });
});
