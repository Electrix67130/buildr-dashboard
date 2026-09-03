"use client";

import { use, useState, FormEvent } from "react";
import Link from "next/link";
import { toast } from "sonner";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { apiFetch, ApiError } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";

/**
 * Reinitialisation de mot de passe depuis le web.
 *
 * Le mail ne proposait qu'un lien profond `buildr://`, ouvrable par le seul
 * telephone ou l'application est installee. Quiconque faisait la demande depuis
 * un ordinateur recevait un lien mort : il n'existait aucune page ici.
 */
export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [expired, setExpired] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error(t("auth.passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      toast.error(t("auth.passwordsMismatch"));
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: { token, new_password: password },
        skipAuth: true,
      });
      setDone(true);
    } catch (err) {
      // 400 = jeton expire ou deja consomme. Le distinguer evite d'envoyer
      // l'utilisateur ressaisir un mot de passe dans un formulaire condamne.
      if (err instanceof ApiError && err.statusCode === 400) setExpired(true);
      else toast.error(err instanceof ApiError ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  if (done || expired) {
    return (
      <>
        <h1 className="mb-1 text-2xl font-bold text-zinc-900 dark:text-white">
          {done ? t("auth.resetDone") : t("auth.forgotTitle")}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {done ? t("auth.resetDoneBody") : t("auth.resetExpired")}
        </p>
        <Link href="/login" className="mt-6 block">
          <Button className="w-full">{t("auth.signIn")}</Button>
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-zinc-900 dark:text-white">
        {t("auth.resetTitle")}
      </h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">{t("auth.resetSubtitle")}</p>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label={t("auth.password")}
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={t("auth.passwordHint")}
        />
        <Input
          label={t("auth.confirmPassword")}
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <Button type="submit" loading={loading}>
          {t("auth.resetSubmit")}
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-6 inline-block text-sm font-semibold text-orange-600 hover:underline dark:text-orange-400"
      >
        {t("auth.backToLogin")}
      </Link>
    </>
  );
}
