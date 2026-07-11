const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function describeDatabaseUrl() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    return "DATABASE_URL presente: no";
  }

  try {
    const parsed = new URL(rawUrl);
    const databaseName = parsed.pathname.replace(/^\/+/, "") || "(sin nombre)";
    return `DATABASE_URL presente: si; host: ${parsed.hostname || "(sin host)"}; base: ${databaseName}`;
  } catch {
    return "DATABASE_URL presente: si; formato: no parseable";
  }
}

function sanitizeForLog(value) {
  return String(value)
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[DATABASE_URL redactada]")
    .replace(/mysql:\/\/\S+/gi, "[DATABASE_URL redactada]")
    .replace(/mongodb(?:\+srv)?:\/\/\S+/gi, "[DATABASE_URL redactada]")
    .replace(/\/\/[^:/\s]+:[^@\s]+@/g, "//[credenciales]@");
}

async function main() {
  console.log("Ejecutando chequeo opt-in de Base de Datos...");
  console.log(describeDatabaseUrl());
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1 as result`;
    console.log("Conexion exitosa. La base de datos esta operativa.");
    process.exit(0);
  } catch (e) {
    console.error("No se pudo conectar a la base de datos.");
    console.error("TIP: si usas Neon con Pooler, revisa que DATABASE_URL tenga sslmode=require y pgbouncer=true.");
    console.error("Detalles del error:");
    console.error(sanitizeForLog(e && e.message ? e.message : e));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
