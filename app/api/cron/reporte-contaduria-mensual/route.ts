import { NextResponse } from "next/server";
import { EmailClient } from "@/src/lib/email.client";
import { env } from "@/src/lib/env";
import { SalasService } from "@/src/modules/salas/service";

export const runtime = "nodejs";
const ACCOUNTING_REPORT_NOTIFY_EMAIL = "web@flacso.edu.uy";
const MONTEVIDEO_TIMEZONE = "America/Montevideo";

function formatMontevideoDateTime(date: Date): string {
  return new Intl.DateTimeFormat("es-UY", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: MONTEVIDEO_TIMEZONE
  }).format(date);
}

async function sendCronNotificationEmail(input: {
  ok: boolean;
  monthKey?: string;
  fileName?: string;
  driveWebViewLink?: string | null;
  driveFolderId?: string;
  error?: string;
}) {
  const emailClient = new EmailClient();
  const sentAt = formatMontevideoDateTime(new Date());
  const subject = input.ok
    ? `Informe mensual de contaduria subido (${input.monthKey ?? "mes anterior"})`
    : `Fallo al subir informe mensual de contaduria (${input.monthKey ?? "mes anterior"})`;

  const fileLinkHtml = input.driveWebViewLink
    ? `<p style="margin:0 0 12px;"><a href="${input.driveWebViewLink}">Abrir archivo en Google Drive</a></p>`
    : "";
  const folderLineHtml = input.driveFolderId
    ? `<p style="margin:0 0 12px;color:#223042;"><strong>Carpeta destino:</strong> ${input.driveFolderId}</p>`
    : "";

  const html = input.ok
    ? `
      <div style="font-family:Arial,sans-serif;color:#223042;line-height:1.5">
        <h2 style="margin:0 0 12px;">Informe mensual subido correctamente</h2>
        <p style="margin:0 0 12px;">El cron mensual subio el informe de contaduria a Google Drive.</p>
        <p style="margin:0 0 6px;"><strong>Mes liquidado:</strong> ${input.monthKey ?? "mes anterior"}</p>
        <p style="margin:0 0 6px;"><strong>Archivo:</strong> ${input.fileName ?? "sin nombre"}</p>
        <p style="margin:0 0 12px;"><strong>Fecha de ejecucion:</strong> ${sentAt}</p>
        ${folderLineHtml}
        ${fileLinkHtml}
      </div>
    `
    : `
      <div style="font-family:Arial,sans-serif;color:#223042;line-height:1.5">
        <h2 style="margin:0 0 12px;">Fallo la subida del informe mensual</h2>
        <p style="margin:0 0 12px;">El cron mensual no pudo subir el informe de contaduria a Google Drive.</p>
        <p style="margin:0 0 6px;"><strong>Mes intentado:</strong> ${input.monthKey ?? "mes anterior"}</p>
        <p style="margin:0 0 12px;"><strong>Fecha de ejecucion:</strong> ${sentAt}</p>
        <p style="margin:0;color:#223042;"><strong>Error:</strong> ${input.error ?? "Sin detalle disponible."}</p>
      </div>
    `;

  await emailClient.send({
    to: ACCOUNTING_REPORT_NOTIFY_EMAIL,
    subject,
    html
  });
}

function ensureCronAuthorized(request: Request) {
  const cronSecret = (env.CRON_SECRET ?? "").trim();
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET no configurado en el servidor." },
      { status: 500 }
    );
  }

  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}

export async function GET(request: Request) {
  const unauthorizedResponse = ensureCronAuthorized(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  try {
    const service = new SalasService();
    const uploaded = await service.uploadMonthlyAccountingWorkbookToDrive({});
    await sendCronNotificationEmail({
      ok: true,
      monthKey: uploaded.monthKey,
      fileName: uploaded.fileName,
      driveWebViewLink: uploaded.driveWebViewLink,
      driveFolderId: uploaded.driveFolderId
    });

    return NextResponse.json({
      ok: true,
      uploadedAt: new Date().toISOString(),
      ...uploaded
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "No se pudo subir el informe mensual.";

    try {
      await sendCronNotificationEmail({
        ok: false,
        error: errorMessage
      });
    } catch {
      // Si tambien falla el aviso por mail, devolvemos el error original del cron.
    }

    return NextResponse.json(
      {
        ok: false,
        error: errorMessage
      },
      { status: 500 }
    );
  }
}
