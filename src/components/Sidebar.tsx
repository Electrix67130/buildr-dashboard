"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, Archive, Users, FileText, CreditCard, Settings, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { canSeeBillingSection, canSeeOrgTeamSection, canSeeTemplatesSection, isSuperAdmin } from "@/lib/permissions";
import { useUnreadSummary } from "@/hooks/useChantierViews";

const NAV_ALL = [
  { href: "/dashboard", labelKey: "nav.overview", icon: LayoutDashboard, key: "overview" as const },
  { href: "/chantiers", labelKey: "nav.chantiers", icon: Building2, key: "chantiers" as const },
  { href: "/archives", labelKey: "nav.archives", icon: Archive, key: "archives" as const },
  { href: "/team", labelKey: "nav.team", icon: Users, key: "team" as const },
  { href: "/templates", labelKey: "nav.templates", icon: FileText, key: "templates" as const },
  { href: "/billing", labelKey: "nav.billing", icon: CreditCard, key: "billing" as const },
  { href: "/settings", labelKey: "nav.settings", icon: Settings, key: "settings" as const },
];

const SUPER_ADMIN_NAV = [
  { href: "/admin", labelKey: "admin.overview", icon: ShieldCheck, key: "admin-overview" as const },
  { href: "/admin/orgs", labelKey: "admin.orgs", icon: Building2, key: "admin-orgs" as const },
  { href: "/admin/users", labelKey: "admin.users", icon: Users, key: "admin-users" as const },
  { href: "/admin/audit", labelKey: "admin.audit", icon: FileText, key: "admin-audit" as const },
  { href: "/admin/errors", labelKey: "admin.errors", icon: ShieldCheck, key: "admin-errors" as const },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { t } = useI18n();
  const summary = useUnreadSummary(!!user);
  const totalUnread = Object.values(summary.data?.by_chantier ?? {}).reduce(
    (s, n) => s + n,
    0,
  );

  const visible = NAV_ALL.filter((item) => {
    if (item.key === "team") return canSeeOrgTeamSection(user);
    if (item.key === "templates") return canSeeTemplatesSection(user);
    if (item.key === "billing") return canSeeBillingSection(user);
    return true;
  });
  const showSuperAdmin = isSuperAdmin(user);

  return (
    <aside className="hidden w-60 flex-col gap-1 border-r border-zinc-200 bg-white px-3 py-4 dark:border-zinc-800 dark:bg-zinc-900 md:flex">
      <Link href="/dashboard" className="mb-4 flex items-center gap-2 px-3 py-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-sm font-bold text-white">
          B
        </div>
        <span className="text-base font-bold text-zinc-900 dark:text-white">Buildr</span>
      </Link>

      <nav className="flex flex-col gap-0.5">
        {visible.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const badge = item.key === "chantiers" && totalUnread > 0 ? totalUnread : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
              )}
            >
              <Icon size={18} />
              <span className="flex-1">{t(item.labelKey)}</span>
              {badge > 0 ? (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white">
                  {badge > 99 ? "99+" : badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {showSuperAdmin ? (
        <>
          <div className="mt-6 px-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              {t("admin.section")}
            </p>
          </div>
          <nav className="mt-1 flex flex-col gap-0.5">
            {SUPER_ADMIN_NAV.map((item) => {
              const Icon = item.icon;
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
                  )}
                >
                  <Icon size={18} />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>
        </>
      ) : null}
    </aside>
  );
}
