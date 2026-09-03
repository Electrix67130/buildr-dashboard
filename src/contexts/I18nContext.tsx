"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { translate, LOCALES, Locale } from "@/i18n/translations";

export type { Locale };
export { LOCALES };

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);
const STORAGE_KEY = "buildr_locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    // La preference enregistree prime : un utilisateur qui a choisi sa langue
    // ne doit pas la voir changer parce qu'il ouvre un autre navigateur.
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (stored && LOCALES.some((l) => l.code === stored)) {
      setLocaleState(stored);
      return;
    }
    // Premiere visite : on suit le navigateur. `languages` est ordonne par
    // preference, on prend la premiere que Buildr parle — un navigateur en
    // « de-AT » doit donner l'allemand, d'ou la coupe sur le tiret.
    const wanted = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const tag of wanted) {
      const code = tag?.split("-")[0];
      const match = LOCALES.find((l) => l.code === code);
      if (match) {
        setLocaleState(match.code);
        return;
      }
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

// Compat alias.
export const useLocale = useI18n;
