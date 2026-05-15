import { SalasLegacyService } from "@/src/modules/salas/domains/core/salas-legacy.service";

export class SalasZoomDomainService {
  constructor(private readonly legacy: SalasLegacyService) {}

  getZoomAccountPassword(
    ...args: Parameters<SalasLegacyService["getZoomAccountPassword"]>
  ): ReturnType<SalasLegacyService["getZoomAccountPassword"]> {
    return this.legacy.getZoomAccountPassword(...args);
  }
}
