/**
 * Hub i18n du dashboard.
 * Chaque langue vit dans `locales/<code>.ts`. Ce fichier agrège + expose `translate()`.
 */

import type { Dict, Locale } from "./types";
import fr from "./locales/fr";
import en from "./locales/en";
import de from "./locales/de";
import es from "./locales/es";
import it from "./locales/it";
import pt from "./locales/pt";
import tr from "./locales/tr";
import pl from "./locales/pl";

export { LOCALES } from "./types";
export type { Locale };

export const TRANSLATIONS: Record<Locale, Dict> = { fr, en, de, es, it, pt, tr, pl };

/** Translate a key, with optional placeholders `{var}` replaced. */
export function translate(
  locale: Locale,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const dict = TRANSLATIONS[locale] ?? TRANSLATIONS.fr;
  let value = dict[key] ?? TRANSLATIONS.fr[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      value = value.replaceAll(`{${k}}`, String(v));
    }
  }
  return value;
}
