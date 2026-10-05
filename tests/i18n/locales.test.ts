/**
 * Les huit langues ont exactement les memes cles, et le francais vouvoie.
 * Une cle oubliee afficherait son identifiant brut ; un « tu » detonnerait.
 */
import { describe, expect, it } from "vitest";
import { TRANSLATIONS } from "@/i18n/translations";

describe("Traductions", () => {
  it("chaque langue a les memes cles que le francais", () => {
    const dicts = TRANSLATIONS as Record<string, Record<string, string>>;
    const ref = Object.keys(dicts.fr).sort();
    for (const code of Object.keys(dicts)) {
      const manquantes = ref.filter((k) => !(k in dicts[code]));
      const enTrop = Object.keys(dicts[code]).filter((k) => !(k in dicts.fr));
      expect({ code, manquantes, enTrop }).toEqual({ code, manquantes: [], enTrop: [] });
    }
  });

  it("le francais vouvoie", () => {
    const fr = (TRANSLATIONS as Record<string, Record<string, string>>).fr;
    // Pas de \b : il ignore les lettres accentuees, et « êtes » cachait un « tes ».
    const tutoiement = /(?<![\p{L}'])(tu|toi|ton|ta|tes|t'as|t'es)(?!\p{L})/iu;
    const imperatifs = /^(Lance|Crée|Ajoute|Choisis|Clique|Renseigne|Sélectionne|Invite|Commence|Essaie|Saisis|Indique|Vérifie|Modifie|Retrouve|Découvre|Configure|Active|Pense|Garde|Donne|Mets|Tape|Glisse|Dépose|Prends|Reviens|Réessaie|Connecte|Rejoins|Télécharge|Partage|Envoie|Valide|Confirme|Décris|Explique|Sois|Fais|Vas|Ouvre|Ferme|Appuie|Note|Contacte|Utilise|Pose|Nomme) /;
    const fautes = Object.entries(fr)
      .filter(([, v]) => tutoiement.test(v) || imperatifs.test(v))
      .map(([k, v]) => `${k} = ${v}`);
    expect(fautes).toEqual([]);
  });
});
