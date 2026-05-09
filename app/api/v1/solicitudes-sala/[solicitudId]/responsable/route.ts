import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/src/lib/api-auth";
import { SalasService } from "@/src/modules/salas/service";

export const runtime = "nodejs";

type Params = { params: Promise<{ solicitudId: string }> };

const bodySchema = z.object({
  responsableNombre: z
    .string()
    .trim()
    .min(1, "Debes seleccionar el nuevo docente a cargo.")
    .max(180),
  docenteCreadorNombre: z
    .string()
    .trim()
    .max(180)
    .optional()
    .or(z.literal(""))
});

export async function PATCH(request: Request, context: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role !== UserRole.ADMINISTRADOR) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Datos invalidos." },
      { status: 400 }
    );
  }

  try {
    const { solicitudId } = await context.params;
    const service = new SalasService();
    const result = await service.reassignRecurringSolicitudResponsable(user, solicitudId, {
      responsableNombre: parsed.data.responsableNombre,
      docenteCreadorNombre: parsed.data.docenteCreadorNombre?.trim() || undefined
    });
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          (error as Error).message ||
          "No se pudo mover la solicitud recurrente al nuevo docente."
      },
      { status: 400 }
    );
  }
}
