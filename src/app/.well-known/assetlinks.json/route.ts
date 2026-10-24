/**
 * App Links Android : pendant d'apple-app-site-association. Android verifie
 * que l'app installee est bien signee par l'une de ces empreintes avant de lui
 * confier les liens https://app.getbuildr.fr/invite/... (filtre declare dans
 * l'app.json de buildr-ui, autoVerify).
 */

// SHA-256 du certificat de signature de l'app, celui de Google Play (Play
// Console > Protege avec Play > Signature de l'appli). Les apps installees
// depuis le Play Store portent cette signature, pas celle de la cle d'import
// d'EAS. Relevee le 2026-10-24 sur l'APK installe depuis le Play Store.
const SHA256_CERT_FINGERPRINTS = [
  "43:A4:BD:78:94:B0:72:43:45:DC:0C:2F:3F:E3:41:6C:BC:38:A3:F3:DE:3D:E3:0B:BB:C0:5A:AD:B4:6A:E7:1B",
];

export function GET() {
  return Response.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "fr.getbuildr.app",
        sha256_cert_fingerprints: SHA256_CERT_FINGERPRINTS,
      },
    },
  ]);
}
