"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

/**
 * Composant invisible : ouvre le WebSocket /ws quand l'utilisateur est logué
 * et invalide les queries TanStack en réaction aux events serveur (temps réel).
 * Si le serveur ferme avec le code 4001 (session prise ailleurs), on déconnecte
 * et on prévient l'utilisateur.
 */
export default function RealtimeSync() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  useRealtimeSync({
    enabled: !!user,
    onSessionReplaced: async () => {
      toast.error(t("auth.sessionReplaced"));
      await logout();
      router.replace("/login");
    },
  });

  return null;
}
