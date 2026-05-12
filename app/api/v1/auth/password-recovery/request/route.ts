import { NextResponse } from "next/server";
import { z } from "zod";
import { requestPasswordRecovery } from "@/src/modules/auth/registration.service";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email()
});

function resolveRequestOrigin(request: Request): string | undefined {
  const originHeader = request.headers.get("origin");
  if (originHeader) return originHeader;
  try {
    return new URL(request.url).origin;
  } catch {
    return undefined;
  }
}

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  try {
    const origin = resolveRequestOrigin(request);
    const result = await requestPasswordRecovery(parsed.data.email, origin);

    return NextResponse.json({
      ok: true,
      message: "Si el correo existe, enviamos instrucciones de recuperación.",
      resetUrl: result.resetUrl
    });
  } catch {
    return NextResponse.json({
      ok: true,
      message: "Si el correo existe, enviamos instrucciones de recuperación."
    });
  }
}
