import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/src/lib/api-auth";
import { SalasService } from "@/src/modules/salas/service";

export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (user.role !== UserRole.ADMINISTRADOR) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const service = new SalasService();
    // @ts-ignore: Method injected at runtime/build if not picked up by TS server immediately
    const result = await service.renotifyOpenAgenda(user);
    
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al renotificar a los asistentes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
