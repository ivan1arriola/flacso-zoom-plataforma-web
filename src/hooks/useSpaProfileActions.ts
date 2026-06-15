import { type FormEvent } from "react";
import { signIn } from "next-auth/react";
import {
  syncProfileFromGoogle as syncProfileFromGoogleApi,
  unlinkGoogleAccount as unlinkGoogleAccountApi,
  updatePassword as updatePasswordApi,
  updateProfile as updateProfileApi,
  type CurrentUser
} from "@/src/services/userApi";

type ProfileForm = {
  firstName: string;
  lastName: string;
  image: string;
};

type PasswordForm = {
  newPassword: string;
  confirmPassword: string;
};

type UseSpaProfileActionsInput = {
  profileForm: ProfileForm;
  passwordForm: PasswordForm;
  setMessage: (value: string) => void;
  setUser: (value: CurrentUser) => void;
  setProfileForm: (value: ProfileForm) => void;
  setGoogleLinked: (value: boolean) => void;
  setHasPassword: (value: boolean) => void;
  setIsSyncingGoogleProfile: (value: boolean) => void;
  setIsUnlinkingGoogleAccount: (value: boolean) => void;
  setIsUpdatingProfile: (value: boolean) => void;
  setIsUpdatingPassword: (value: boolean) => void;
  setShowProfileForm: (value: boolean) => void;
  setShowPasswordForm: (value: boolean) => void;
  setPasswordForm: (value: PasswordForm) => void;
};

function profileFormFromUser(user: CurrentUser): ProfileForm {
  return {
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    image: user.image ?? ""
  };
}

export function useSpaProfileActions({
  profileForm,
  passwordForm,
  setMessage,
  setUser,
  setProfileForm,
  setGoogleLinked,
  setHasPassword,
  setIsSyncingGoogleProfile,
  setIsUnlinkingGoogleAccount,
  setIsUpdatingProfile,
  setIsUpdatingPassword,
  setShowProfileForm,
  setShowPasswordForm,
  setPasswordForm
}: UseSpaProfileActionsInput) {
  async function linkGoogleAccount() {
    setMessage("");
    await signIn("google", { callbackUrl: "/" });
  }

  async function unlinkGoogleAccount() {
    setIsUnlinkingGoogleAccount(true);
    setMessage("");
    try {
      const response = await unlinkGoogleAccountApi();
      if (!response.success) {
        setMessage(response.error ?? "No se pudo desvincular la cuenta de Google.");
        return;
      }
      setGoogleLinked(false);
      setMessage(response.message ?? "Cuenta de Google desvinculada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo desvincular la cuenta de Google.");
    } finally {
      setIsUnlinkingGoogleAccount(false);
    }
  }

  async function syncProfileFromGoogle() {
    setIsSyncingGoogleProfile(true);
    setMessage("");
    try {
      const response = await syncProfileFromGoogleApi();
      if (!response.success) {
        setMessage(response.error ?? "No se pudo sincronizar el perfil con Google.");
        return;
      }
      if (response.user) {
        setUser(response.user);
        setProfileForm(profileFormFromUser(response.user));
      }
      setMessage(response.message ?? "Perfil sincronizado con Google.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo sincronizar el perfil con Google.");
    } finally {
      setIsSyncingGoogleProfile(false);
    }
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsUpdatingProfile(true);
    setMessage("");
    try {
      const response = await updateProfileApi({
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        image: profileForm.image
      });
      if (!response.success) {
        setMessage(response.error ?? "No se pudo actualizar el perfil.");
        return;
      }
      if (response.user) {
        setUser(response.user);
        setProfileForm(profileFormFromUser(response.user));
      }
      setMessage("Perfil actualizado correctamente.");
      setShowProfileForm(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al actualizar perfil.");
    } finally {
      setIsUpdatingProfile(false);
    }
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage("Las contraseñas no coinciden.");
      return;
    }
    setIsUpdatingPassword(true);
    setMessage("");
    try {
      const result = await updatePasswordApi(passwordForm.newPassword);
      if (!result.success) {
        setMessage(result.error ?? "No se pudo actualizar la contraseña.");
        return;
      }
      setHasPassword(true);
      setMessage("Contraseña establecida correctamente. Ya puedes ingresar con tu email.");
      setShowPasswordForm(false);
      setPasswordForm({ newPassword: "", confirmPassword: "" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al actualizar contraseña.");
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  return {
    linkGoogleAccount,
    unlinkGoogleAccount,
    syncProfileFromGoogle,
    submitProfile,
    submitPassword
  };
}
