export const MEETING_NOTIFICATION_POLICY = {
  ASSIGNED: { responsible: true, assignedAssistant: true, previousAssistant: false, assistantPool: false },
  REASSIGNED: { responsible: true, assignedAssistant: true, previousAssistant: true, assistantPool: false },
  UNASSIGNED: { responsible: false, assignedAssistant: false, previousAssistant: true, assistantPool: false },
  OPEN_CALL: { responsible: false, assignedAssistant: false, previousAssistant: false, assistantPool: true },
  SCHEDULE_CHANGED: { responsible: true, assignedAssistant: true, previousAssistant: false, assistantPool: false },
  CANCELLED: { responsible: true, assignedAssistant: true, previousAssistant: false, assistantPool: false }
} as const;

function normalizeEmail(value?: string | null): string | null {
  const normalized = (value ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

export function resolveAssignmentEmailRecipients(input: {
  responsibleEmail?: string | null;
  assignedAssistantEmail?: string | null;
}): string[] {
  return Array.from(
    new Set(
      [input.responsibleEmail, input.assignedAssistantEmail]
        .map(normalizeEmail)
        .filter((email): email is string => Boolean(email))
    )
  );
}
