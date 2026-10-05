/**
 * MessageThread porte toutes les discussions du dashboard : fil du chantier,
 * d'une etape, d'une urgence. Ce qu'il propose sur un message decide de ce
 * que chacun peut faire a la parole d'autrui : on ne modifie que la sienne,
 * on ne signale ni ne bloque que celle des autres. Une regression ici se
 * repercute sur tous les fils a la fois.
 */
import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import MessageThread, { type ThreadMessage } from "@/components/MessageThread";
import { makeMessage } from "../helpers/fixtures";
import { renderWithProviders } from "../helpers/render";

const ME = "user-me";

function setup(props: Partial<React.ComponentProps<typeof MessageThread>> = {}, messages?: ThreadMessage[]) {
  const handlers = {
    onSend: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };
  const utils = renderWithProviders(
    <MessageThread
      messages={
        messages ?? [
          makeMessage({ id: "theirs", author_id: "user-other", content: "Le beton arrive a 8h" }),
          makeMessage({ id: "mine", author_id: ME, content: "Je serai la", first_name: "Alice", last_name: "Martin" }),
        ]
      }
      currentUserId={ME}
      {...handlers}
      {...props}
    />,
  );
  return { ...utils, ...handlers };
}

/** Le bloc d'un message, pour chercher ses boutons sans confondre avec les voisins. */
function messageBlock(id: string): HTMLElement {
  const el = document.getElementById(`message-${id}`);
  if (!el) throw new Error(`message ${id} absent`);
  return el;
}

describe("MessageThread — envoi", () => {
  it("envoie le texte saisi, sans espaces superflus, puis vide le champ", async () => {
    const { user, onSend } = setup();
    const field = screen.getByPlaceholderText("Écrire un message…");
    await user.type(field, "  On coule demain  ");
    // Le bouton d'envoi n'a qu'une icone, sans nom accessible : on le prend par son type.
    await user.click(field.closest("form")!.querySelector("button[type=submit]")!);
    expect(onSend).toHaveBeenCalledWith("On coule demain", undefined);
    expect(field).toHaveValue("");
  });

  it("Entree envoie, Maj+Entree passe a la ligne", async () => {
    const { user, onSend } = setup();
    const field = screen.getByPlaceholderText("Écrire un message…");
    await user.type(field, "ligne 1{Shift>}{Enter}{/Shift}ligne 2");
    expect(onSend).not.toHaveBeenCalled();
    await user.keyboard("{Enter}");
    expect(onSend).toHaveBeenCalledWith("ligne 1\nligne 2", undefined);
  });

  it("n'envoie rien tant que le message est vide", async () => {
    const { user, onSend } = setup();
    await user.type(screen.getByPlaceholderText("Écrire un message…"), "   {Enter}");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("sans droit d'ecriture, il n'y a pas de champ de saisie", () => {
    setup({ canSend: false });
    expect(screen.queryByPlaceholderText("Écrire un message…")).not.toBeInTheDocument();
  });
});

describe("MessageThread — reponse citee", () => {
  it("« Repondre » puis envoi transmet l'identifiant du message cite", async () => {
    const { user, onSend } = setup({ onReact: vi.fn() });
    await user.click(within(messageBlock("theirs")).getByRole("button", { name: "Répondre" }));
    expect(screen.getByText("Réponse à Bruno Durand")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Écrire un message…"), "Bien recu{Enter}");
    expect(onSend).toHaveBeenCalledWith("Bien recu", "theirs");
    // La citation en cours disparait apres l'envoi.
    expect(screen.queryByText("Réponse à Bruno Durand")).not.toBeInTheDocument();
  });

  it("Echap abandonne la reponse : le message part sans citation", async () => {
    const { user, onSend } = setup({ onReact: vi.fn() });
    await user.click(within(messageBlock("theirs")).getByRole("button", { name: "Répondre" }));
    const field = screen.getByPlaceholderText("Écrire un message…");
    await user.type(field, "{Escape}Autre chose{Enter}");
    expect(onSend).toHaveBeenCalledWith("Autre chose", undefined);
  });

  it("sans onReact (fil d'urgence), ni reponse ni reaction ne sont proposees", () => {
    setup();
    expect(screen.queryByRole("button", { name: "Répondre" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Réagir" })).not.toBeInTheDocument();
  });

  it("affiche la citation d'un message qui en repond a un autre", () => {
    setup({}, [
      makeMessage({ id: "a", content: "Qui a les cles ?" }),
      makeMessage({
        id: "b",
        author_id: ME,
        content: "Moi",
        reply_to: { id: "a", content: "Qui a les cles ?", author_id: "user-other", first_name: "Bruno", last_name: "Durand" },
      }),
    ]);
    const quote = within(messageBlock("b")).getByRole("button", { name: /Bruno Durand.*Qui a les cles/ });
    expect(quote).toBeInTheDocument();
  });

  it("une citation de son propre message est attribuee a « Vous »", () => {
    setup({}, [
      makeMessage({
        id: "b",
        content: "Oui",
        reply_to: { id: "a", content: "On commence ?", author_id: ME, first_name: "Alice", last_name: "Martin" },
      }),
    ]);
    expect(within(messageBlock("b")).getByRole("button", { name: /Vous.*On commence/ })).toBeInTheDocument();
  });
});

describe("MessageThread — reactions", () => {
  it("ouvrir la rangee d'emojis puis en choisir un appelle onReact et referme la rangee", async () => {
    const onReact = vi.fn();
    const { user } = setup({ onReact });
    await user.click(within(messageBlock("theirs")).getByRole("button", { name: "Réagir" }));
    await user.click(within(messageBlock("theirs")).getByRole("button", { name: "🔥" }));
    expect(onReact).toHaveBeenCalledWith("theirs", "🔥");
    expect(within(messageBlock("theirs")).queryByRole("button", { name: "🔥" })).not.toBeInTheDocument();
  });

  it("les pastilles disent qui a reagi : aria-pressed sur les siennes, un clic bascule", async () => {
    const onReact = vi.fn();
    const { user } = setup({ onReact }, [
      makeMessage({
        id: "m",
        reactions: [
          { emoji: "👍", count: 3, mine: true },
          { emoji: "😮", count: 1, mine: false },
        ],
      }),
    ]);
    const mine = within(messageBlock("m")).getByRole("button", { name: /👍\s*3/ });
    const other = within(messageBlock("m")).getByRole("button", { name: /😮\s*1/ });
    expect(mine).toHaveAttribute("aria-pressed", "true");
    expect(other).toHaveAttribute("aria-pressed", "false");
    await user.click(other);
    expect(onReact).toHaveBeenCalledWith("m", "😮");
  });

  it("sans onReact, les pastilles s'affichent mais restent inertes", () => {
    setup({}, [makeMessage({ id: "m", reactions: [{ emoji: "👍", count: 2, mine: false }] })]);
    expect(within(messageBlock("m")).getByRole("button", { name: /👍\s*2/ })).toBeDisabled();
  });
});

describe("MessageThread — signaler et bloquer", () => {
  it("« Signaler » n'apparait que sur les messages d'autrui", async () => {
    const onReport = vi.fn();
    const { user } = setup({ onReport });
    expect(within(messageBlock("mine")).queryByRole("button", { name: "Signaler" })).not.toBeInTheDocument();
    await user.click(within(messageBlock("theirs")).getByRole("button", { name: "Signaler" }));
    expect(onReport).toHaveBeenCalledWith(expect.objectContaining({ id: "theirs", author_id: "user-other" }));
  });

  it("sans onReport, aucun bouton « Signaler »", () => {
    setup();
    expect(screen.queryByRole("button", { name: "Signaler" })).not.toBeInTheDocument();
  });

  it("« Bloquer » demande confirmation, puis transmet l'auteur et son nom", async () => {
    const onBlock = vi.fn();
    const { user } = setup({ onBlock });
    expect(within(messageBlock("mine")).queryByRole("button", { name: "Bloquer" })).not.toBeInTheDocument();

    await user.click(within(messageBlock("theirs")).getByRole("button", { name: "Bloquer" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Bloquer Bruno Durand ?")).toBeInTheDocument();
    expect(onBlock).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Bloquer" }));
    expect(onBlock).toHaveBeenCalledWith("user-other", "Bruno Durand");
  });

  it("annuler la confirmation ne bloque personne", async () => {
    const onBlock = vi.fn();
    const { user } = setup({ onBlock });
    await user.click(within(messageBlock("theirs")).getByRole("button", { name: "Bloquer" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Annuler" }));
    expect(onBlock).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("sans onBlock, aucun bouton « Bloquer »", () => {
    setup();
    expect(screen.queryByRole("button", { name: "Bloquer" })).not.toBeInTheDocument();
  });
});

describe("MessageThread — modifier et supprimer", () => {
  it("modifier et supprimer sont reserves a l'auteur", () => {
    setup();
    expect(within(messageBlock("theirs")).queryByRole("button", { name: "Modifier" })).not.toBeInTheDocument();
    expect(within(messageBlock("theirs")).queryByRole("button", { name: "Supprimer" })).not.toBeInTheDocument();
    expect(within(messageBlock("mine")).getByRole("button", { name: "Modifier" })).toBeInTheDocument();
    expect(within(messageBlock("mine")).getByRole("button", { name: "Supprimer" })).toBeInTheDocument();
  });

  it("un moderateur (canDeleteOthers) peut supprimer le message d'autrui, pas le modifier", () => {
    setup({ canDeleteOthers: true });
    expect(within(messageBlock("theirs")).getByRole("button", { name: "Supprimer" })).toBeInTheDocument();
    expect(within(messageBlock("theirs")).queryByRole("button", { name: "Modifier" })).not.toBeInTheDocument();
  });

  it("modifier son message envoie le nouveau texte", async () => {
    const { user, onEdit } = setup();
    await user.click(within(messageBlock("mine")).getByRole("button", { name: "Modifier" }));
    const editor = within(messageBlock("mine")).getByDisplayValue("Je serai la");
    await user.clear(editor);
    await user.type(editor, "Je serai la a 9h");
    await user.click(within(messageBlock("mine")).getByRole("button", { name: "Enregistrer" }));
    expect(onEdit).toHaveBeenCalledWith("mine", "Je serai la a 9h");
  });

  it("supprimer passe par une confirmation", async () => {
    const { user, onDelete } = setup();
    await user.click(within(messageBlock("mine")).getByRole("button", { name: "Supprimer" }));
    expect(onDelete).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Supprimer" }));
    expect(onDelete).toHaveBeenCalledWith("mine");
  });

  it("un message modifie porte la mention « modifié »", () => {
    setup({}, [makeMessage({ id: "m", created_at: "2026-10-01T09:00:00Z", updated_at: "2026-10-01T09:05:00Z" })]);
    expect(within(messageBlock("m")).getByText(/modifié/)).toBeInTheDocument();
  });
});
