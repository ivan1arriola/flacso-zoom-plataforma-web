import { SalasLegacyService } from "@/src/modules/salas/domains/core/salas-legacy.service";

export class SalasTarifasDomainService {
  constructor(private readonly legacy: SalasLegacyService) {}

  listTarifas(
    ...args: Parameters<SalasLegacyService["listTarifas"]>
  ): ReturnType<SalasLegacyService["listTarifas"]> {
    return this.legacy.listTarifas(...args);
  }

  buildMonthlyAccountingWorkbook(
    ...args: Parameters<SalasLegacyService["buildMonthlyAccountingWorkbook"]>
  ): ReturnType<SalasLegacyService["buildMonthlyAccountingWorkbook"]> {
    return this.legacy.buildMonthlyAccountingWorkbook(...args);
  }

  uploadMonthlyAccountingWorkbookToDrive(
    ...args: Parameters<SalasLegacyService["uploadMonthlyAccountingWorkbookToDrive"]>
  ): ReturnType<SalasLegacyService["uploadMonthlyAccountingWorkbookToDrive"]> {
    return this.legacy.uploadMonthlyAccountingWorkbookToDrive(...args);
  }

  listPersonMeetingHours(
    ...args: Parameters<SalasLegacyService["listPersonMeetingHours"]>
  ): ReturnType<SalasLegacyService["listPersonMeetingHours"]> {
    return this.legacy.listPersonMeetingHours(...args);
  }

  createTarifa(
    ...args: Parameters<SalasLegacyService["createTarifa"]>
  ): ReturnType<SalasLegacyService["createTarifa"]> {
    return this.legacy.createTarifa(...args);
  }
}
