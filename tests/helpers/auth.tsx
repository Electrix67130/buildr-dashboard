/**
 * Contexte d'authentification simule. `src/contexts/AuthContext` est remplace
 * pour toute la suite (tests/setup.ts) : `useAuth()` renvoie l'utilisateur
 * pose par `setAuthUser`, un administrateur par defaut, sans appel a /auth/me.
 */
import type { ReactNode } from "react";
import { vi } from "vitest";
import type { User } from "@/types/api";
import { makeUser } from "./fixtures";

let currentUser: User | null = makeUser();
let loading = false;

export const authActions = {
  login: vi.fn(async () => {}),
  signup: vi.fn(async () => {}),
  logout: vi.fn(async () => {}),
  refresh: vi.fn(async () => {}),
};

export function setAuthUser(user: User | null) {
  currentUser = user;
}

export function setAuthLoading(value: boolean) {
  loading = value;
}

export function resetAuth() {
  currentUser = makeUser();
  loading = false;
  Object.values(authActions).forEach((fn) => fn.mockClear());
}

export const authModuleMock = {
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: currentUser,
    isLoading: loading,
    isAuthenticated: !!currentUser,
    ...authActions,
  }),
};
