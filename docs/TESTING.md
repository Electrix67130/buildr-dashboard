# Tests du dashboard

Vitest + React Testing Library + jsdom. Les tests rendent les vrais composants
dans les vrais providers (React Query, i18n, dialogues) ; seuls l'API, le
contexte d'authentification et le routeur Next sont simules.

## Lancer

```bash
npm test                                  # toute la suite, une fois
npm run test:watch                        # relance a chaque modification
npx vitest run tests/components/reports   # un dossier
npx vitest run -t "Rejeter"               # les tests dont le nom contient « Rejeter »
npx tsc --noEmit                          # les tests sont types comme le reste
```

Aucune base ni API a demarrer. La ligne `Not implemented: navigation to another
Document` dans la sortie est attendue : elle vient de `tests/lib/api.test.ts`, ou
le client renvoie vers `/login` et jsdom ne sait pas naviguer.

## Organisation

```
vitest.config.mts       # alias @/ -> src/, jsdom, setup, variables NEXT_PUBLIC_*
tests/
├── setup.ts            # mocks globaux (API, auth, next/navigation, next/link), nettoyage
├── helpers/
│   ├── api.ts          # routeur qui remplace apiFetch : api.on / api.calls / deferred / page
│   ├── auth.tsx        # useAuth simule : setAuthUser(), admin par defaut
│   ├── navigation.tsx  # router (vi.fn), setPathname, setSearchParams, next/link en <a>
│   ├── render.tsx      # renderWithProviders, renderHookWithProviders
│   ├── fixtures.ts     # makeUser, makeMessage, makeReport, makeStep, makeMember...
│   └── fake-websocket.ts
├── components/         # un fichier par composant
├── app/                # pages
├── hooks/
└── lib/
```

## Simulation de l'API

**Choix : `apiFetch` est remplace par un `vi.mock` global**, pas par `msw`.
Tous les composants passent par `apiFetch` (`src/lib/api.ts`) : le remplacer
suffit, sans serveur reseau a monter, et les assertions portent sur ce que le
composant a demande (methode, chemin, query, corps) plutot que sur des
requetes HTTP brutes. `ApiError`, `getAccessToken`, etc. restent les vrais.

```ts
import { api, ApiReject, deferred, page } from "../helpers/api";

api.on("GET", "/chantier-members/by-chantier", page([makeMember()]));  // chemin sans query
api.on("GET", "/reports?status=pending&limit=1", page([], { counts: { pending: 3 } })); // chemin exact
api.on("GET", /^\/super-admin\/users\?/, (req) => page(filtrer(req.query)));            // fonction de la requete
api.on("POST", "/reports", new ApiReject(404, "Introuvable"));          // erreur de l'API
api.once("PATCH", "/reports/r-1", {});                                  // un seul appel

const pending = deferred();
api.on("POST", "/chantiers/c-1/steps/reorder", () => pending.promise);  // requete en vol
// ... verifier l'ecran optimiste ...
pending.resolve({});

expect(api.lastCall("PATCH", "/reports/r-1")!.body).toEqual({ status: "resolved", resolution_note: "..." });
expect(api.lastCall("GET", "/super-admin/users")!.query.get("role")).toBe("manager");
expect(api.unhandled).toEqual([]);   // aucune route imprevue
```

- Une chaine sans `?` compare le chemin sans query string ; avec `?`, le chemin
  complet ; une RegExp est testee sur le chemin complet.
- La derniere route declaree l'emporte : un test peut surcharger un defaut.
- Une route non declaree rejette en `ApiError(404)` et s'ajoute a
  `api.unhandled`. Le test continue (une requete annexe, comme les compteurs
  de non-lus, ne le casse pas), mais on peut l'exiger vide.
- Les formes de reponse suivent `buildr-api/docs/API.md` : listes paginees
  `{ data, meta }` (`page()`), `counts` pour les signalements, etc.
- L'etat est remis a zero avant chaque test (`tests/setup.ts`).

Le vrai `apiFetch` (renouvellement du jeton, en-tetes) est teste dans
`tests/lib/api.test.ts` : il est recupere par `vi.importActual` et c'est
`fetch` qui y est simule.

Les autres modules lies au reseau se simulent dans le fichier qui en a besoin,
par exemple `vi.mock("@/lib/upload", ...)` dans `Steps.test.tsx`.

## Authentification, navigation, langue

- `useAuth()` renvoie un **administrateur** (`makeUser()`) par defaut.
  Autre utilisateur : `renderWithProviders(<X />, { user: makeUser({ role: "employee" }) })`,
  visiteur : `{ user: null }`. `authActions.logout` etc. sont des `vi.fn()`.
- `useRouter()` renvoie `router` (de `helpers/navigation`) :
  `expect(router.replace).toHaveBeenCalledWith("/dashboard")`.
  `setPathname("/reports")` avant le rendu pour `usePathname()`.
- Langue : francais. Les tests cherchent les textes affiches (`"Marquer comme
  traité"`), ce qui verifie aussi que la cle de traduction existe.

## Ecrire un test

1. Un fichier `tests/<dossier>/<Composant>.test.tsx`, avec un **commentaire
   d'en-tete qui dit pourquoi ce comportement compte**.
2. `describe` / `it` **en francais**, qui decrivent ce que fait l'utilisateur et
   ce qu'il obtient, pas l'implementation.
3. Declarer les routes, rendre avec `renderWithProviders`, agir avec le `user`
   renvoye (`userEvent`), verifier l'ecran et `api.calls`.
4. Chercher par role et nom accessible (`getByRole("button", { name: "Rejeter" })`).
   Si un element n'a pas de nom accessible, le dire en commentaire : c'est un
   defaut d'accessibilite a corriger dans le composant, pas a contourner en silence.
5. Pour une requete, attendre avec `waitFor(() => expect(api.calls(...)).toHaveLength(1))`.

```tsx
/**
 * Pourquoi ce comportement compte, en deux ou trois lignes.
 */
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import ReportList from "@/components/reports/ReportList";
import { api } from "../../helpers/api";
import { makeReport } from "../../helpers/fixtures";
import { renderWithProviders } from "../../helpers/render";

describe("ReportList", () => {
  it("« Rejeter » envoie dismissed", async () => {
    api.on("PATCH", "/reports/report-1", {});
    const { user } = renderWithProviders(<ReportList reports={[makeReport()]} />);
    await user.click(screen.getByRole("button", { name: "Rejeter" }));
    await waitFor(() => expect(api.lastCall("PATCH")?.body).toMatchObject({ status: "dismissed" }));
  });
});
```

Glisser-deposer : `fireEvent.dragStart / dragOver / drop` avec un objet
`dataTransfer` factice (voir `Steps.test.tsx`). WebSocket : `installFakeWebSocket()`
puis `FakeWebSocket.last.simulateOpen() / simulateMessage() / simulateClose(code)`,
avec `vi.useFakeTimers()` pour les delais de reconnexion.

## Fichiers de test

| Fichier | Objet |
|---|---|
| `tests/components/MessageThread.test.tsx` | Envoi (Entree, Maj+Entree, vide), reponse citee et `replyToId`, rangee d'emojis et `onReact`, pastilles `aria-pressed`, « Signaler » et « Bloquer » (avec confirmation) seulement sur les messages d'autrui et si fournis, modifier/supprimer reserves a l'auteur, `canDeleteOthers`, mention « modifié » |
| `tests/components/reports/ReportList.test.tsx` | Motif, cible, rapporteur, personne visee, chantier, extrait, « supprimé depuis », badge escalade, signalement traite sans actions, suppression du contenu par `target_type` (`/comments`, `/emergency-comments`, `/photos`), note puis `PATCH resolved`, `dismissed`, desactivation du compte |
| `tests/components/reports/ReportDialog.test.tsx` | `POST /reports` avec cible, motif et commentaire ; defauts ; fenetre gardee ouverte en cas d'erreur |
| `tests/components/chantier/Steps.test.tsx` | Etapes, sous-etapes, vignettes et visionneuse, droits `canManage` / `canToggle`, photo jointe a une etape ou une sous-etape, toggles, glisser-deposer des etapes (ordre optimiste avant la reponse, retour a l'ordre d'origine en cas d'echec) et des sous-etapes |
| `tests/components/chantier/Members.test.tsx` | Administrateur : « Accès complet » sans cases ; ouvrier : cases et `PATCH /chantier-members/:id` |
| `tests/components/chantier/EmergencyDetailDialog.test.tsx` | Toutes les photos, visionneuse, ancienne `photo_url`, signalement d'un message du fil en `emergency_comment` |
| `tests/components/Sidebar.test.tsx` | Entree « Signalements » reservee a l'admin, pastille, 99+, pas de requete du compteur pour les autres roles |
| `tests/app/admin-users.test.tsx` | Filtres de la console (organisation, role, etat, super admin, tri, recherche) dans la query de `/super-admin/users`, reinitialisation, badge compte supprime |
| `tests/app/reports-page.test.tsx` | Non-admin redirige vers `/dashboard` sans requete ; admin : liste et compteur ; filtre d'etat |
| `tests/hooks/useRealtimeSync.test.tsx` | Connexion `/ws`, codes 4001/4002/4003 sans reconnexion, reconnexion 1 s / 2 s / 5 s… plafonnee a 30 s, remise a zero apres ouverture, `report.created`, invalidations, message illisible |
| `tests/lib/api.test.ts` | 401 → renouvellement puis rejeu ; 502 ou erreur reseau au renouvellement : jetons gardes ; 401 au renouvellement : jetons effaces ; renouvellement partage ; `skipAuth` ; pas de `Content-Type` sans corps |
