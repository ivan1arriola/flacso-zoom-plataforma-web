import { describe, expect, it } from "vitest";

import {
  detectZoomUpcomingOverlaps,
  normalizeZoomUpcomingEvents,
  type ZoomUpcomingEvent
} from "@/src/lib/zoom-upcoming";

describe("zoom upcoming helpers", () => {
  it("normaliza reuniones Zoom, descarta fechas invalidas y ordena por inicio", () => {
    const result = normalizeZoomUpcomingEvents([
      {
        id: "987 654 3210",
        uuid: "uuid-2",
        occurrence_id: "occ-2",
        topic: "Segunda",
        start_time: "2026-06-11T15:00:00Z",
        duration: "90",
        timezone: "America/Montevideo",
        join_url: "https://zoom.us/j/9876543210",
        status: "waiting",
        type: "8"
      },
      {
        id: "1234567890",
        topic: "Primera",
        start_time: "2026-06-10T15:00:00Z",
        duration: 45.8,
        type: 2
      },
      {
        id: "no-valida",
        topic: "Sin fecha",
        start_time: "not-a-date"
      }
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: "1234567890:2026-06-10T15:00:00.000Z",
      meetingId: "1234567890",
      topic: "Primera",
      startTime: "2026-06-10T15:00:00.000Z",
      endTime: "2026-06-10T15:45:00.000Z",
      durationMinutes: 45,
      meetingType: 2,
      meetingKind: "UNICA"
    });
    expect(result[1]).toMatchObject({
      id: "9876543210:occ-2",
      meetingId: "9876543210",
      meetingUuid: "uuid-2",
      occurrenceId: "occ-2",
      durationMinutes: 90,
      meetingType: 8,
      meetingKind: "RECURRENTE"
    });
  });

  it("detecta solapamientos sin marcar reuniones contiguas", () => {
    const events: ZoomUpcomingEvent[] = [
      event("a", "2026-06-10T10:00:00Z", "2026-06-10T11:00:00Z"),
      event("b", "2026-06-10T10:30:00Z", "2026-06-10T12:00:00Z"),
      event("c", "2026-06-10T12:00:00Z", "2026-06-10T13:00:00Z")
    ];

    expect(detectZoomUpcomingOverlaps(events)).toEqual({
      overlapCount: 1,
      overlappingEventIds: ["a", "b"],
      overlaps: [
        {
          firstEventId: "a",
          secondEventId: "b",
          firstStartTime: "2026-06-10T10:00:00Z",
          secondStartTime: "2026-06-10T10:30:00Z",
          overlapStartTime: "2026-06-10T10:30:00.000Z",
          overlapEndTime: "2026-06-10T11:00:00.000Z"
        }
      ]
    });
  });
});

function event(id: string, startTime: string, endTime: string): ZoomUpcomingEvent {
  return {
    id,
    meetingId: id,
    meetingUuid: null,
    occurrenceId: null,
    topic: id,
    startTime,
    endTime,
    durationMinutes: Math.floor((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60_000),
    timezone: "UTC",
    joinUrl: "",
    status: "waiting",
    meetingType: 2,
    meetingKind: "UNICA"
  };
}
