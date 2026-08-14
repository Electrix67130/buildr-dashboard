import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  /**
   * Classes appliquees au champ lui-meme (padding pour une icone, alignement du
   * texte...). `className` habille le conteneur : c'est lui qui porte le
   * placement dans une grille ou un flex.
   */
  inputClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, inputClassName, label, error, hint, id, ...rest },
  ref,
) {
  const inputId = id || rest.name;
  return (
    // La className va au conteneur, pas au champ : c'est le conteneur qui est
    // l'element de grille. Appliquee au <input>, un `col-span-2` n'avait aucun
    // effet — tous les champs occupaient une colonne, d'ou des libelles trop a
    // l'etroit qui passaient sur deux lignes et desalignaient la rangee.
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={inputId} className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </label>
      ) : null}
      <input
        ref={ref}
        id={inputId}
        className={cn(
          "h-10 w-full rounded-lg border bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-orange-500/30 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-600",
          error
            ? "border-red-500 focus:border-red-500"
            : "border-zinc-300 focus:border-orange-500 dark:border-zinc-700",
          inputClassName,
        )}
        {...rest}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {!error && hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
});

export default Input;
