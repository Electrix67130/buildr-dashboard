/**
 * La liste des signalements est l'outil de l'administrateur pour moderer son
 * organisation. Elle doit dire qui signale qui et pourquoi, garder la trace
 * d'un contenu deja supprime, et que chaque bouton frappe la bonne route :
 * supprimer une photo a la place d'un message, ou classer un signalement
 * qu'on voulait rejeter, ne se rattrape pas.
 */
import { describe, expect, it } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import ReportList from "@/components/reports/ReportList";
import type { Report } from "@/hooks/useReports";
import { api } from "../../helpers/api";
import { makeReport } from "../../helpers/fixtures";
import { renderWithProviders } from "../../helpers/render";

function setup(reports: Report[]) {
  return renderWithProviders(<ReportList reports={reports} />);
}

describe("ReportList — ce qui est affiche", () => {
  it("affiche le motif, le type de cible, le rapporteur, la personne visee, le chantier et l'extrait", () => {
    setup([makeReport({ comment: "Il insiste depuis une semaine" })]);
    expect(screen.getByText("Harcèlement")).toBeInTheDocument();
    expect(screen.getByText("Message")).toBeInTheDocument();
    expect(screen.getByText(/Signalé par Claire Petit/)).toBeInTheDocument();
    expect(screen.getByText(/concerne Bruno Durand/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Residence Les Pins" })).toHaveAttribute("href", "/chantiers/chantier-1");
    expect(screen.getByText("Message deplace")).toBeInTheDocument();
    expect(screen.getByText("« Il insiste depuis une semaine »")).toBeInTheDocument();
  });

  it("un compte vise anonymise apparait comme « compte supprimé »", () => {
    setup([makeReport({ target_first_name: null, target_last_name: null })]);
    expect(screen.getByText(/concerne compte supprimé/)).toBeInTheDocument();
  });

  it("un contenu supprime depuis garde son extrait, avec la mention, et n'offre plus de le supprimer", () => {
    setup([makeReport({ target_exists: false })]);
    expect(screen.getByText("Message deplace")).toBeInTheDocument();
    expect(screen.getByText("Ce contenu a été supprimé depuis.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Supprimer le contenu" })).not.toBeInTheDocument();
  });

  it("un signalement qui vise un administrateur porte le badge « escaladé »", () => {
    setup([makeReport({ escalated: true })]);
    expect(screen.getByText("Vise un administrateur")).toBeInTheDocument();
  });

  it("un signalement deja traite affiche son etat et sa note, sans aucune action", () => {
    setup([makeReport({ status: "resolved", resolution_note: "Message retire" })]);
    expect(screen.getByText("Traités")).toBeInTheDocument();
    expect(screen.getByText(/Message retire/)).toBeInTheDocument();
    for (const name of ["Supprimer le contenu", "Désactiver le compte", "Rejeter", "Marquer comme traité"]) {
      expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
    }
  });

  it("liste vide : un etat vide explicite", () => {
    setup([]);
    expect(screen.getByText("Aucun signalement")).toBeInTheDocument();
  });

  it("un membre signale (cible « user ») n'a pas de contenu a supprimer, seulement le compte", () => {
    setup([makeReport({ target_type: "user", target_id: "user-target", target_excerpt: null })]);
    expect(screen.queryByRole("button", { name: "Supprimer le contenu" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Désactiver le compte" })).toBeInTheDocument();
  });
});

describe("ReportList — supprimer le contenu", () => {
  it.each([
    ["comment", "/comments/target-9"],
    ["emergency_comment", "/emergency-comments/target-9"],
    ["photo", "/photos/target-9"],
  ] as const)("cible %s : la suppression part sur %s apres confirmation", async (targetType, route) => {
    api.on("DELETE", route, undefined);
    const { user } = setup([makeReport({ target_type: targetType, target_id: "target-9" })]);
    await user.click(screen.getByRole("button", { name: "Supprimer le contenu" }));
    expect(api.calls("DELETE")).toHaveLength(0);
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Supprimer" }));
    await waitFor(() => expect(api.calls("DELETE", route)).toHaveLength(1));
    expect(api.unhandled).toEqual([]);
  });

  it("annuler la confirmation ne supprime rien", async () => {
    const { user } = setup([makeReport()]);
    await user.click(screen.getByRole("button", { name: "Supprimer le contenu" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Annuler" }));
    expect(api.calls("DELETE")).toHaveLength(0);
  });
});

describe("ReportList — classer le signalement", () => {
  it("« Marquer comme traité » ouvre la fenetre de note puis envoie PATCH /reports/:id en resolved", async () => {
    api.on("PATCH", "/reports/report-1", {});
    const { user } = setup([makeReport()]);
    await user.click(screen.getByRole("button", { name: "Marquer comme traité" }));
    const dialog = screen.getByRole("dialog");
    expect(api.calls("PATCH")).toHaveLength(0);

    await user.type(within(dialog).getByPlaceholderText("Ce qui a été fait…"), "  Message retire, rappel a l'ordre  ");
    await user.click(within(dialog).getByRole("button", { name: "Marquer comme traité" }));
    await waitFor(() => expect(api.calls("PATCH", "/reports/report-1")).toHaveLength(1));
    expect(api.lastCall("PATCH")!.body).toEqual({ status: "resolved", resolution_note: "Message retire, rappel a l'ordre" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("sans note, la note n'est pas envoyee", async () => {
    api.on("PATCH", "/reports/report-1", {});
    const { user } = setup([makeReport()]);
    await user.click(screen.getByRole("button", { name: "Marquer comme traité" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Marquer comme traité" }));
    await waitFor(() => expect(api.calls("PATCH")).toHaveLength(1));
    expect(api.lastCall("PATCH")!.body).toEqual({ status: "resolved", resolution_note: undefined });
  });

  it("« Rejeter » envoie directement dismissed", async () => {
    api.on("PATCH", "/reports/report-1", {});
    const { user } = setup([makeReport()]);
    await user.click(screen.getByRole("button", { name: "Rejeter" }));
    await waitFor(() => expect(api.calls("PATCH", "/reports/report-1")).toHaveLength(1));
    expect(api.lastCall("PATCH")!.body).toMatchObject({ status: "dismissed" });
  });

  it("« Désactiver le compte » vise la personne signalee, apres confirmation", async () => {
    api.on("PATCH", "/users/user-target", {});
    const { user } = setup([makeReport()]);
    await user.click(screen.getByRole("button", { name: "Désactiver le compte" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Désactiver le compte de Bruno Durand/)).toBeInTheDocument();
    await user.click(within(dialog).getAllByRole("button").at(-1)!);
    await waitFor(() => expect(api.calls("PATCH", "/users/user-target")).toHaveLength(1));
    expect(api.lastCall("PATCH")!.body).toEqual({ is_active: false });
  });
});
