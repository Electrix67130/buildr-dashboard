"use client";

import { useState, useRef, ChangeEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, ExternalLink, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { apiFetch, ApiError } from "@/lib/api";
import { uploadFile } from "@/lib/upload";
import { formatDate } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";
import { useConfirm } from "@/contexts/DialogContext";
import type { Document, DocumentType, PaginatedResponse } from "@/types/api";

const TYPE_KEYS: Record<DocumentType, string> = {
  dict: "documents.type.dict",
  dt: "documents.type.dt",
  bon_de_commande: "documents.type.bonDeCommande",
  plan: "documents.type.plan",
  arrete: "documents.type.arrete",
  facture: "documents.type.facture",
  autre: "documents.type.autre",
};

const TYPES: DocumentType[] = ["dict", "dt", "bon_de_commande", "plan", "arrete", "facture", "autre"];

function formatSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

export default function Documents({
  chantierId,
  canEdit = false,
}: {
  chantierId: string;
  canEdit?: boolean;
}) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pickerType, setPickerType] = useState<DocumentType>("autre");
  const [uploading, setUploading] = useState(false);

  const list = useQuery({
    queryKey: ["documents", chantierId],
    queryFn: () =>
      apiFetch<PaginatedResponse<Document>>(`/documents?chantier_id=${chantierId}&limit=100`),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/documents/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents", chantierId] }),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : t("common.error")),
  });

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadFile(file);
      await apiFetch("/documents", {
        method: "POST",
        body: {
          chantier_id: chantierId,
          name: file.name,
          type: pickerType,
          url: uploaded.url,
          file_size: uploaded.file_size,
          mime_type: uploaded.mime_type,
        },
      });
      toast.success(t("documents.added"));
      qc.invalidateQueries({ queryKey: ["documents", chantierId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("photos.uploadError"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {canEdit ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <select
            value={pickerType}
            onChange={(e) => setPickerType(e.target.value as DocumentType)}
            className="h-10 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            {TYPES.map((k) => (
              <option key={k} value={k}>
                {t(TYPE_KEYS[k])}
              </option>
            ))}
          </select>
          <input ref={fileInputRef} type="file" onChange={onFileChange} className="hidden" />
          <Button onClick={() => fileInputRef.current?.click()} loading={uploading}>
            <Upload size={16} />
            {t("documents.add")}
          </Button>
        </div>
      ) : null}

      {list.isLoading ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : !list.data || list.data.data.length === 0 ? (
        <EmptyState title={t("documents.empty")} description={t("documents.emptyDesc")} />
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {list.data.data.map((d) => (
              <li key={d.id} className="group flex items-center gap-3 px-6 py-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                  <FileText size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-zinc-900 dark:text-white">{d.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {t("documents.addedOn", { date: formatDate(d.created_at) })}
                    {d.file_size ? ` • ${formatSize(d.file_size)}` : ""}
                  </p>
                </div>
                <Badge variant="default">{t(TYPE_KEYS[d.type])}</Badge>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white"
                  aria-label={t("common.actions")}
                >
                  <ExternalLink size={16} />
                </a>
                {canEdit ? (
                  <button
                    onClick={async () => {
                      const ok = await confirm({
                        title: t("common.delete"),
                        description: t("documents.confirmDelete", { name: d.name }),
                        confirmLabel: t("common.delete"),
                        tone: "danger",
                      });
                      if (ok) remove.mutate(d.id);
                    }}
                    className="rounded-lg p-2 text-zinc-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-900/20"
                    aria-label={t("common.delete")}
                  >
                    <Trash2 size={16} />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
