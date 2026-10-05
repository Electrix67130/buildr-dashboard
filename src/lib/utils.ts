import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Langue des dates : posee par le fournisseur i18n, francais par defaut. */
let formatLocale = "fr-FR";
const LOCALE_TAGS: Record<string, string> = { fr: "fr-FR", en: "en-GB", de: "de-DE", es: "es-ES", it: "it-IT", pt: "pt-PT", tr: "tr-TR", pl: "pl-PL" };
export function setFormatLocale(locale: string) {
  formatLocale = LOCALE_TAGS[locale] ?? locale;
}

export function formatDate(date?: string | null) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString(formatLocale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date?: string | null) {
  if (!date) return "—";
  const d = new Date(date);
  // Le separateur date/heure depend de la langue : on laisse Intl le choisir.
  return d.toLocaleString(formatLocale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function initials(firstName?: string, lastName?: string) {
  const a = firstName?.[0] ?? "";
  const b = lastName?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
}
