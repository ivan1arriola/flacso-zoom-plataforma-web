import { SalasLegacyService } from "@/src/modules/salas/domains/core/salas-legacy.service";

export class SalasAgendaDomainService {
  constructor(private readonly legacy: SalasLegacyService) {}

  listOpenAgenda(
    ...args: Parameters<SalasLegacyService["listOpenAgenda"]>
  ): ReturnType<SalasLegacyService["listOpenAgenda"]> {
    return this.legacy.listOpenAgenda(...args);
  }

  setInterest(
    ...args: Parameters<SalasLegacyService["setInterest"]>
  ): ReturnType<SalasLegacyService["setInterest"]> {
    return this.legacy.setInterest(...args);
  }

  updateUpcomingEvent(
    ...args: Parameters<SalasLegacyService["updateUpcomingEvent"]>
  ): ReturnType<SalasLegacyService["updateUpcomingEvent"]> {
    return this.legacy.updateUpcomingEvent(...args);
  }
}
