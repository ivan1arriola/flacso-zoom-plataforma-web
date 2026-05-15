import { NextResponse } from "next/server";
import { switchSession } from "@/src/lib/auth/vault";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email es requerido" }, { status: 400 });
    }

    const success = await switchSession(email);
    if (!success) {
      return NextResponse.json({ error: "No se pudo cambiar de cuenta. Es posible que la sesion haya expirado." }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error switching account:", error);
    return NextResponse.json({ error: "Error interno al cambiar de cuenta." }, { status: 500 });
  }
}
