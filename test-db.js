const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_yn4SXZc7UguI@ep-odd-butterfly-angmdooj-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    }
  }
});

async function main() {
  console.log("Intentando conectar a la base de datos...");
  try {
    await prisma.$connect();
    console.log("✅ Conexión exitosa a la base de datos!");
    
    // Intenta hacer una consulta simple
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    console.log("✅ Consulta de prueba exitosa:", result);
  } catch (e) {
    console.error("❌ Fallo en la conexión a la base de datos:");
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
