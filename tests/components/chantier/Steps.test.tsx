/**
 * Les etapes sont le suivi d'avancement du chantier : ce que le client voit,
 * ce que l'equipe coche sur place. Cocher la mauvaise sous-etape, perdre une
 * photo d'attestation ou un reordonnancement qui ne part pas a l'API, et le
 * suivi ment. L'ordre doit aussi changer a l'ecran des le lacher, sans
 * attendre le serveur.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import Steps from "@/components/chantier/Steps";
import type { ChantierStep } from "@/types/api";
import { api, deferred } from "../../helpers/api";
import { makeStep, makeSubstep } from "../../helpers/fixtures";
import { renderWithProviders } from "../../helpers/render";

vi.mock("@/lib/upload", () => ({
  uploadFile: vi.fn(async (file: File) => ({
    url: "https://cdn.test/upload/photo.jpg",
    original_name: file.name,
    file_size: 1234,
    mime_type: "image/jpeg",
  })),
}));

const CHANTIER = "chantier-1";
const STEPS_ROUTE = `/chantiers/${CHANTIER}/steps`;

function serveSteps(steps: ChantierStep[]) {
  api.on("GET", STEPS_ROUTE, steps);
  api.on("GET", "/chantier-views/unread", { unread_step_ids: [], unread_emergency_ids: [] });
}

const threeSteps = () => [
  makeStep({ id: "A", name: "Terrassement", position: 0 }),
  makeStep({ id: "B", name: "Gros oeuvre", position: 1 }),
  makeStep({ id: "C", name: "Toiture", position: 2 }),
];

/** Les noms d'etapes dans l'ordre de l'ecran. */
function stepOrder(): string[] {
  const list = screen.getByRole("list");
  return within(list)
    .getAllByRole("listitem")
    .filter((li) => li.parentElement === list)
    .map((li) => li.querySelector("p.font-medium")!.textContent ?? "");
}

function stepItem(name: string): HTMLElement {
  return screen.getByText(name).closest("li")!;
}

const dataTransfer = () => ({ effectAllowed: "", dropEffect: "", setData: vi.fn(), getData: vi.fn(), types: [] });

describe("Steps — affichage", () => {
  it("affiche les etapes, leurs sous-etapes et les vignettes de photos", async () => {
    serveSteps([
      makeStep({
        id: "A",
        name: "Gros oeuvre",
        photos: [{ id: "p1", url: "https://cdn.test/full.jpg", thumbnail_url: "https://cdn.test/thumb.jpg", step_id: "A", substep_id: null, created_at: "" }],
        substeps: [
          makeSubstep({ id: "s1", step_id: "A", name: "Fondations", validated_at: "2026-10-01T10:00:00Z" }),
          makeSubstep({ id: "s2", step_id: "A", name: "Murs porteurs" }),
        ],
      }),
    ]);
    renderWithProviders(<Steps chantierId={CHANTIER} />);
    expect(await screen.findByText("Gros oeuvre")).toBeInTheDocument();
    expect(screen.getByText("Fondations")).toHaveClass("line-through");
    expect(screen.getByText("Murs porteurs")).not.toHaveClass("line-through");
    const strip = screen.getByLabelText("Photos de l'étape");
    expect(strip.querySelector("img")).toHaveAttribute("src", "https://cdn.test/thumb.jpg");
  });

  it("cliquer une vignette ouvre la photo en grand", async () => {
    serveSteps([
      makeStep({ photos: [{ id: "p1", url: "https://cdn.test/full.jpg", thumbnail_url: null, step_id: "step-1", substep_id: null, created_at: "" }] }),
    ]);
    const { user } = renderWithProviders(<Steps chantierId={CHANTIER} />);
    const strip = await screen.findByLabelText("Photos de l'étape");
    await user.click(within(strip).getByRole("button"));
    expect(screen.getByRole("dialog").querySelector("img")).toHaveAttribute("src", "https://cdn.test/full.jpg");
  });

  it("aucune etape : un etat vide", async () => {
    serveSteps([]);
    renderWithProviders(<Steps chantierId={CHANTIER} />);
    expect(await screen.findByText("Aucune étape")).toBeInTheDocument();
  });
});

describe("Steps — droits", () => {
  it("« Joindre une photo » et le glisser-deposer sont reserves a canManage", async () => {
    serveSteps([makeStep({ substeps: [makeSubstep()] })]);
    renderWithProviders(<Steps chantierId={CHANTIER} />);
    await screen.findByText("Gros oeuvre");
    expect(screen.queryByRole("button", { name: "Joindre une photo" })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Nom de la nouvelle étape")).not.toBeInTheDocument();
    expect(stepItem("Gros oeuvre")).toHaveAttribute("draggable", "false");
  });

  it("avec canManage, une etape et chacune de ses sous-etapes ont leur bouton photo", async () => {
    serveSteps([makeStep({ substeps: [makeSubstep({ id: "s1" }), makeSubstep({ id: "s2", name: "Dalle" })] })]);
    renderWithProviders(<Steps chantierId={CHANTIER} canManage />);
    await screen.findByText("Gros oeuvre");
    expect(screen.getAllByRole("button", { name: "Joindre une photo" })).toHaveLength(3);
    expect(stepItem("Gros oeuvre")).toHaveAttribute("draggable", "true");
  });

  it("joindre une photo a l'etape l'envoie avec step_id", async () => {
    serveSteps([makeStep({ id: "A", substeps: [makeSubstep({ id: "s1", step_id: "A" })] })]);
    api.on("POST", "/photos", { id: "photo-1" });
    const { user, container } = renderWithProviders(<Steps chantierId={CHANTIER} canManage />);
    await screen.findByText("Fondations");
    const buttons = screen.getAllByRole("button", { name: "Joindre une photo" });
    // Celui de l'etape vient apres ceux des sous-etapes dans la ligne.
    await user.click(buttons.at(-1)!);
    await user.upload(container.querySelector<HTMLInputElement>('input[type="file"]')!, new File(["x"], "a.jpg", { type: "image/jpeg" }));
    await waitFor(() => expect(api.calls("POST", "/photos")).toHaveLength(1));
    expect(api.lastCall("POST", "/photos")!.body).toMatchObject({ step_id: "A" });
    expect(api.lastCall("POST", "/photos")!.body).not.toHaveProperty("substep_id");
  });

  it("joindre une photo a une sous-etape l'envoie avec substep_id", async () => {
    serveSteps([makeStep({ substeps: [makeSubstep({ id: "s1" })] })]);
    api.on("POST", "/photos", { id: "photo-1" });
    const { user, container } = renderWithProviders(<Steps chantierId={CHANTIER} canManage />);
    await screen.findByText("Fondations");
    const substepRow = screen.getByText("Fondations").closest("li")!;
    await user.click(within(substepRow).getByRole("button", { name: "Joindre une photo" }));
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(input, new File(["x"], "fondations.jpg", { type: "image/jpeg" }));

    await waitFor(() => expect(api.calls("POST", "/photos")).toHaveLength(1));
    expect(api.lastCall("POST", "/photos")!.body).toMatchObject({
      chantier_id: CHANTIER,
      url: "https://cdn.test/upload/photo.jpg",
      substep_id: "s1",
    });
    expect(api.lastCall("POST", "/photos")!.body).not.toHaveProperty("step_id");
  });
});

describe("Steps — validation", () => {
  it("cliquer une sous-etape non cochee appelle son toggle avec validated: true", async () => {
    serveSteps([makeStep({ substeps: [makeSubstep({ id: "s1", name: "Fondations" }), makeSubstep({ id: "s2", name: "Dalle" })] })]);
    api.on("POST", "/chantier-substeps/s2/toggle", {});
    const { user } = renderWithProviders(<Steps chantierId={CHANTIER} canToggle />);
    await screen.findByText("Dalle");
    // La case de la sous-etape n'a pas de nom accessible : c'est le premier bouton de sa ligne.
    await user.click(screen.getByText("Dalle").closest("li")!.querySelector("button")!);
    await waitFor(() => expect(api.calls("POST", "/chantier-substeps/s2/toggle")).toHaveLength(1));
    expect(api.lastCall("POST", "/chantier-substeps/s2/toggle")!.body).toEqual({ validated: true });
    expect(api.calls("POST", "/chantier-substeps/s1/toggle")).toHaveLength(0);
  });

  it("decocher une sous-etape validee envoie validated: false", async () => {
    serveSteps([makeStep({ substeps: [makeSubstep({ id: "s1", validated_at: "2026-10-01T10:00:00Z" })] })]);
    api.on("POST", "/chantier-substeps/s1/toggle", {});
    const { user } = renderWithProviders(<Steps chantierId={CHANTIER} canToggle />);
    await screen.findByText("Fondations");
    await user.click(screen.getByText("Fondations").closest("li")!.querySelector("button")!);
    await waitFor(() => expect(api.calls("POST", "/chantier-substeps/s1/toggle")).toHaveLength(1));
    expect(api.lastCall("POST")!.body).toEqual({ validated: false });
  });

  it("valider l'etape elle-meme passe par /chantier-steps/:id/toggle", async () => {
    serveSteps([makeStep({ id: "A", name: "Terrassement" })]);
    api.on("POST", "/chantier-steps/A/toggle", {});
    const { user } = renderWithProviders(<Steps chantierId={CHANTIER} canToggle />);
    await screen.findByText("Terrassement");
    await user.click(screen.getByRole("button", { name: "Valider l'étape" }));
    await waitFor(() => expect(api.calls("POST", "/chantier-steps/A/toggle")).toHaveLength(1));
    expect(api.lastCall("POST")!.body).toEqual({ validated: true });
  });

  it("sans canToggle, les cases sont inertes", async () => {
    serveSteps([makeStep({ substeps: [makeSubstep()] })]);
    renderWithProviders(<Steps chantierId={CHANTIER} />);
    await screen.findByText("Fondations");
    expect(screen.getByText("Fondations").closest("li")!.querySelector("button")).toBeDisabled();
  });
});

describe("Steps — glisser-deposer", () => {
  it("lacher Toiture sur Terrassement envoie le nouvel ordre, deja visible avant la reponse", async () => {
    serveSteps(threeSteps());
    const pending = deferred();
    api.on("POST", `/chantiers/${CHANTIER}/steps/reorder`, () => pending.promise);
    renderWithProviders(<Steps chantierId={CHANTIER} canManage />);
    await screen.findByText("Toiture");
    expect(stepOrder()).toEqual(["Terrassement", "Gros oeuvre", "Toiture"]);

    const dt = dataTransfer();
    fireEvent.dragStart(stepItem("Toiture"), { dataTransfer: dt });
    fireEvent.dragOver(stepItem("Terrassement"), { dataTransfer: dt });
    fireEvent.drop(stepItem("Terrassement"), { dataTransfer: dt });

    await waitFor(() => expect(api.calls("POST", `/chantiers/${CHANTIER}/steps/reorder`)).toHaveLength(1));
    expect(api.lastCall("POST")!.body).toEqual({ ordered_ids: ["C", "A", "B"] });
    // La requete est encore en vol : l'ordre affiche est deja le nouveau.
    expect(stepOrder()).toEqual(["Toiture", "Terrassement", "Gros oeuvre"]);

    api.on("GET", STEPS_ROUTE, [threeSteps()[2], threeSteps()[0], threeSteps()[1]]);
    pending.resolve({});
    await waitFor(() => expect(api.calls("GET", STEPS_ROUTE).length).toBeGreaterThanOrEqual(2));
    expect(stepOrder()).toEqual(["Toiture", "Terrassement", "Gros oeuvre"]);
  });

  it("si l'API refuse, la liste est relue et l'ordre d'origine revient", async () => {
    serveSteps(threeSteps());
    const pending = deferred();
    api.on("POST", `/chantiers/${CHANTIER}/steps/reorder`, () => pending.promise);
    renderWithProviders(<Steps chantierId={CHANTIER} canManage />);
    await screen.findByText("Toiture");

    const dt = dataTransfer();
    fireEvent.dragStart(stepItem("Toiture"), { dataTransfer: dt });
    fireEvent.dragOver(stepItem("Terrassement"), { dataTransfer: dt });
    fireEvent.drop(stepItem("Terrassement"), { dataTransfer: dt });
    expect(stepOrder()).toEqual(["Toiture", "Terrassement", "Gros oeuvre"]);

    pending.reject(new Error("refus"));
    await waitFor(() => expect(stepOrder()).toEqual(["Terrassement", "Gros oeuvre", "Toiture"]));
  });

  it("lacher une etape sur elle-meme n'appelle pas l'API", async () => {
    serveSteps(threeSteps());
    renderWithProviders(<Steps chantierId={CHANTIER} canManage />);
    await screen.findByText("Toiture");
    const dt = dataTransfer();
    fireEvent.dragStart(stepItem("Gros oeuvre"), { dataTransfer: dt });
    fireEvent.dragOver(stepItem("Gros oeuvre"), { dataTransfer: dt });
    fireEvent.drop(stepItem("Gros oeuvre"), { dataTransfer: dt });
    expect(api.calls("POST")).toHaveLength(0);
  });

  it("reordonner les sous-etapes d'une etape passe par /chantier-steps/:id/substeps/reorder", async () => {
    serveSteps([
      makeStep({
        id: "A",
        substeps: [
          makeSubstep({ id: "s1", step_id: "A", name: "Fondations" }),
          makeSubstep({ id: "s2", step_id: "A", name: "Dalle" }),
        ],
      }),
    ]);
    api.on("POST", "/chantier-steps/A/substeps/reorder", {});
    renderWithProviders(<Steps chantierId={CHANTIER} canManage />);
    await screen.findByText("Dalle");
    const dt = dataTransfer();
    fireEvent.dragStart(screen.getByText("Dalle").closest("li")!, { dataTransfer: dt });
    fireEvent.dragOver(screen.getByText("Fondations").closest("li")!, { dataTransfer: dt });
    fireEvent.drop(screen.getByText("Fondations").closest("li")!, { dataTransfer: dt });
    await waitFor(() => expect(api.calls("POST", "/chantier-steps/A/substeps/reorder")).toHaveLength(1));
    expect(api.lastCall("POST")!.body).toEqual({ ordered_ids: ["s2", "s1"] });
    expect(api.calls("POST", `/chantiers/${CHANTIER}/steps/reorder`)).toHaveLength(0);
  });
});
