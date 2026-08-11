# Permissions Buildr — référence

Document de référence des permissions par rôle. Source de vérité : l'app mobile (`buildr-ui`) + l'API (`buildr-api`). Le dashboard doit implémenter **exactement les mêmes règles**, plus deux additions exclusives au dashboard (vue d'ensemble et abonnement).

## Rôles

Deux niveaux de rôles cohabitent :

- **Rôle d'organisation** (`organization_member.role`) : `admin`, `manager`, `employee`, `client`, `gestionnaire_reseau`
- **Rôle de chantier** (`chantier_member.role`) : `manager`, `ouvrier`, `client`, `gestionnaire_reseau` (pas d'`admin`, et `employee` devient `ouvrier`)

Mapping automatique à l'ajout sur un chantier :

| Org | → | Chantier |
|---|---|---|
| `admin` | → | `manager` |
| `manager` | → | `manager` |
| `employee` | → | `ouvrier` |
| `client` | → | `client` |
| `gestionnaire_reseau` | → | `gestionnaire_reseau` |

## Navigation (sidebar / tabs)

| Section | admin | manager | employee | client | gestionnaire_reseau |
|---|:-:|:-:|:-:|:-:|:-:|
| Vue d'ensemble *(dashboard only)* | ✅ | ✅ | ✅ | ✅ | ✅ |
| Chantiers (liste) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Archives | ✅ | ✅ | ✅ | ✅ | ✅ |
| Équipe (organisation) | ✅ | ✅ | ✅ | ❌ | ✅ |
| Templates | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Abonnement** *(dashboard only)* | ✅ | ❌ | ❌ | ❌ | ❌ |
| Paramètres | ✅ | ✅ | ✅ | ✅ | ✅ |

## Chantiers (liste)

| Action | admin | manager | employee | client | gestionnaire_reseau |
|---|:-:|:-:|:-:|:-:|:-:|
| Voir la liste de l'organisation | ✅ tous | ✅ tous | 🟡 ses membres | 🟡 ses membres | 🟡 ses membres |
| Créer un chantier | ✅ | ❌ | ❌ | ❌ | ❌ |
| Supprimer un chantier | ✅ | ❌ | ❌ | ❌ | ❌ |
| Archiver / désarchiver | ✅ | ❌ | ❌ | ❌ | ❌ |
| Modifier durée de conservation | ✅ | ❌ | ❌ | ❌ | ❌ |

🟡 = uniquement les chantiers où l'utilisateur est créateur OU membre.

## Chantier — détail

Variables clé :

- `isCreator` : l'utilisateur a créé le chantier.
- `currentMember` : sa ligne dans `chantier_member` (peut être absente si admin).
- `currentMember.can_*` : permissions fines stockées sur la ligne `chantier_member`.

### Onglets visibles

| Onglet | Règle de visibilité |
|---|---|
| Vue d'ensemble | Toujours visible (si l'utilisateur peut voir le chantier) |
| Discussions | `admin` ou `isCreator` ou `can_view_comments` ou `can_view_steps` |
| Photos | `admin` ou `isCreator` ou `can_view_photos` |
| Documents | `admin` ou `isCreator` ou `can_view_documents` ou rôle `gestionnaire_reseau` (filtré DICT côté serveur) |
| Étapes | `admin` ou `isCreator` ou `can_view_steps` |
| Urgences | `admin` ou `isCreator` ou tout membre du chantier |
| Équipe | `admin` ou `isCreator` ou `can_view_team` |

### Actions

| Action | Règle |
|---|---|
| Modifier le chantier (description, dates, adresse…) | `admin` ou `isCreator` ou `can_edit` |
| Créer/supprimer une étape | `admin` ou `isCreator` ou `chantier_member.role === 'manager'` ou `can_edit` |
| Cocher/décocher une étape | `admin` ou `isCreator` ou tout membre dont le rôle ≠ `client` |
| Ajouter photo / document | `admin` ou `isCreator` ou `can_edit` |
| Supprimer une photo / un document | `admin` ou `isCreator` ou `can_edit` |
| Envoyer un message (discussion) | tout membre qui peut voir les discussions |
| Supprimer son propre message | l'auteur |
| Supprimer le message d'autrui | `admin` ou `isCreator` |
| Créer une urgence | `admin` ou `isCreator` ou `manager` ou `ouvrier` ou `client` (jamais `gestionnaire_reseau`) |
| Créer une réclamation | `client` (mode `claim`) |
| Mode urgences (split / emergency / claim) | `admin / creator / manager` → split (2 sous-onglets), `client` → claim, autres → emergency |

### Équipe du chantier

| Action | Règle |
|---|---|
| Voir la liste des membres | `admin` ou `isCreator` ou `can_view_team` |
| Ajouter un membre | `admin` ou `manager` (org) ou `isCreator` |
| Retirer un membre | `admin` ou `manager` (org) ou `isCreator` |
| Modifier les permissions fines (`can_view_*`, `can_edit`) | `admin` ou `isCreator` (les managers org **ne peuvent pas**) |

### Permissions fines par défaut (à l'ajout)

Quand on ajoute un `client` ou `gestionnaire_reseau` à un chantier, l'admin/créateur passe par une modale de configuration **pré-remplie avec les défauts du rôle** :

| Permission | client (défaut) | gestionnaire_reseau (défaut) |
|---|:-:|:-:|
| `can_view_comments` | ✅ | ❌ |
| `can_view_photos` | ✅ | ❌ |
| `can_view_documents` | ❌ | ✅ (filtré DICT côté serveur) |
| `can_view_steps` | ❌ | ❌ |
| `can_view_team` | ✅ | ❌ |
| `can_edit` | ❌ | ❌ |

Pour les rôles internes (`manager`, `ouvrier`), pas de modale : les défauts backend s'appliquent (toutes les vues à `true`, `can_edit=false` par défaut).

## Équipe (organisation)

| Action | admin | manager | employee | client | gestionnaire_reseau |
|---|:-:|:-:|:-:|:-:|:-:|
| Voir la liste des membres de l'org | ✅ tous | 🟡 son équipe | 🟡 ses co-membres | ❌ pas de tab | 🟡 ses co-membres |
| Inviter un membre (admin/manager rôle) | ✅ | ❌ | ❌ | ❌ | ❌ |
| Inviter un membre (employee/client rôle) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Annuler une invitation | ✅ | 🟡 ses invitations | ❌ | ❌ | ❌ |
| Changer le rôle d'un membre | ✅ | ❌ | ❌ | ❌ | ❌ |
| Supprimer un membre | ✅ | ❌ | ❌ | ❌ | ❌ |

🟡 = scope limité.

## Profil / paramètres

| Action | admin | manager | employee | client | gestionnaire_reseau |
|---|:-:|:-:|:-:|:-:|:-:|
| Modifier prénom / nom / email / téléphone | ✅ self | ✅ self | ✅ self | ✅ self | ✅ self |
| Modifier `company_name` | ✅ | ❌ (read-only) | ❌ (read-only) | ✅ | ❌ |
| Changer son mot de passe | ✅ | ✅ | ✅ | ✅ | ✅ |
| Switcher d'organisation | ✅ si plusieurs memberships | ✅ idem | ✅ idem | ✅ idem | ✅ idem |
| Créer une organisation | ✅ tous (devient admin de la nouvelle) |  |  |  |  |
| Modifier nom de l'organisation active | ✅ | ❌ | ❌ | ❌ | ❌ |
| Modifier durée de conservation des archives | ✅ | ❌ | ❌ | ❌ | ❌ |

## Abonnement *(dashboard only)*

| Action | admin | autres |
|---|:-:|:-:|
| Voir la page Abonnement | ✅ | ❌ (redirigé) |
| Voir le calcul des sièges facturables | ✅ | — |
| Gérer le moyen de paiement (Stripe Customer Portal — à venir) | ✅ | — |

Sièges facturables = nombre de membres avec rôle `admin`, `manager` ou `employee`. Les `client` et `gestionnaire_reseau` ne sont pas facturés (ils sont externes).

## Implémentation

Le fichier `src/lib/permissions.ts` expose les helpers correspondant à chaque ligne de ce tableau. **Toujours** passer par lui plutôt que de dupliquer la logique dans les composants. Quand une règle change, on l'édite ici → tout le dashboard en bénéficie.

L'API enforce de toute façon les vraies règles côté serveur (403 sur tentative non autorisée). Ce document et le helper servent à **masquer / désactiver l'UI** côté client pour ne pas proposer ce qui ne marchera pas.
