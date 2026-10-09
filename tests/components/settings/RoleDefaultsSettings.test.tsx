/**
 * Droits par defaut des roles. Enregistrer un role remplace les droits de tous
 * ses membres deja presents : l'ecran doit le dire, chiffre a l'appui, avant
 * d'envoyer quoi que ce soit — et envoyer le reglage complet du bon role.
 */
import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import RoleDefaultsSettings from "@/components/settings/RoleDefaultsSettings";
import { api } from "../../helpers/api";
import { renderWithProviders } from "../../helpers/render";

const base = { can_view_comments: true, can_view_photos: true, can_view_documents: true, can_view_steps: true, can_view_team: true, can_edit: false };

function serveRoles() {
  api.on("GET", "/role-permissions", [
    { role: "manager", ...base, customized: false, member_count: 0 },
    { role: "ouvrier", ...base, customized: false, member_count: 12 },
    { role: "client", ...base, can_view_documents: false, can_view_steps: false, customized: true, member_count: 3 },
    { role: "gestionnaire_reseau", ...base, can_view_comments: false, customized: false, member_count: 0 },
  ]);
}

const row = (name: string) => screen.getByText(name).closest("tr")!;

describe("RoleDefaultsSettings", () => {
  it("confirme le nombre de membres touches, puis envoie le reglage complet du role", async () => {
    serveRoles();
    api.on("PUT", "/role-permissions/ouvrier", { role: "ouvrier", updated_members: 12 });
    const { user } = renderWithProviders(<RoleDefaultsSettings />);
    await screen.findByText("Ouvrier");

    await user.click(within(row("Ouvrier")).getByRole("checkbox", { name: /Ouvrier — .*documents/i }));
    await user.click(within(row("Ouvrier")).getByRole("button", { name: "Enregistrer et appliquer" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/12 membre/)).toBeInTheDocument();
    expect(api.lastCall("PUT", "/role-permissions/ouvrier")).toBeUndefined();

    await user.click(within(dialog).getByRole("button", { name: "Enregistrer et appliquer" }));
    expect(api.lastCall("PUT", "/role-permissions/ouvrier")!.body).toEqual({ ...base, can_view_documents: false });
  });

  it("propose de revenir aux valeurs d'origine seulement pour un role personnalise", async () => {
    serveRoles();
    renderWithProviders(<RoleDefaultsSettings />);
    await screen.findByText("Client");
    expect(within(row("Client")).getByRole("button", { name: /Valeurs d'origine/ })).toBeInTheDocument();
    expect(within(row("Ouvrier")).queryByRole("button", { name: /Valeurs d'origine/ })).not.toBeInTheDocument();
  });
});
