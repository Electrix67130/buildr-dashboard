import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent, type RefObject } from "react";
import type { MentionableUser } from "@/types/api";
import {
  activeMentionQuery,
  insertMention,
  normalizeName,
  serializeMentions,
  toEditable,
  type MentionRef,
} from "@/lib/mentions";

/**
 * Saisie d'un message avec mentions dans un `<textarea>` : taper « @ » propose
 * les personnes qui lisent le fil, fleches et Entree (ou Tab) choisissent,
 * Echap ferme la liste. Le champ montre « @Prenom Nom », `serialize()` rend le
 * texte que l'API sait lire.
 */
export function useMentionInput(people: MentionableUser[] | undefined, ref: RefObject<HTMLTextAreaElement | null>) {
  const [text, setText] = useState("");
  const [cursor, setCursor] = useState(0);
  const [mentions, setMentions] = useState<MentionRef[]>([]);
  const [highlighted, setHighlighted] = useState(0);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  // Position du curseur a imposer apres l'insertion d'une mention : appliquee
  // juste apres le rendu, avant toute frappe suivante.
  const pendingCursor = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (pendingCursor.current === null) return;
    ref.current?.focus();
    ref.current?.setSelectionRange(pendingCursor.current, pendingCursor.current);
    pendingCursor.current = null;
  }, [text, ref]);

  const active = activeMentionQuery(text, cursor);
  const suggestions = useMemo(() => {
    if (!active || !people || dismissedAt === active.start) return [];
    const query = normalizeName(active.query);
    return people.filter((p) => normalizeName(`${p.first_name} ${p.last_name}`).includes(query)).slice(0, 6);
  }, [active, people, dismissedAt]);

  const sync = (el: HTMLTextAreaElement) => setCursor(el.selectionStart ?? el.value.length);

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    sync(e.target);
    setHighlighted(0);
  };

  const pick = useCallback(
    (person: MentionableUser) => {
      if (!active) return;
      const name = `${person.first_name} ${person.last_name}`;
      const next = insertMention(text, active.start, cursor, name);
      setText(next.text);
      setCursor(next.cursor);
      setMentions((current) => (current.some((m) => m.id === person.id) ? current : [...current, { id: person.id, name }]));
      pendingCursor.current = next.cursor;
    },
    [active, text, cursor],
  );

  /** A appeler en tete du onKeyDown du champ : vrai si la touche a servi a la liste. */
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): boolean => {
    if (suggestions.length === 0) return false;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setHighlighted((h) => (h + step + suggestions.length) % suggestions.length);
      return true;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      pick(suggestions[Math.min(highlighted, suggestions.length - 1)]);
      return true;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setDismissedAt(active?.start ?? null);
      return true;
    }
    return false;
  };

  const load = useCallback((content: string) => {
    const editable = toEditable(content);
    setText(editable.text);
    setMentions(editable.mentions);
    setCursor(editable.text.length);
  }, []);

  const reset = useCallback(() => {
    setText("");
    setMentions([]);
    setCursor(0);
  }, []);

  const serialize = useCallback(() => serializeMentions(text.trim(), mentions), [text, mentions]);

  return {
    text,
    suggestions,
    highlighted,
    pick,
    handleKeyDown,
    load,
    reset,
    serialize,
    textareaProps: {
      value: text,
      onChange,
      onSelect: (e: React.SyntheticEvent<HTMLTextAreaElement>) => sync(e.currentTarget),
      onClick: (e: React.MouseEvent<HTMLTextAreaElement>) => sync(e.currentTarget),
    },
  };
}
