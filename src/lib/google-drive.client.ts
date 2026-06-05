import { Readable } from "node:stream";
import { google } from "googleapis";
import { env } from "./env";
import {
  resolveGoogleServiceAccountCredentials,
  toReadableGoogleAuthError
} from "./google-service-account";

const DRIVE_READONLY_SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
const DRIVE_UPLOAD_SCOPES = ["https://www.googleapis.com/auth/drive"];
const SHEETS_EDIT_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/spreadsheets"
];

export type StoredDriveRecording = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  createdTime: string;
  modifiedTime: string;
  size: number | null;
};

export type DriveDestinationPreview = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  accessible: boolean;
  error?: string;
};

function buildGoogleJwtAuth(
  scopes: string[] = DRIVE_READONLY_SCOPES,
  options?: { useDelegatedSubject?: boolean }
) {
  const credentials = resolveGoogleServiceAccountCredentials();

  return new google.auth.JWT({
    email: credentials.email,
    key: credentials.privateKey,
    scopes,
    subject: options?.useDelegatedSubject ? credentials.subject : undefined
  });
}

async function authorizeJwt(auth: InstanceType<typeof google.auth.JWT>) {
  try {
    await auth.authorize();
  } catch (error) {
    throw new Error(toReadableGoogleAuthError(error));
  }
}

function toStoredDriveRecording(value: Record<string, unknown>): StoredDriveRecording {
  const rawSize = value.size;
  const parsedSize =
    typeof rawSize === "string"
      ? Number(rawSize)
      : typeof rawSize === "number"
        ? rawSize
        : Number.NaN;

  return {
    id: typeof value.id === "string" ? value.id : "",
    name: typeof value.name === "string" ? value.name : "sin_nombre",
    mimeType: typeof value.mimeType === "string" ? value.mimeType : "",
    webViewLink: typeof value.webViewLink === "string" ? value.webViewLink : "",
    createdTime: typeof value.createdTime === "string" ? value.createdTime : "",
    modifiedTime: typeof value.modifiedTime === "string" ? value.modifiedTime : "",
    size: Number.isFinite(parsedSize) ? parsedSize : null
  };
}

function toDriveDestinationPreview(value: Record<string, unknown>): DriveDestinationPreview {
  return {
    id: typeof value.id === "string" ? value.id : "",
    name: typeof value.name === "string" ? value.name : "",
    mimeType: typeof value.mimeType === "string" ? value.mimeType : "",
    webViewLink: typeof value.webViewLink === "string" ? value.webViewLink : "",
    accessible: true
  };
}

export async function resolveDriveDestinationPreview(): Promise<DriveDestinationPreview> {
  const folderId = (env.DRIVE_DESTINATION_ID || "").trim();
  if (!folderId) {
    return {
      id: "",
      name: "",
      mimeType: "",
      webViewLink: "",
      accessible: false,
      error: "DRIVE_DESTINATION_ID no configurado en servidor."
    };
  }

  try {
    const auth = buildGoogleJwtAuth();
    await authorizeJwt(auth);
    const drive = google.drive({ version: "v3", auth });
    const response = await drive.files.get({
      fileId: folderId,
      fields: "id,name,mimeType,webViewLink",
      supportsAllDrives: true
    });

    const raw = response.data as unknown as Record<string, unknown>;
    const preview = toDriveDestinationPreview(raw);
    if (!preview.id) {
      return {
        id: folderId,
        name: "",
        mimeType: "",
        webViewLink: "",
        accessible: false,
        error: "Google Drive no devolvio metadatos validos para la carpeta destino."
      };
    }
    if (preview.id !== folderId) {
      return {
        ...preview,
        accessible: false,
        error: "Google Drive devolvio un ID distinto al configurado."
      };
    }
    return preview;
  } catch (error) {
    return {
      id: folderId,
      name: "",
      mimeType: "",
      webViewLink: "",
      accessible: false,
      error: error instanceof Error ? error.message : "No se pudo leer la carpeta destino en Drive."
    };
  }
}

export async function listStoredRecordings(params: {
  pageToken?: string;
  pageSize?: number;
}): Promise<{ driveDestinationId: string; items: StoredDriveRecording[]; nextPageToken?: string }> {
  const folderId = (env.DRIVE_DESTINATION_ID || "").trim();
  if (!folderId) {
    throw new Error(
      "No se encontro DRIVE_DESTINATION_ID. Debe definirse en variables del servidor."
    );
  }

  const auth = buildGoogleJwtAuth();
  await authorizeJwt(auth);
  const drive = google.drive({ version: "v3", auth });

  const response = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields:
      "nextPageToken, files(id, name, mimeType, webViewLink, createdTime, modifiedTime, size)",
    orderBy: "createdTime desc",
    pageSize: Math.max(1, Math.min(params.pageSize ?? 40, 200)),
    pageToken: params.pageToken || undefined,
    includeItemsFromAllDrives: true,
    supportsAllDrives: true
  });

  const files = Array.isArray(response.data.files) ? response.data.files : [];
  const items = files
    .map((item) => toStoredDriveRecording(item as unknown as Record<string, unknown>))
    .filter((item) => item.id);

  return {
    driveDestinationId: folderId,
    items,
    nextPageToken:
      typeof response.data.nextPageToken === "string" && response.data.nextPageToken
        ? response.data.nextPageToken
        : undefined
  };
}

export async function uploadFileToDriveFolder(params: {
  folderId: string;
  fileName: string;
  contentType: string;
  content: Buffer;
}): Promise<{ fileId: string; fileName: string; webViewLink: string | null }> {
  const folderId = params.folderId.trim();
  if (!folderId) {
    throw new Error("No se indicó el folder de Google Drive para subir el archivo.");
  }

  const auth = buildGoogleJwtAuth(DRIVE_UPLOAD_SCOPES);
  await authorizeJwt(auth);
  const drive = google.drive({ version: "v3", auth });

  const response = await drive.files.create({
    requestBody: {
      name: params.fileName,
      parents: [folderId]
    },
    media: {
      mimeType: params.contentType,
      body: Readable.from(params.content)
    },
    fields: "id,name,webViewLink",
    supportsAllDrives: true
  });

  const fileId = typeof response.data.id === "string" ? response.data.id : "";
  if (!fileId) {
    throw new Error("Google Drive no devolvió fileId al subir el informe mensual.");
  }

  return {
    fileId,
    fileName:
      typeof response.data.name === "string" && response.data.name
        ? response.data.name
        : params.fileName,
    webViewLink:
      typeof response.data.webViewLink === "string" && response.data.webViewLink
        ? response.data.webViewLink
        : null
  };
}

export async function createSpreadsheetInDriveFolder(params: {
  folderId: string;
  fileName: string;
  sheetTitle?: string;
  rows: Array<Array<string | number>>;
  buildRequests?: (input: {
    sheetId: number;
    rowCount: number;
    columnCount: number;
  }) => Array<Record<string, unknown>>;
}): Promise<{ fileId: string; fileName: string; webViewLink: string | null }> {
  const folderId = params.folderId.trim();
  if (!folderId) {
    throw new Error("No se indicó el folder de Google Drive para crear la hoja.");
  }

  const auth = buildGoogleJwtAuth(SHEETS_EDIT_SCOPES);
  await authorizeJwt(auth);

  const drive = google.drive({ version: "v3", auth });
  const created = await drive.files.create({
    requestBody: {
      name: params.fileName,
      mimeType: "application/vnd.google-apps.spreadsheet",
      parents: [folderId]
    },
    fields: "id,name,webViewLink",
    supportsAllDrives: true
  });

  const fileId = typeof created.data.id === "string" ? created.data.id : "";
  if (!fileId) {
    throw new Error("Google Drive no devolvió fileId al crear la hoja de contaduría.");
  }

  const sheets = google.sheets({ version: "v4", auth });
  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: fileId,
    fields: "sheets.properties(sheetId,title)"
  });

  const firstSheet = metadata.data.sheets?.[0]?.properties;
  const sheetId = typeof firstSheet?.sheetId === "number" ? firstSheet.sheetId : 0;
  const currentTitle = typeof firstSheet?.title === "string" ? firstSheet.title : "Sheet1";
  const sheetTitle = params.sheetTitle?.trim() || "Informe";
  const columnCount = Math.max(1, ...params.rows.map((row) => row.length));
  const normalizedRows = params.rows.map((row) => {
    const nextRow = [...row];
    while (nextRow.length < columnCount) {
      nextRow.push("");
    }
    return nextRow;
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: fileId,
    range: `${currentTitle}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: normalizedRows
    }
  });

  const requests: Array<Record<string, unknown>> = [
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          title: sheetTitle,
          gridProperties: {
            frozenRowCount: 2
          }
        },
        fields: "title,gridProperties.frozenRowCount"
      }
    }
  ];

  const extraRequests = params.buildRequests?.({
    sheetId,
    rowCount: normalizedRows.length,
    columnCount
  }) ?? [];
  requests.push(...extraRequests);

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: fileId,
      requestBody: {
        requests
      }
    });
  }

  return {
    fileId,
    fileName:
      typeof created.data.name === "string" && created.data.name
        ? created.data.name
        : params.fileName,
    webViewLink:
      typeof created.data.webViewLink === "string" && created.data.webViewLink
        ? created.data.webViewLink
        : `https://docs.google.com/spreadsheets/d/${fileId}/edit`
  };
}
