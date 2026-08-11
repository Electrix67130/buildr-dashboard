"use client";

import { useState, FormEvent, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace("/dashboard");
  }, [authLoading, isAuthenticated, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success(t("auth.connected"));
      router.replace("/dashboard");
    } catch (err) {
      const msg =
        err instanceof ApiError && err.statusCode === 401
          ? t("auth.invalidCredentials")
          : err instanceof Error
            ? err.message
            : t("auth.connectionError");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-zinc-900 dark:text-white">{t("auth.signInTitle")}</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">{t("auth.signInSubtitle")}</p>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label={t("auth.email")}
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label={t("auth.password")}
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
          >
            {t("auth.forgotPassword")}
          </Link>
        </div>
        <Button type="submit" loading={loading} className="mt-2">
          {t("auth.signIn")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {t("auth.noAccount")}{" "}
        <Link
          href="/signup"
          className="font-semibold text-orange-600 hover:underline dark:text-orange-400"
        >
          {t("auth.createOrg")}
        </Link>
      </p>
    </>
  );
}
