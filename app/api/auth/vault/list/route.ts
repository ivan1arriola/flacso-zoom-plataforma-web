import { NextResponse } from "next/server";
import { getVaultIdentities } from "@/src/lib/auth/vault";

export const runtime = "nodejs";

export async function GET() {
  try {
    const identities = await getVaultIdentities();
    return NextResponse.json({ identities });
  } catch (error) {
    console.error("Error listing vault:", error);
    return NextResponse.json({ error: "No se pudo obtener la lista de cuentas." }, { status: 500 });
  }
}
