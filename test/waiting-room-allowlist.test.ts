import { describe, expect, it } from "vitest";

import {
  buildMotivoAsistenciaWithWaitingRoom,
  extractWaitingRoomAllowlistFromMotivo,
  normalizeWaitingRoomAllowlistEntries,
  parseWaitingRoomAllowlistText
} from "@/src/lib/waiting-room-allowlist";

describe("waiting room allowlist", () => {
  it("parsea texto libre con nombre, correo, delimitadores y deduplicacion", () => {
    const result = parseWaitingRoomAllowlistText(`
      Ana Perez | ANA@FLACSO.EDU.UY
      docente@flacso.edu.uy
      Invitado sin correo
      Ana Perez | ana@flacso.edu.uy
    `);

    expect(result.errors).toEqual([]);
    expect(result.entries).toEqual([
      { nombre: "Ana Perez", correo: "ana@flacso.edu.uy" },
      { correo: "docente@flacso.edu.uy" },
      { nombre: "Invitado sin correo" }
    ]);
  });

  it("informa correos invalidos sin perder entradas validas", () => {
    const result = parseWaitingRoomAllowlistText("Ana;ana@flacso.edu.uy\nLuis;luis@@flacso");

    expect(result.entries).toEqual([{ nombre: "Ana", correo: "ana@flacso.edu.uy" }]);
    expect(result.errors).toEqual(["Sala de espera: correo inválido en la línea 2."]);
  });

  it("normaliza entradas estructuradas y rechaza filas con formato invalido", () => {
    expect(
      normalizeWaitingRoomAllowlistEntries([
        { nombre: " Ana ", correo: "ANA@FLACSO.EDU.UY" },
        { nombre: "Ana", correo: "ana@flacso.edu.uy" },
        { nombre: "", correo: "" }
      ])
    ).toEqual([{ nombre: "Ana", correo: "ana@flacso.edu.uy" }]);

    expect(() => normalizeWaitingRoomAllowlistEntries([{ correo: "mal@@flacso" }])).toThrow(
      "Lista de sala de espera: correo inválido en la fila 1."
    );
    expect(() => normalizeWaitingRoomAllowlistEntries(["mal"])).toThrow(
      "Lista de sala de espera: formato inválido en la fila 1."
    );
  });

  it("incrusta y extrae la lista dentro del motivo de asistencia", () => {
    const motivo = buildMotivoAsistenciaWithWaitingRoom("Necesito apoyo tecnico", [
      { nombre: "Ana", correo: "ana@flacso.edu.uy" },
      { nombre: "Bruno" }
    ]);

    expect(motivo).toContain("Necesito apoyo tecnico");
    expect(extractWaitingRoomAllowlistFromMotivo(motivo)).toEqual([
      { nombre: "Ana", correo: "ana@flacso.edu.uy" },
      { nombre: "Bruno" }
    ]);
  });

  it("reemplaza un bloque previo en vez de duplicarlo", () => {
    const original = buildMotivoAsistenciaWithWaitingRoom("Base", [
      { correo: "viejo@flacso.edu.uy" }
    ]);
    const replaced = buildMotivoAsistenciaWithWaitingRoom(original, [
      { correo: "nuevo@flacso.edu.uy" }
    ]);

    expect(replaced?.match(/\[WAITING_ROOM_ALLOWLIST\]/g)).toHaveLength(1);
    expect(extractWaitingRoomAllowlistFromMotivo(replaced)).toEqual([
      { correo: "nuevo@flacso.edu.uy" }
    ]);
  });
});
