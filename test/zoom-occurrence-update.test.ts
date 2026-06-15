import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dbEventoZoomFindUnique: vi.fn(),
  zoomUpdateMeeting: vi.fn(),
  zoomGetMeeting: vi.fn(),
  fetchZoomMeetingSnapshot: vi.fn(),
}));

vi.mock("@/src/lib/db", () => ({
  db: {
    user: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    notificacion: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    eventoZoom: {
      findUnique: mocks.dbEventoZoomFindUnique,
      update: vi.fn().mockResolvedValue({}),
    },
    asignacionAsistente: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    tarifaAsistenciaGlobal: {
      findFirst: vi.fn().mockResolvedValue({ montoPorMinuto: 10 }),
    },
    $transaction: vi.fn().mockImplementation(async (callback) => {
      // Mock the transaction callback by calling it with the db mock itself
      return callback({
        eventoZoom: { 
          update: vi.fn().mockResolvedValue({}),
          findMany: vi.fn().mockResolvedValue([])
        },
        solicitudSala: { update: vi.fn().mockResolvedValue({}) },
        asignacionAsistente: { updateMany: vi.fn().mockResolvedValue({}) },
        auditoria: { create: vi.fn().mockResolvedValue({}) },
      });
    }),
  },
}));

vi.mock("@/src/lib/zoom-meetings.client", () => ({
  ZoomMeetingsClient: {
    fromAccountCredentials: vi.fn().mockResolvedValue({
      updateMeeting: mocks.zoomUpdateMeeting,
      getMeeting: mocks.zoomGetMeeting,
    }),
  },
}));

// We need to partially mock the file so we can intercept fetchZoomMeetingSnapshot, 
// but since it's not exported, we'll just mock the zoom getMeeting response directly 
// so the internal fetchZoomMeetingSnapshot works.
import { SalasLegacyService } from "@/src/modules/salas/domains/core/salas-legacy.service";
import { UserRole } from "@prisma/client";

describe("SalasLegacyService.updateUpcomingEvent - specific occurrence update", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("extracts target occurrence and updates the specific instance in Zoom", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-14T00:00:00Z"));

    // Mock the DB event
    mocks.dbEventoZoomFindUnique.mockResolvedValue({
      id: "evt-master",
      solicitudSalaId: "sol-1",
      modalidadReunion: "VIRTUAL",
      inicioProgramadoAt: new Date("2026-06-06T10:00:00Z"),
      finProgramadoAt: new Date("2026-06-06T12:00:00Z"),
      timezone: "America/Montevideo",
      requiereAsistencia: false,
      estadoCobertura: "NO_REQUIERE",
      estadoEvento: "PROGRAMADO",
      zoomMeetingId: null, // No dedicated
      zoomJoinUrl: "https://zoom.us/j/123",
      solicitud: {
        id: "sol-1",
        titulo: "Género, interseccionalidad y determinación social de la salud",
        programaNombre: "Programa A",
        meetingPrincipalId: "9876543210",
        createdByUserId: "user-docente",
        docente: { usuarioId: "user-docente" },
      },
      asignaciones: [],
    });

    // Mock Zoom API response for the series (to get occurrences)
    mocks.zoomGetMeeting.mockResolvedValue({
      id: 9876543210,
      join_url: "https://zoom.us/j/123",
      occurrences: [
        {
          occurrence_id: "occ-1",
          start_time: "2026-06-06T10:00:00Z",
          duration: 120,
          status: "available",
        },
        {
          occurrence_id: "occ-2",
          start_time: "2026-06-30T10:00:00Z",
          duration: 120,
          status: "available",
        },
      ],
    });

    mocks.zoomUpdateMeeting.mockResolvedValue(undefined);

    const service = new SalasLegacyService();
    
    // Admin user mock
    const userMock = {
      id: "user-admin",
      email: "admin@flacso.edu.uy",
      emails: ["admin@flacso.edu.uy"],
      name: "Admin",
      role: UserRole.ADMINISTRADOR,
    };

    // User edits the SECOND class (targetPreviousStart = 2026-06-30T10:00:00Z)
    // they want to change the start time to 18:00
    const result = await service.updateUpcomingEvent(userMock, "evt-master", {
      inicioProgramadoAt: "2026-06-30T18:00:00Z",
      finProgramadoAt: "2026-06-30T20:00:00Z",
      targetPreviousStart: "2026-06-30T10:00:00Z", 
      targetOccurrenceId: "occ-2", 
    });

    expect(result.updated).toBe(true);

    // Ensure the zoomClient.updateMeeting was called with the specific occurrence_id
    expect(mocks.zoomUpdateMeeting).toHaveBeenCalledWith(
      "9876543210", 
      expect.objectContaining({
        start_time: expect.any(String),
        duration: 120,
      }),
      { occurrence_id: "occ-2" }
    );
  });
});
