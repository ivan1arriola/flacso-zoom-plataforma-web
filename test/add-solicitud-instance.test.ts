import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  EstadoEventoZoom,
  EstadoSolicitudSala,
  ModalidadReunion,
  TipoInstancias,
  UserRole
} from "@prisma/client";

const mocks = vi.hoisted(() => ({
  solicitudFindUnique: vi.fn(),
  cuentaFindUnique: vi.fn(),
  eventoCount: vi.fn(),
  transaction: vi.fn(),
  eventoCreate: vi.fn(),
  solicitudUpdate: vi.fn(),
  auditoriaCreate: vi.fn(),
  zoomGetMeeting: vi.fn(),
  zoomUpdateMeeting: vi.fn(),
  zoomFromCredentials: vi.fn(),
  notifyMovement: vi.fn()
}));

vi.mock("@/src/lib/db", () => ({
  db: {
    solicitudSala: {
      findUnique: mocks.solicitudFindUnique
    },
    cuentaZoom: {
      findUnique: mocks.cuentaFindUnique
    },
    eventoZoom: {
      count: mocks.eventoCount
    },
    $transaction: mocks.transaction
  }
}));

vi.mock("@/src/lib/zoom-meetings.client", () => ({
  ZoomApiError: class ZoomApiError extends Error {},
  ZoomMeetingsClient: {
    fromAccountCredentials: mocks.zoomFromCredentials
  }
}));

vi.mock("@/src/lib/admin-notifications.client", () => ({
  notifyAdminInAppMovement: mocks.notifyMovement
}));

import { SalasLegacyService } from "@/src/modules/salas/domains/core/salas-legacy.service";

const MEETING_ID = "81764908424";
const TARGET_START = "2026-11-26T21:15:00.000Z";
const TARGET_END = "2026-11-27T00:00:00.000Z";

function occurrence(index: number, status = "available") {
  const start = new Date("2026-08-20T21:15:00.000Z");
  start.setUTCDate(start.getUTCDate() + index * 7);
  return {
    occurrence_id: String(start.getTime()),
    start_time: start.toISOString(),
    duration: 165,
    status
  };
}

function zoomMeeting(endTimes: number, lastStatus = "available") {
  return {
    id: Number(MEETING_ID),
    type: 8,
    timezone: "America/Montevideo",
    join_url: `https://zoom.us/j/${MEETING_ID}`,
    start_url: `https://zoom.us/s/${MEETING_ID}`,
    duration: 165,
    recurrence: {
      type: 2,
      repeat_interval: 1,
      weekly_days: "5",
      end_times: endTimes
    },
    occurrences: Array.from(
      { length: endTimes },
      (_, index) => occurrence(index, index === endTimes - 1 ? lastStatus : "available")
    )
  };
}

function solicitudFixture() {
  const eventos = Array.from({ length: 14 }, (_, index) => {
    const start = new Date("2026-08-20T21:15:00.000Z");
    start.setUTCDate(start.getUTCDate() + index * 7);
    return {
      id: `event-${index + 1}`,
      cuentaZoomId: "zoom-account-1",
      inicioProgramadoAt: start,
      finProgramadoAt: new Date(start.getTime() + 165 * 60_000),
      estadoEvento: EstadoEventoZoom.PROGRAMADO,
      zoomMeetingId: index === 0 ? MEETING_ID : null,
      zoomJoinUrl: `https://zoom.us/j/${MEETING_ID}`
    };
  });

  return {
    id: "solicitud-1",
    titulo: "Diploma de especializacion abordaje de las violencias hacia NNA",
    estadoSolicitud: EstadoSolicitudSala.PROVISIONADA,
    modalidadReunion: ModalidadReunion.VIRTUAL,
    tipoInstancias: TipoInstancias.MULTIPLE_COMPATIBLE_ZOOM,
    timezone: "America/Montevideo",
    meetingPrincipalId: MEETING_ID,
    requiereAsistencia: false,
    requiereGrabacion: false,
    cuentaZoomAsignadaId: "zoom-account-1",
    fechaInicioSolicitada: eventos[0].inicioProgramadoAt,
    fechaFinSolicitada: eventos[0].finProgramadoAt,
    eventos
  };
}

const admin = {
  id: "admin-1",
  email: "admin@flacso.edu.uy",
  emails: ["admin@flacso.edu.uy"],
  name: "Admin",
  firstName: "Admin",
  lastName: "FLACSO",
  role: UserRole.ADMINISTRADOR
};

describe("SalasLegacyService.addSolicitudInstance", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-27T15:00:00.000Z"));
    vi.clearAllMocks();

    mocks.solicitudFindUnique.mockResolvedValue(solicitudFixture());
    mocks.cuentaFindUnique.mockResolvedValue({ id: "zoom-account-1" });
    mocks.eventoCount.mockResolvedValue(0);
    mocks.eventoCreate.mockResolvedValue({ id: "event-15" });
    mocks.solicitudUpdate.mockResolvedValue({});
    mocks.auditoriaCreate.mockResolvedValue({});
    mocks.notifyMovement.mockResolvedValue(undefined);
    mocks.zoomUpdateMeeting.mockResolvedValue(undefined);
    mocks.zoomFromCredentials.mockResolvedValue({
      getMeeting: mocks.zoomGetMeeting,
      updateMeeting: mocks.zoomUpdateMeeting
    });
    mocks.transaction.mockImplementation(async (callback) => callback({
      eventoZoom: { create: mocks.eventoCreate },
      solicitudSala: { update: mocks.solicitudUpdate },
      auditoria: { create: mocks.auditoriaCreate }
    }));
  });

  it("extends the Zoom recurrence but stores the secondary event without duplicating the unique meeting ID", async () => {
    mocks.zoomGetMeeting
      .mockResolvedValueOnce(zoomMeeting(14))
      .mockResolvedValueOnce(zoomMeeting(15));

    const result = await new SalasLegacyService().addSolicitudInstance(admin, "solicitud-1", {
      inicioProgramadoAt: TARGET_START,
      finProgramadoAt: TARGET_END
    });

    expect(mocks.zoomUpdateMeeting).toHaveBeenCalledWith(MEETING_ID, {
      recurrence: expect.objectContaining({ end_times: 15 })
    });
    expect(mocks.eventoCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        zoomMeetingId: null,
        zoomJoinUrl: `https://zoom.us/j/${MEETING_ID}`
      })
    });
    expect(result).toEqual(expect.objectContaining({
      cantidadInstancias: 15,
      usaMeetingPrincipal: true,
      zoomMeetingId: MEETING_ID
    }));
  });

  it("regenerates a deleted tail occurrence before creating the local event", async () => {
    mocks.zoomGetMeeting
      .mockResolvedValueOnce(zoomMeeting(15, "deleted"))
      .mockResolvedValueOnce(zoomMeeting(14))
      .mockResolvedValueOnce(zoomMeeting(15));

    await new SalasLegacyService().addSolicitudInstance(admin, "solicitud-1", {
      inicioProgramadoAt: TARGET_START,
      finProgramadoAt: TARGET_END
    });

    expect(mocks.zoomUpdateMeeting).toHaveBeenNthCalledWith(1, MEETING_ID, {
      recurrence: expect.objectContaining({ end_times: 14 })
    });
    expect(mocks.zoomUpdateMeeting).toHaveBeenNthCalledWith(2, MEETING_ID, {
      recurrence: expect.objectContaining({ end_times: 15 })
    });
    expect(mocks.eventoCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ zoomMeetingId: null })
    });
  });

  it("restores the original recurrence instead of deleting an occurrence when the local transaction fails", async () => {
    mocks.zoomGetMeeting
      .mockResolvedValueOnce(zoomMeeting(14))
      .mockResolvedValueOnce(zoomMeeting(15));
    mocks.transaction.mockRejectedValueOnce(new Error("local transaction failed"));

    await expect(
      new SalasLegacyService().addSolicitudInstance(admin, "solicitud-1", {
        inicioProgramadoAt: TARGET_START,
        finProgramadoAt: TARGET_END
      })
    ).rejects.toThrow("local transaction failed");

    expect(mocks.zoomUpdateMeeting).toHaveBeenNthCalledWith(1, MEETING_ID, {
      recurrence: expect.objectContaining({ end_times: 15 })
    });
    expect(mocks.zoomUpdateMeeting).toHaveBeenNthCalledWith(2, MEETING_ID, {
      recurrence: expect.objectContaining({ end_times: 14 })
    });
  });
});
