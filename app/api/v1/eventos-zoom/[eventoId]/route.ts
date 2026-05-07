import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/src/lib/api-auth";
import { SalasService } from "@/src/modules/salas/service";

export const runtime = "nodejs";

type Params = { params: Promise<{ eventoId: string }> };

const bodySchema = z
  .object({
    titulo: z.string().trim().max(180).optional().or(z.literal("")),
    programaNombre: z.string().trim().max(180).optional().or(z.literal("")),
    responsableNombre: z.string().trim().max(180).optional().or(z.literal("")),
    descripcion: z.string().trim().max(5000).optional().or(z.literal("")),
    inicioProgramadoAt: z.string().trim().min(1).optional(),
    finProgramadoAt: z.string().trim().min(1).optional(),
    timezone: z.string().trim().max(80).optional().or(z.literal(""))
  })
  .refine(
    (value) =>
      value.titulo !== undefined ||
      value.programaNombre !== undefined ||
      value.responsableNombre !== undefined ||
      value.descripcion !== undefined ||
      value.inicioProgramadoAt !== undefined ||
      value.finProgramadoAt !== undefined ||
      value.timezone !== undefined,
    {
      message: "Debes enviar al menos un campo para actualizar."
    }
  );

export async function PATCH(request: Request, context: Params) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    const result = await service.updateUpcomingEvent(user, eventoId, {
      titulo: typeof parsed.data.titulo === "string" ? parsed.data.titulo : undefined,
      programaNombre:
        typeof parsed.data.programaNombre === "string"
          ? parsed.data.programaNombre
          : undefined,
      responsableNombre:
        typeof parsed.data.responsableNombre === "string"
          ? parsed.data.responsableNombre
          : undefined,
      descripcion:
        typeof parsed.data.descripcion === "string" ? parsed.data.descripcion : undefined,
      inicioProgramadoAt:
        typeof parsed.data.inicioProgramadoAt === "string"
          ? parsed.data.inicioProgramadoAt
          : undefined,
      finProgramadoAt:
        typeof parsed.data.finProgramadoAt === "string"
          ? parsed.data.finProgramadoAt
          : undefined,
      timezone: typeof parsed.data.timezone === "string" ? parsed.data.timezone : undefined
    });

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo actualizar la reunion." },
      { status: 400 }
    );
  }
}
