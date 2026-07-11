import { describe, expect, it } from "vitest";
import {
  MEETING_NOTIFICATION_POLICY,
  resolveAssignmentEmailRecipients
} from "@/src/lib/meeting-notification-policy";

describe("meeting notification policy", () => {
  it("limita una asignacion al responsable y asistente asignado", () => {
    expect(resolveAssignmentEmailRecipients({
      responsibleEmail: "Responsable@Flacso.edu.uy",
      assignedAssistantEmail: "asistente@flacso.edu.uy"
    })).toEqual(["responsable@flacso.edu.uy", "asistente@flacso.edu.uy"]);
    expect(MEETING_NOTIFICATION_POLICY.ASSIGNED.assistantPool).toBe(false);
  });

  it("elimina duplicados y direcciones invalidas", () => {
    expect(resolveAssignmentEmailRecipients({
      responsibleEmail: "persona@flacso.edu.uy",
      assignedAssistantEmail: "PERSONA@flacso.edu.uy"
    })).toEqual(["persona@flacso.edu.uy"]);
    expect(resolveAssignmentEmailRecipients({ responsibleEmail: "invalido" })).toEqual([]);
  });
});
