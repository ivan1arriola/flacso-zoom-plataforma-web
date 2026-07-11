/**
 * Auditoría de invariante: reuniones recurrentes deben tener mismo host e ID.
 *
 * Detecta:
 *  1. Instancias con zoomMeetingId distinto al meetingPrincipalId de la solicitud
 *  2. Instancias con cuentaZoomId distinta a cuentaZoomAsignadaId de la solicitud
 *  3. Solicitudes recurrentes sin meetingPrincipalId (serie rota)
 *  4. Instancias con zoomMeetingId null cuando la serie tiene un meetingPrincipalId
 *
 * Uso:
 *   node scripts/audit-recurring-meeting-invariant.js           # solo detección
 *   node scripts/audit-recurring-meeting-invariant.js --fix     # detección + corrección
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const DRY_RUN = !process.argv.includes("--fix");

const RECURRING_INSTANCES = { not: "UNICA" };
const ACTIVE_STATES = [
  "REGISTRADA",
  "PROVISIONANDO",
  "PROVISIONADA",
  "PENDIENTE_RESOLUCION_MANUAL_ID",
];

async function main() {
  console.log(`\n🔍 Auditoría de invariante de serie recurrente`);
  console.log(`   Modo: ${DRY_RUN ? "DETECCIÓN (dry-run)" : "CORRECCIÓN (--fix)"}\n`);

  // ── 1. Find all recurring solicitudes with active or provisioned state ──
  const solicitudes = await prisma.solicitudSala.findMany({
    where: {
      tipoInstancias: RECURRING_INSTANCES,
      estadoSolicitud: { in: ACTIVE_STATES },
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

  console.log(`   Solicitudes recurrentes encontradas: ${solicitudes.length}\n`);

  const violations = {
    noPrincipalId: [],           // series sin meetingPrincipalId
    wrongMeetingId: [],          // instances with zoomMeetingId != meetingPrincipalId
    wrongAccount: [],            // instances with cuentaZoomId != cuentaZoomAsignadaId
    missingMeetingId: [],        // instances with null zoomMeetingId but series has one
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

      // Check: instance has a different meeting ID than the series
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

      // Check: instance has null meeting ID but series has one
      if (!evMeetingId && primary) {
        violations.missingMeetingId.push({
          solicitudId: sol.id,
          titulo: sol.titulo,
          eventoId: ev.id,
          fecha: ev.inicioProgramadoAt.toISOString(),
          seriesMeetingId: primary,
        });
      }

      // Check: instance account differs from series account
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

  // ── Report ──
  let totalViolations = 0;

  if (violations.noPrincipalId.length > 0) {
    totalViolations += violations.noPrincipalId.length;
    console.log(`\n⚠️  SERIES SIN meetingPrincipalId (${violations.noPrincipalId.length}):`);
    console.log(`   Estas series no tienen un ID principal de Zoom definido.\n`);
    for (const v of violations.noPrincipalId) {
      console.log(`   - [${v.solicitudId}] "${v.titulo}" (${v.tipoInstancias}, ${v.eventoCount} instancias)`);
    }
  }

  if (violations.wrongMeetingId.length > 0) {
    totalViolations += violations.wrongMeetingId.length;
    console.log(`\n❌ INSTANCIAS CON ID DIFERENTE AL DE LA SERIE (${violations.wrongMeetingId.length}):`);
    console.log(`   Estas instancias tienen un zoomMeetingId distinto al meetingPrincipalId.\n`);
    for (const v of violations.wrongMeetingId) {
      console.log(`   - [${v.solicitudId}] "${v.titulo}"`);
      console.log(`     Evento: ${v.eventoId} (${v.fecha})`);
      console.log(`     Instance: ${v.instanceMeetingId} | Series: ${v.seriesMeetingId}`);
    }
  }

  if (violations.missingMeetingId.length > 0) {
    totalViolations += violations.missingMeetingId.length;
    console.log(`\n🟡 INSTANCIAS SIN ID PERO SERIE TIENE UNO (${violations.missingMeetingId.length}):`);
    console.log(`   Estas instancias no tienen zoomMeetingId pero la serie sí tiene meetingPrincipalId.\n`);
    for (const v of violations.missingMeetingId) {
      console.log(`   - [${v.solicitudId}] "${v.titulo}"`);
      console.log(`     Evento: ${v.eventoId} (${v.fecha}) | Series: ${v.seriesMeetingId}`);
    }
  }

  if (violations.wrongAccount.length > 0) {
    totalViolations += violations.wrongAccount.length;
    console.log(`\n❌ INSTANCIAS CON CUENTA DIFERENTE A LA SERIE (${violations.wrongAccount.length}):`);
    console.log(`   Estas instancias usan una cuenta Zoom distinta a cuentaZoomAsignadaId.\n`);
    for (const v of violations.wrongAccount) {
      console.log(`   - [${v.solicitudId}] "${v.titulo}"`);
      console.log(`     Evento: ${v.eventoId} (${v.fecha})`);
      console.log(`     Instance account: ${v.instanceAccountId} | Series account: ${v.seriesAccountId}`);
    }
  }

  if (totalViolations === 0) {
    console.log(`\n✅ No se encontraron violaciones del invariante.\n`);
    await prisma.$disconnect();
    return;
  }

  console.log(`\n📊 Total de violaciones: ${totalViolations}\n`);

  // ── Fix ──
  if (DRY_RUN) {
    console.log(`💡 Para corregir, ejecutá: node scripts/audit-recurring-meeting-invariant.js --fix\n`);
    await prisma.$disconnect();
    return;
  }

  console.log(`\n🔧 Aplicando correcciones...\n`);
  let fixed = 0;

  // Fix wrongMeetingId: overwrite instance's zoomMeetingId with the series primary
  for (const v of violations.wrongMeetingId) {
    try {
      await prisma.eventoZoom.update({
        where: { id: v.eventoId },
        data: { zoomMeetingId: v.seriesMeetingId },
      });
      console.log(`   ✅ Corregido zoomMeetingId en evento ${v.eventoId} → ${v.seriesMeetingId}`);
      fixed++;
    } catch (e) {
      console.error(`   ❌ Error al corregir evento ${v.eventoId}: ${e.message}`);
    }
  }

  // Fix missingMeetingId: set instance's zoomMeetingId to the series primary
  for (const v of violations.missingMeetingId) {
    try {
      await prisma.eventoZoom.update({
        where: { id: v.eventoId },
        data: { zoomMeetingId: v.seriesMeetingId },
      });
      console.log(`   ✅ Asignado zoomMeetingId en evento ${v.eventoId} → ${v.seriesMeetingId}`);
      fixed++;
    } catch (e) {
      console.error(`   ❌ Error al corregir evento ${v.eventoId}: ${e.message}`);
    }
  }

  // Fix wrongAccount: overwrite instance's cuentaZoomId with the series account
  for (const v of violations.wrongAccount) {
    try {
      await prisma.eventoZoom.update({
        where: { id: v.eventoId },
        data: { cuentaZoomId: v.seriesAccountId },
      });
      console.log(`   ✅ Corregido cuentaZoomId en evento ${v.eventoId} → ${v.seriesAccountId}`);
      fixed++;
    } catch (e) {
      console.error(`   ❌ Error al corregir evento ${v.eventoId}: ${e.message}`);
    }
  }

  // noPrincipalId cases cannot be auto-fixed — they need manual resolution
  if (violations.noPrincipalId.length > 0) {
    console.log(`\n   ⚠️  ${violations.noPrincipalId.length} series sin meetingPrincipalId requieren revisión manual.`);
    console.log(`   Estas series necesitan que se defina un ID principal de Zoom antes de poder operar.\n`);
  }

  console.log(`\n✅ Corregidos ${fixed} de ${totalViolations} violaciones.\n`);
  await prisma.$disconnect();
}

function normalize(val) {
  if (!val) return null;
  const s = String(val).trim();
  return s.length > 0 ? s : null;
}

main().catch((e) => {
  console.error("Error fatal:", e);
  process.exit(1);
});
