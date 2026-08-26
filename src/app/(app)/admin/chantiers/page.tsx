"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, Archive, MapPin } from "lucide-react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import { adminApi, type ChantierStatus, type ChantierFilters } from "@/lib/admin-api";
import { formatDate } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";

const STATUS_LABEL_KEYS: Record<ChantierStatus, string> = {
  a_venir: "chantiers.statusUpcoming",
  en_cours: "chantiers.statusInProgress",
  termine: "chantiers.statusCompleted",
};

const STATUS_VARIANT: Record<ChantierStatus, "default" | "info" | "success"> = {
  a_venir: "default",
  en_cours: "info",
  termine: "success",
};

export default function AdminChantiersPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [orgId, setOrgId] = useState("");
  const [userId, setUserId] = useState("");
  const [status, setStatus] = useState<ChantierStatus | "">("");
  const [archived, setArchived] = useState<"false" | "true" | "all">("false");
  const [sort, setSort] = useState<NonNullable<ChantierFilters["sort"]>>("created_at");
  const [order, setOrder] = useState<NonNullable<ChantierFilters["order"]>>("desc");

  const filters: ChantierFilters = useMemo(
    () => ({
      q: search || undefined,
      organization_id: orgId || undefined,
      user_id: userId || undefined,
      status: status || undefined,
      archived,
      sort,
      order,
    }),
    [search, orgId, userId, status, archived, sort, order],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "chantiers", filters],
    queryFn: () => adminApi.chantiers(filters),
  });

  // Listes pour les dropdowns org/user
  const orgsList = useQuery({
    queryKey: ["admin", "orgs", "all"],
    queryFn: () => adminApi.orgs(undefined, 1),
  });
  const usersList = useQuery({
    queryKey: ["admin", "users", "all"],
    queryFn: () => adminApi.users(undefined, 1),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t("nav.chantiers")}</h1>
        <p className="text-sm text-zinc-500">
          {data?.meta.total ?? 0} chantier{(data?.meta.total ?? 0) > 1 ? "s" : ""}
        </p>
      </div>

      {/* Filtres */}
      <Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative sm:col-span-2 lg:col-span-3">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <Input
              placeholder={t("admin.searchChantier")}
              inputClassName="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select
            label={t("topbar.organization")}
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
          >
            <option value="">{t("admin.filterAllOrgs")}</option>
            {orgsList.data?.data.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>

          <Select label={t("admin.filterMember")} value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">{t("admin.filterAllUsers")}</option>
            {usersList.data?.data.map((u) => (
              <option key={u.id} value={u.id}>
                {u.first_name} {u.last_name} — {u.email}
              </option>
            ))}
          </Select>

          <Select
            label={t("chantiers.form.status")}
            value={status}
            onChange={(e) => setStatus(e.target.value as ChantierStatus | "")}
          >
            <option value="">{t("admin.filterAllStatuses")}</option>
            <option value="a_venir">{t("chantiers.statusUpcoming")}</option>
            <option value="en_cours">{t("chantiers.statusInProgress")}</option>
            <option value="termine">{t("chantiers.statusCompleted")}</option>
          </Select>

          <Select
            label={t("admin.filterArchiving")}
            value={archived}
            onChange={(e) => setArchived(e.target.value as typeof archived)}
          >
            <option value="false">{t("admin.filterActive")}</option>
            <option value="true">{t("admin.filterArchived")}</option>
            <option value="all">{t("common.all")}</option>
          </Select>

          <Select
            label={t("admin.sortLabel")}
            value={`${sort}:${order}`}
            onChange={(e) => {
              const [s, o] = e.target.value.split(":");
              setSort(s as typeof sort);
              setOrder(o as typeof order);
            }}
          >
            <option value="created_at:desc">{t("admin.sortRecent")}</option>
            <option value="created_at:asc">{t("admin.sortOldest")}</option>
            <option value="name:asc">{t("admin.sortNameAsc")}</option>
            <option value="name:desc">{t("admin.sortNameDesc")}</option>
            <option value="status:asc">{t("chantiers.form.status")}</option>
          </Select>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setOrgId("");
                setUserId("");
                setStatus("");
                setArchived("false");
                setSort("created_at");
                setOrder("desc");
              }}
              className="text-sm text-orange-600 hover:text-orange-700 hover:underline"
            >
              Réinitialiser les filtres
            </button>
          </div>
        </div>
      </Card>

      <Card className="p-0">
        {isLoading ? (
          <p className="p-6 text-sm text-zinc-500">{t("common.loading")}</p>
        ) : data && data.data.length > 0 ? (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {data.data.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/chantiers/${c.id}`}
                  className="flex flex-wrap items-center gap-3 px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-zinc-900 dark:text-white">{c.name}</p>
                      <Badge variant={STATUS_VARIANT[c.status]}>{t(STATUS_LABEL_KEYS[c.status])}</Badge>
                      {c.archived_at ? (
                        <Badge variant="default">
                          <Archive size={10} className="mr-1" />
                          Archivé
                        </Badge>
                      ) : null}
                    </div>
                    {c.address || c.city ? (
                      <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-zinc-500">
                        <MapPin size={12} />
                        {[c.address, c.city].filter(Boolean).join(", ")}
                      </p>
                    ) : null}
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {c.organization_name} ·{" "}
                      {c.created_by_first_name} {c.created_by_last_name} · {c.member_count} membre
                      {c.member_count > 1 ? "s" : ""} · Créé le {formatDate(c.created_at)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-6 text-sm text-zinc-500">{t("admin.noChantierMatch")}</p>
        )}
      </Card>
    </div>
  );
}
