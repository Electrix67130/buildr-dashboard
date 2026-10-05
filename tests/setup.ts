/**
 * Mise en place commune a tous les tests (vitest.config.ts, `setupFiles`).
 *
 * - `@/lib/api` : `apiFetch` remplace par le routeur de tests/helpers/api.ts ;
 *   le reste du module (ApiError, jetons) est le vrai. tests/lib/api.test.ts
 *   teste le vrai `apiFetch` via `vi.importActual`.
 * - `@/contexts/AuthContext` : utilisateur pose par le test (admin par defaut).
 * - `next/navigation` et `next/link` : simules, hors du routeur Next.
 */
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  const helpers = await import("./helpers/api");
  helpers.setApiErrorFactory((status, message, body) => new actual.ApiError(status, message, body));
  return { ...actual, apiFetch: helpers.apiFetchMock };
});

vi.mock("@/contexts/AuthContext", async () => (await import("./helpers/auth")).authModuleMock);
vi.mock("next/navigation", async () => (await import("./helpers/navigation")).navigationModuleMock);
vi.mock("next/link", async () => (await import("./helpers/navigation")).linkModuleMock);

// jsdom n'implemente pas le defilement : MessageThread s'en sert pour aller au message cite.
Element.prototype.scrollIntoView = vi.fn();

beforeEach(async () => {
  const [{ api }, { resetAuth }, { resetNavigation }] = await Promise.all([
    import("./helpers/api"),
    import("./helpers/auth"),
    import("./helpers/navigation"),
  ]);
  api.reset();
  resetAuth();
  resetNavigation();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.useRealTimers();
});
