"use client";

import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useI18n } from "@/contexts/I18nContext";
import { useSiretLookup } from "@/hooks/useSiretLookup";

export interface OrgLegalFields {
  siret: string;
  legal_form: string;
  vat_number: string;
  naf_code: string;
  address: string;
  postal_code: string;
  city: string;
  country: string;
  phone: string;
  billing_email: string;
  website: string;
  insurance_provider: string;
  insurance_number: string;
}

export const EMPTY_LEGAL_FIELDS: OrgLegalFields = {
  siret: "",
  legal_form: "",
  vat_number: "",
  naf_code: "",
  address: "",
  postal_code: "",
  city: "",
  country: "FR",
  phone: "",
  billing_email: "",
  website: "",
  insurance_provider: "",
  insurance_number: "",
};

/** Convertit le state du formulaire en payload pour l'API (les strings vides deviennent null). */
export function legalFieldsToPayload(
  form: OrgLegalFields,
): Record<keyof OrgLegalFields, string | null> {
  const out = {} as Record<keyof OrgLegalFields, string | null>;
  (Object.keys(form) as (keyof OrgLegalFields)[]).forEach((k) => {
    const value = form[k].trim();
    out[k] = value === "" ? null : value;
  });
  return out;
}

interface Props {
  form: OrgLegalFields;
  setForm: React.Dispatch<React.SetStateAction<OrgLegalFields>>;
  /** Appelé quand la raison sociale (name) est mise à jour via SIRET. */
  onAutofilledName?: (name: string) => void;
}

export default function OrgLegalFieldset({ form, setForm, onAutofilledName }: Props) {
  const { t } = useI18n();
  const lookup = useSiretLookup();

  const set = <K extends keyof OrgLegalFields>(key: K, value: OrgLegalFields[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const siretClean = form.siret.replace(/\s/g, "");
  const siretValid = /^\d{14}$/.test(siretClean);

  const onAutofill = async () => {
    const result = await lookup.lookup(form.siret);
    if (!result) {
      if (lookup.error) toast.error(lookup.error);
      return;
    }
    setForm((prev) => ({
      ...prev,
      siret: result.siret,
      legal_form: result.legal_form ?? prev.legal_form,
      naf_code: result.naf_code ?? prev.naf_code,
      address: result.address ?? prev.address,
      postal_code: result.postal_code ?? prev.postal_code,
      city: result.city ?? prev.city,
      vat_number: result.vat_number ?? prev.vat_number,
      country: prev.country || "FR",
    }));
    if (result.name) onAutofilledName?.(result.name);
    toast.success(t("settings.legal.autofillSuccess"));
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <Input
          label={t("settings.legal.siret")}
          placeholder="12345678901234"
          value={form.siret}
          onChange={(e) => set("siret", e.target.value.replace(/[^0-9 ]/g, "").slice(0, 17))}
          hint={t("settings.legal.siretHint")}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={onAutofill}
          disabled={!siretValid}
          loading={lookup.isLoading}
        >
          <Sparkles size={14} />
          {t("settings.legal.autofill")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label={t("settings.legal.legalForm")}
          placeholder="SAS, SARL, EI…"
          value={form.legal_form}
          onChange={(e) => set("legal_form", e.target.value)}
        />
        <Input
          label={t("settings.legal.nafCode")}
          placeholder="4120A"
          value={form.naf_code}
          onChange={(e) => set("naf_code", e.target.value.toUpperCase().slice(0, 6))}
          hint={t("settings.legal.nafHint")}
        />
        <Input
          label={t("settings.legal.vatNumber")}
          placeholder="FR12345678901"
          value={form.vat_number}
          onChange={(e) => set("vat_number", e.target.value.toUpperCase())}
          className="sm:col-span-2"
        />
      </div>

      <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {t("settings.legal.address")}
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
          <Input
            label={t("settings.legal.streetAddress")}
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            className="sm:col-span-4"
          />
          <Input
            label={t("settings.legal.postalCode")}
            value={form.postal_code}
            onChange={(e) => set("postal_code", e.target.value)}
            className="sm:col-span-2"
          />
          <Input
            label={t("settings.legal.city")}
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            className="sm:col-span-4"
          />
          <Input
            label={t("settings.legal.country")}
            value={form.country}
            onChange={(e) => set("country", e.target.value.toUpperCase().slice(0, 2))}
            className="sm:col-span-2"
            hint="ISO-2"
          />
        </div>
      </div>

      <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {t("settings.legal.contact")}
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label={t("settings.legal.phone")}
            type="tel"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
          <Input
            label={t("settings.legal.billingEmail")}
            type="email"
            value={form.billing_email}
            onChange={(e) => set("billing_email", e.target.value)}
            hint={t("settings.legal.billingEmailHint")}
          />
          <Input
            label={t("settings.legal.website")}
            type="url"
            placeholder="https://"
            value={form.website}
            onChange={(e) => set("website", e.target.value)}
            className="sm:col-span-2"
          />
        </div>
      </div>

      <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {t("settings.legal.insurance")}
        </h3>
        <p className="-mt-1 mb-3 text-xs text-zinc-500">{t("settings.legal.insuranceHint")}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            label={t("settings.legal.insuranceProvider")}
            value={form.insurance_provider}
            onChange={(e) => set("insurance_provider", e.target.value)}
          />
          <Input
            label={t("settings.legal.insuranceNumber")}
            value={form.insurance_number}
            onChange={(e) => set("insurance_number", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
