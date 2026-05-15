import { NextResponse } from "next/server";
import { removeFromVault } from "@/src/lib/auth/vault";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email es requerido" }, { status: 400 });
    }

    await removeFromVault(email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error removing account from vault:", error);
    return NextResponse.json({ error: "Error interno al quitar la cuenta." }, { status: 500 });
  }
}
