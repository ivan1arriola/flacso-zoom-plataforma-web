import { SalasLegacyService } from "@/src/modules/salas/domains/core/salas-legacy.service";

export class SalasAsignacionesDomainService {
  constructor(private readonly legacy: SalasLegacyService) {}

  listAssignmentBoard(
    ...args: Parameters<SalasLegacyService["listAssignmentBoard"]>
  ): ReturnType<SalasLegacyService["listAssignmentBoard"]> {
    return this.legacy.listAssignmentBoard(...args);
  }

  createMonthlyAssignmentSuggestion(
    ...args: Parameters<SalasLegacyService["createMonthlyAssignmentSuggestion"]>
  ): ReturnType<SalasLegacyService["createMonthlyAssignmentSuggestion"]> {
    return this.legacy.createMonthlyAssignmentSuggestion(...args);
  }

  getNextMonthlyAssignmentSuggestion(
    ...args: Parameters<SalasLegacyService["getNextMonthlyAssignmentSuggestion"]>
  ): ReturnType<SalasLegacyService["getNextMonthlyAssignmentSuggestion"]> {
    return this.legacy.getNextMonthlyAssignmentSuggestion(...args);
  }

  assignAssistant(
    ...args: Parameters<SalasLegacyService["assignAssistant"]>
  ): ReturnType<SalasLegacyService["assignAssistant"]> {
    return this.legacy.assignAssistant(...args);
  }

  unassignAssistantFromEvent(
    ...args: Parameters<SalasLegacyService["unassignAssistantFromEvent"]>
  ): ReturnType<SalasLegacyService["unassignAssistantFromEvent"]> {
    return this.legacy.unassignAssistantFromEvent(...args);
  }
}
