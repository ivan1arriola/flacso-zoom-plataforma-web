import { Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/src/lib/api-auth";
import { SalasService } from "@/src/modules/salas/service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const canAccess =
      user.role === UserRole.ASISTENTE_ZOOM ||
      user.role === UserRole.SOPORTE_ZOOM ||
      user.role === UserRole.ADMINISTRADOR;
    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const service = new SalasService();
    const agenda = await service.listOpenAgenda(user);
    return NextResponse.json({ agenda });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022") {
      return NextResponse.json(
        {
          error: "La base de datos no está sincronizada con el schema actual (columna faltante).",
          hint: "Ejecuta: npm run db:push",
          prismaCode: error.code
        },
        { status: 500 }
      );
    }

    const message = error instanceof Error ? error.message : "No se pudo obtener la agenda abierta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
