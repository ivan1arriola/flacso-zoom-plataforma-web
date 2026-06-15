export type WaitingRoomAllowlistEntry = {
  nombre?: string;
  correo?: string;
};

const WAITING_ROOM_ALLOWLIST_MARKER_START = "[WAITING_ROOM_ALLOWLIST]";
const WAITING_ROOM_ALLOWLIST_MARKER_END = "[/WAITING_ROOM_ALLOWLIST]";
const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string): boolean {
  return SIMPLE_EMAIL_REGEX.test(value);
}

function dedupeEntries(entries: WaitingRoomAllowlistEntry[]): WaitingRoomAllowlistEntry[] {
  const seen = new Set<string>();
  const result: WaitingRoomAllowlistEntry[] = [];

  for (const entry of entries) {
    const nombre = normalizeText(entry.nombre);
    const correo = normalizeEmail(normalizeText(entry.correo));
    if (!nombre && !correo) continue;
    const key = `${nombre.toLowerCase()}|${correo}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      nombre: nombre || undefined,
      correo: correo || undefined
    });
  }

  return result;
}

export function normalizeWaitingRoomAllowlistEntries(input: unknown): WaitingRoomAllowlistEntry[] {
  if (!Array.isArray(input)) return [];

  const result: WaitingRoomAllowlistEntry[] = [];
  input.forEach((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(`Lista de sala de espera: formato inválido en la fila ${index + 1}.`);
    }

    const rowObj = row as { nombre?: unknown; correo?: unknown };
    const nombre = normalizeText(rowObj.nombre);
    const correo = normalizeEmail(normalizeText(rowObj.correo));
    if (!nombre && !correo) return;

    if (correo && !isValidEmail(correo)) {
      throw new Error(`Lista de sala de espera: correo inválido en la fila ${index + 1}.`);
    }

    result.push({
      nombre: nombre || undefined,
      correo: correo || undefined
    });
  });

  return dedupeEntries(result);
}

export function parseWaitingRoomAllowlistText(raw: string): {
  entries: WaitingRoomAllowlistEntry[];
  errors: string[];
} {
  const errors: string[] = [];
  const entries: WaitingRoomAllowlistEntry[] = [];

  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  lines.forEach((line, index) => {
    const value = line.trim();
    if (!value) return;

    let nombre = "";
    let correo = "";

    const delimiter = value.includes("|")
      ? "|"
      : value.includes(";")
        ? ";"
        : value.includes(",")
          ? ","
          : null;

    if (!delimiter) {
      if (isValidEmail(value)) {
        correo = normalizeEmail(value);
      } else {
        nombre = value;
      }
    } else {
      const split = value.split(delimiter);
      nombre = normalizeText(split[0] ?? "");
      correo = normalizeEmail(normalizeText(split.slice(1).join(delimiter)));
      if (!nombre && !correo) return;
    }

    if (correo && !isValidEmail(correo)) {
      errors.push(`Sala de espera: correo inválido en la línea ${index + 1}.`);
      return;
    }

    entries.push({
      nombre: nombre || undefined,
      correo: correo || undefined
    });
  });

  return {
    entries: dedupeEntries(entries),
    errors
  };
}

function stripWaitingRoomAllowlistBlock(raw?: string | null): string {
  const source = normalizeText(raw);
  if (!source) return "";
  const markerStart = escapeRegExp(WAITING_ROOM_ALLOWLIST_MARKER_START);
  const markerEnd = escapeRegExp(WAITING_ROOM_ALLOWLIST_MARKER_END);
  const markerPattern = new RegExp(`${markerStart}[\\s\\S]*?${markerEnd}`, "g");
  return source.replace(markerPattern, "").trim();
}

export function extractWaitingRoomAllowlistFromMotivo(raw?: string | null): WaitingRoomAllowlistEntry[] {
  const source = normalizeText(raw);
  if (!source) return [];

  const markerStart = escapeRegExp(WAITING_ROOM_ALLOWLIST_MARKER_START);
  const markerEnd = escapeRegExp(WAITING_ROOM_ALLOWLIST_MARKER_END);
  const markerPattern = new RegExp(`${markerStart}([\\s\\S]*?)${markerEnd}`);
  const match = source.match(markerPattern);
  if (!match?.[1]) return [];

  try {
    const parsed = JSON.parse(match[1]) as unknown;
    return normalizeWaitingRoomAllowlistEntries(parsed);
  } catch {
    return [];
  }
}

export function buildMotivoAsistenciaWithWaitingRoom(
  motivoBase: string | null | undefined,
  waitingRoomEntries: WaitingRoomAllowlistEntry[]
): string | undefined {
  const normalizedEntries = dedupeEntries(waitingRoomEntries);
  const cleanBase = stripWaitingRoomAllowlistBlock(motivoBase);
  const resolvedBase = cleanBase || "Asistencia solicitada desde formulario docente.";
  if (normalizedEntries.length === 0) {
    return resolvedBase || undefined;
  }
  return `${resolvedBase}\n${WAITING_ROOM_ALLOWLIST_MARKER_START}${JSON.stringify(normalizedEntries)}${WAITING_ROOM_ALLOWLIST_MARKER_END}`;
}
