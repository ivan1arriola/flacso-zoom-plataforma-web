import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Solicitud } from "@/src/services/solicitudesApi";
import { buildAgendaMeetings } from "@/src/lib/admin-agenda";

describe("admin agenda", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-10T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });
  it("flattens zoom instances into agenda meetings with ordering and metadata", () => {
    const solicitudes: Solicitud[] = [
      {
        id: "sol-1",
        titulo: "Seminario de prueba",
        programaNombre: "Programa A",
        responsableNombre: "Ana Responsable",
        modalidadReunion: "VIRTUAL",
        tipoInstancias: "UNICA",
        estadoSolicitud: "PROVISIONADA",
        requestedBy: {
          id: "user-1",
          email: "docente@flacso.edu.uy",
          name: "Docente Uno"
        },
        requiereAsistencia: true,
        meetingPrincipalId: "123 456 7890",
        createdAt: "2026-05-20T10:00:00.000Z",
        zoomInstances: [
          {
            eventId: "evt-2",
            startTime: "2026-06-11T15:00:00.000Z",
            endTime: "2026-06-11T16:30:00.000Z",
            durationMinutes: 90,
            modalidadReunion: "VIRTUAL",
            estadoEvento: "PROGRAMADO",
            estadoCobertura: "CONFIRMADO",
            status: "waiting",
            joinUrl: "https://zoom.us/j/1234567890?pwd=abc",
            requiereAsistencia: true,
            monitorNombre: "Asistente Dos",
            monitorEmail: "asistente2@flacso.edu.uy"
          },
          {
            eventId: "evt-1",
            startTime: "2026-06-10T15:00:00.000Z",
            endTime: "2026-06-10T16:00:00.000Z",
            durationMinutes: 60,
            modalidadReunion: "VIRTUAL",
            estadoEvento: "PROGRAMADO",
            estadoCobertura: "REQUERIDO_SIN_ASIGNAR",
            status: "waiting",
            joinUrl: "https://zoom.us/j/1234567890?pwd=abc",
            requiereAsistencia: true,
            monitorNombre: null,
            monitorEmail: null
          }
        ]
      }
    ];

    const result = buildAgendaMeetings(solicitudes);

    expect(result).toHaveLength(2);
    expect(result[0]?.eventId).toBe("evt-1");
    expect(result[0]?.instanceIndex).toBe(1);
    expect(result[0]?.totalInstances).toBe(2);
    expect(result[0]?.zoomMeetingId).toBe("1234567890");
    expect(result[0]?.docenteNombre).toBe("Docente Uno");
    expect(result[1]?.monitorEmail).toBe("asistente2@flacso.edu.uy");
  });

  it("marks cancelled meetings, past meetings and fallback Zoom URLs consistently", () => {
    const solicitudes: Solicitud[] = [
      {
        id: "sol-cancelled",
        titulo: "Cancelada",
        modalidadReunion: "VIRTUAL",
        tipoInstancias: "UNICA",
        estadoSolicitud: "PROVISIONADA",
        estadoSolicitudVista: "CANCELADA_DOCENTE",
        requestedBy: null,
        requiereAsistencia: true,
        meetingPrincipalId: null,
        zoomJoinUrl: "https://us02web.zoom.us/j/9876543210?pwd=secret",
        createdAt: "2026-06-01T10:00:00.000Z",
        zoomInstances: [
          {
            eventId: "evt-cancelled",
            startTime: "2026-06-09T15:00:00.000Z",
            endTime: "2026-06-09T16:00:00.000Z",
            durationMinutes: 60,
            status: "waiting",
            estadoEvento: "PROGRAMADO",
            requiereAsistencia: null
          }
        ]
      },
      {
        id: "sol-past",
        titulo: "Pasada",
        modalidadReunion: "HIBRIDA",
        tipoInstancias: "UNICA",
        estadoSolicitud: "PROVISIONADA",
        requestedBy: {
          id: "docente-1",
          email: "docente@flacso.edu.uy",
          name: "Docente Uno"
        },
        requiresAsistencia: false,
        meetingPrincipalId: "123 456 7890",
        zoomJoinUrl: null,
        createdAt: "2026-06-01T10:00:00.000Z",
        zoomInstances: [
          {
            eventId: "evt-past",
            startTime: "2026-06-09T15:00:00.000Z",
            endTime: "2026-06-09T16:30:00.000Z",
            durationMinutes: 10,
            status: "waiting",
            estadoEvento: "PROGRAMADO",
            joinUrl: null
          }
        ]
      }
    ];

    const result = buildAgendaMeetings(solicitudes);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      eventId: "evt-cancelled",
      solicitudEstado: "CANCELADA_DOCENTE",
      isCancelled: true,
      isPast: false,
      zoomMeetingId: "9876543210",
      joinUrl: "https://zoom.us/j/9876543210",
      requiresAssistance: true
    });
    expect(result[1]).toMatchObject({
      eventId: "evt-past",
      isCancelled: false,
      isPast: true,
      durationMinutes: 90,
      zoomMeetingId: "1234567890",
      joinUrl: "https://zoom.us/j/1234567890",
      requiresAssistance: false,
      docenteEmail: "docente@flacso.edu.uy"
    });
  });

  it("skips instances with invalid start dates", () => {
    const result = buildAgendaMeetings([
      {
        id: "sol-invalid",
        titulo: "Sin fecha valida",
        modalidadReunion: "VIRTUAL",
        tipoInstancias: "UNICA",
        estadoSolicitud: "PROVISIONADA",
        createdAt: "2026-06-01T10:00:00.000Z",
        zoomInstances: [
          {
            eventId: "evt-invalid",
            startTime: "not-a-date",
            durationMinutes: 60
          }
        ]
      }
    ]);

    expect(result).toEqual([]);
  });

});
