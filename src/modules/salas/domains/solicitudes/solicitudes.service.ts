import { SalasLegacyService } from "@/src/modules/salas/domains/core/salas-legacy.service";

export class SalasSolicitudesDomainService {
  constructor(private readonly legacy: SalasLegacyService) {}

  listSolicitudes(
    ...args: Parameters<SalasLegacyService["listSolicitudes"]>
  ): ReturnType<SalasLegacyService["listSolicitudes"]> {
    return this.legacy.listSolicitudes(...args);
  }

  getSolicitud(
    ...args: Parameters<SalasLegacyService["getSolicitud"]>
  ): ReturnType<SalasLegacyService["getSolicitud"]> {
    return this.legacy.getSolicitud(...args);
  }

  updateSolicitudAssistance(
    ...args: Parameters<SalasLegacyService["updateSolicitudAssistance"]>
  ): ReturnType<SalasLegacyService["updateSolicitudAssistance"]> {
    return this.legacy.updateSolicitudAssistance(...args);
  }

  reassignRecurringSolicitudResponsable(
    ...args: Parameters<SalasLegacyService["reassignRecurringSolicitudResponsable"]>
  ): ReturnType<SalasLegacyService["reassignRecurringSolicitudResponsable"]> {
    return this.legacy.reassignRecurringSolicitudResponsable(...args);
  }

  updateSolicitudInstanceAssistance(
    ...args: Parameters<SalasLegacyService["updateSolicitudInstanceAssistance"]>
  ): ReturnType<SalasLegacyService["updateSolicitudInstanceAssistance"]> {
    return this.legacy.updateSolicitudInstanceAssistance(...args);
  }

  enableSolicitudInstanceAssistance(
    ...args: Parameters<SalasLegacyService["enableSolicitudInstanceAssistance"]>
  ): ReturnType<SalasLegacyService["enableSolicitudInstanceAssistance"]> {
    return this.legacy.enableSolicitudInstanceAssistance(...args);
  }

  disableSolicitudInstanceAssistance(
    ...args: Parameters<SalasLegacyService["disableSolicitudInstanceAssistance"]>
  ): ReturnType<SalasLegacyService["disableSolicitudInstanceAssistance"]> {
    return this.legacy.disableSolicitudInstanceAssistance(...args);
  }

  enableSolicitudAssistance(
    ...args: Parameters<SalasLegacyService["enableSolicitudAssistance"]>
  ): ReturnType<SalasLegacyService["enableSolicitudAssistance"]> {
    return this.legacy.enableSolicitudAssistance(...args);
  }

  sendSolicitudReminder(
    ...args: Parameters<SalasLegacyService["sendSolicitudReminder"]>
  ): ReturnType<SalasLegacyService["sendSolicitudReminder"]> {
    return this.legacy.sendSolicitudReminder(...args);
  }

  createSolicitud(
    ...args: Parameters<SalasLegacyService["createSolicitud"]>
  ): ReturnType<SalasLegacyService["createSolicitud"]> {
    return this.legacy.createSolicitud(...args);
  }

  addSolicitudInstance(
    ...args: Parameters<SalasLegacyService["addSolicitudInstance"]>
  ): ReturnType<SalasLegacyService["addSolicitudInstance"]> {
    return this.legacy.addSolicitudInstance(...args);
  }

  cancelSolicitud(
    ...args: Parameters<SalasLegacyService["cancelSolicitud"]>
  ): ReturnType<SalasLegacyService["cancelSolicitud"]> {
    return this.legacy.cancelSolicitud(...args);
  }

  restoreSolicitudInstance(
    ...args: Parameters<SalasLegacyService["restoreSolicitudInstance"]>
  ): ReturnType<SalasLegacyService["restoreSolicitudInstance"]> {
    return this.legacy.restoreSolicitudInstance(...args);
  }

  deleteSolicitud(
    ...args: Parameters<SalasLegacyService["deleteSolicitud"]>
  ): ReturnType<SalasLegacyService["deleteSolicitud"]> {
    return this.legacy.deleteSolicitud(...args);
  }
}
