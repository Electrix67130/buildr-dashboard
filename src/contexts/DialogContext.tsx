"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertTriangle, Info } from "lucide-react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { useI18n } from "@/contexts/I18nContext";

type DialogTone = "default" | "danger" | "info";

interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: DialogTone;
}

interface AlertOptions {
  title: string;
  description?: ReactNode;
  acknowledgeLabel?: string;
  tone?: Exclude<DialogTone, "danger">;
}

type State =
  | { kind: "idle" }
  | ({ kind: "confirm" } & ConfirmOptions)
  | ({ kind: "alert" } & AlertOptions);

interface DialogContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  alert: (opts: AlertOptions) => Promise<void>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [state, setState] = useState<State>({ kind: "idle" });
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const resolve = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setState({ kind: "idle" });
  }, []);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((res) => {
        resolverRef.current = res;
        setState({ kind: "confirm", ...opts });
      }),
    [],
  );

  const alert = useCallback(
    (opts: AlertOptions) =>
      new Promise<void>((res) => {
        resolverRef.current = () => res();
        setState({ kind: "alert", ...opts });
      }),
    [],
  );

  const value = useMemo(() => ({ confirm, alert }), [confirm, alert]);

  const open = state.kind !== "idle";
  const tone: DialogTone = open ? (state.tone ?? "default") : "default";

  return (
    <DialogContext.Provider value={value}>
      {children}

      <Modal
        open={open}
        onClose={() => {
          if (state.kind === "confirm") resolve(false);
          else if (state.kind === "alert") resolve(true);
        }}
        title={state.kind !== "idle" ? state.title : ""}
        size="sm"
        footer={
          state.kind === "confirm" ? (
            <>
              <Button variant="secondary" onClick={() => resolve(false)}>
                {state.cancelLabel ?? t("common.cancel")}
              </Button>
              <Button
                variant={state.tone === "danger" ? "danger" : "primary"}
                onClick={() => resolve(true)}
              >
                {state.confirmLabel ?? t("common.confirm")}
              </Button>
            </>
          ) : state.kind === "alert" ? (
            <Button onClick={() => resolve(true)}>
              {state.acknowledgeLabel ?? t("common.understood")}
            </Button>
          ) : null
        }
      >
        {state.kind !== "idle" && state.description ? (
          <div className="flex items-start gap-3">
            {tone === "danger" ? (
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300">
                <AlertTriangle size={18} />
              </div>
            ) : tone === "info" ? (
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                <Info size={18} />
              </div>
            ) : null}
            <div className="flex-1 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
              {state.description}
            </div>
          </div>
        ) : null}
      </Modal>
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within DialogProvider");
  return ctx;
}

export function useConfirm() {
  return useDialog().confirm;
}

export function useAlert() {
  return useDialog().alert;
}
