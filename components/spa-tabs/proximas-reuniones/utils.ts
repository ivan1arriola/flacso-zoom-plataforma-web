import type { ZoomUpcomingMeeting } from "@/src/services/zoomApi";
import { normalizeZoomMeetingId } from "@/components/spa-tabs/spa-tabs-utils";
import type {
  ZoomGroupingMode,
  ZoomMeetingGroup,
  ZoomMeetingGroupByDay,
  ZoomMeetingsByMonthAndDay,
  ZoomRecurringSeries
} from "./types";

export function startOfWeek(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - day);
  return next;
}

export function formatGroupLabel(date: Date, mode: ZoomGroupingMode): string {
  if (mode === "MONTH") {
    return new Intl.DateTimeFormat("es-UY", {
      month: "long",
      year: "numeric"
    }).format(date);
  }

  const weekStart = startOfWeek(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const dayMonth = new Intl.DateTimeFormat("es-UY", {
    day: "2-digit",
    month: "2-digit"
  });
  const year = new Intl.DateTimeFormat("es-UY", { year: "numeric" }).format(weekStart);
  return `Semana ${dayMonth.format(weekStart)} - ${dayMonth.format(weekEnd)} (${year})`;
}

export function formatGroupKey(date: Date, mode: ZoomGroupingMode): string {
  if (mode === "MONTH") {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  const weekStart = startOfWeek(date);
  return `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(
    weekStart.getDate()
  ).padStart(2, "0")}`;
}

export function groupMeetingsByPeriod(
  meetings: ZoomUpcomingMeeting[],
  mode: ZoomGroupingMode
): ZoomMeetingGroup[] {
  const grouped = new Map<string, ZoomMeetingGroup>();

  for (const meeting of meetings) {
    const startDate = new Date(meeting.startTime);
    if (Number.isNaN(startDate.getTime())) continue;

    const key = formatGroupKey(startDate, mode);
    const existing = grouped.get(key);
    if (existing) {
      existing.meetings.push(meeting);
      continue;
    }

    grouped.set(key, {
      key,
      label: formatGroupLabel(startDate, mode),
      meetings: [meeting]
    });
  }

  return Array.from(grouped.values());
}

export function groupMeetingsByMonthAndDay(meetings: ZoomUpcomingMeeting[]): ZoomMeetingsByMonthAndDay[] {
  const monthGrouped = new Map<string, Map<string, ZoomMeetingGroupByDay>>();

  for (const meeting of meetings) {
    const startDate = new Date(meeting.startTime);
    if (Number.isNaN(startDate.getTime())) continue;

    const monthKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}`;
    const dayKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, "0")}-${String(
      startDate.getDate()
    ).padStart(2, "0")}`;
    const dayLabel = new Intl.DateTimeFormat("es-UY", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(startDate);

    let dayGroups = monthGrouped.get(monthKey);
    if (!dayGroups) {
      dayGroups = new Map();
      monthGrouped.set(monthKey, dayGroups);
    }

    const existingDay = dayGroups.get(dayKey);
    if (existingDay) {
      existingDay.meetings.push(meeting);
    } else {
      dayGroups.set(dayKey, {
        key: dayKey,
        label: dayLabel,
        meetings: [meeting]
      });
    }
  }

  const result: ZoomMeetingsByMonthAndDay[] = [];
  for (const [monthKey, dayGroups] of monthGrouped.entries()) {
    const dayGroupsArray = Array.from(dayGroups.values());
    dayGroupsArray.sort((a, b) => a.key.localeCompare(b.key));
    if (dayGroupsArray.length === 0 || dayGroupsArray[0].meetings.length === 0) {
      continue;
    }

    const firstDate = new Date(dayGroupsArray[0].meetings[0].startTime);
    const monthLabel = new Intl.DateTimeFormat("es-UY", {
      month: "long",
      year: "numeric"
    }).format(firstDate);

    result.push({
      key: monthKey,
      label: monthLabel,
      dayGroups: dayGroupsArray
    });
  }

  result.sort((a, b) => a.key.localeCompare(b.key));
  return result;
}

export function buildRecurringSeries(
  meetings: ZoomUpcomingMeeting[],
  sortDescending: boolean
): ZoomRecurringSeries[] {
  const grouped = new Map<
    string,
    {
      meetingId: string | null;
      topic: string;
      meetings: ZoomUpcomingMeeting[];
      accountEmails: Set<string>;
    }
  >();

  for (const meeting of meetings) {
    if (meeting.meetingKind !== "RECURRENTE") continue;
    const topicKey = meeting.topic.trim().toLowerCase() || "sin-titulo";
    const accountKey = (meeting.accountEmail || meeting.accountId || "").trim().toLowerCase();
    const key = meeting.meetingId ? `meeting:${meeting.meetingId}` : `fallback:${accountKey}:${topicKey}`;

    const existing = grouped.get(key);
    if (existing) {
      existing.meetings.push(meeting);
      if (meeting.accountEmail) existing.accountEmails.add(meeting.accountEmail);
      continue;
    }

    grouped.set(key, {
      meetingId: meeting.meetingId,
      topic: meeting.topic || "Sin titulo",
      meetings: [meeting],
      accountEmails: new Set(meeting.accountEmail ? [meeting.accountEmail] : [])
    });
  }

  const direction = sortDescending ? -1 : 1;
  const series = Array.from(grouped.entries()).map(([key, value]) => {
    const sortedMeetings = [...value.meetings].sort(
      (a, b) => direction * (new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    );
    return {
      key,
      meetingId: value.meetingId,
      topic: value.topic,
      meetings: sortedMeetings,
      accountEmails: Array.from(value.accountEmails)
    };
  });

  return series.sort((a, b) => {
    const aStart = new Date(a.meetings[0]?.startTime ?? "").getTime();
    const bStart = new Date(b.meetings[0]?.startTime ?? "").getTime();
    return direction * (aStart - bStart);
  });
}

export function getMeetingCardKey(meeting: ZoomUpcomingMeeting): string {
  return `${meeting.accountId}:${meeting.id}:${meeting.startTime}`;
}

export function formatNullableCount(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "-";
  return String(Math.max(0, Math.floor(value)));
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function summarizeZoomMeetings(meetings: ZoomUpcomingMeeting[]) {
  const linked = meetings.filter((meeting) => meeting.association.linked).length;
  const total = meetings.length;
  const overlaps = meetings.filter((meeting) => meeting.hasAccountOverlap).length;
  const recurrent = meetings.filter((meeting) => meeting.meetingKind === "RECURRENTE").length;
  return {
    total,
    linked,
    pending: Math.max(0, total - linked),
    overlaps,
    recurrent
  };
}

export function buildRecurrenceCountByMeetingId(meetings: ZoomUpcomingMeeting[]) {
  const map = new Map<string, number>();
  for (const meeting of meetings) {
    const meetingId = normalizeZoomMeetingId(meeting.meetingId);
    if (!meetingId) continue;
    map.set(meetingId, (map.get(meetingId) ?? 0) + 1);
  }
  return map;
}
