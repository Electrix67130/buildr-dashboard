"use client";

import { cn } from "@/lib/utils";
import { parseMentions } from "@/lib/mentions";
import { useI18n } from "@/contexts/I18nContext";
import type { MentionableUser } from "@/types/api";

/** Un message, ses mentions en couleur ; celles qui vous visent ressortent davantage. */
export function MentionText({ content, currentUserId }: { content: string; currentUserId?: string }) {
  return (
    <>
      {parseMentions(content).map((segment, i) =>
        segment.type === "text" ? (
          <span key={i}>{segment.text}</span>
        ) : (
          <span
            key={i}
            className={cn(
              "font-semibold text-orange-700 dark:text-orange-300",
              segment.id === currentUserId && "rounded bg-orange-100 px-0.5 dark:bg-orange-900/40",
            )}
          >
            @{segment.name}
          </span>
        ),
      )}
    </>
  );
}

/** La liste des personnes proposees pendant la saisie d'une mention. */
export function MentionMenu({
  people,
  highlighted,
  onPick,
}: {
  people: MentionableUser[];
  highlighted: number;
  onPick: (person: MentionableUser) => void;
}) {
  const { t } = useI18n();
  if (people.length === 0) return null;
  return (
    <ul
      role="listbox"
      aria-label={t("mentions.suggestions")}
      className="absolute bottom-full left-0 z-20 mb-1 w-64 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
    >
      {people.map((person, i) => (
        <li key={person.id} role="option" aria-selected={i === highlighted}>
          <button
            type="button"
            // mousedown : garder le focus dans le champ pendant le choix.
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(person);
            }}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-zinc-800 dark:text-zinc-100",
              i === highlighted ? "bg-orange-50 dark:bg-orange-900/30" : "hover:bg-zinc-50 dark:hover:bg-zinc-700",
            )}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[10px] font-semibold text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
              {(person.first_name[0] ?? "") + (person.last_name[0] ?? "")}
            </span>
            <span className="truncate">
              {person.first_name} {person.last_name}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
