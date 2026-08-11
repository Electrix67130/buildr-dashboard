"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  label?: string;
  className?: string;
}

export default function CopyButton({ value, label, className }: Props) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const onClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(label ? t("common.copiedNamed", { label }) : t("common.copied"));
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t("common.copyError"));
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("common.copy")}
      title={t("common.copy")}
      className={cn(
        "inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200",
        className,
      )}
    >
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  );
}
