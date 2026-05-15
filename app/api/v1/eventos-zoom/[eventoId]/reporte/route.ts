import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/src/lib/api-auth";
import { SalasService } from "@/src/modules/salas/service";
import { UserRole } from "@prisma/client";

export const runtime = "nodejs";

type Params = { params: Promise<{ eventoId: string }> };

const bodySchema = z.object({
  minutosReportados: z.number().int().min(1).max(1440),
  comentariosReporte: z.string().trim().max(1000).optional()
});

export async function POST(request: Request, context: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Roles permitidos para reportar
  const allowedRoles: UserRole[] = [UserRole.ADMINISTRADOR, UserRole.CONTADURIA, UserRole.ASISTENTE_ZOOM];
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rawBody = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos invalidos." },
      { status: 400 }
    );
  }

  try {
    const { eventoId } = await context.params;
    const service = new SalasService();
    await service.reportMeetingDuration(user, eventoId, {
      minutosReportados: parsed.data.minutosReportados,
      comentariosReporte: parsed.data.comentariosReporte
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo registrar el reporte." },
      { status: 400 }
    );
  }
}
