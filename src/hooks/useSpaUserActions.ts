import { type FormEvent } from "react";
import { parseEmailLines } from "@/src/lib/spa-home/client-utils";
import {
  loadUsers,
  submitCreateUser as submitCreateUserApi,
  submitResendUserActivationLink as submitResendUserActivationLinkApi,
  submitSendSelfActivationLinkTest as submitSendSelfActivationLinkTestApi,
  submitUpdateUserRole as submitUpdateUserRoleApi,
  type ManagedUser
} from "@/src/services/userApi";

type CreateUserForm = {
  firstName: string;
  lastName: string;
  emails: string;
  role: string;
};

type UseSpaUserActionsInput = {
  createUserForm: CreateUserForm;
  setCreateUserForm: (updater: (prev: CreateUserForm) => CreateUserForm) => void;
  setUsers: (value: ManagedUser[]) => void;
  setMessage: (value: string) => void;
  setIsLoadingUsers: (value: boolean) => void;
  setIsCreatingUser: (value: boolean) => void;
  setUpdatingUserId: (value: string | null) => void;
  setResendingActivationUserId: (value: string | null) => void;
  setIsSendingSelfActivationLink: (value: boolean) => void;
};

export function useSpaUserActions({
  createUserForm,
  setCreateUserForm,
  setUsers,
  setMessage,
  setIsLoadingUsers,
  setIsCreatingUser,
  setUpdatingUserId,
  setResendingActivationUserId,
  setIsSendingSelfActivationLink
}: UseSpaUserActionsInput) {
  async function refreshUsers() {
    setIsLoadingUsers(true);
    try {
      const users = await loadUsers();
      if (users) setUsers(users);
    } finally {
      setIsLoadingUsers(false);
    }
  }

  async function submitCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsCreatingUser(true);

    try {
      const parsedEmails = parseEmailLines(createUserForm.emails);
      if (parsedEmails.length === 0) {
        setMessage("Debes indicar al menos un correo de acceso.");
        return;
      }

      const response = await submitCreateUserApi({
        firstName: createUserForm.firstName,
        lastName: createUserForm.lastName,
        emails: parsedEmails,
        role: createUserForm.role
      });

      if (!response.success) {
        setMessage(response.error ?? "No se pudo crear el usuario.");
        return;
      }

      setCreateUserForm((prev) => ({
        ...prev,
        emails: "",
        firstName: "",
        lastName: "",
        role: "DOCENTE"
      }));
      setMessage("Usuario creado. Enviamos un enlace de activacion por correo para completar el alta.");
      const users = await loadUsers();
      if (users) setUsers(users);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo crear el usuario.");
    } finally {
      setIsCreatingUser(false);
    }
  }

  async function updateUserRole(userId: string, role: string, emails: string[]) {
    setMessage("");
    setUpdatingUserId(userId);
    try {
      const normalizedEmails = parseEmailLines(emails.join("\n"));
      if (normalizedEmails.length === 0) {
        setMessage("Debes indicar al menos un correo de acceso.");
        return;
      }

      const response = await submitUpdateUserRoleApi({ userId, role, emails: normalizedEmails });
      if (!response.success) {
        setMessage(response.error ?? "No se pudo actualizar el usuario.");
        return;
      }

      const users = await loadUsers();
      if (users) setUsers(users);
      setMessage("Usuario actualizado correctamente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el usuario.");
    } finally {
      setUpdatingUserId(null);
    }
  }

  async function resendUserActivationLink(userId: string) {
    setMessage("");
    setResendingActivationUserId(userId);
    try {
      const response = await submitResendUserActivationLinkApi({ userId });
      if (!response.success) {
        setMessage(response.error ?? "No se pudo reenviar el enlace de activacion.");
        return;
      }
      setMessage("Enlace de activacion reenviado correctamente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo reenviar el enlace de activacion.");
    } finally {
      setResendingActivationUserId(null);
    }
  }

  async function sendSelfActivationLinkTest() {
    setMessage("");
    setIsSendingSelfActivationLink(true);
    try {
      const response = await submitSendSelfActivationLinkTestApi();
      if (!response.success) {
        setMessage(response.error ?? "No se pudo enviar el enlace de prueba.");
        return;
      }
      setMessage("Enlace de prueba enviado a tu correo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo enviar el enlace de prueba.");
    } finally {
      setIsSendingSelfActivationLink(false);
    }
  }

  return {
    refreshUsers,
    submitCreateUser,
    updateUserRole,
    resendUserActivationLink,
    sendSelfActivationLinkTest
  };
}
