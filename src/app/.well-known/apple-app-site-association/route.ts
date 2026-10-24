/**
 * Liens universels iOS : un lien https://app.getbuildr.fr/invite/... ouvre
 * l'app Buildr si elle est installee, la page web sinon.
 *
 * Seules les invitations passent par l'app. Le reste du dashboard doit rester
 * dans le navigateur : un admin qui clique un lien vers ses parametres depuis
 * son telephone ne veut pas atterrir dans l'app mobile.
 *
 * Route plutot que fichier statique : Apple exige du JSON, et un fichier sans
 * extension dans public/ ne serait pas servi en application/json.
 */

// Team ID Apple (eas.json, submit.production.ios.appleTeamId) + bundle id.
const APP_ID = "KH8XN5X4VY.fr.getbuildr.app";

export function GET() {
  return Response.json({
    applinks: {
      details: [
        {
          appIDs: [APP_ID],
          components: [{ "/": "/invite/*" }],
        },
      ],
    },
  });
}
