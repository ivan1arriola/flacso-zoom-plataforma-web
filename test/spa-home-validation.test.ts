import { describe, expect, it } from "vitest";

import { normalizeDocentesCorreosByLine } from "@/src/lib/spa-home/validation";

describe("spa-home validation", () => {
  it("normaliza correos docentes por linea, en minuscula y sin duplicados", () => {
    expect(
      normalizeDocentesCorreosByLine(`
        DOCENTE@FLACSO.EDU.UY
        docente@flacso.edu.uy
        otra.persona@flacso.edu.uy
      `)
    ).toBe("docente@flacso.edu.uy\notra.persona@flacso.edu.uy");
  });

  it("devuelve undefined si no hay correos", () => {
    expect(normalizeDocentesCorreosByLine("\n  \n")).toBeUndefined();
  });

  it("rechaza separadores multiples para obligar un correo por linea", () => {
    expect(() => normalizeDocentesCorreosByLine("a@flacso.edu.uy; b@flacso.edu.uy")).toThrow(
      "Correos de docentes: usa un correo por linea (error en linea 1)."
    );
    expect(() => normalizeDocentesCorreosByLine("no-es-correo")).toThrow(
      "Correos de docentes: email invalido en linea 1."
    );
  });
});
