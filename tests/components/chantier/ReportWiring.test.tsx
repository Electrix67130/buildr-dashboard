/**
 * Le bouton « Signaler » d'un fil doit ouvrir la fenetre de signalement et
 * envoyer la bonne cible. La fenetre avait ete declaree sans etre montee :
 * le typage ne le voyait pas, un test le voit.
 */
import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import Discussions from "@/components/chantier/Discussions";
import StepDiscussionDialog from "@/components/chantier/StepDiscussionDialog";
import EmergencyDetailDialog from "@/components/chantier/EmergencyDetailDialog";
import { api, page } from "../../helpers/api";
import { renderWithProviders } from "../../helpers/render";
import { makeMessage, makeEmergency } from "../../helpers/fixtures";

const autrui = makeMessage({ id: "m-1", author_id: "quelqu-un-d-autre", content: "Propos deplaces" });

async function signalerEtVerifier(user: ReturnType<typeof renderWithProviders>["user"], attendu: string) {
  api.on("POST", "/reports", { id: "r-1" });
  await user.click(await screen.findByRole("button", { name: "Signaler" }));
  expect(await screen.findByRole("heading", { name: "Signaler" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /Envoyer le signalement/ }));
  await waitFor(() => expect(api.calls("POST", "/reports")).toHaveLength(1));
  expect(api.lastCall("POST", "/reports")?.body).toMatchObject({ target_type: attendu, target_id: "m-1", reason: "inappropriate" });
}

describe("Signalement depuis les fils", () => {
  it("la discussion du chantier signale un message", async () => {
    api.on("GET", /\/comments\?/, page([autrui]));
    const { user } = renderWithProviders(<Discussions chantierId="c-1" />);
    await signalerEtVerifier(user, "comment");
  });

  it("la discussion d'une etape signale un message", async () => {
    api.on("GET", /\/comments\?/, page([autrui]));
    const { user } = renderWithProviders(
      <StepDiscussionDialog open onClose={vi.fn()} chantierId="c-1" stepId="s-1" stepName="Fondations" />,
    );
    await signalerEtVerifier(user, "comment");
  });

  it("le fil d'une urgence signale un message d'urgence", async () => {
    api.on("GET", /\/emergency-comments\?/, page([autrui]));
    const { user } = renderWithProviders(<EmergencyDetailDialog open onClose={vi.fn()} emergency={makeEmergency()} />);
    await signalerEtVerifier(user, "emergency_comment");
  });
});
