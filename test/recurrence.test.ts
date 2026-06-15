import { describe, expect, it } from "vitest";

import {
  buildRecurrenceSummary,
  buildRecurringStarts,
  getZoomWeekday,
  parseWeekdaysCsv
} from "@/src/lib/spa-home/recurrence";

function localDateTimeKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

describe("spa-home recurrence helpers", () => {
  it("parsea dias Zoom desde CSV ignorando duplicados y valores fuera de rango", () => {
    expect(parseWeekdaysCsv("2, 4, 4, 9, x, 1")).toEqual([1, 2, 4]);
  });

  it("mapea Date.getDay a los valores de weekday de Zoom", () => {
    expect(getZoomWeekday(new Date("2026-06-14T10:00:00"))).toBe(1);
    expect(getZoomWeekday(new Date("2026-06-15T10:00:00"))).toBe(2);
  });

  it("genera recurrencias semanales agregando el dia inicial aunque no venga seleccionado", () => {
    const starts = buildRecurringStarts({
      firstStart: new Date("2026-06-01T10:00:00"),
      recurrenceEnd: new Date("2026-06-10T10:00:00"),
      recurrenceType: "2",
      repeatInterval: 1,
      weeklyDays: [4],
      monthlyMode: "DAY_OF_MONTH",
      monthlyDay: 1,
      monthlyWeek: 1,
      monthlyWeekDay: 2
    });

    expect(starts.map(localDateTimeKey)).toEqual([
      "2026-06-01T10:00",
      "2026-06-03T10:00",
      "2026-06-08T10:00",
      "2026-06-10T10:00"
    ]);
  });

  it("respeta intervalo de semanas", () => {
    const starts = buildRecurringStarts({
      firstStart: new Date("2026-06-01T10:00:00"),
      recurrenceEnd: new Date("2026-06-30T10:00:00"),
      recurrenceType: "2",
      repeatInterval: 2,
      weeklyDays: [2, 4],
      monthlyMode: "DAY_OF_MONTH",
      monthlyDay: 1,
      monthlyWeek: 1,
      monthlyWeekDay: 2
    });

    expect(starts.map(localDateTimeKey)).toEqual([
      "2026-06-01T10:00",
      "2026-06-03T10:00",
      "2026-06-15T10:00",
      "2026-06-17T10:00",
      "2026-06-29T10:00"
    ]);
  });

  it("omite meses sin el dia solicitado en recurrencia mensual por dia de mes", () => {
    const starts = buildRecurringStarts({
      firstStart: new Date("2026-01-31T18:00:00"),
      recurrenceEnd: new Date("2026-04-30T18:00:00"),
      recurrenceType: "3",
      repeatInterval: 1,
      weeklyDays: [],
      monthlyMode: "DAY_OF_MONTH",
      monthlyDay: 31,
      monthlyWeek: 1,
      monthlyWeekDay: 2
    });

    expect(starts.map(localDateTimeKey)).toEqual([
      "2026-01-31T18:00",
      "2026-03-31T18:00"
    ]);
  });

  it("calcula la ultima ocurrencia de un dia de semana del mes", () => {
    const starts = buildRecurringStarts({
      firstStart: new Date("2026-01-30T09:00:00"),
      recurrenceEnd: new Date("2026-03-31T09:00:00"),
      recurrenceType: "3",
      repeatInterval: 1,
      weeklyDays: [],
      monthlyMode: "WEEKDAY_OF_MONTH",
      monthlyDay: 1,
      monthlyWeek: -1,
      monthlyWeekDay: 6
    });

    expect(starts.map(localDateTimeKey)).toEqual([
      "2026-01-30T09:00",
      "2026-02-27T09:00",
      "2026-03-27T09:00"
    ]);
  });

  it("mantiene el limite preventivo de 51 fechas para que el builder pueda rechazar mas de 50", () => {
    const starts = buildRecurringStarts({
      firstStart: new Date("2026-01-01T08:00:00"),
      recurrenceEnd: new Date("2026-12-31T08:00:00"),
      recurrenceType: "1",
      repeatInterval: 1,
      weeklyDays: [],
      monthlyMode: "DAY_OF_MONTH",
      monthlyDay: 1,
      monthlyWeek: 1,
      monthlyWeekDay: 2
    });

    expect(starts).toHaveLength(51);
  });

  it("resume recurrencias con los valores que espera la UI", () => {
    expect(
      buildRecurrenceSummary({
        recurrenceType: "2",
        repeatInterval: 1,
        weeklyDays: [2, 4],
        monthlyMode: "DAY_OF_MONTH",
        monthlyDay: 1,
        monthlyWeek: 1,
        monthlyWeekDay: 2,
        totalInstancias: 4,
        fechaFinal: "2026-06-10"
      })
    ).toBe("Recurrencia Zoom semanal cada 1 semana(s), dias Lun, Mie, hasta 2026-06-10 (4 instancias).");
  });
});
