/**
 * Limpieza de occurrence_id de las URLs de unión de Zoom en la base de datos.
 *
 * El parámetro occurrence_id en las join URLs es innecesario: Zoom identifica
 * las ocurrencias por meeting ID + hora. Esta limpieza lo elimina de todos los
 * registros (eventoZoom.zoomJoinUrl y solicitudSala-related join URLs).
 *
 * Uso:
 *   node scripts/clean-occurrence-id-from-urls.js           # dry-run
 *   node scripts/clean-occurrence-id-from-urls.js --fix     # aplicar cambios
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const DRY_RUN = !process.argv.includes("--fix");

function stripOccurrenceId(url) {
  if (!url || typeof url !== "string") return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("occurrence_id");
    const cleaned = parsed.toString();
    return cleaned !== url ? cleaned : url;
  } catch {
    return url;
  }
}

async function main() {
  console.log(`\n🧹 Limpieza de occurrence_id de join URLs`);
  console.log(`   Modo: ${DRY_RUN ? "DRY-RUN (sin cambios)" : "CORRECCIÓN (--fix)"}\n`);

  // ── 1. Find all eventoZoom records with occurrence_id in zoomJoinUrl ──
  const eventsWithOccurrence = await prisma.$queryRaw`
    SELECT id, "zoomJoinUrl"
    FROM "EventoZoom"
    WHERE "zoomJoinUrl" LIKE '%occurrence_id=%'
  `;

  console.log(`   Eventos con occurrence_id en zoomJoinUrl: ${eventsWithOccurrence.length}`);

  if (eventsWithOccurrence.length > 0) {
    for (const ev of eventsWithOccurrence) {
      const cleaned = stripOccurrenceId(ev.zoomJoinUrl);
      if (DRY_RUN) {
        console.log(`   [DRY-RUN] ${ev.id}`);
        console.log(`     Antes: ${ev.zoomJoinUrl}`);
        console.log(`     Después: ${cleaned}`);
      } else {
        await prisma.$executeRaw`
          UPDATE "EventoZoom"
          SET "zoomJoinUrl" = ${cleaned}
          WHERE id = ${ev.id}
        `;
        console.log(`   ✅ ${ev.id}: ${ev.zoomJoinUrl} → ${cleaned}`);
      }
    }
  }

  // ── 2. Also check solicitudSala-related fields if any ──
  // (no explicit joinUrl field on solicitudSala, but check for safety)

  if (DRY_RUN && eventsWithOccurrence.length > 0) {
    console.log(`\n💡 Para aplicar, ejecutá: node scripts/clean-occurrence-id-from-urls.js --fix\n`);
  } else if (eventsWithOccurrence.length === 0) {
    console.log(`\n✅ No hay occurrence_id que limpiar.\n`);
  } else {
    console.log(`\n✅ ${eventsWithOccurrence.length} URLs limpiadas.\n`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Error fatal:", e);
  process.exit(1);
});
