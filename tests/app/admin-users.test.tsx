/**
 * La console des utilisateurs (super admin) filtre cote serveur : chaque
 * filtre de l'ecran doit devenir le bon parametre de `GET /super-admin/users`
 * (docs/API.md, « Console »). Un filtre qui ne part pas montre une liste
 * fausse sans que rien ne le signale. Un compte supprime (anonymise) doit se
 * distinguer d'un compte simplement desactive.
 */
import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import AdminUsersPage from "@/app/(app)/admin/users/page";
import { api, page } from "../helpers/api";
import { makeAdminUser, makeUser } from "../helpers/fixtures";
import { renderWithProviders } from "../helpers/render";

const superAdmin = makeUser({ is_super_admin: true });

function serve(users = [makeAdminUser()]) {
  api.on("GET", "/super-admin/users", page(users));
  api.on("GET", "/super-admin/orgs", page([
    { id: "org-1", name: "BTP Martin", is_active: true, archive_retention_years: 5, created_at: "", member_count: 3, chantier_count: 2 },
    { id: "org-2", name: "Toitures Durand", is_active: true, archive_retention_years: 5, created_at: "", member_count: 1, chantier_count: 0 },
  ]));
}

/** Les libelles des listes ne sont pas relies a leur champ (pas d'id) : on remonte au conteneur. */
function field(label: string): HTMLSelectElement {
  return screen.getByText(label, { selector: "label" }).parentElement!.querySelector("select")!;
}

function lastQuery(): URLSearchParams {
  return api.lastCall("GET", "/super-admin/users")!.query;
}

describe("Console utilisateurs — filtres", () => {
  it("par defaut : page 1, tri par date d'inscription decroissante, sans filtre", async () => {
    serve();
    renderWithProviders(<AdminUsersPage />, { user: superAdmin });
    await screen.findByText("Bruno Durand");
    const q = lastQuery();
    expect(Object.fromEntries(q)).toEqual({ page: "1", limit: "50", sort: "created_at", order: "desc" });
  });

  it("organisation, role, etat et super admin deviennent organization_id, role, status, super_admin=1", async () => {
    serve();
    const { user } = renderWithProviders(<AdminUsersPage />, { user: superAdmin });
    await screen.findByRole("option", { name: "Toitures Durand" });

    await user.selectOptions(field("Organisation"), "org-2");
    await waitFor(() => expect(lastQuery().get("organization_id")).toBe("org-2"));

    await user.selectOptions(field("Rôle"), "manager");
    await waitFor(() => expect(lastQuery().get("role")).toBe("manager"));

    await user.selectOptions(field("État du compte"), "deleted");
    await waitFor(() => expect(lastQuery().get("status")).toBe("deleted"));

    await user.click(screen.getByRole("checkbox", { name: "Super admins uniquement" }));
    await waitFor(() => expect(lastQuery().get("super_admin")).toBe("1"));

    // Les filtres se cumulent dans la meme requete.
    expect(Object.fromEntries(lastQuery())).toMatchObject({
      organization_id: "org-2",
      role: "manager",
      status: "deleted",
      super_admin: "1",
    });
  });

  it("le tri choisi donne sort et order", async () => {
    serve();
    const { user } = renderWithProviders(<AdminUsersPage />, { user: superAdmin });
    await screen.findByText("Bruno Durand");
    await user.selectOptions(field("Tri"), "last_name:asc");
    await waitFor(() => expect(lastQuery().get("sort")).toBe("last_name"));
    expect(lastQuery().get("order")).toBe("asc");
  });

  it("la recherche part en q", async () => {
    serve();
    const { user } = renderWithProviders(<AdminUsersPage />, { user: superAdmin });
    await screen.findByText("Bruno Durand");
    await user.type(screen.getByPlaceholderText("Rechercher (email, nom)…"), "durand");
    await waitFor(() => expect(lastQuery().get("q")).toBe("durand"));
  });

  it("« Réinitialiser les filtres » retire organisation, role, etat et super admin", async () => {
    serve();
    const { user } = renderWithProviders(<AdminUsersPage />, { user: superAdmin });
    await screen.findByRole("option", { name: "BTP Martin" });
    await user.selectOptions(field("Rôle"), "client");
    await user.click(screen.getByRole("checkbox", { name: "Super admins uniquement" }));
    await user.click(screen.getByRole("button", { name: "Réinitialiser les filtres" }));
    await waitFor(() => expect(lastQuery().get("role")).toBeNull());
    expect(lastQuery().get("super_admin")).toBeNull();
  });
});

describe("Console utilisateurs — etat des comptes", () => {
  it("un compte supprime porte le badge « Supprimé », pas celui de compte desactive", async () => {
    serve([
      makeAdminUser({ id: "u-del", first_name: "Compte", last_name: "supprimé", is_active: false, deleted_at: "2026-09-01T00:00:00Z", organizations: [] }),
      makeAdminUser({ id: "u-off", first_name: "Denis", last_name: "Roux", is_active: false }),
    ]);
    renderWithProviders(<AdminUsersPage />, { user: superAdmin });
    const deleted = (await screen.findByText("Compte supprimé")).closest("li")!;
    expect(within(deleted).getByText("Supprimé")).toBeInTheDocument();
    expect(within(deleted).queryByText("Désactivé")).not.toBeInTheDocument();
    const disabled = screen.getByText("Denis Roux").closest("li")!;
    expect(within(disabled).getByText("Désactivé")).toBeInTheDocument();
  });

  it("chaque ligne liste les organisations du compte et son role dans chacune", async () => {
    serve([
      makeAdminUser({
        organizations: [
          { id: "org-1", name: "BTP Martin", role: "admin" },
          { id: "org-2", name: "Toitures Durand", role: "client" },
        ],
      }),
    ]);
    renderWithProviders(<AdminUsersPage />, { user: superAdmin });
    const line = (await screen.findByText("Bruno Durand")).closest("li")!;
    expect(within(line).getByText(/BTP Martin/)).toHaveTextContent("BTP Martin · Admin");
    expect(within(line).getByText(/Toitures Durand/)).toHaveTextContent("Toitures Durand · Client");
  });
});
