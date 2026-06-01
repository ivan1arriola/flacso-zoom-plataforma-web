const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log("⚙️ [Deploy] Ejecutando test de integración de Base de Datos...");
  console.log("DATABASE_URL presente en env:", !!process.env.DATABASE_URL);
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1 as result`;
    console.log("✅ Conexión exitosa. La base de datos está operativa.");
    process.exit(0);
  } catch (e) {
    console.error("❌ FALLO CRÍTICO EN EL DEPLOY: No se pudo conectar a la base de datos.");
    console.error("💡 TIP: Si estás en Vercel y usas Neon con Pooler, asegúrate de que DATABASE_URL termine en '?sslmode=require&pgbouncer=true'");
    console.error("Detalles del error:");
    console.error(e.message || e);
    process.exit(1); // Salida con error 1 abortará el deploy (build step)
  } finally {
    await prisma.$disconnect();
  }
}

main();
