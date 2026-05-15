import { SalasLegacyService } from "@/src/modules/salas/domains/core/salas-legacy.service";

export class SalasDashboardDomainService {
  constructor(private readonly legacy: SalasLegacyService) {}

  getDashboardSummary(
    ...args: Parameters<SalasLegacyService["getDashboardSummary"]>
  ): ReturnType<SalasLegacyService["getDashboardSummary"]> {
    return this.legacy.getDashboardSummary(...args);
  }
}
