"use client";

import { useState, useRef, ChangeEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { apiFetch, ApiError } from "@/lib/api";
import { uploadFile } from "@/lib/upload";
import { formatDate } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";
import { useConfirm } from "@/contexts/DialogContext";
import type { Photo, PaginatedResponse } from "@/types/api";

export default function Photos({
  chantierId,
  canEdit = false,
}: {
  chantierId: string;
  canEdit?: boolean;
}) {
  const qc = useQueryClient();
  const { t } = useI18n();
  const confirm = useConfirm();
  const [selected, setSelected] = useState<Photo | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const list = useQuery({
    queryKey: ["photos", chantierId],
    queryFn: () =>
      apiFetch<PaginatedResponse<Photo>>(`/photos?chantier_id=${chantierId}&limit=100`),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/photos/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["photos", chantierId] }),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : t("common.error")),
  });

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const uploaded = await uploadFile(file);
        await apiFetch("/photos", {
          method: "POST",
          body: {
            chantier_id: chantierId,
            url: uploaded.url,
            file_size: uploaded.file_size,
            mime_type: uploaded.mime_type,
            taken_at: new Date().toISOString(),
          },
        });
      }
      toast.success(
        files.length > 1
          ? t("photos.uploadedPlural", { count: files.length })
          : t("photos.uploaded", { count: files.length }),
      );
      qc.invalidateQueries({ queryKey: ["photos", chantierId] });
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
        <div className="flex justify-end">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onFileChange}
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()} loading={uploading}>
            <Upload size={16} />
            {t("photos.add")}
          </Button>
        </div>
      ) : null}

      {list.isLoading ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : !list.data || list.data.data.length === 0 ? (
        <EmptyState title={t("photos.empty")} description={t("photos.emptyDesc")} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {list.data.data.map((p) => (
            <div
              key={p.id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800"
            >
              <button
                onClick={() => setSelected(p)}
                className="block h-full w-full"
                aria-label="Voir la photo"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.thumbnail_url || p.url}
                  alt={p.caption || ""}
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
              </button>
              {canEdit ? (
                <button
                  onClick={async () => {
                    const ok = await confirm({
                      title: t("common.delete"),
                      description: t("photos.confirmDelete"),
                      confirmLabel: t("common.delete"),
                      tone: "danger",
                    });
                    if (ok) remove.mutate(p.id);
                  }}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
                  aria-label={t("common.delete")}
                >
                  <Trash2 size={14} />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          onClick={() => setSelected(null)}
        >
          <button
            onClick={() => setSelected(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label={t("common.close")}
          >
            <X size={20} />
          </button>
          <div className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={selected.url} alt="" className="max-h-[85vh] rounded-lg" />
            {selected.caption ? (
              <p className="mt-2 text-center text-sm text-white">{selected.caption}</p>
            ) : null}
            {selected.taken_at ? (
              <p className="mt-1 text-center text-xs text-white/60">
                {t("photos.takenOn", { date: formatDate(selected.taken_at) })}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
