import { describe, expect, it } from "vitest";
import type { Solicitud } from "@/src/services/solicitudesApi";
import { buildAgendaMeetings } from "@/src/lib/admin-agenda";

describe("admin agenda", () => {
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
});
