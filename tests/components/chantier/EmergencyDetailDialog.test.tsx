/**
 * Une urgence se documente souvent en plusieurs photos (docs/API.md,
 * « Plusieurs photos par urgence »). Si la fenetre n'en montre qu'une, ou ne
 * permet pas de les agrandir, l'administrateur au bureau juge sur une
 * vignette. Le fil de l'urgence doit aussi permettre de signaler un message.
 */
import { describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import EmergencyDetailDialog from "@/components/chantier/EmergencyDetailDialog";
import type { EmergencyPhoto } from "@/types/api";
import { api, page } from "../../helpers/api";
import { makeEmergency, makeMessage } from "../../helpers/fixtures";
import { renderWithProviders } from "../../helpers/render";

const photos: EmergencyPhoto[] = [1, 2, 3].map((n) => ({
  id: `ph-${n}`,
  url: `https://cdn.test/full-${n}.jpg`,
  thumbnail_url: `https://cdn.test/thumb-${n}.jpg`,
  created_at: "2026-10-01T09:00:00Z",
}));

function serveThread(messages = [] as ReturnType<typeof makeMessage>[]) {
  api.on("GET", "/emergency-comments", page(messages.map((m) => ({ ...m, emergency_id: "emergency-1" }))));
}

function photoButtons(): HTMLButtonElement[] {
  return Array.from(screen.getAllByRole("dialog")[0].querySelectorAll<HTMLButtonElement>("button")).filter((b) =>
    b.querySelector("img"),
  );
}

describe("EmergencyDetailDialog — photos", () => {
  it("affiche toutes les photos de l'urgence en vignettes", async () => {
    serveThread();
    renderWithProviders(<EmergencyDetailDialog open onClose={vi.fn()} emergency={makeEmergency({ photos })} />);
    expect(await screen.findByText("Fuite d'eau au sous-sol")).toBeInTheDocument();
    const thumbs = photoButtons().map((b) => b.querySelector("img")!.getAttribute("src"));
    expect(thumbs).toEqual(["https://cdn.test/thumb-1.jpg", "https://cdn.test/thumb-2.jpg", "https://cdn.test/thumb-3.jpg"]);
  });

  it("cliquer une vignette ouvre la visionneuse sur la photo en pleine taille", async () => {
    serveThread();
    const { user } = renderWithProviders(<EmergencyDetailDialog open onClose={vi.fn()} emergency={makeEmergency({ photos })} />);
    await screen.findByText("Fuite d'eau au sous-sol");
    await user.click(photoButtons()[1]);
    const viewer = screen.getAllByRole("dialog").at(-1)!;
    expect(viewer.querySelector("img")).toHaveAttribute("src", "https://cdn.test/full-2.jpg");
    await user.click(within(viewer).getByRole("button", { name: "Fermer" }));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("une ancienne urgence a photo_url seule montre cette photo", async () => {
    serveThread();
    renderWithProviders(
      <EmergencyDetailDialog open onClose={vi.fn()} emergency={makeEmergency({ photos: [], photo_url: "https://cdn.test/legacy.jpg" })} />,
    );
    await screen.findByText("Fuite d'eau au sous-sol");
    expect(photoButtons().map((b) => b.querySelector("img")!.getAttribute("src"))).toEqual(["https://cdn.test/legacy.jpg"]);
  });
});

describe("EmergencyDetailDialog — fil", () => {
  it("signaler un message du fil envoie un signalement de type emergency_comment", async () => {
    serveThread([makeMessage({ id: "ec-1", author_id: "user-other", content: "Venez vite" })]);
    api.on("POST", "/reports", { id: "r-1" });
    const { user } = renderWithProviders(<EmergencyDetailDialog open onClose={vi.fn()} emergency={makeEmergency()} />);
    await screen.findByText("Venez vite");
    await user.click(screen.getByRole("button", { name: "Signaler" }));
    await user.click(screen.getByRole("button", { name: "Envoyer le signalement" }));
    await waitFor(() => expect(api.calls("POST", "/reports")).toHaveLength(1));
    expect(api.lastCall("POST", "/reports")!.body).toMatchObject({ target_type: "emergency_comment", target_id: "ec-1" });
  });
});
