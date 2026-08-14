"use client";

import { useState, FormEvent, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import OrgLegalFieldset, {
  OrgLegalFields,
  EMPTY_LEGAL_FIELDS,
  legalFieldsToPayload,
} from "@/components/settings/OrgLegalFieldset";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { ApiError } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const { signup, isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useI18n();
  const [account, setAccount] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company_name: "",
    password: "",
  });
  const [legal, setLegal] = useState<OrgLegalFields>(EMPTY_LEGAL_FIELDS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && isAuthenticated) router.replace("/dashboard");
  }, [authLoading, isAuthenticated, router]);

  function update<K extends keyof typeof account>(key: K, value: string) {
    setAccount((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (account.password.length < 8) {
      toast.error(t("auth.passwordTooShort"));
      return;
    }
    setLoading(true);
    try {
      const payload = legalFieldsToPayload(legal);
      // company_name de l'utilisateur (label affichage) <> name légal de l'orga
      // que l'on stocke via le payload légal. On utilise company_name comme nom de l'orga.
      await signup({
        ...account,
        organization: payload,
      });
      toast.success(t("auth.accountCreated"));
      router.replace("/dashboard");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t("common.error");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-zinc-900 dark:text-white">{t("auth.signUpTitle")}</h1>
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">{t("auth.signUpSubtitle")}</p>

      <form onSubmit={onSubmit} className="flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
            {t("auth.accountSection")}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t("auth.firstName")}
              required
              value={account.first_name}
              onChange={(e) => update("first_name", e.target.value)}
            />
            <Input
              label={t("auth.lastName")}
              required
              value={account.last_name}
              onChange={(e) => update("last_name", e.target.value)}
            />
          </div>
          <Input
            label={t("auth.email")}
            type="email"
            autoComplete="email"
            required
            value={account.email}
            onChange={(e) => update("email", e.target.value)}
          />
          <Input
            label={t("auth.phone")}
            type="tel"
            autoComplete="tel"
            required
            value={account.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
          <Input
            label={t("auth.password")}
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            hint={t("auth.passwordHint")}
            value={account.password}
            onChange={(e) => update("password", e.target.value)}
          />
        </section>

        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
              {t("auth.companySection")}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">{t("auth.companySectionHint")}</p>
          </div>
          <Input
            label={t("auth.companyName")}
            placeholder={t("auth.companyPlaceholder")}
            required
            value={account.company_name}
            onChange={(e) => update("company_name", e.target.value)}
            hint={t("auth.companyNameHint")}
          />
          <OrgLegalFieldset
            form={legal}
            setForm={setLegal}
            onAutofilledName={(name) => update("company_name", name)}
            // Le site web n'est exploite nulle part dans l'application : il n'a
            // pas sa place entre l'utilisateur et la creation de son compte.
            // Il reste modifiable dans les reglages.
            hiddenFields={["website"]}
          />
        </section>

        <Button type="submit" loading={loading}>
          {t("auth.signUp")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        {t("auth.haveAccount")}{" "}
        <Link
          href="/login"
          className="font-semibold text-orange-600 hover:underline dark:text-orange-400"
        >
          {t("auth.signIn")}
        </Link>
      </p>
    </>
  );
}
