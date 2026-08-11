"use client";

import { useState, FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import OrgLegalFieldset, {
  OrgLegalFields,
  EMPTY_LEGAL_FIELDS,
  legalFieldsToPayload,
} from "@/components/settings/OrgLegalFieldset";
import { apiFetch, ApiError } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import type { Organization } from "@/types/api";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CreateOrgModal({ open, onClose }: Props) {
  const { t } = useI18n();
  const { refresh } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [legal, setLegal] = useState<OrgLegalFields>(EMPTY_LEGAL_FIELDS);

  const reset = () => {
    setName("");
    setLegal(EMPTY_LEGAL_FIELDS);
  };

  const create = useMutation({
    mutationFn: () =>
      apiFetch<Organization>("/organizations", {
        method: "POST",
        body: { name: name.trim(), ...legalFieldsToPayload(legal) },
      }),
    onSuccess: async () => {
      toast.success(t("settings.orgCreated"));
      await refresh();
      qc.invalidateQueries();
      reset();
      onClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : t("common.error")),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={create.isPending ? () => {} : onClose}
      title={t("settings.createOrg")}
      subtitle={t("settings.createOrgSubtitle")}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={create.isPending}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!name.trim()}
            loading={create.isPending}
          >
            {t("settings.create")}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Input
          label={t("auth.companyName")}
          placeholder={t("settings.createOrgPlaceholder")}
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <OrgLegalFieldset
          form={legal}
          setForm={setLegal}
          onAutofilledName={(autofilled) => setName(autofilled)}
        />
      </form>
    </Modal>
  );
}
