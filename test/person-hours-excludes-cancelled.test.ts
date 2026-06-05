import {
  EstadoAsignacion,
  EstadoEjecucionEvento,
  EstadoEventoZoom,
  EstadoSolicitudSala,
  ModalidadReunion,
  UserRole
} from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindMany: vi.fn(),
  rateFindMany: vi.fn(),
  assignmentFindMany: vi.fn()
}));

vi.mock("@/src/lib/db", () => ({
  db: {
    user: {
      findMany: mocks.userFindMany
    },
    tarifaAsistenciaGlobal: {
      findMany: mocks.rateFindMany
    },
    asignacionAsistente: {
      findMany: mocks.assignmentFindMany
    }
  }
}));

import { SalasLegacyService } from "@/src/modules/salas/domains/core/salas-legacy.service";

describe("SalasLegacyService.listPersonMeetingHours", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-05T12:00:00.000Z"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("excluye asignaciones de eventos cancelados del detalle del asistente", async () => {
    mocks.userFindMany.mockResolvedValue([
      {
        id: "user-avril",
        email: "avrilarias160504@gmail.com",
        role: UserRole.ASISTENTE_ZOOM,
        name: "Avril Arias",
        firstName: "Avril",
        lastName: "Arias",
        asistenteProfile: { id: "assistant-avril" }
      }
    ]);

    mocks.rateFindMany.mockResolvedValue([
      {
        id: "rate-virtual",
        modalidadReunion: ModalidadReunion.VIRTUAL,
        valorHora: 400,
        moneda: "UYU"
      },
      {
        id: "rate-hibrida",
        modalidadReunion: ModalidadReunion.HIBRIDA,
        valorHora: 500,
        moneda: "UYU"
      }
    ]);

    const cancelledAssignment = {
      id: "assignment-cancelled",
      estadoAsignacion: EstadoAsignacion.ASIGNADO,
      asistente: {
        usuarioId: "user-avril",
        usuario: {
          name: "Avril Arias",
          firstName: "Avril",
          lastName: "Arias",
          email: "avrilarias160504@gmail.com"
        }
      },
      evento: {
        id: "event-cancelled",
        solicitudSalaId: "sol-cancelled",
        modalidadReunion: ModalidadReunion.VIRTUAL,
        inicioProgramadoAt: new Date("2026-06-06T13:00:00.000Z"),
        finProgramadoAt: new Date("2026-06-06T15:00:00.000Z"),
        inicioRealAt: null,
        finRealAt: null,
        minutosReales: null,
        minutosReportados: null,
        comentariosReporte: null,
        estadoEvento: EstadoEventoZoom.CANCELADO,
        estadoEjecucion: EstadoEjecucionEvento.NO_INICIADO,
        timezone: "America/Montevideo",
        zoomMeetingId: "1111111111",
        zoomJoinUrl: "https://zoom.us/j/1111111111",
        zoomPayloadUltimo: null,
        requiereAsistencia: true,
        cuentaZoom: {
          ownerEmail: "web@flacso.edu.uy",
          nombreCuenta: "Cuenta Web"
        },
        solicitud: {
          titulo: "Género, interseccionalidad y determinación social de la salud",
          responsableNombre: "Programa Género",
          programaNombre: "Programa Género",
          requiereGrabacion: false,
          estadoSolicitud: EstadoSolicitudSala.CANCELADA_DOCENTE
        }
      }
    };

    const activeAssignment = {
      id: "assignment-active",
      estadoAsignacion: EstadoAsignacion.ASIGNADO,
      asistente: {
        usuarioId: "user-avril",
        usuario: {
          name: "Avril Arias",
          firstName: "Avril",
          lastName: "Arias",
          email: "avrilarias160504@gmail.com"
        }
      },
      evento: {
        id: "event-active",
        solicitudSalaId: "sol-active",
        modalidadReunion: ModalidadReunion.VIRTUAL,
        inicioProgramadoAt: new Date("2026-06-06T13:00:00.000Z"),
        finProgramadoAt: new Date("2026-06-06T15:00:00.000Z"),
        inicioRealAt: null,
        finRealAt: null,
        minutosReales: null,
        minutosReportados: null,
        comentariosReporte: null,
        estadoEvento: EstadoEventoZoom.PROGRAMADO,
        estadoEjecucion: EstadoEjecucionEvento.NO_INICIADO,
        timezone: "America/Montevideo",
        zoomMeetingId: "2222222222",
        zoomJoinUrl: "https://zoom.us/j/2222222222",
        zoomPayloadUltimo: null,
        requiereAsistencia: true,
        cuentaZoom: {
          ownerEmail: "web@flacso.edu.uy",
          nombreCuenta: "Cuenta Web"
        },
        solicitud: {
          titulo: "Género, interseccionalidad y determinación social de la salud -",
          responsableNombre: "Programa Género",
          programaNombre: "Programa Género",
          requiereGrabacion: false,
          estadoSolicitud: EstadoSolicitudSala.PROVISIONADA
        }
      }
    };

    mocks.assignmentFindMany
      .mockResolvedValueOnce([cancelledAssignment, activeAssignment])
      .mockResolvedValueOnce([cancelledAssignment, activeAssignment]);

    const service = new SalasLegacyService();
    const result = await service.listPersonMeetingHours({ userId: "user-avril" });

    expect(result.selectedUserId).toBe("user-avril");
    expect(result.meetings).toHaveLength(1);
    expect(result.meetings[0]?.assignmentId).toBe("assignment-active");
    expect(result.meetings[0]?.eventId).toBe("event-active");
    expect(result.meetings.some((meeting) => meeting.eventId === "event-cancelled")).toBe(false);
  });
});
