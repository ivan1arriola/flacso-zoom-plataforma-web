import { useState, useEffect, useCallback } from "react";
import type { VaultIdentity } from "@/src/lib/auth/vault";

export function useMultiAccount() {
  const [identities, setIdentities] = useState<VaultIdentity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshIdentities = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/vault/list");
      const data = await res.json();
      if (res.ok) {
        setIdentities(data.identities || []);
      }
    } catch (error) {
      console.error("Error refreshing multi-account identities:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const switchAccount = useCallback(async (email: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/vault/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || "No se pudo cambiar de cuenta.");
      }
    } catch (error) {
      console.error("Error switching account:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeAccount = useCallback(async (email: string) => {
    try {
      const res = await fetch("/api/auth/vault/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        setIdentities((prev) => prev.filter((id) => id.email.toLowerCase() !== email.toLowerCase()));
      }
    } catch (error) {
      console.error("Error removing account:", error);
    }
  }, []);

  const syncCurrentAccount = useCallback(async () => {
    try {
      await fetch("/api/auth/vault/sync", { method: "POST" });
      await refreshIdentities();
    } catch (error) {
      console.error("Error syncing current account:", error);
    }
  }, [refreshIdentities]);

  useEffect(() => {
    refreshIdentities();
  }, [refreshIdentities]);

  return {
    identities,
    isLoading,
    refreshIdentities,
    switchAccount,
    removeAccount,
    syncCurrentAccount
  };
}
