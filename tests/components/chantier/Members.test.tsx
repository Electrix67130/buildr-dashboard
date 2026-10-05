/**
 * L'equipe d'un chantier et ses permissions. Un administrateur de
 * l'organisation a toujours tout : l'API repond 409 si on tente de modifier
 * ses drapeaux (docs/API.md, « Les permissions d'un administrateur ne se
 * modifient pas »). L'ecran ne doit donc pas lui proposer de cases, et pour
 * un ouvrier chaque case doit partir sur la bonne permission du bon membre.
 */
import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import Members from "@/components/chantier/Members";
import { api, page } from "../../helpers/api";
import { makeMember } from "../../helpers/fixtures";
import { renderWithProviders } from "../../helpers/render";

const CHANTIER = "chantier-1";

function serveMembers() {
  api.on(
    "GET",
    "/chantier-members/by-chantier",
    page([
      makeMember({ id: "m-admin", user_id: "u-admin", first_name: "Alice", last_name: "Martin", role: "manager", user_role: "admin" }),
      makeMember({ id: "m-ouvrier", user_id: "u-ouvrier", first_name: "Bruno", last_name: "Durand", role: "ouvrier", user_role: "employee", can_view_photos: false }),
    ]),
  );
}

function row(name: string): HTMLElement {
  return screen.getByText(name).closest("li")!;
}

describe("Members — permissions", () => {
  it("demande les membres du chantier avec leur role dans l'organisation", async () => {
    serveMembers();
    renderWithProviders(<Members chantierId={CHANTIER} canEditPerms />);
    await screen.findByText("Alice Martin");
    expect(api.lastCall("GET", "/chantier-members/by-chantier")!.query.get("chantier_id")).toBe(CHANTIER);
  });

  it("un administrateur de l'organisation affiche « Accès complet » et aucune case de permission", async () => {
    serveMembers();
    const { user } = renderWithProviders(<Members chantierId={CHANTIER} canEditPerms />);
    await screen.findByText("Alice Martin");
    const admin = row("Alice Martin");
    expect(within(admin).getByText("Accès complet")).toBeInTheDocument();
    expect(within(admin).queryByRole("button", { name: "Permissions" })).not.toBeInTheDocument();
    expect(within(admin).queryAllByRole("checkbox")).toHaveLength(0);

    // Ouvrir celles de l'ouvrier n'en fait pas apparaitre chez l'admin.
    await user.click(within(row("Bruno Durand")).getByRole("button", { name: "Permissions" }));
    expect(within(row("Alice Martin")).queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("un ouvrier affiche ses cases, qui refletent ses droits", async () => {
    serveMembers();
    const { user } = renderWithProviders(<Members chantierId={CHANTIER} canEditPerms />);
    await screen.findByText("Bruno Durand");
    expect(within(row("Bruno Durand")).queryByText("Accès complet")).not.toBeInTheDocument();
    await user.click(within(row("Bruno Durand")).getByRole("button", { name: "Permissions" }));
    const boxes = within(row("Bruno Durand")).getAllByRole("checkbox");
    expect(boxes).toHaveLength(6);
    expect(within(row("Bruno Durand")).getByRole("checkbox", { name: /Voir les photos/ })).not.toBeChecked();
    expect(within(row("Bruno Durand")).getByRole("checkbox", { name: /Voir les discussions/ })).toBeChecked();
  });

  it("cocher une permission envoie PATCH /chantier-members/:id avec ce seul drapeau", async () => {
    serveMembers();
    api.on("PATCH", "/chantier-members/m-ouvrier", {});
    const { user } = renderWithProviders(<Members chantierId={CHANTIER} canEditPerms />);
    await screen.findByText("Bruno Durand");
    await user.click(within(row("Bruno Durand")).getByRole("button", { name: "Permissions" }));
    await user.click(within(row("Bruno Durand")).getByRole("checkbox", { name: /Voir les photos/ }));
    await waitFor(() => expect(api.calls("PATCH", "/chantier-members/m-ouvrier")).toHaveLength(1));
    expect(api.lastCall("PATCH")!.body).toEqual({ can_view_photos: true });
    expect(api.calls("PATCH", "/chantier-members/m-admin")).toHaveLength(0);
  });

  it("sans canEditPerms, personne n'a de bouton de permissions", async () => {
    serveMembers();
    renderWithProviders(<Members chantierId={CHANTIER} />);
    await screen.findByText("Bruno Durand");
    expect(screen.queryByRole("button", { name: "Permissions" })).not.toBeInTheDocument();
  });
});
