/**
 * Le client HTTP decide quand une session est finie. Seul un 401 du
 * renouvellement doit effacer les jetons (docs/API.md, « POST /auth/refresh ») :
 * jusqu'a la 1.4.3, un 502 pendant un redeploiement de l'API deconnectait
 * tout le monde. Ici on teste le vrai `apiFetch`, sur un `fetch` simule.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as ApiModule from "@/lib/api";

// tests/setup.ts remplace apiFetch pour les composants ; ici on veut le vrai.
const { apiFetch, ApiError, getAccessToken, getRefreshToken, setTokens } =
  await vi.importActual<typeof ApiModule>("@/lib/api");

const fetchMock = vi.fn<typeof fetch>();
/** En-tetes de chaque appel, copies au moment de l'appel (apiFetch reutilise son objet pour le rejeu). */
let sentHeaders: Record<string, string>[] = [];

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** Repond selon l'URL appelee, une file de reponses par route. */
function serve(responses: Record<string, Response[]>) {
  fetchMock.mockImplementation(async (input, init) => {
    sentHeaders.push({ ...(init?.headers as Record<string, string>) });
    const path = new URL(String(input)).pathname;
    const queue = responses[path];
    const next = queue?.shift();
    if (!next) throw new Error(`fetch inattendu : ${path}`);
    return next;
  });
}

function authHeader(callIndex: number): string | undefined {
  return sentHeaders[callIndex]["Authorization"];
}

beforeEach(() => {
  fetchMock.mockReset();
  sentHeaders = [];
  vi.stubGlobal("fetch", fetchMock);
  setTokens("access-old", "refresh-old");
});

describe("apiFetch — renouvellement du jeton", () => {
  it("au 401, renouvelle le jeton puis rejoue la requete avec le nouveau", async () => {
    serve({
      "/chantiers": [json(401, { message: "expired" }), json(200, [{ id: "c-1" }])],
      "/auth/refresh": [json(200, { access_token: "access-new", refresh_token: "refresh-new" })],
    });
    await expect(apiFetch("/chantiers")).resolves.toEqual([{ id: "c-1" }]);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(authHeader(0)).toBe("Bearer access-old");
    const refreshInit = fetchMock.mock.calls[1][1]!;
    expect(JSON.parse(String(refreshInit.body))).toEqual({ refresh_token: "refresh-old" });
    expect(authHeader(2)).toBe("Bearer access-new");
    expect(getAccessToken()).toBe("access-new");
    expect(getRefreshToken()).toBe("refresh-new");
  });

  it("un 502 au renouvellement ne vide PAS les jetons et remonte l'erreur", async () => {
    serve({
      "/chantiers": [json(401, {})],
      "/auth/refresh": [json(502, {})],
    });
    const err = await apiFetch("/chantiers").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as InstanceType<typeof ApiError>).statusCode).toBe(502);
    expect(getAccessToken()).toBe("access-old");
    expect(getRefreshToken()).toBe("refresh-old");
  });

  it("une erreur reseau au renouvellement ne vide pas non plus les jetons", async () => {
    fetchMock
      .mockResolvedValueOnce(json(401, {}))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(apiFetch("/chantiers")).rejects.toThrow("Failed to fetch");
    expect(getRefreshToken()).toBe("refresh-old");
  });

  it("un 401 au renouvellement vide les jetons et renvoie une 401", async () => {
    // apiFetch renvoie alors vers /login. jsdom ne sait pas naviguer et l'ecrit
    // (« Not implemented: navigation ») : ce message dans la sortie est attendu.
    serve({
      "/chantiers": [json(401, {})],
      "/auth/refresh": [json(401, {})],
    });
    const err = await apiFetch("/chantiers").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as InstanceType<typeof ApiError>).statusCode).toBe(401);
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("deux requetes en 401 simultanees partagent un seul renouvellement", async () => {
    serve({
      "/a": [json(401, {}), json(200, { ok: "a" })],
      "/b": [json(401, {}), json(200, { ok: "b" })],
      "/auth/refresh": [json(200, { access_token: "access-new", refresh_token: "refresh-new" })],
    });
    await expect(Promise.all([apiFetch("/a"), apiFetch("/b")])).resolves.toEqual([{ ok: "a" }, { ok: "b" }]);
    const refreshCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/auth/refresh"));
    expect(refreshCalls).toHaveLength(1);
  });

  it("skipAuth : un 401 remonte tel quel, sans tentative de renouvellement", async () => {
    serve({ "/auth/login": [json(401, { message: "Identifiants invalides" })] });
    const err = await apiFetch("/auth/login", { method: "POST", body: {}, skipAuth: true }).catch((e: unknown) => e);
    expect((err as InstanceType<typeof ApiError>).message).toBe("Identifiants invalides");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getRefreshToken()).toBe("refresh-old");
  });
});

describe("apiFetch — requetes et reponses", () => {
  it("un DELETE sans corps n'annonce pas de Content-Type (sinon Fastify repond 400)", async () => {
    serve({ "/invitations/i-1": [new Response(null, { status: 204 })] });
    await expect(apiFetch("/invitations/i-1", { method: "DELETE" })).resolves.toBeUndefined();
    const headers = fetchMock.mock.calls[0][1]!.headers as Record<string, string>;
    expect(headers).not.toHaveProperty("Content-Type");
    expect(fetchMock.mock.calls[0][1]!.body).toBeUndefined();
  });

  it("un corps est envoye en JSON avec son Content-Type", async () => {
    serve({ "/reports": [json(201, { id: "r-1" })] });
    await apiFetch("/reports", { method: "POST", body: { reason: "other" } });
    const init = fetchMock.mock.calls[0][1]!;
    expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(init.body).toBe('{"reason":"other"}');
  });

  it("une erreur porte le message renvoye par l'API", async () => {
    serve({ "/chantier-members/m-1": [json(409, { message: "Un administrateur a toujours tout" })] });
    const err = await apiFetch("/chantier-members/m-1", { method: "PATCH", body: {} }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as InstanceType<typeof ApiError>).statusCode).toBe(409);
    expect((err as InstanceType<typeof ApiError>).message).toBe("Un administrateur a toujours tout");
  });
});
