/**
 * Rendu dans les providers de l'application, montes comme dans
 * src/app/providers.tsx : React Query, i18n (francais), dialogues. Le contexte
 * d'authentification est simule (tests/helpers/auth.tsx).
 */
import type { ReactElement, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, renderHook, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "@/contexts/I18nContext";
import { DialogProvider } from "@/contexts/DialogContext";
import type { User } from "@/types/api";
import { setAuthUser } from "./auth";
import { makeUser } from "./fixtures";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // Pas de nouvel essai : une route en erreur doit se voir tout de suite.
      queries: { retry: false, staleTime: 0, gcTime: Infinity, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

interface ProviderOptions {
  /** Utilisateur connecte ; `null` pour un visiteur. Administrateur par defaut. */
  user?: User | null;
  queryClient?: QueryClient;
}

function prepare({ user, queryClient }: ProviderOptions) {
  setAuthUser(user === undefined ? makeUser() : user);
  // I18nProvider lit la langue enregistree avant celle du navigateur (en-US sous jsdom).
  localStorage.setItem("buildr_locale", "fr");
  const client = queryClient ?? createTestQueryClient();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <I18nProvider>
        <DialogProvider>{children}</DialogProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
  return { client, Wrapper };
}

export function renderWithProviders(
  ui: ReactElement,
  options: ProviderOptions & Omit<RenderOptions, "wrapper"> = {},
) {
  const { user, queryClient, ...rest } = options;
  const { client, Wrapper } = prepare({ user, queryClient });
  const userActions = userEvent.setup();
  return { ...render(ui, { wrapper: Wrapper, ...rest }), queryClient: client, user: userActions };
}

export function renderHookWithProviders<Result, Props>(
  hook: (props: Props) => Result,
  options: ProviderOptions & { initialProps?: Props } = {},
) {
  const { user, queryClient, initialProps } = options;
  const { client, Wrapper } = prepare({ user, queryClient });
  return { ...renderHook(hook, { wrapper: Wrapper, initialProps }), queryClient: client };
}
