import type { UserRole } from "@/types/api";

const ROLE_BADGE: Record<UserRole, string> = {
  admin:
    "bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:ring-violet-700/40",
  manager:
    "bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-700/40",
  employee:
    "bg-orange-100 text-orange-700 ring-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:ring-orange-700/40",
  client:
    "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-700/40",
  gestionnaire_reseau:
    "bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700",
};

const ROLE_DOT: Record<UserRole, string> = {
  admin: "bg-violet-500",
  manager: "bg-blue-500",
  employee: "bg-orange-500",
  client: "bg-emerald-500",
  gestionnaire_reseau: "bg-zinc-500",
};

export const roleBadgeClass = (role: UserRole): string =>
  `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${ROLE_BADGE[role]}`;

export const roleDotClass = (role: UserRole): string => `h-1.5 w-1.5 rounded-full ${ROLE_DOT[role]}`;
