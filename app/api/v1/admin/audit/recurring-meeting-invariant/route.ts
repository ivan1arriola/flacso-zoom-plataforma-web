import { NextResponse } from "next/server";
import { isAdminAuthorized } from "@/src/lib/api-auth";
import { db } from "@/src/lib/db";

export const runtime = "nodejs";

const RECURRING_INSTANCES = { not: "UNICA" as const };
const ACTIVE_STATES = [
  "REGISTRADA",
  "PROVISIONANDO",
  "PROVISIONADA",
  "PENDIENTE_RESOLUCION_MANUAL_ID",
] as const;

function normalize(val: string | null | undefined): string | null {
  if (!val) return null;
  const s = String(val).trim();
  return s.length > 0 ? s : null;
}

export async function GET() {
  if (!(await isAdminAuthorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const solicitudes = await db.solicitudSala.findMany({
    where: {
      tipoInstancias: RECURRING_INSTANCES,
      estadoSolicitud: { in: ACTIVE_STATES as any },
    },
    select: {
      id: true,
      titulo: true,
      meetingPrincipalId: true,
      cuentaZoomAsignadaId: true,
      tipoInstancias: true,
      estadoSolicitud: true,
      eventos: {
        select: {
          id: true,
          zoomMeetingId: true,
          cuentaZoomId: true,
          estadoEvento: true,
          inicioProgramadoAt: true,
        },
        orderBy: { inicioProgramadoAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const violations: {
    noPrincipalId: Array<{
      solicitudId: string;
      titulo: string;
      tipoInstancias: string;
      eventoCount: number;
    }>;
    wrongMeetingId: Array<{
      solicitudId: string;
      titulo: string;
      eventoId: string;
      fecha: string;
      instanceMeetingId: string;
      seriesMeetingId: string;
    }>;
    wrongAccount: Array<{
      solicitudId: string;
      titulo: string;
      eventoId: string;
      fecha: string;
      instanceAccountId: string;
      seriesAccountId: string;
    }>;
    missingMeetingId: Array<{
      solicitudId: string;
      titulo: string;
      eventoId: string;
      fecha: string;
      seriesMeetingId: string;
    }>;
  } = {
    noPrincipalId: [],
    wrongMeetingId: [],
    wrongAccount: [],
    missingMeetingId: [],
  };

  for (const sol of solicitudes) {
    const primary = normalize(sol.meetingPrincipalId);

    if (!primary) {
      violations.noPrincipalId.push({
        solicitudId: sol.id,
        titulo: sol.titulo,
        tipoInstancias: sol.tipoInstancias,
        eventoCount: sol.eventos.length,
      });
      continue;
    }

    for (const ev of sol.eventos) {
      if (ev.estadoEvento === "CANCELADO") continue;

      const evMeetingId = normalize(ev.zoomMeetingId);

      if (evMeetingId && evMeetingId !== primary) {
        violations.wrongMeetingId.push({
          solicitudId: sol.id,
          titulo: sol.titulo,
          eventoId: ev.id,
          fecha: ev.inicioProgramadoAt.toISOString(),
          instanceMeetingId: evMeetingId,
          seriesMeetingId: primary,
        });
      }

      if (!evMeetingId && primary) {
        violations.missingMeetingId.push({
          solicitudId: sol.id,
          titulo: sol.titulo,
          eventoId: ev.id,
          fecha: ev.inicioProgramadoAt.toISOString(),
          seriesMeetingId: primary,
        });
      }

      if (sol.cuentaZoomAsignadaId && ev.cuentaZoomId !== sol.cuentaZoomAsignadaId) {
        violations.wrongAccount.push({
          solicitudId: sol.id,
          titulo: sol.titulo,
          eventoId: ev.id,
          fecha: ev.inicioProgramadoAt.toISOString(),
          instanceAccountId: ev.cuentaZoomId,
          seriesAccountId: sol.cuentaZoomAsignadaId,
        });
      }
    }
  }

  const totalViolations =
    violations.noPrincipalId.length +
    violations.wrongMeetingId.length +
    violations.wrongAccount.length +
    violations.missingMeetingId.length;

  return NextResponse.json({
    totalSolicitudes: solicitudes.length,
    totalViolations,
    violations,
  });
}
