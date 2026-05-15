import { SalasAgendaDomainService } from "@/src/modules/salas/domains/agenda/agenda.service";
import { SalasAsignacionesDomainService } from "@/src/modules/salas/domains/asignaciones/asignaciones.service";
import {
  SalasLegacyService,
  type CreateSolicitudInput
} from "@/src/modules/salas/domains/core/salas-legacy.service";
import { SalasDashboardDomainService } from "@/src/modules/salas/domains/dashboard/dashboard.service";
import { SalasProvisionDomainService } from "@/src/modules/salas/domains/provision/provision.service";
import { SalasReunionesDomainService } from "@/src/modules/salas/domains/reuniones/reuniones.service";
import { SalasSolicitudesDomainService } from "@/src/modules/salas/domains/solicitudes/solicitudes.service";
import { SalasTarifasDomainService } from "@/src/modules/salas/domains/tarifas/tarifas.service";
import { SalasZoomDomainService } from "@/src/modules/salas/domains/zoom/zoom.service";

export type { CreateSolicitudInput };

export class SalasService {
  private readonly legacy = new SalasLegacyService();

  private readonly dashboardDomain = new SalasDashboardDomainService(this.legacy);
  private readonly solicitudesDomain = new SalasSolicitudesDomainService(this.legacy);
  private readonly reunionesDomain = new SalasReunionesDomainService(this.legacy);
  private readonly agendaDomain = new SalasAgendaDomainService(this.legacy);
  private readonly asignacionesDomain = new SalasAsignacionesDomainService(this.legacy);
  private readonly provisionDomain = new SalasProvisionDomainService(this.legacy);
  private readonly tarifasDomain = new SalasTarifasDomainService(this.legacy);
  private readonly zoomDomain = new SalasZoomDomainService(this.legacy);

  getDashboardSummary(
    ...args: Parameters<SalasLegacyService["getDashboardSummary"]>
  ): ReturnType<SalasLegacyService["getDashboardSummary"]> {
    return this.dashboardDomain.getDashboardSummary(...args);
  }

  listSolicitudes(
    ...args: Parameters<SalasLegacyService["listSolicitudes"]>
  ): ReturnType<SalasLegacyService["listSolicitudes"]> {
    return this.solicitudesDomain.listSolicitudes(...args);
  }

  getSolicitud(
    ...args: Parameters<SalasLegacyService["getSolicitud"]>
  ): ReturnType<SalasLegacyService["getSolicitud"]> {
    return this.solicitudesDomain.getSolicitud(...args);
  }

  updateSolicitudAssistance(
    ...args: Parameters<SalasLegacyService["updateSolicitudAssistance"]>
  ): ReturnType<SalasLegacyService["updateSolicitudAssistance"]> {
    return this.solicitudesDomain.updateSolicitudAssistance(...args);
  }

  reassignRecurringSolicitudResponsable(
    ...args: Parameters<SalasLegacyService["reassignRecurringSolicitudResponsable"]>
  ): ReturnType<SalasLegacyService["reassignRecurringSolicitudResponsable"]> {
    return this.solicitudesDomain.reassignRecurringSolicitudResponsable(...args);
  }

  updateSolicitudInstanceAssistance(
    ...args: Parameters<SalasLegacyService["updateSolicitudInstanceAssistance"]>
  ): ReturnType<SalasLegacyService["updateSolicitudInstanceAssistance"]> {
    return this.solicitudesDomain.updateSolicitudInstanceAssistance(...args);
  }

  enableSolicitudInstanceAssistance(
    ...args: Parameters<SalasLegacyService["enableSolicitudInstanceAssistance"]>
  ): ReturnType<SalasLegacyService["enableSolicitudInstanceAssistance"]> {
    return this.solicitudesDomain.enableSolicitudInstanceAssistance(...args);
  }

  disableSolicitudInstanceAssistance(
    ...args: Parameters<SalasLegacyService["disableSolicitudInstanceAssistance"]>
  ): ReturnType<SalasLegacyService["disableSolicitudInstanceAssistance"]> {
    return this.solicitudesDomain.disableSolicitudInstanceAssistance(...args);
  }

  enableSolicitudAssistance(
    ...args: Parameters<SalasLegacyService["enableSolicitudAssistance"]>
  ): ReturnType<SalasLegacyService["enableSolicitudAssistance"]> {
    return this.solicitudesDomain.enableSolicitudAssistance(...args);
  }

  sendSolicitudReminder(
    ...args: Parameters<SalasLegacyService["sendSolicitudReminder"]>
  ): ReturnType<SalasLegacyService["sendSolicitudReminder"]> {
    return this.solicitudesDomain.sendSolicitudReminder(...args);
  }

  listPastMeetings(
    ...args: Parameters<SalasLegacyService["listPastMeetings"]>
  ): ReturnType<SalasLegacyService["listPastMeetings"]> {
    return this.reunionesDomain.listPastMeetings(...args);
  }

  updatePastMeeting(
    ...args: Parameters<SalasLegacyService["updatePastMeeting"]>
  ): ReturnType<SalasLegacyService["updatePastMeeting"]> {
    return this.reunionesDomain.updatePastMeeting(...args);
  }

  reportMeetingDuration(
    ...args: Parameters<SalasLegacyService["reportMeetingDuration"]>
  ): ReturnType<SalasLegacyService["reportMeetingDuration"]> {
    return this.reunionesDomain.reportMeetingDuration(...args);
  }

  createSolicitud(
    ...args: Parameters<SalasLegacyService["createSolicitud"]>
  ): ReturnType<SalasLegacyService["createSolicitud"]> {
    return this.solicitudesDomain.createSolicitud(...args);
  }

  addSolicitudInstance(
    ...args: Parameters<SalasLegacyService["addSolicitudInstance"]>
  ): ReturnType<SalasLegacyService["addSolicitudInstance"]> {
    return this.solicitudesDomain.addSolicitudInstance(...args);
  }

  cancelSolicitud(
    ...args: Parameters<SalasLegacyService["cancelSolicitud"]>
  ): ReturnType<SalasLegacyService["cancelSolicitud"]> {
    return this.solicitudesDomain.cancelSolicitud(...args);
  }

  restoreSolicitudInstance(
    ...args: Parameters<SalasLegacyService["restoreSolicitudInstance"]>
  ): ReturnType<SalasLegacyService["restoreSolicitudInstance"]> {
    return this.solicitudesDomain.restoreSolicitudInstance(...args);
  }

  deleteSolicitud(
    ...args: Parameters<SalasLegacyService["deleteSolicitud"]>
  ): ReturnType<SalasLegacyService["deleteSolicitud"]> {
    return this.solicitudesDomain.deleteSolicitud(...args);
  }

  listManualProvisionPendings(
    ...args: Parameters<SalasLegacyService["listManualProvisionPendings"]>
  ): ReturnType<SalasLegacyService["listManualProvisionPendings"]> {
    return this.provisionDomain.listManualProvisionPendings(...args);
  }

  resolveManualProvision(
    ...args: Parameters<SalasLegacyService["resolveManualProvision"]>
  ): ReturnType<SalasLegacyService["resolveManualProvision"]> {
    return this.provisionDomain.resolveManualProvision(...args);
  }

  listOpenAgenda(
    ...args: Parameters<SalasLegacyService["listOpenAgenda"]>
  ): ReturnType<SalasLegacyService["listOpenAgenda"]> {
    return this.agendaDomain.listOpenAgenda(...args);
  }

  listAssignmentBoard(
    ...args: Parameters<SalasLegacyService["listAssignmentBoard"]>
  ): ReturnType<SalasLegacyService["listAssignmentBoard"]> {
    return this.asignacionesDomain.listAssignmentBoard(...args);
  }

  createMonthlyAssignmentSuggestion(
    ...args: Parameters<SalasLegacyService["createMonthlyAssignmentSuggestion"]>
  ): ReturnType<SalasLegacyService["createMonthlyAssignmentSuggestion"]> {
    return this.asignacionesDomain.createMonthlyAssignmentSuggestion(...args);
  }

  getNextMonthlyAssignmentSuggestion(
    ...args: Parameters<SalasLegacyService["getNextMonthlyAssignmentSuggestion"]>
  ): ReturnType<SalasLegacyService["getNextMonthlyAssignmentSuggestion"]> {
    return this.asignacionesDomain.getNextMonthlyAssignmentSuggestion(...args);
  }

  setInterest(
    ...args: Parameters<SalasLegacyService["setInterest"]>
  ): ReturnType<SalasLegacyService["setInterest"]> {
    return this.agendaDomain.setInterest(...args);
  }

  assignAssistant(
    ...args: Parameters<SalasLegacyService["assignAssistant"]>
  ): ReturnType<SalasLegacyService["assignAssistant"]> {
    return this.asignacionesDomain.assignAssistant(...args);
  }

  unassignAssistantFromEvent(
    ...args: Parameters<SalasLegacyService["unassignAssistantFromEvent"]>
  ): ReturnType<SalasLegacyService["unassignAssistantFromEvent"]> {
    return this.asignacionesDomain.unassignAssistantFromEvent(...args);
  }

  updateUpcomingEvent(
    ...args: Parameters<SalasLegacyService["updateUpcomingEvent"]>
  ): ReturnType<SalasLegacyService["updateUpcomingEvent"]> {
    return this.agendaDomain.updateUpcomingEvent(...args);
  }

  registerUpcomingMeetingInSystem(
    ...args: Parameters<SalasLegacyService["registerUpcomingMeetingInSystem"]>
  ): ReturnType<SalasLegacyService["registerUpcomingMeetingInSystem"]> {
    return this.provisionDomain.registerUpcomingMeetingInSystem(...args);
  }

  registerPastMeeting(
    ...args: Parameters<SalasLegacyService["registerPastMeeting"]>
  ): ReturnType<SalasLegacyService["registerPastMeeting"]> {
    return this.reunionesDomain.registerPastMeeting(...args);
  }

  listTarifas(
    ...args: Parameters<SalasLegacyService["listTarifas"]>
  ): ReturnType<SalasLegacyService["listTarifas"]> {
    return this.tarifasDomain.listTarifas(...args);
  }

  buildMonthlyAccountingWorkbook(
    ...args: Parameters<SalasLegacyService["buildMonthlyAccountingWorkbook"]>
  ): ReturnType<SalasLegacyService["buildMonthlyAccountingWorkbook"]> {
    return this.tarifasDomain.buildMonthlyAccountingWorkbook(...args);
  }

  uploadMonthlyAccountingWorkbookToDrive(
    ...args: Parameters<SalasLegacyService["uploadMonthlyAccountingWorkbookToDrive"]>
  ): ReturnType<SalasLegacyService["uploadMonthlyAccountingWorkbookToDrive"]> {
    return this.tarifasDomain.uploadMonthlyAccountingWorkbookToDrive(...args);
  }

  getZoomAccountPassword(
    ...args: Parameters<SalasLegacyService["getZoomAccountPassword"]>
  ): ReturnType<SalasLegacyService["getZoomAccountPassword"]> {
    return this.zoomDomain.getZoomAccountPassword(...args);
  }

  listPersonMeetingHours(
    ...args: Parameters<SalasLegacyService["listPersonMeetingHours"]>
  ): ReturnType<SalasLegacyService["listPersonMeetingHours"]> {
    return this.tarifasDomain.listPersonMeetingHours(...args);
  }

  createTarifa(
    ...args: Parameters<SalasLegacyService["createTarifa"]>
  ): ReturnType<SalasLegacyService["createTarifa"]> {
    return this.tarifasDomain.createTarifa(...args);
  }
}
