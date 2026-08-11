"use client";

import { useEffect, useState, FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Building2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import OrgLegalFieldset, {
  OrgLegalFields,
  EMPTY_LEGAL_FIELDS,
  legalFieldsToPayload,
} from "@/components/settings/OrgLegalFieldset";
import { apiFetch, ApiError } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import type { Organization } from "@/types/api";

function pickInitial(org: Organization | undefined): OrgLegalFields {
  if (!org) return EMPTY_LEGAL_FIELDS;
  return {
    siret: org.siret ?? "",
    legal_form: org.legal_form ?? "",
    vat_number: org.vat_number ?? "",
    naf_code: org.naf_code ?? "",
    address: org.address ?? "",
    postal_code: org.postal_code ?? "",
    city: org.city ?? "",
    country: org.country ?? "FR",
    phone: org.phone ?? "",
    billing_email: org.billing_email ?? "",
    website: org.website ?? "",
    insurance_provider: org.insurance_provider ?? "",
    insurance_number: org.insurance_number ?? "",
  };
}

interface Props {
  org: Organization;
}

export default function OrgLegalForm({ org }: Props) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState<OrgLegalFields>(() => pickInitial(org));

  useEffect(() => {
    setForm(pickInitial(org));
  }, [org]);

  const update = useMutation({
    mutationFn: (body: Partial<Organization>) =>
      apiFetch<Organization>("/organization", { method: "PATCH", body }),
    onSuccess: (data) => {
      toast.success(t("settings.orgUpdated"));
      qc.setQueryData(["organization"], data);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : t("common.error")),
  });

  const onAutofilledName = (name: string) => {
    if (name && name !== org.name) update.mutate({ name });
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    update.mutate(legalFieldsToPayload(form));
  };

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-zinc-500" />
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            {t("settings.legal.title")}
          </h2>
        </div>
        <p className="-mt-3 text-xs text-zinc-500">{t("settings.legal.subtitle")}</p>

        <OrgLegalFieldset form={form} setForm={setForm} onAutofilledName={onAutofilledName} />

        <div className="flex justify-end">
          <Button type="submit" loading={update.isPending}>
            <Save size={16} />
            {t("common.save")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
