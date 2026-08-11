"use client";

import Badge from "@/components/ui/Badge";
import { useI18n } from "@/contexts/I18nContext";
import type { ChantierStatus } from "@/types/api";

const VARIANT: Record<ChantierStatus, "default" | "info" | "success"> = {
  a_venir: "default",
  en_cours: "info",
  termine: "success",
};

const KEY: Record<ChantierStatus, string> = {
  a_venir: "chantiers.statusUpcoming",
  en_cours: "chantiers.statusInProgress",
  termine: "chantiers.statusCompleted",
};

export default function StatusBadge({ status }: { status: ChantierStatus }) {
  const { t } = useI18n();
  return <Badge variant={VARIANT[status]}>{t(KEY[status])}</Badge>;
}
