"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { apiFetch, ApiError } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { useConfirm } from "@/contexts/DialogContext";
import type { ChantierMemberRole, RolePermissionFlag, RolePermissionsView } from "@/types/api";

const KEY = ["role-permissions"] as const;

/** Les colonnes du tableau : libelles repris des droits d'un membre de chantier. */
const FLAGS: { key: RolePermissionFlag; labelKey: string; descKey: string }[] = [
  { key: "can_view_comments", labelKey: "chantierMembers.perm.viewComments", descKey: "chantierMembers.perm.viewCommentsDesc" },
  { key: "can_view_photos", labelKey: "chantierMembers.perm.viewPhotos", descKey: "chantierMembers.perm.viewPhotosDesc" },
  { key: "can_view_documents", labelKey: "chantierMembers.perm.viewDocuments", descKey: "chantierMembers.perm.viewDocumentsDesc" },
  { key: "can_view_steps", labelKey: "chantierMembers.perm.viewSteps", descKey: "chantierMembers.perm.viewStepsDesc" },
  { key: "can_view_team", labelKey: "chantierMembers.perm.viewTeam", descKey: "chantierMembers.perm.viewTeamDesc" },
  { key: "can_edit", labelKey: "chantierMembers.perm.edit", descKey: "chantierMembers.perm.editDesc" },
];

const ROLE_LABEL: Record<ChantierMemberRole, string> = {
  manager: "role.manager",
  ouvrier: "role.ouvrier",
  client: "role.client",
  gestionnaire_reseau: "role.gestionnaire_reseau",
};

type Draft = Record<RolePermissionFlag, boolean>;

const flagsOf = (r: RolePermissionsView): Draft =>
  Object.fromEntries(FLAGS.map((f) => [f.key, r[f.key]])) as Draft;

/**
 * Droits par defaut des roles : ce qu'une personne voit en arrivant sur un
 * chantier selon son role. Enregistrer un role l'applique aussi a tous ses
 * membres deja presents — d'ou la confirmation, qui dit combien.
 */
export default function RoleDefaultsSettings() {
  const qc = useQueryClient();
  const { t } = useI18n();
  const confirm = useConfirm();
  const roles = useQuery({ queryKey: KEY, queryFn: () => apiFetch<RolePermissionsView[]>("/role-permissions") });
  const [drafts, setDrafts] = useState<Partial<Record<ChantierMemberRole, Draft>>>({});

  const onError = (err: unknown) => toast.error(err instanceof ApiError ? err.message : t("common.error"));
  const done = (role: ChantierMemberRole, count: number) => {
    setDrafts((d) => ({ ...d, [role]: undefined }));
    toast.success(t("roleDefaults.applied", { count: String(count) }));
    qc.invalidateQueries({ queryKey: KEY });
    qc.invalidateQueries({ queryKey: ["chantier-members"] });
  };

  const save = useMutation({
    mutationFn: ({ role, draft }: { role: ChantierMemberRole; draft: Draft }) =>
      apiFetch<{ updated_members: number }>(`/role-permissions/${role}`, { method: "PUT", body: draft }),
    onSuccess: (res, { role }) => done(role, res.updated_members),
    onError,
  });

  const reset = useMutation({
    mutationFn: (role: ChantierMemberRole) =>
      apiFetch<{ updated_members: number }>(`/role-permissions/${role}`, { method: "DELETE" }),
    onSuccess: (res, role) => done(role, res.updated_members),
    onError,
  });

  const toggle = (r: RolePermissionsView, key: RolePermissionFlag) =>
    setDrafts((d) => {
      const current = d[r.role] ?? flagsOf(r);
      return { ...d, [r.role]: { ...current, [key]: !current[key] } };
    });

  const askSave = async (r: RolePermissionsView, draft: Draft) => {
    const roleName = t(ROLE_LABEL[r.role]);
    const ok =
      r.member_count === 0 ||
      (await confirm({
        title: t("roleDefaults.confirmTitle", { role: roleName }),
        description: t("roleDefaults.confirmBody", { count: String(r.member_count) }),
        confirmLabel: t("roleDefaults.save"),
        tone: "danger",
      }));
    if (ok) save.mutate({ role: r.role, draft });
  };

  const askReset = async (r: RolePermissionsView) => {
    const roleName = t(ROLE_LABEL[r.role]);
    const ok = await confirm({
      title: t("roleDefaults.resetTitle", { role: roleName }),
      description: t("roleDefaults.confirmBody", { count: String(r.member_count) }),
      confirmLabel: t("roleDefaults.reset"),
      tone: "danger",
    });
    if (ok) reset.mutate(r.role);
  };

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">{t("roleDefaults.title")}</h2>
          <p className="mt-1 text-xs text-zinc-500">{t("roleDefaults.intro")}</p>
        </div>

        {!roles.data ? (
          <p className="text-sm text-zinc-500">{t("common.loading")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800">
                  <th className="py-2 pr-3 font-medium">{t("roleDefaults.role")}</th>
                  {FLAGS.map((f) => (
                    <th key={f.key} className="px-2 py-2 text-center font-medium" title={t(f.descKey)}>
                      {t(f.labelKey)}
                    </th>
                  ))}
                  <th className="py-2 pl-3" />
                </tr>
              </thead>
              <tbody>
                {roles.data.map((r) => {
                  const draft = drafts[r.role];
                  const values = draft ?? flagsOf(r);
                  const dirty = !!draft && FLAGS.some((f) => draft[f.key] !== r[f.key]);
                  return (
                    <tr key={r.role} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                      <td className="py-3 pr-3">
                        <p className="font-medium text-zinc-900 dark:text-white">{t(ROLE_LABEL[r.role])}</p>
                        <p className="text-xs text-zinc-500">
                          {t("roleDefaults.members", { count: String(r.member_count) })}
                          {r.customized ? ` · ${t("roleDefaults.customized")}` : ""}
                        </p>
                      </td>
                      {FLAGS.map((f) => (
                        <td key={f.key} className="px-2 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={values[f.key]}
                            onChange={() => toggle(r, f.key)}
                            aria-label={`${t(ROLE_LABEL[r.role])} — ${t(f.labelKey)}`}
                            className="h-4 w-4 rounded border-zinc-300 text-orange-600 focus:ring-orange-500 dark:border-zinc-600 dark:bg-zinc-800"
                          />
                        </td>
                      ))}
                      <td className="py-3 pl-3">
                        <div className="flex justify-end gap-2">
                          {dirty ? (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => setDrafts((d) => ({ ...d, [r.role]: undefined }))}>
                                {t("common.cancel")}
                              </Button>
                              <Button size="sm" loading={save.isPending} onClick={() => askSave(r, draft!)}>
                                {t("roleDefaults.save")}
                              </Button>
                            </>
                          ) : r.customized ? (
                            <Button variant="ghost" size="sm" onClick={() => askReset(r)} title={t("roleDefaults.reset")}>
                              <RotateCcw size={14} />
                              {t("roleDefaults.reset")}
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-zinc-500">{t("roleDefaults.adminNote")}</p>
      </div>
    </Card>
  );
}
