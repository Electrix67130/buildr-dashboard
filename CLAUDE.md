@AGENTS.md

## Centre d'aide — Regle obligatoire

Le centre d'aide (getbuildr.fr/aide) decrit l'application telle qu'elle est,
avec les libelles exacts des ecrans. Il vit dans
`buildr-website/src/content/guides/` (plan et format : `README.md` du dossier).

**Toute modification visible par un utilisateur met le centre d'aide a jour dans
le meme lot de travail** : ecran, bouton, libelle ou parcours ajoute, modifie ou
supprime, mais aussi regle metier (duree de validite, droits d'un role, limite).

1. Chercher les articles touches : `grep -rn "<libelle ou notion>" ../buildr-website/src/content/guides/*.md`.
2. Les corriger ; reecrire ou supprimer un article dont la fonctionnalite disparait
   (et le retirer des `related` des autres).
3. Nouvelle fonctionnalite : ecrire l'article, ou l'ajouter au plan du `README.md`
   comme article a ecrire, et le signaler a Julien.
4. Dans `buildr-website` : `npm run build:guides`, puis commit dans ce depot.

Une capture d'ecran devenue fausse se refait aussi (procedure dans le `README.md`).
Si rien n'est a changer, le dire explicitement dans le compte rendu.
