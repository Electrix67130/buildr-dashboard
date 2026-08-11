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

const STATUS_LABEL: Record<ChantierStatus, string> = {
  a_venir: "À venir",
  en_cours: "En cours",
  termine: "Terminé",
};

const STATUS_VARIANT: Record<ChantierStatus, "default" | "info" | "success"> = {
  a_venir: "default",
  en_cours: "info",
  termine: "success",
};

export default function AdminChantiersPage() {
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
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Chantiers</h1>
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
              placeholder="Rechercher (nom, adresse, ville)…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select
            label="Organisation"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
          >
            <option value="">Toutes les organisations</option>
            {orgsList.data?.data.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>

          <Select label="Membre" value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Tous les utilisateurs</option>
            {usersList.data?.data.map((u) => (
              <option key={u.id} value={u.id}>
                {u.first_name} {u.last_name} — {u.email}
              </option>
            ))}
          </Select>

          <Select
            label="Statut"
            value={status}
            onChange={(e) => setStatus(e.target.value as ChantierStatus | "")}
          >
            <option value="">Tous les statuts</option>
            <option value="a_venir">À venir</option>
            <option value="en_cours">En cours</option>
            <option value="termine">Terminé</option>
          </Select>

          <Select
            label="Archivage"
            value={archived}
            onChange={(e) => setArchived(e.target.value as typeof archived)}
          >
            <option value="false">Actifs</option>
            <option value="true">Archivés</option>
            <option value="all">Tous</option>
          </Select>

          <Select
            label="Tri"
            value={`${sort}:${order}`}
            onChange={(e) => {
              const [s, o] = e.target.value.split(":");
              setSort(s as typeof sort);
              setOrder(o as typeof order);
            }}
          >
            <option value="created_at:desc">Plus récents</option>
            <option value="created_at:asc">Plus anciens</option>
            <option value="name:asc">Nom (A→Z)</option>
            <option value="name:desc">Nom (Z→A)</option>
            <option value="status:asc">Statut</option>
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
          <p className="p-6 text-sm text-zinc-500">Chargement…</p>
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
                      <Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABEL[c.status]}</Badge>
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
          <p className="p-6 text-sm text-zinc-500">Aucun chantier ne correspond aux filtres.</p>
        )}
      </Card>
    </div>
  );
}
