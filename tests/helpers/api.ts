/**
 * Simulation de l'API : `apiFetch` (src/lib/api.ts) est remplace, pour toute
 * la suite, par `apiFetchMock` (voir tests/setup.ts). Chaque test declare les
 * routes dont il a besoin avec `api.on(...)`, puis verifie ce que le composant
 * a envoye avec `api.calls(...)`.
 *
 * Une route non declaree rejette avec une ApiError 404 et s'inscrit dans
 * `api.unhandled` : un composant qui appelle une route imprevue ne plante pas
 * le test, mais on peut l'exiger avec `expect(api.unhandled).toEqual([])`.
 */
import { vi } from "vitest";

export type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export interface ApiRequest {
  method: Method;
  /** Chemin complet, query string comprise : `/reports?status=pending`. */
  path: string;
  /** Chemin sans la query string. */
  pathname: string;
  query: URLSearchParams;
  body: unknown;
}

type Responder = unknown | ((req: ApiRequest) => unknown);

interface Route {
  method: Method;
  matcher: string | RegExp;
  respond: Responder;
  once: boolean;
}

interface FetchOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  skipAuth?: boolean;
  retry?: boolean;
}

/** Constructeur d'erreur, branche par tests/setup.ts sur la vraie ApiError. */
let makeError: (status: number, message: string, body: unknown) => Error = (s, m) =>
  new Error(`${s} ${m}`);

export function setApiErrorFactory(factory: typeof makeError) {
  makeError = factory;
}

/** Fait repondre une route en erreur, comme le ferait l'API. */
export class ApiReject {
  constructor(
    public status: number,
    public message = "Erreur simulee",
    public body: unknown = null,
  ) {}
}

let routes: Route[] = [];
const calls: ApiRequest[] = [];
const unhandled: string[] = [];

function matches(route: Route, req: ApiRequest): boolean {
  if (route.method !== req.method) return false;
  if (typeof route.matcher === "string") {
    return route.matcher.includes("?") ? route.matcher === req.path : route.matcher === req.pathname;
  }
  return route.matcher.test(req.path);
}

export const apiFetchMock = vi.fn(async (path: string, options: FetchOptions = {}): Promise<unknown> => {
  const [pathname, search = ""] = path.split("?");
  const req: ApiRequest = {
    method: (options.method ?? "GET").toUpperCase() as Method,
    path,
    pathname,
    query: new URLSearchParams(search),
    body: options.body,
  };
  calls.push(req);

  // Les dernieres routes declarees l'emportent : un test peut surcharger un defaut.
  const index = [...routes].reverse().findIndex((r) => matches(r, req));
  if (index === -1) {
    unhandled.push(`${req.method} ${path}`);
    throw makeError(404, `Route non simulee : ${req.method} ${path}`, null);
  }
  const route = routes[routes.length - 1 - index];
  if (route.once) routes = routes.filter((r) => r !== route);

  const value = typeof route.respond === "function" ? await (route.respond as (r: ApiRequest) => unknown)(req) : route.respond;
  if (value instanceof ApiReject) throw makeError(value.status, value.message, value.body);
  // Copie : un composant qui muterait la reponse ne doit pas polluer la suivante.
  return value === undefined ? undefined : structuredClone(value);
});

export const api = {
  /** Declare une reponse (valeur, fonction de la requete, ou `new ApiReject(...)`). */
  on(method: Method, matcher: string | RegExp, respond: Responder = null) {
    routes.push({ method, matcher, respond, once: false });
    return api;
  },
  /** Comme `on`, pour un seul appel. */
  once(method: Method, matcher: string | RegExp, respond: Responder = null) {
    routes.push({ method, matcher, respond, once: true });
    return api;
  },
  /** Les appels faits, filtres par methode et chemin (sans query string si `matcher` est une chaine). */
  calls(method?: Method, matcher?: string | RegExp): ApiRequest[] {
    return calls.filter(
      (c) =>
        (!method || c.method === method) &&
        (!matcher ||
          (typeof matcher === "string"
            ? matcher.includes("?")
              ? c.path === matcher
              : c.pathname === matcher
            : matcher.test(c.path))),
    );
  },
  lastCall(method?: Method, matcher?: string | RegExp): ApiRequest | undefined {
    return api.calls(method, matcher).at(-1);
  },
  get unhandled(): readonly string[] {
    return unhandled;
  },
  reset() {
    routes = [];
    calls.length = 0;
    unhandled.length = 0;
    apiFetchMock.mockClear();
  },
};

/** Une promesse qu'on resout a la main, pour observer l'ecran pendant qu'une requete est en vol. */
export function deferred<T = unknown>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Enveloppe paginee des listes de l'API (docs/API.md, « Pagination »). */
export function page<T>(data: T[], extra: Record<string, unknown> = {}) {
  return { data, meta: { total: data.length, page: 1, limit: 50, totalPages: 1 }, ...extra };
}
