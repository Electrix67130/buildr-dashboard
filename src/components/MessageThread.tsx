"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { Send, Pencil, Trash2, Check, X } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/utils";
import { useI18n } from "@/contexts/I18nContext";
import { useConfirm } from "@/contexts/DialogContext";

export interface ThreadMessage {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

interface Props {
  messages: ThreadMessage[];
  currentUserId?: string;
  isLoading?: boolean;
  canSend?: boolean;
  canDeleteOthers?: boolean;
  placeholder?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  onSend: (content: string) => void;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  sending?: boolean;
  /**
   * Considère le message comme "modifié" si updated_at - created_at > 2s
   * (compense les petits décalages côté serveur).
   */
  editedThresholdMs?: number;
}

export default function MessageThread({
  messages,
  currentUserId,
  isLoading = false,
  canSend = true,
  canDeleteOthers = false,
  placeholder,
  emptyTitle,
  emptyDescription,
  onSend,
  onEdit,
  onDelete,
  sending = false,
  editedThresholdMs = 2000,
}: Props) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const beginEdit = (m: ThreadMessage) => {
    setEditingId(m.id);
    setEditText(m.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEdit = () => {
    if (!editingId) return;
    const trimmed = editText.trim();
    if (!trimmed) return;
    onEdit(editingId, trimmed);
    cancelEdit();
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const trimmed = text.trim();
      if (trimmed) {
        onSend(trimmed);
        setText("");
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {canSend ? (
        <form
          onSubmit={onSubmit}
          className="flex gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder ?? t("discussions.placeholder")}
            rows={1}
            className="min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
            onKeyDown={onKeyDown}
          />
          <Button type="submit" disabled={!text.trim()} loading={sending}>
            <Send size={16} />
          </Button>
        </form>
      ) : null}

      {isLoading ? (
        <p className="text-sm text-zinc-500">{t("common.loading")}</p>
      ) : messages.length === 0 ? (
        <EmptyState
          title={emptyTitle ?? t("discussions.empty")}
          description={emptyDescription ?? t("discussions.emptyDesc")}
        />
      ) : (
        <div className="space-y-3">
          {messages.map((m) => {
            const isOwn = m.author_id === currentUserId;
            const isEditing = editingId === m.id;
            const edited =
              new Date(m.updated_at).getTime() - new Date(m.created_at).getTime() >
              editedThresholdMs;
            return (
              <div
                key={m.id}
                className="group flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <Avatar
                  firstName={m.first_name}
                  lastName={m.last_name}
                  src={m.avatar_url}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {isOwn ? t("common.you") : `${m.first_name} ${m.last_name}`}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatDateTime(m.created_at)}
                      {edited ? (
                        <span className="ml-1.5 italic text-zinc-400">
                          · {t("messages.edited")}
                        </span>
                      ) : null}
                    </p>
                  </div>

                  {isEditing ? (
                    <EditField
                      value={editText}
                      onChange={setEditText}
                      onSave={saveEdit}
                      onCancel={cancelEdit}
                    />
                  ) : (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                      {m.content}
                    </p>
                  )}
                </div>

                {!isEditing && (isOwn || canDeleteOthers) ? (
                  <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {isOwn ? (
                      <button
                        onClick={() => beginEdit(m)}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                        aria-label={t("messages.edit")}
                        title={t("messages.edit")}
                      >
                        <Pencil size={14} />
                      </button>
                    ) : null}
                    {isOwn || canDeleteOthers ? (
                      <button
                        onClick={async () => {
                          const ok = await confirm({
                            title: t("common.delete"),
                            description: t("discussions.confirmDelete"),
                            confirmLabel: t("common.delete"),
                            tone: "danger",
                          });
                          if (ok) onDelete(m.id);
                        }}
                        className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                        aria-label={t("common.delete")}
                        title={t("common.delete")}
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EditField({
  value,
  onChange,
  onSave,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
    const v = ref.current?.value ?? "";
    ref.current?.setSelectionRange(v.length, v.length);
  }, []);

  return (
    <div className="mt-2 flex flex-col gap-2">
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            onSave();
          }
        }}
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <X size={12} />
          {t("common.cancel")}
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!value.trim()}
          className="inline-flex items-center gap-1 rounded-md bg-zinc-900 px-2 py-1 text-xs font-semibold text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          <Check size={12} />
          {t("common.save")}
        </button>
      </div>
    </div>
  );
}
