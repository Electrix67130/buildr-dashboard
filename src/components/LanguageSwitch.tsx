"use client";

import { Globe } from "lucide-react";
import { useI18n, LOCALES, Locale } from "@/contexts/I18nContext";

/**
 * Selecteur de langue compact, pour les ecrans ou la barre laterale et ses
 * reglages ne sont pas disponibles — connexion, inscription, invitation.
 *
 * Un invite qui ne parle pas francais arrivait sur la page d'invitation sans
 * aucun moyen de changer de langue : le selecteur vivait dans les Reglages,
 * derriere l'authentification qu'il n'avait pas encore franchie.
 *
 * Un `select` natif plutot qu'un menu maison : il est accessible au clavier et
 * aux lecteurs d'ecran sans travail supplementaire, et sur mobile il ouvre la
 * roue systeme, plus confortable que huit lignes dans une carte etroite.
 */
export default function LanguageSwitch({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <Globe size={14} className="pointer-events-none absolute left-2 text-zinc-400" />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label={t("settings.language")}
        className="cursor-pointer appearance-none rounded-lg border border-zinc-200 bg-white py-1.5 pl-7 pr-3 text-sm text-zinc-600 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}
