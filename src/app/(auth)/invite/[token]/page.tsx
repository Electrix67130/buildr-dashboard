"use client";

import { useState, useEffect, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { apiFetch, ApiError } from "@/lib/api";

/**
 * Page d'acceptation d'une invitation.
 *
 * C'est la destination du lien envoyé par email. Sans elle, le lien menait à un
 * 404 et l'onboarding s'arrêtait là : l'invité ne peut pas passer par l'app
 * mobile, il ne l'a pas encore installée.
 *
 * L'email et le rôle viennent de l'invitation et ne sont pas modifiables — ils
 * sont fixés par la personne qui a invité.
 */

interface InvitationInfo {
  email: string;
  role: string;
  organization_name: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  manager: "Chef de chantier",
  employee: "Ouvrier",
  client: "Client",
  gestionnaire_reseau: "Gestionnaire réseau",
};

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const router = useRouter();
  const { signup, isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useI18n();

  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  const { data, isLoading, error } = useQuery<InvitationInfo, ApiError>({
    queryKey: ["invitation", token],
    queryFn: () => apiFetch<InvitationInfo>(`/invitations/by-token/${token}`, { skipAuth: true }),
    enabled: !!token,
    retry: false,
  });

  // Un utilisateur deja connecte n'a rien a faire ici : l'invitation cree un
  // compte. On le renvoie vers son espace plutot que de le laisser en creer un
  // second sans comprendre pourquoi ca echoue.
  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace("/dashboard");
  }, [authLoading, isAuthenticated, router]);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!data) return;
    if (form.password.length < 8) {
      toast.error(t("auth.passwordTooShort"));
      return;
    }
    setSubmitting(true);
    try {
      // L'email n'est pas transmis depuis le formulaire : l'API reprend celui
      // de l'invitation, qui fait foi.
      await signup({
        email: data.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
        invitation_token: token,
      });
      toast.success(t("invite.welcome", { org: data.organization_name }));
      router.replace("/dashboard");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common.error"));
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) {
    return <p className="text-sm text-zinc-500">{t("common.loading")}</p>;
  }

  if (error || !data) {
    // 400 = expiree, 404 = introuvable ou deja acceptee. La distinction compte
    // pour l'invite : dans un cas il redemande un lien, dans l'autre il se
    // connecte simplement.
    const expired = error?.statusCode === 400;
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          {expired ? t("invite.expiredTitle") : t("invite.invalidTitle")}
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {expired ? t("invite.expiredBody") : t("invite.invalidBody")}
        </p>
        <Link href="/login">
          <Button className="w-full">{t("auth.signIn")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-zinc-900 dark:text-white">
        {t("invite.title", { org: data.organization_name })}
      </h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">{t("invite.subtitle")}</p>

      <div className="mb-6 rounded-xl bg-zinc-50 p-4 text-sm dark:bg-zinc-800/50">
        <div className="flex justify-between gap-4">
          <span className="text-zinc-500">{t("auth.email")}</span>
          <span className="font-medium text-zinc-900 dark:text-white">{data.email}</span>
        </div>
        <div className="mt-2 flex justify-between gap-4">
          <span className="text-zinc-500">{t("invite.role")}</span>
          <span className="font-medium text-zinc-900 dark:text-white">
            {ROLE_LABELS[data.role] ?? data.role}
          </span>
        </div>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label={t("auth.firstName")}
            required
            autoComplete="given-name"
            value={form.first_name}
            onChange={(e) => update("first_name", e.target.value)}
          />
          <Input
            label={t("auth.lastName")}
            required
            autoComplete="family-name"
            value={form.last_name}
            onChange={(e) => update("last_name", e.target.value)}
          />
        </div>
        <Input
          label={t("auth.phone")}
          type="tel"
          required
          autoComplete="tel"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
        />
        <Input
          label={t("auth.password")}
          type="password"
          required
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
        />
        <Button type="submit" disabled={submitting} className="mt-2 w-full">
          {submitting ? t("common.loading") : t("invite.accept")}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
        {t("invite.mobileHint")}
      </p>
    </>
  );
}
