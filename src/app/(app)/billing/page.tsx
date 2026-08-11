"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, Users, Check, Lock } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { canSeeBillingSection, isBillableRole } from "@/lib/permissions";
import type { User, PaginatedResponse } from "@/types/api";

const PRICE_PER_SEAT = 10;

export default function BillingPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useI18n();
  const allowed = canSeeBillingSection(user);

  useEffect(() => {
    if (authLoading) return;
    if (!allowed) router.replace("/dashboard");
  }, [authLoading, allowed, router]);

  const members = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<PaginatedResponse<User>>("/users?limit=100"),
    enabled: allowed,
  });

  if (!allowed) {
    return (
      <Card className="flex flex-col items-center gap-3 py-16 text-center">
        <Lock size={32} className="text-zinc-400" />
        <p className="text-sm text-zinc-500">{t("billing.adminOnly")}</p>
      </Card>
    );
  }

  const billableCount = (members.data?.data ?? []).filter((m) => isBillableRole(m.role)).length;
  const monthlyPrice = billableCount * PRICE_PER_SEAT;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t("billing.title")}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("billing.subtitle")}</p>
      </div>

      <Card className="border-orange-200 bg-orange-50 dark:border-orange-900/30 dark:bg-orange-900/10">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-orange-100 p-2 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
            <CreditCard size={18} />
          </div>
          <div>
            <p className="font-semibold text-zinc-900 dark:text-white">{t("billing.comingSoon")}</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {t("billing.comingSoonDesc")}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("billing.billableSeats")}
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-zinc-900 dark:text-white">{billableCount}</span>
            <span className="text-sm text-zinc-500">
              {t("billing.seatsUnit", { price: PRICE_PER_SEAT })}
            </span>
          </div>
          <p className="mt-3 text-xs text-zinc-500">{t("billing.billableHint")}</p>
        </Card>

        <Card>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
            {t("billing.monthlyTotal")}
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-zinc-900 dark:text-white">{monthlyPrice}€</span>
            <span className="text-sm text-zinc-500">{t("billing.perMonth")}</span>
          </div>
          <Badge variant="success" className="mt-3">
            <Check size={12} className="mr-1" />
            {t("billing.trial")}
          </Badge>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">
          {t("billing.plan")}
        </h2>
        <div className="flex items-start gap-3">
          <Users size={18} className="mt-0.5 text-orange-600 dark:text-orange-400" />
          <div>
            <p className="font-medium text-zinc-900 dark:text-white">{t("billing.planName")}</p>
            <p className="mt-1 text-sm text-zinc-500">
              {t("billing.planDesc", { price: PRICE_PER_SEAT })}
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button disabled>{t("billing.manage")}</Button>
        </div>
      </Card>
    </div>
  );
}
