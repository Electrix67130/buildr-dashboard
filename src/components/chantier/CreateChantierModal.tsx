"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import CityAddressAutocomplete from "@/components/ui/CityAddressAutocomplete";
import { apiFetch, ApiError } from "@/lib/api";
import { useI18n } from "@/contexts/I18nContext";
import type { Chantier, ChantierStatus, PaginatedResponse, User } from "@/types/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (chantier: Chantier) => void;
}

interface FormState {
  name: string;
  description: string;
  address: string;
  city: string;
  postal_code: string;
  latitude: number | null;
  longitude: number | null;
  status: ChantierStatus;
  start_date: string;
  end_date: string;
  manager_id: string;
}

const EMPTY: FormState = {
  name: "",
  description: "",
  address: "",
  city: "",
  postal_code: "",
  latitude: null,
  longitude: null,
  status: "a_venir",
  start_date: "",
  end_date: "",
  manager_id: "",
};

export default function CreateChantierModal({ open, onClose, onCreated }: Props) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const teamQuery = useQuery({
    queryKey: ["users", "for-manager-select"],
    queryFn: () => apiFetch<PaginatedResponse<User>>("/users?limit=100"),
    enabled: open,
  });

  const candidates = (teamQuery.data?.data ?? []).filter(
    (u) => u.role === "admin" || u.role === "manager",
  );

  const mutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { name: form.name.trim() };
      if (form.description.trim()) body.description = form.description.trim();
      if (form.address.trim()) body.address = form.address.trim();
      if (form.city.trim()) body.city = form.city.trim();
      if (form.postal_code.trim()) body.postal_code = form.postal_code.trim();
      if (form.latitude !== null) body.latitude = form.latitude;
      if (form.longitude !== null) body.longitude = form.longitude;
      body.status = form.status;
      if (form.start_date) body.start_date = form.start_date;
      if (form.end_date) body.end_date = form.end_date;
      if (form.manager_id) body.manager_id = form.manager_id;
      return apiFetch<Chantier>("/chantiers", { method: "POST", body });
    },
    onSuccess: (chantier) => {
      qc.invalidateQueries({ queryKey: ["chantiers"] });
      setForm(EMPTY);
      setError(null);
      onCreated?.(chantier);
      onClose();
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : t("common.error"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError(t("chantiers.form.nameRequired"));
      return;
    }
    setError(null);
    mutation.mutate();
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Modal
      open={open}
      onClose={mutation.isPending ? () => {} : onClose}
      title={t("chantiers.new")}
      subtitle={t("chantiers.form.subtitle")}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={mutation.isPending}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} loading={mutation.isPending}>
            {t("chantiers.form.submit")}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          name="name"
          label={t("chantiers.form.name")}
          placeholder={t("chantiers.form.namePlaceholder")}
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          required
          autoFocus
        />
        <Textarea
          name="description"
          label={t("chantiers.form.description")}
          placeholder={t("chantiers.form.descriptionPlaceholder")}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
        />

        <CityAddressAutocomplete
          city={form.city}
          postalCode={form.postal_code}
          address={form.address}
          onCityChange={(value) =>
            setForm((prev) => ({
              ...prev,
              city: value,
              postal_code: "",
              address: "",
              latitude: null,
              longitude: null,
            }))
          }
          onCitySelect={(name, cp, lat, lng) =>
            setForm((prev) => ({
              ...prev,
              city: name,
              postal_code: cp,
              latitude: lat,
              longitude: lng,
              address: "",
            }))
          }
          onAddressChange={(value) => update("address", value)}
          onAddressSelect={(name, lat, lng) =>
            setForm((prev) => ({ ...prev, address: name, latitude: lat, longitude: lng }))
          }
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select
            name="status"
            label={t("chantiers.form.status")}
            value={form.status}
            onChange={(e) => update("status", e.target.value as ChantierStatus)}
          >
            <option value="a_venir">{t("chantiers.statusUpcoming")}</option>
            <option value="en_cours">{t("chantiers.statusInProgress")}</option>
            <option value="termine">{t("chantiers.statusCompleted")}</option>
          </Select>
          <Input
            name="start_date"
            type="date"
            label={t("chantiers.form.startDate")}
            value={form.start_date}
            onChange={(e) => update("start_date", e.target.value)}
          />
          <Input
            name="end_date"
            type="date"
            label={t("chantiers.form.endDate")}
            value={form.end_date}
            onChange={(e) => update("end_date", e.target.value)}
          />
        </div>

        <Select
          name="manager_id"
          label={t("chantiers.form.manager")}
          hint={t("chantiers.form.managerHint")}
          value={form.manager_id}
          onChange={(e) => update("manager_id", e.target.value)}
        >
          <option value="">{t("chantiers.form.managerNone")}</option>
          {candidates.map((u) => (
            <option key={u.id} value={u.id}>
              {u.first_name} {u.last_name} ({u.email})
            </option>
          ))}
        </Select>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
