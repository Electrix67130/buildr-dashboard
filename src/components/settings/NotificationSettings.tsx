"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BellOff } from "lucide-react";
import Card from "@/components/ui/Card";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";
import type { NotificationCategory, NotificationPreferences } from "@/types/api";

const KEY = ["notification-preferences"] as const;

/** Les categories, dans l'ordre affiche. Les signalements ne concernent que les administrateurs. */
const CATEGORIES: { key: NotificationCategory; adminOnly?: boolean }[] = [
  { key: "mentions" },
  { key: "messages" },
  { key: "emergencies" },
  { key: "steps" },
  { key: "photos" },
  { key: "documents" },
  { key: "membership" },
  { key: "reports", adminOnly: true },
];

/**
 * Reglages des notifications de l'application mobile : l'interrupteur general,
 * une case par type d'evenement, et les chantiers mis en sourdine (reglables
 * depuis la cloche de chaque chantier dans l'application).
 */
export default function NotificationSettings() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { t } = useI18n();
  const prefs = useQuery({ queryKey: KEY, queryFn: () => apiFetch<NotificationPreferences>("/notification-preferences") });
  const onError = (err: unknown) => toast.error(err instanceof ApiError ? err.message : t("common.error"));
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });

  // Affiche tout de suite, retablit si l'API refuse.
  const optimistic = (update: (p: NotificationPreferences) => NotificationPreferences) => {
    const previous = qc.getQueryData<NotificationPreferences>(KEY);
    if (previous) qc.setQueryData(KEY, update(previous));
    return { previous };
  };
  const rollback = (_e: unknown, _v: unknown, ctx?: { previous?: NotificationPreferences }) => {
    if (ctx?.previous) qc.setQueryData(KEY, ctx.previous);
  };

  const setPush = useMutation({
    mutationFn: (enabled: boolean) => apiFetch("/push-tokens/preference", { method: "PATCH", body: { enabled } }),
    onMutate: (enabled) => optimistic((p) => ({ ...p, push_enabled: enabled })),
    onError: (err, v, ctx) => {
      rollback(err, v, ctx);
      onError(err);
    },
    onSettled: invalidate,
  });

  const setCategory = useMutation({
    mutationFn: (body: { category: NotificationCategory; enabled: boolean }) =>
      apiFetch("/notification-preferences", { method: "PATCH", body }),
    onMutate: ({ category, enabled }) =>
      optimistic((p) => ({ ...p, categories: { ...p.categories, [category]: enabled } })),
    onError: (err, v, ctx) => {
      rollback(err, v, ctx);
      onError(err);
    },
    onSettled: invalidate,
  });

  const resetChantier = useMutation({
    mutationFn: (chantierId: string) =>
      apiFetch(`/notification-preferences/chantiers/${chantierId}`, { method: "PUT", body: { level: "all" } }),
    onSuccess: invalidate,
    onError,
  });

  const data = prefs.data;
  const isAdmin = (user?.memberships ?? []).some((m) => m.role === "admin") || user?.role === "admin";

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">{t("notifPrefs.title")}</h2>
          <p className="mt-1 text-xs text-zinc-500">{t("notifPrefs.intro")}</p>
        </div>

        {!data ? (
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        ) : (
          <>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800">
              <input
                type="checkbox"
                checked={data.push_enabled}
                onChange={(e) => setPush.mutate(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-500 dark:border-zinc-600 dark:bg-zinc-800"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-white">{t("notifPrefs.push")}</p>
                <p className="text-xs text-zinc-500">{t("notifPrefs.pushDesc")}</p>
              </div>
            </label>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">{t("notifPrefs.byType")}</p>
              <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2", !data.push_enabled && "opacity-50")}>
                {CATEGORIES.filter((c) => !c.adminOnly || isAdmin).map(({ key }) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  >
                    <input
                      type="checkbox"
                      checked={data.categories[key]}
                      disabled={!data.push_enabled}
                      onChange={(e) => setCategory.mutate({ category: key, enabled: e.target.checked })}
                      className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-500 dark:border-zinc-600 dark:bg-zinc-800"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">{t(`notifPrefs.${key}`)}</p>
                      <p className="text-xs text-zinc-500">{t(`notifPrefs.${key}Desc`)}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">{t("notifPrefs.byChantier")}</p>
              {data.chantiers.length === 0 ? (
                <p className="text-sm text-zinc-500">{t("notifPrefs.noMutedChantier")}</p>
              ) : (
                <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                  {data.chantiers.map((c) => (
                    <li key={c.chantier_id} className="flex items-center gap-3 px-3 py-2">
                      <BellOff size={16} className="shrink-0 text-orange-600" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">{c.chantier_name}</p>
                        <p className="text-xs text-zinc-500">
                          {t(c.level === "important" ? "notifPrefs.levelImportant" : "notifPrefs.levelNone")}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => resetChantier.mutate(c.chantier_id)}
                        className="rounded-md px-2 py-1 text-xs font-semibold text-orange-700 hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-orange-900/20"
                      >
                        {t("notifPrefs.reset")}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-zinc-500">{t("notifPrefs.byChantierHint")}</p>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
