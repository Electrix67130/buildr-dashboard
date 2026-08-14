"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Ban, CheckCircle, LogIn } from "lucide-react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { adminApi } from "@/lib/admin-api";
import { formatDate } from "@/lib/utils";
import { setTokens } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/contexts/DialogContext";

export default function AdminOrgsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orgs", search],
    queryFn: () => adminApi.orgs(search || undefined),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "orgs"] });

  const enable = useMutation({
    mutationFn: adminApi.enableOrg,
    onSuccess: () => {
      toast.success("Organisation réactivée");
      invalidate();
    },
  });
  const disable = useMutation({
    mutationFn: adminApi.disableOrg,
    onSuccess: () => {
      toast.success("Organisation désactivée");
      invalidate();
    },
  });

  const impersonate = useMutation({
    mutationFn: adminApi.impersonate,
    onSuccess: (data) => {
      // On stocke le JWT temporaire (30 min) à la place de l'access_token, le refresh
      // existant continue de fonctionner avec ton compte super_admin.
      setTokens(data.access_token, "");
      toast.success("Connecté en tant qu'admin de l'orga (30 min)");
      router.replace("/dashboard");
    },
    onError: () => toast.error("Aucun admin dans cette orga"),
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Organisations</h1>
        <p className="text-sm text-zinc-500">
          {data?.meta.total ?? 0} organisation{(data?.meta.total ?? 0) > 1 ? "s" : ""}
        </p>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <Input
          placeholder="Rechercher par nom…"
          inputClassName="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Card className="p-0">
        {isLoading ? (
          <p className="p-6 text-sm text-zinc-500">Chargement…</p>
        ) : data && data.data.length > 0 ? (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {data.data.map((o) => (
              <li key={o.id} className="flex items-center gap-3 px-6 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-zinc-900 dark:text-white">{o.name}</p>
                    {!o.is_active ? <Badge variant="danger">Désactivée</Badge> : null}
                  </div>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {o.member_count} membres • {o.chantier_count} chantiers actifs • créée le {formatDate(o.created_at)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const ok = await confirm({
                      title: `Impersonate ${o.name}`,
                      description: `Se connecter en tant qu'admin de "${o.name}" ?\n\nUn JWT temporaire de 30 min sera créé, action loggée dans audit_log.`,
                      confirmLabel: "Impersonate",
                    });
                    if (ok) impersonate.mutate(o.id);
                  }}
                  title="Login as admin"
                >
                  <LogIn size={14} />
                  Impersonate
                </Button>
                {o.is_active ? (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={async () => {
                      const ok = await confirm({
                        title: `Désactiver ${o.name}`,
                        description: `Désactiver "${o.name}" ? Les membres ne pourront plus se connecter.`,
                        confirmLabel: "Désactiver",
                        tone: "danger",
                      });
                      if (ok) disable.mutate(o.id);
                    }}
                  >
                    <Ban size={14} />
                    Désactiver
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => enable.mutate(o.id)}>
                    <CheckCircle size={14} />
                    Réactiver
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="p-6 text-sm text-zinc-500">Aucune organisation.</p>
        )}
      </Card>
    </div>
  );
}
