/**
 * Le menu est la porte d'entree de la moderation : l'entree « Signalements »
 * et sa pastille previennent l'administrateur qu'un signalement l'attend.
 * Les autres roles ne doivent ni la voir, ni declencher la requete du
 * compteur (que l'API leur refuserait).
 */
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import Sidebar from "@/components/Sidebar";
import { api, page } from "../helpers/api";
import { makeUser } from "../helpers/fixtures";
import { setPathname } from "../helpers/navigation";
import { renderWithProviders } from "../helpers/render";

function serve(pending: number) {
  api.on("GET", "/reports?status=pending&limit=1", page([], { counts: { pending } }));
  api.on("GET", "/chantier-views/unread-summary", { by_chantier: {}, by_organization: {} });
}

describe("Sidebar — Signalements", () => {
  it("un administrateur voit l'entree, avec la pastille du nombre en attente", async () => {
    serve(3);
    renderWithProviders(<Sidebar />);
    const link = screen.getByRole("link", { name: /Signalements/ });
    expect(link).toHaveAttribute("href", "/reports");
    await waitFor(() => expect(link).toHaveTextContent("Signalements3"));
  });

  it("sans signalement en attente, pas de pastille", async () => {
    serve(0);
    renderWithProviders(<Sidebar />);
    await waitFor(() => expect(api.calls("GET", "/reports")).toHaveLength(1));
    expect(screen.getByRole("link", { name: /Signalements/ })).toHaveTextContent(/^Signalements$/);
  });

  it("au-dela de 99, la pastille affiche 99+", async () => {
    serve(150);
    renderWithProviders(<Sidebar />);
    await waitFor(() => expect(screen.getByRole("link", { name: /Signalements/ })).toHaveTextContent("99+"));
  });

  it.each(["manager", "employee", "client"] as const)("un %s ne voit pas l'entree et ne demande pas le compteur", async (role) => {
    serve(3);
    renderWithProviders(<Sidebar />, { user: makeUser({ role }) });
    await waitFor(() => expect(api.calls("GET", "/chantier-views/unread-summary")).toHaveLength(1));
    expect(screen.queryByRole("link", { name: /Signalements/ })).not.toBeInTheDocument();
    expect(api.calls("GET", "/reports")).toHaveLength(0);
  });

  it("l'entree de la page courante est mise en avant", () => {
    serve(0);
    setPathname("/reports");
    renderWithProviders(<Sidebar />);
    expect(screen.getByRole("link", { name: /Signalements/ })).toHaveClass("bg-orange-50");
    expect(screen.getByRole("link", { name: "Vue d'ensemble" })).not.toHaveClass("bg-orange-50");
  });
});
