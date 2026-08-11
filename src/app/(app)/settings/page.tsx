"use client";

import { useState, useEffect, useRef, FormEvent, ChangeEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, KeyRound, Sun, Moon, Monitor, Plus, ArrowRightLeft, Check, Camera, Trash2 } from "lucide-react";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import OrgLegalForm from "@/components/settings/OrgLegalForm";
import CreateOrgModal from "@/components/settings/CreateOrgModal";
import { apiFetch, ApiError } from "@/lib/api";
import { uploadFile } from "@/lib/upload";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme, ThemeMode } from "@/contexts/ThemeContext";
import { useI18n, LOCALES, Locale } from "@/contexts/I18nContext";
import { useConfirm } from "@/contexts/DialogContext";
import { cn } from "@/lib/utils";
import type { Organization } from "@/types/api";

const THEME_OPTIONS: { mode: ThemeMode; key: string; icon: typeof Sun }[] = [
  { mode: "light", key: "settings.themeLight", icon: Sun },
  { mode: "dark", key: "settings.themeDark", icon: Moon },
  { mode: "system", key: "settings.themeSystem", icon: Monitor },
];

export default function SettingsPage() {
  const qc = useQueryClient();
  const { user, refresh } = useAuth();
  const { mode, setMode } = useTheme();
  const { locale, setLocale, t } = useI18n();
  const confirm = useConfirm();
  const isAdmin = user?.role === "admin";

  const org = useQuery({
    queryKey: ["organization"],
    queryFn: () => apiFetch<Organization>("/organization"),
    enabled: isAdmin,
  });

  // Profile state
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    company_name: "",
  });
  useEffect(() => {
    if (user) {
      setProfile({
        first_name: user.first_name ?? "",
        last_name: user.last_name ?? "",
        email: user.email ?? "",
        phone: user.phone ?? "",
        company_name: user.company_name ?? "",
      });
    }
  }, [user]);

  const updateProfile = useMutation({
    mutationFn: () =>
      apiFetch(`/users/${user?.id}`, {
        method: "PATCH",
        body: {
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          phone: profile.phone || undefined,
          company_name: profile.company_name || undefined,
        },
      }),
    onSuccess: async () => {
      toast.success(t("settings.profileUpdated"));
      await refresh();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : t("common.error")),
  });

  // Avatar upload
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const onPickAvatar = () => avatarInputRef.current?.click();

  const onAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("settings.avatarInvalid"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("settings.avatarTooBig"));
      return;
    }
    setAvatarLoading(true);
    try {
      const { url } = await uploadFile(file);
      await apiFetch(`/users/${user.id}`, { method: "PATCH", body: { avatar_url: url } });
      await refresh();
      toast.success(t("settings.avatarUpdated"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common.error"));
    } finally {
      setAvatarLoading(false);
    }
  };

  const onRemoveAvatar = async () => {
    if (!user) return;
    const ok = await confirm({
      title: t("settings.avatarRemove"),
      description: t("settings.avatarRemoveConfirm"),
      confirmLabel: t("common.delete"),
      tone: "danger",
    });
    if (!ok) return;
    setAvatarLoading(true);
    try {
      await apiFetch(`/users/${user.id}`, { method: "PATCH", body: { avatar_url: null } });
      await refresh();
      toast.success(t("settings.avatarRemoved"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common.error"));
    } finally {
      setAvatarLoading(false);
    }
  };

  // Password state
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const updatePassword = useMutation({
    mutationFn: () =>
      apiFetch("/auth/password", {
        method: "POST",
        body: { current_password: pwd.current, new_password: pwd.next },
      }),
    onSuccess: () => {
      toast.success(t("settings.passwordChanged"));
      setPwd({ current: "", next: "", confirm: "" });
    },
    onError: (err) => {
      const msg = err instanceof ApiError ? err.message : t("common.error");
      toast.error(
        msg.toLowerCase().includes("current") ? t("settings.passwordCurrentWrong") : msg,
      );
    },
  });

  function onSavePassword(e: FormEvent) {
    e.preventDefault();
    if (pwd.next.length < 8) return toast.error(t("auth.passwordTooShort"));
    if (pwd.next !== pwd.confirm) return toast.error(t("settings.passwordMismatch"));
    updatePassword.mutate();
  }

  // Org state
  const [orgName, setOrgName] = useState("");
  const [retention, setRetention] = useState("");
  useEffect(() => {
    if (org.data) {
      setOrgName(org.data.name);
      setRetention(String(org.data.archive_retention_years));
    }
  }, [org.data]);

  const updateOrg = useMutation({
    mutationFn: (body: { name?: string; archive_retention_years?: number }) =>
      apiFetch<Organization>("/organization", { method: "PATCH", body }),
    onSuccess: (data) => {
      toast.success(t("settings.orgUpdated"));
      qc.setQueryData(["organization"], data);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : t("common.error")),
  });

  const parsedRetention = parseInt(retention, 10);
  const retentionValid =
    Number.isInteger(parsedRetention) && parsedRetention >= 1 && parsedRetention <= 10;

  function onSaveOrg(e: FormEvent) {
    e.preventDefault();
    if (!retentionValid) return;
    updateOrg.mutate({ name: orgName, archive_retention_years: parsedRetention });
  }

  function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    updateProfile.mutate();
  }

  // Switch org
  const switchOrg = useMutation({
    mutationFn: (organization_id: string) =>
      apiFetch("/auth/switch-organization", { method: "POST", body: { organization_id } }),
    onSuccess: async () => {
      await refresh();
      qc.invalidateQueries();
      toast.success(t("settings.orgChanged"));
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : t("common.error")),
  });

  // Create org. Auto-ouvert si on arrive avec ?createOrg=1 (lien depuis le mobile).
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (searchParams.get("createOrg") === "1") {
      setShowCreate(true);
      // Nettoie le query param pour ne pas réouvrir le modal après fermeture.
      const params = new URLSearchParams(searchParams.toString());
      params.delete("createOrg");
      const qs = params.toString();
      router.replace(qs ? `/settings?${qs}` : "/settings");
    }
  }, [searchParams, router]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{t("settings.title")}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("settings.subtitle")}</p>
      </div>

      <Card>
        <form onSubmit={onSaveProfile} className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">{t("settings.profile")}</h2>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar
                firstName={user?.first_name}
                lastName={user?.last_name}
                src={user?.avatar_url}
                size="lg"
              />
              {avatarLoading ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              ) : null}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={onAvatarChange}
              className="hidden"
            />
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onPickAvatar}
                  disabled={avatarLoading}
                >
                  <Camera size={14} />
                  {user?.avatar_url ? t("settings.avatarChange") : t("settings.avatarUpload")}
                </Button>
                {user?.avatar_url ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onRemoveAvatar}
                    disabled={avatarLoading}
                  >
                    <Trash2 size={14} />
                    {t("settings.avatarRemove")}
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-zinc-500">{t("settings.avatarHint")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label={t("settings.firstName")}
              value={profile.first_name}
              onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
              required
            />
            <Input
              label={t("settings.lastName")}
              value={profile.last_name}
              onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
              required
            />
          </div>
          <Input
            label={t("settings.email")}
            type="email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            required
          />
          <Input
            label={t("settings.phone")}
            type="tel"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          />
          <Input
            label={t("settings.companyName")}
            value={profile.company_name}
            onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
            disabled={!isAdmin && user?.role !== "client"}
            hint={!isAdmin && user?.role !== "client" ? t("settings.companyHint") : undefined}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={updateProfile.isPending}>
              <Save size={16} />
              {t("common.save")}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <form onSubmit={onSavePassword} className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              {t("settings.security")}
            </h2>
          </div>
          <Input
            label={t("settings.currentPassword")}
            type="password"
            autoComplete="current-password"
            value={pwd.current}
            onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
            required
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label={t("settings.newPassword")}
              type="password"
              autoComplete="new-password"
              minLength={8}
              hint={t("auth.passwordHint")}
              value={pwd.next}
              onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
              required
            />
            <Input
              label={t("settings.confirmPassword")}
              type="password"
              autoComplete="new-password"
              value={pwd.confirm}
              onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={updatePassword.isPending}>
              {t("settings.changePassword")}
            </Button>
          </div>
        </form>
      </Card>

      <Card>
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            {t("settings.organizations")}
          </h2>
          <ul className="flex flex-col gap-2">
            {(user?.memberships ?? []).map((m) => {
              const active = m.organization_id === user?.active_organization_id;
              return (
                <li
                  key={m.organization_id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border px-4 py-3",
                    active
                      ? "border-orange-500 bg-orange-50 dark:bg-orange-900/10"
                      : "border-zinc-200 dark:border-zinc-800",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-zinc-900 dark:text-white">
                      {m.organization_name}
                    </p>
                    <p className="text-xs text-zinc-500">{m.role}</p>
                  </div>
                  {active ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
                      <Check size={12} />
                      {t("settings.active")}
                    </span>
                  ) : (
                    <button
                      onClick={() => switchOrg.mutate(m.organization_id)}
                      disabled={switchOrg.isPending}
                      className="flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                      <ArrowRightLeft size={12} />
                      {t("settings.activate")}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 py-3 text-sm font-medium text-orange-600 hover:bg-orange-50 dark:border-zinc-700 dark:text-orange-400 dark:hover:bg-orange-900/10"
          >
            <Plus size={14} />
            {t("settings.createOrg")}
          </button>
          <CreateOrgModal open={showCreate} onClose={() => setShowCreate(false)} />
        </div>
      </Card>

      {isAdmin ? (
        <Card>
          <form onSubmit={onSaveOrg} className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              {t("settings.activeOrg")}
            </h2>
            <Input
              label={t("settings.orgName")}
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
            />
            <Input
              label={t("settings.retention")}
              type="number"
              min={1}
              max={10}
              value={retention}
              onChange={(e) => setRetention(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))}
              hint={t("settings.retentionHint")}
              error={retention !== "" && !retentionValid ? t("settings.retentionError") : undefined}
            />
            <div className="flex justify-end">
              <Button type="submit" loading={updateOrg.isPending} disabled={!retentionValid}>
                <Save size={16} />
                {t("common.save")}
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {isAdmin && org.data ? <OrgLegalForm org={org.data} /> : null}

      <Card>
        <div className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            {t("settings.appearance")}
          </h2>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              {t("settings.theme")}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const active = mode === opt.mode;
                return (
                  <button
                    key={opt.mode}
                    onClick={() => setMode(opt.mode)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm transition-colors",
                      active
                        ? "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-900/10 dark:text-orange-300"
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800",
                    )}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{t(opt.key)}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              {t("settings.language")}
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {LOCALES.map((l) => {
                const active = locale === l.code;
                return (
                  <button
                    key={l.code}
                    onClick={() => setLocale(l.code as Locale)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                      active
                        ? "border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-900/10 dark:text-orange-300"
                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800",
                    )}
                  >
                    <span className="text-base">{l.flag}</span>
                    <span className="font-medium">{l.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
