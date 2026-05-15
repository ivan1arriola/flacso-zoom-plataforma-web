import { NextResponse } from "next/server";
import { getSessionUser } from "@/src/lib/api-auth";
import { updateCurrentInVault } from "@/src/lib/auth/vault";

export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "No session active" });
    }

    await updateCurrentInVault({
      email: user.email,
      name: user.name,
      image: user.image,
      role: user.role,
      firstName: (user as any).firstName,
      lastName: (user as any).lastName
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error syncing vault:", error);
    return NextResponse.json({ error: "No se pudo sincronizar la cuenta." }, { status: 500 });
  }
}
