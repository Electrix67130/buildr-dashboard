"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: { email },
        skipAuth: true,
      });
      setSent(true);
    } catch {
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <>
        <h1 className="mb-1 text-2xl font-bold text-zinc-900 dark:text-white">
          {t("auth.forgotSent")}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t("auth.forgotSentBody", { email })}
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-semibold text-orange-600 hover:underline dark:text-orange-400"
        >
          {t("auth.backToLogin")}
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-zinc-900 dark:text-white">
        {t("auth.forgotTitle")}
      </h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">{t("auth.forgotSubtitle")}</p>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label={t("auth.email")}
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" loading={loading} className="mt-2">
          {t("auth.forgotSubmit")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        <Link
          href="/login"
          className="font-semibold text-orange-600 hover:underline dark:text-orange-400"
        >
          {t("auth.backToLogin")}
        </Link>
      </p>
    </>
  );
}
