/**
 * La page des signalements est reservee aux administrateurs de
 * l'organisation : un signalement peut viser un collegue, et seul
 * l'administrateur doit le lire. Un autre role est renvoye au tableau de bord
 * sans meme que la liste soit demandee.
 */
import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import ReportsPage from "@/app/(app)/reports/page";
import { api, page } from "../helpers/api";
import { makeReport, makeUser } from "../helpers/fixtures";
import { router } from "../helpers/navigation";
import { renderWithProviders } from "../helpers/render";

describe("Page Signalements", () => {
  it("un non-administrateur est redirige vers /dashboard, sans requete", async () => {
    renderWithProviders(<ReportsPage />, { user: makeUser({ role: "manager" }) });
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/dashboard"));
    expect(screen.queryByText("Signalements")).not.toBeInTheDocument();
    expect(api.calls("GET", "/reports")).toHaveLength(0);
  });

  it("un administrateur voit la liste des signalements en attente et leur nombre", async () => {
    api.on("GET", "/reports", page([makeReport(), makeReport({ id: "report-2", reason: "off_topic" })], { counts: { pending: 2 } }));
    renderWithProviders(<ReportsPage />);
    expect(await screen.findByText("Hors sujet")).toBeInTheDocument();
    expect(screen.getByText("Harcèlement")).toBeInTheDocument();
    expect(screen.getByText("2 en attente")).toBeInTheDocument();
    expect(api.lastCall("GET", "/reports")!.query.get("status")).toBe("pending");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("changer l'etat relit la liste avec ce statut", async () => {
    api.on("GET", "/reports", page([], { counts: { pending: 0 } }));
    const { user } = renderWithProviders(<ReportsPage />);
    await screen.findByText("Aucun signalement");
    await user.selectOptions(screen.getByRole("combobox"), "dismissed");
    await waitFor(() => expect(api.lastCall("GET", "/reports")!.query.get("status")).toBe("dismissed"));
  });
});
