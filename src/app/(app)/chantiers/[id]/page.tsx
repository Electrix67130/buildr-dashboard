"use client";

import { useState, use } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  MessageSquare,
  Camera,
  FileText,
  ListChecks,
  AlertTriangle,
  Users,
  Navigation,
} from "lucide-react";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/StatusBadge";
import { apiFetch } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import {
  canEditChantier,
  canManageSteps,
  canToggleSteps,
  canCreateEmergency,
  canManageChantierMembers,
  canEditChantierPermissions,
  canDeleteOthersMessage,
  canViewComments,
  canViewPhotos,
  canViewDocuments,
  canViewSteps,
  canViewTeam,
  canViewEmergencies,
  emergencyMode,
  ChantierContext,
} from "@/lib/permissions";
import type { Chantier, ChantierMember, PaginatedResponse } from "@/types/api";
import { useUnreadCounts, useMarkTabViewed } from "@/hooks/useChantierViews";
import Discussions from "@/components/chantier/Discussions";
import Photos from "@/components/chantier/Photos";
import Documents from "@/components/chantier/Documents";
import Steps from "@/components/chantier/Steps";
import Emergencies from "@/components/chantier/Emergencies";
import Members from "@/components/chantier/Members";

const ALL_TABS = [
  { key: "overview", labelKey: "chantier.tabOverview", icon: User },
  { key: "discussions", labelKey: "chantier.tabDiscussions", icon: MessageSquare },
  { key: "photos", labelKey: "chantier.tabPhotos", icon: Camera },
  { key: "documents", labelKey: "chantier.tabDocuments", icon: FileText },
  { key: "steps", labelKey: "chantier.tabSteps", icon: ListChecks },
  { key: "emergencies", labelKey: "chantier.tabEmergencies", icon: AlertTriangle },
  { key: "team", labelKey: "chantier.tabTeam", icon: Users },
] as const;

type TabKey = (typeof ALL_TABS)[number]["key"];

export default function ChantierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<TabKey>("overview");
  const unread = useUnreadCounts(id);
  const markTabViewed = useMarkTabViewed();

  const { data: chantier, isLoading, error } = useQuery({
    queryKey: ["chantiers", "detail", id],
    queryFn: () => apiFetch<Chantier>(`/chantiers/${id}`),
  });

  // On charge la membership courante de l'utilisateur sur ce chantier (peut être absente si admin).
  const { data: members } = useQuery({
    queryKey: ["chantier-members", id],
    queryFn: () =>
      apiFetch<PaginatedResponse<ChantierMember>>(
        `/chantier-members/by-chantier?chantier_id=${id}&limit=100`,
      ),
    enabled: !!chantier,
  });

  const currentMember =
    (members?.data ?? []).find((m) => m.user_id === user?.id) ?? null;

  const ctx: ChantierContext = {
    user,
    chantier: chantier ?? null,
    currentMember,
  };

  const tabVisibility: Record<TabKey, boolean> = {
    overview: true,
    discussions: canViewComments(ctx) || canViewSteps(ctx),
    photos: canViewPhotos(ctx),
    documents: canViewDocuments(ctx),
    steps: canViewSteps(ctx),
    emergencies: canViewEmergencies(ctx),
    team: canViewTeam(ctx),
  };
  const visibleTabs = ALL_TABS.filter((tab) => tabVisibility[tab.key]);
  const mode = chantier ? emergencyMode(ctx) : "split";
  const counts = unread.data;
  const tabUnread: Record<TabKey, number> = {
    overview: 0,
    discussions: (counts?.comments ?? 0) + (counts?.comments_steps ?? 0),
    photos: counts?.photos ?? 0,
    documents: counts?.documents ?? 0,
    steps: counts?.comments_steps ?? 0,
    emergencies: (counts?.emergencies ?? 0) + (counts?.emergencies_claim ?? 0),
    team: 0,
  };
  const tabsRendered = visibleTabs.map((tab) => ({
    ...tab,
    label:
      tab.key === "emergencies" && mode === "claim"
        ? t("chantier.tabClaims")
        : t(tab.labelKey),
    unread: tabUnread[tab.key],
  }));

  const handleTabChange = (next: TabKey) => {
    setTab(next);
    if (!chantier) return;
    // Marque les onglets correspondants comme vus côté serveur.
    if (next === "discussions") {
      if (tabUnread.discussions > 0) {
        if ((counts?.comments ?? 0) > 0) markTabViewed.mutate({ chantier_id: id, tab: "comments" });
        if ((counts?.comments_steps ?? 0) > 0)
          markTabViewed.mutate({ chantier_id: id, tab: "comments_steps" });
      }
    } else if (next === "photos" && (counts?.photos ?? 0) > 0) {
      markTabViewed.mutate({ chantier_id: id, tab: "photos" });
    } else if (next === "documents" && (counts?.documents ?? 0) > 0) {
      markTabViewed.mutate({ chantier_id: id, tab: "documents" });
    } else if (next === "emergencies") {
      if ((counts?.emergencies ?? 0) > 0)
        markTabViewed.mutate({ chantier_id: id, tab: "emergencies" });
      if ((counts?.emergencies_claim ?? 0) > 0)
        markTabViewed.mutate({ chantier_id: id, tab: "emergencies_claim" });
    } else if (next === "steps" && (counts?.comments_steps ?? 0) > 0) {
      markTabViewed.mutate({ chantier_id: id, tab: "comments_steps" });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/chantiers"
          className="mb-3 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
        >
          <ArrowLeft size={14} />
          {t("chantier.back")}
        </Link>
        {isLoading ? (
          <h1 className="text-2xl font-bold text-zinc-400">{t("common.loading")}</h1>
        ) : error || !chantier ? (
          <h1 className="text-2xl font-bold text-red-600">{t("chantier.notFound")}</h1>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{chantier.name}</h1>
            <StatusBadge status={chantier.status} />
            {chantier.archived_at ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                {t("chantier.archived")}
              </span>
            ) : null}
          </div>
        )}
      </div>

      {chantier ? (
        <>
          <div className="overflow-x-auto">
            <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
              {tabsRendered.map((t) => {
                const Icon = t.icon;
                const active = tab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => handleTabChange(t.key)}
                    className={cn(
                      "relative flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                      active
                        ? "border-orange-600 text-orange-600 dark:text-orange-400"
                        : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
                    )}
                  >
                    <Icon size={16} />
                    {t.label}
                    {t.unread > 0 ? (
                      <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white">
                        {t.unread > 99 ? "99+" : t.unread}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {tab === "overview" ? <Overview chantier={chantier} /> : null}


          {tab === "discussions" && tabVisibility.discussions ? (
            <Discussions
              chantierId={chantier.id}
              canSend={canViewComments(ctx)}
              canDeleteOthers={canDeleteOthersMessage(ctx)}
            />
          ) : null}

          {tab === "photos" && tabVisibility.photos ? (
            <Photos chantierId={chantier.id} canEdit={canEditChantier(ctx)} />
          ) : null}

          {tab === "documents" && tabVisibility.documents ? (
            <Documents chantierId={chantier.id} canEdit={canEditChantier(ctx)} />
          ) : null}

          {tab === "steps" && tabVisibility.steps ? (
            <Steps
              chantierId={chantier.id}
              canManage={canManageSteps(ctx)}
              canToggle={canToggleSteps(ctx)}
            />
          ) : null}

          {tab === "emergencies" && tabVisibility.emergencies ? (
            <Emergencies
              chantierId={chantier.id}
              canCreate={canCreateEmergency(ctx)}
              canDelete={canManageChantierMembers(ctx)}
              mode={mode}
            />
          ) : null}

          {tab === "team" && tabVisibility.team ? (
            <Members
              chantierId={chantier.id}
              canManage={canManageChantierMembers(ctx)}
              canEditPerms={canEditChantierPermissions(ctx)}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Overview({ chantier }: { chantier: Chantier }) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {chantier.description ? (
          <Card>
            <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">
              {t("chantier.description")}
            </h2>
            <p className="whitespace-pre-wrap text-sm text-zinc-600 dark:text-zinc-400">
              {chantier.description}
            </p>
          </Card>
        ) : null}

        <Card>
          <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">
            {t("chantier.details")}
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Detail
              icon={<Calendar size={14} />}
              label={t("chantier.startDate")}
              value={formatDate(chantier.start_date)}
            />
            <Detail
              icon={<Calendar size={14} />}
              label={t("chantier.endDate")}
              value={formatDate(chantier.end_date)}
            />
            <Detail
              icon={<MapPin size={14} />}
              label={t("chantier.address")}
              value={
                [chantier.address, chantier.postal_code, chantier.city].filter(Boolean).join(", ") || "—"
              }
            />
            <Detail
              icon={<User size={14} />}
              label={t("chantier.createdOn")}
              value={formatDate(chantier.created_at)}
            />
          </dl>
          {chantier.latitude && chantier.longitude ? (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${chantier.latitude},${chantier.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-orange-500/40 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-100 dark:border-orange-500/40 dark:bg-orange-900/20 dark:text-orange-300 dark:hover:bg-orange-900/30"
            >
              <Navigation size={14} />
              {t("chantier.directions")}
            </a>
          ) : null}
        </Card>
      </div>

      <div className="space-y-4">
        {chantier.archived_at ? (
          <Card>
            <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">
              {t("chantier.retention")}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {t("chantier.archivedOn")} <strong>{formatDate(chantier.archived_at)}</strong>
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {t("chantier.autoDeleteOn")} <strong>{formatDate(chantier.auto_delete_at)}</strong>
            </p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 text-zinc-900 dark:text-white">{value}</dd>
    </div>
  );
}
