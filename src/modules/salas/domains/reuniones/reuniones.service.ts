import { SalasLegacyService } from "@/src/modules/salas/domains/core/salas-legacy.service";

export class SalasReunionesDomainService {
  constructor(private readonly legacy: SalasLegacyService) {}

  listPastMeetings(
    ...args: Parameters<SalasLegacyService["listPastMeetings"]>
  ): ReturnType<SalasLegacyService["listPastMeetings"]> {
    return this.legacy.listPastMeetings(...args);
  }

  updatePastMeeting(
    ...args: Parameters<SalasLegacyService["updatePastMeeting"]>
  ): ReturnType<SalasLegacyService["updatePastMeeting"]> {
    return this.legacy.updatePastMeeting(...args);
  }

  reportMeetingDuration(
    ...args: Parameters<SalasLegacyService["reportMeetingDuration"]>
  ): ReturnType<SalasLegacyService["reportMeetingDuration"]> {
    return this.legacy.reportMeetingDuration(...args);
  }

  registerPastMeeting(
    ...args: Parameters<SalasLegacyService["registerPastMeeting"]>
  ): ReturnType<SalasLegacyService["registerPastMeeting"]> {
    return this.legacy.registerPastMeeting(...args);
  }
}
