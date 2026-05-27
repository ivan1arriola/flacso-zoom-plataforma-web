import { NextResponse } from "next/server";
import { getSessionUser } from "@/src/lib/api-auth";
import { SalasService } from "@/src/modules/salas/service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const includeAdminZoomAlerts = searchParams.get("includeAdminZoomAlerts") === "1";
  const service = new SalasService();
  const summary = await service.getDashboardSummary(user, {
    includeAdminZoomAlerts
  });
  return NextResponse.json({ summary });
}
