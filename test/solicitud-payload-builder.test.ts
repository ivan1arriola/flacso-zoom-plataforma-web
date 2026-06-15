import { describe, expect, it } from "vitest";

import {
  buildDocenteSolicitudPayload,
  parseSpecificDatesInput
} from "@/components/spa-tabs/solicitud-payload-builder";
import {
  DEFAULT_SOLICITUD_FORM,
  type SolicitudFormState
} from "@/src/lib/spa-home/solicitud-form";

function form(overrides: Partial<SolicitudFormState> = {}): SolicitudFormState {
  return {
    ...DEFAULT_SOLICITUD_FORM,
    tema: "Clase de prueba",
    responsable: "Ana Responsable",
    programa: "Diploma de prueba",
    modalidad: "VIRTUAL",
    asistenciaZoom: "SI",
    grabacion: "NO",
    ...overrides
  };
}

function localIso(day: string, time: string): string {
  return new Date(`${day}T${time}`).toISOString();
}

describe("solicitud payload builder", () => {
  it("parsea fechas especificas en formatos aceptados, ordena y deduplica", () => {
    expect(parseSpecificDatesInput("12/06, 2026-06-10; 12/06/2026", 2026)).toEqual({
      dates: ["2026-06-10", "2026-06-12"],
      errors: []
    });

    expect(parseSpecificDatesInput("31/02", 2026)).toEqual({
      dates: [],
      errors: ['Fecha invalida: "31/02". Usa DD/MM, DD/MM/AAAA o AAAA-MM-DD.']
    });
  });

  it("construye payload para una reunion unica", () => {
    const payload = buildDocenteSolicitudPayload({
      form: form({
        unaOVarias: "UNA",
        descripcionUnica: "Descripcion base",
        diaUnica: "2026-06-10",
        horaInicioUnica: "09:00",
        horaFinUnica: "10:30",
        salaEsperaAutorizados: "Invitada | invitada@flacso.edu.uy",
        grabacion: "SI"
      }),
      metadata: "Creado desde test",
      normalizedDocentesCorreos: "docente@flacso.edu.uy"
    });

    expect(payload).toMatchObject({
      titulo: "Clase de prueba",
      responsableNombre: "Ana Responsable",
      programaNombre: "Diploma de prueba",
      descripcion: "Descripcion base\n\nCreado desde test",
      finalidadAcademica: "Diploma de prueba",
      modalidadReunion: "VIRTUAL",
      tipoInstancias: "UNICA",
      fechaInicioSolicitada: localIso("2026-06-10", "09:00"),
      fechaFinSolicitada: localIso("2026-06-10", "10:30"),
      timezone: "America/Montevideo",
      docentesCorreos: "docente@flacso.edu.uy",
      grabacionPreferencia: "SI",
      requiereGrabacion: true,
      requiereAsistencia: true,
      motivoAsistencia: "Asistencia solicitada desde formulario docente.",
      salaEsperaPermitidos: [{ nombre: "Invitada", correo: "invitada@flacso.edu.uy" }]
    });
  });

  it("omite lista de sala de espera cuando la asistencia Zoom no fue solicitada", () => {
    const payload = buildDocenteSolicitudPayload({
      form: form({
        asistenciaZoom: "NO",
        unaOVarias: "UNA",
        diaUnica: "2026-06-10",
        horaInicioUnica: "09:00",
        duracionUnica: "60",
        salaEsperaAutorizados: "Invitada | invitada@flacso.edu.uy"
      }),
      metadata: ""
    });

    expect(payload.requiereAsistencia).toBe(false);
    expect(payload.motivoAsistencia).toBeUndefined();
    expect(payload.salaEsperaPermitidos).toBeUndefined();
  });

  it("construye payload para fechas especificas con horarios particulares por fecha", () => {
    const payload = buildDocenteSolicitudPayload({
      form: form({
        unaOVarias: "VARIAS",
        variasModo: "FECHAS_ESPECIFICAS",
        descripcionRecurrente: "Clases puntuales",
        fechasEspecificas: "12/06/2026, 10/06/2026",
        horaInicioRecurrente: "09:00",
        duracionRecurrente: "60",
        fechasEspecificasDetalle: JSON.stringify({
          "2026-06-12": {
            horaInicio: "14:00",
            horaFin: "16:30"
          }
        })
      }),
      metadata: ""
    });

    expect(payload.tipoInstancias).toBe("MULTIPLE_NO_COMPATIBLE_ZOOM");
    expect(payload.meetingIdEstrategia).toBe("UNICO_PREFERIDO");
    expect(payload.fechaInicioSolicitada).toBe(localIso("2026-06-10", "09:00"));
    expect(payload.fechaFinSolicitada).toBe(localIso("2026-06-10", "10:00"));
    expect(payload.fechasInstancias).toEqual([
      localIso("2026-06-10", "09:00"),
      localIso("2026-06-12", "14:00")
    ]);
    expect(payload.instanciasDetalle).toEqual([
      {
        inicioProgramadoAt: localIso("2026-06-10", "09:00"),
        finProgramadoAt: localIso("2026-06-10", "10:00")
      },
      {
        inicioProgramadoAt: localIso("2026-06-12", "14:00"),
        finProgramadoAt: localIso("2026-06-12", "16:30")
      }
    ]);
    expect(payload.regimenEncuentros).toContain("Fechas puntuales:");
  });

  it("construye payload recurrente compatible con Zoom y suma el dia ancla a weekly_days", () => {
    const payload = buildDocenteSolicitudPayload({
      form: form({
        unaOVarias: "VARIAS",
        variasModo: "RECURRENCIA_ZOOM",
        descripcionRecurrente: "Clases recurrentes",
        primerDiaRecurrente: "2026-06-01",
        horaInicioRecurrente: "10:00",
        horaFinRecurrente: "11:30",
        recurrenciaTipoZoom: "2",
        recurrenciaIntervalo: "1",
        recurrenciaDiasSemana: "4",
        fechaFinal: "2026-06-10"
      }),
      metadata: ""
    });

    expect(payload.tipoInstancias).toBe("MULTIPLE_COMPATIBLE_ZOOM");
    expect(payload.fechaInicioSolicitada).toBe(localIso("2026-06-01", "10:00"));
    expect(payload.fechaFinSolicitada).toBe(localIso("2026-06-01", "11:30"));
    expect(payload.patronRecurrencia).toEqual({
      totalInstancias: 4,
      fechaFinal: "2026-06-10",
      zoomRecurrence: {
        type: 2,
        repeat_interval: 1,
        weekly_days: "2,4",
        monthly_day: undefined,
        monthly_week: undefined,
        monthly_week_day: undefined,
        end_times: 4
      }
    });
    expect(payload.instanciasDetalle?.map((item) => item.inicioProgramadoAt)).toEqual([
      localIso("2026-06-01", "10:00"),
      localIso("2026-06-03", "10:00"),
      localIso("2026-06-08", "10:00"),
      localIso("2026-06-10", "10:00")
    ]);
  });

  it("rechaza configuraciones recurrentes que superan el maximo de Zoom", () => {
    expect(() =>
      buildDocenteSolicitudPayload({
        form: form({
          unaOVarias: "VARIAS",
          variasModo: "RECURRENCIA_ZOOM",
          primerDiaRecurrente: "2026-01-01",
          horaInicioRecurrente: "09:00",
          duracionRecurrente: "60",
          recurrenciaTipoZoom: "1",
          recurrenciaIntervalo: "1",
          fechaFinal: "2026-12-31"
        }),
        metadata: ""
      })
    ).toThrow("Zoom permite un maximo de 50 ocurrencias por reunion recurrente.");
  });

  it("propaga errores de validacion de sala de espera", () => {
    expect(() =>
      buildDocenteSolicitudPayload({
        form: form({
          unaOVarias: "UNA",
          diaUnica: "2026-06-10",
          horaInicioUnica: "09:00",
          duracionUnica: "60",
          salaEsperaAutorizados: "Ana | ana@@flacso"
        }),
        metadata: ""
      })
    ).toThrow("Sala de espera: correo inválido en la línea 1.");
  });
});
