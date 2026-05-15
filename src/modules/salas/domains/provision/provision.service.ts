import { SalasLegacyService } from "@/src/modules/salas/domains/core/salas-legacy.service";

export class SalasProvisionDomainService {
  constructor(private readonly legacy: SalasLegacyService) {}

  listManualProvisionPendings(
    ...args: Parameters<SalasLegacyService["listManualProvisionPendings"]>
  ): ReturnType<SalasLegacyService["listManualProvisionPendings"]> {
    return this.legacy.listManualProvisionPendings(...args);
  }

  resolveManualProvision(
    ...args: Parameters<SalasLegacyService["resolveManualProvision"]>
  ): ReturnType<SalasLegacyService["resolveManualProvision"]> {
    return this.legacy.resolveManualProvision(...args);
  }

  registerUpcomingMeetingInSystem(
    ...args: Parameters<SalasLegacyService["registerUpcomingMeetingInSystem"]>
  ): ReturnType<SalasLegacyService["registerUpcomingMeetingInSystem"]> {
    return this.legacy.registerUpcomingMeetingInSystem(...args);
  }
}
