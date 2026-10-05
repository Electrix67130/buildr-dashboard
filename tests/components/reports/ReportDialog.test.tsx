/**
 * La fenetre de signalement est le seul chemin par lequel un membre alerte
 * son administrateur. Si elle transmet une mauvaise cible ou perd le motif,
 * le signalement arrive inexploitable — ou n'arrive pas.
 */
import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import ReportDialog from "@/components/reports/ReportDialog";
import { api, ApiReject } from "../../helpers/api";
import { renderWithProviders } from "../../helpers/render";

const target = { type: "emergency_comment" as const, id: "ec-42", label: "Bruno Durand : Venez vite" };

describe("ReportDialog", () => {
  it("rappelle ce qu'on signale et dit que la personne visee n'en saura rien", () => {
    renderWithProviders(<ReportDialog target={target} onClose={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Bruno Durand : Venez vite")).toBeInTheDocument();
    expect(within(dialog).getByText(/jamais à la personne concernée/)).toBeInTheDocument();
  });

  it("envoie POST /reports avec la cible, le motif choisi et le commentaire", async () => {
    api.on("POST", "/reports", { id: "r-1" });
    const onClose = vi.fn();
    const { user } = renderWithProviders(<ReportDialog target={target} onClose={onClose} />);
    await user.selectOptions(screen.getByRole("combobox"), "harassment");
    await user.type(screen.getByPlaceholderText("Expliquez ce qui pose problème…"), "  Propos insultants  ");
    await user.click(screen.getByRole("button", { name: "Envoyer le signalement" }));

    await waitFor(() => expect(api.calls("POST", "/reports")).toHaveLength(1));
    expect(api.lastCall("POST", "/reports")!.body).toEqual({
      target_type: "emergency_comment",
      target_id: "ec-42",
      reason: "harassment",
      comment: "Propos insultants",
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("motif par defaut « inapproprie », commentaire vide non transmis", async () => {
    api.on("POST", "/reports", { id: "r-1" });
    const { user } = renderWithProviders(<ReportDialog target={{ type: "photo", id: "p-1", label: "Photo" }} onClose={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Envoyer le signalement" }));
    await waitFor(() => expect(api.calls("POST", "/reports")).toHaveLength(1));
    expect(api.lastCall("POST")!.body).toEqual({ target_type: "photo", target_id: "p-1", reason: "inappropriate", comment: undefined });
  });

  it("si l'API refuse, la fenetre reste ouverte", async () => {
    api.on("POST", "/reports", new ApiReject(404, "Introuvable"));
    const onClose = vi.fn();
    const { user } = renderWithProviders(<ReportDialog target={target} onClose={onClose} />);
    await user.click(screen.getByRole("button", { name: "Envoyer le signalement" }));
    await waitFor(() => expect(api.calls("POST", "/reports")).toHaveLength(1));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("sans cible, rien n'est affiche", () => {
    renderWithProviders(<ReportDialog target={null} onClose={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
