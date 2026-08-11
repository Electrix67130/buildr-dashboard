"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, ChevronDown, ArrowRightLeft, Check, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import Avatar from "@/components/ui/Avatar";
import { apiFetch, ApiError } from "@/lib/api";

export default function Topbar() {
  const { user, logout, refresh } = useAuth();
  const { t } = useI18n();
  const qc = useQueryClient();
  const router = useRouter();
  const [userOpen, setUserOpen] = useState(false);
  const [orgOpen, setOrgOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);
  const orgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
      if (orgRef.current && !orgRef.current.contains(e.target as Node)) setOrgOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  async function handleSwitchOrg(orgId: string) {
    if (orgId === user?.active_organization_id) {
      setOrgOpen(false);
      return;
    }
    setSwitching(true);
    try {
      await apiFetch("/auth/switch-organization", {
        method: "POST",
        body: { organization_id: orgId },
      });
      await refresh();
      qc.invalidateQueries();
      toast.success(t("settings.orgChanged"));
      setOrgOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common.error"));
    } finally {
      setSwitching(false);
    }
  }

  if (!user) return null;

  const memberships = user.memberships ?? [];
  const activeOrg = memberships.find((m) => m.organization_id === user.active_organization_id);
  const showSwitcher = memberships.length > 1;

  return (
    <header className="flex h-16 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-900">
      {showSwitcher ? (
        <div ref={orgRef} className="relative">
          <button
            onClick={() => setOrgOpen((v) => !v)}
            disabled={switching}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-1.5 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            <Building2 size={16} className="text-zinc-500" />
            <span className="text-sm font-medium text-zinc-900 dark:text-white">
              {activeOrg?.organization_name ?? t("topbar.organization")}
            </span>
            <ArrowRightLeft size={14} className="text-zinc-400" />
          </button>

          {orgOpen ? (
            <div className="absolute left-0 top-full z-10 mt-1 w-64 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
              <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {t("topbar.switchOrg")}
                </p>
              </div>
              <ul className="max-h-72 overflow-y-auto">
                {memberships.map((m) => {
                  const active = m.organization_id === user.active_organization_id;
                  return (
                    <li key={m.organization_id}>
                      <button
                        onClick={() => handleSwitchOrg(m.organization_id)}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                            {m.organization_name}
                          </p>
                          <p className="text-xs text-zinc-500">{m.role}</p>
                        </div>
                        {active ? <Check size={14} className="text-orange-600" /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Building2 size={14} />
          <span>{activeOrg?.organization_name ?? "—"}</span>
        </div>
      )}

      <div ref={userRef} className="relative">
        <button
          onClick={() => setUserOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <Avatar firstName={user.first_name} lastName={user.last_name} src={user.avatar_url} size="sm" />
          <span className="hidden text-sm font-medium text-zinc-900 sm:block dark:text-white">
            {user.first_name} {user.last_name}
          </span>
          <ChevronDown size={16} className="text-zinc-500" />
        </button>

        {userOpen ? (
          <div className="absolute right-0 top-full z-10 mt-1 w-56 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                {user.first_name} {user.last_name}
              </p>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <LogOut size={16} />
              {t("topbar.signOut")}
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
