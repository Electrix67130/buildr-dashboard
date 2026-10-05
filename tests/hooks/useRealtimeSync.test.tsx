/**
 * Le canal temps reel tient l'ecran a jour et porte les fins de session
 * decidees par le serveur : 4001 session prise ailleurs, 4002 compte
 * desactive, 4003 compte supprime. Ces trois-la ne doivent jamais etre
 * suivies d'une reconnexion — on rouvrirait une session qu'on vient de
 * couper. Toute autre fermeture (redemarrage de l'API, reseau) doit au
 * contraire se reconnecter, avec un delai croissant.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act } from "@testing-library/react";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { FakeWebSocket, installFakeWebSocket } from "../helpers/fake-websocket";
import { renderHookWithProviders } from "../helpers/render";

type Options = Parameters<typeof useRealtimeSync>[0];

function setup(overrides: Partial<Options> = {}) {
  const callbacks = {
    onSessionReplaced: vi.fn(),
    onAccountDisabled: vi.fn(),
    onAccountDeleted: vi.fn(),
    onReportCreated: vi.fn(),
  };
  const utils = renderHookWithProviders(() => useRealtimeSync({ enabled: true, ...callbacks, ...overrides }));
  const invalidate = vi.spyOn(utils.queryClient, "invalidateQueries");
  return { ...utils, ...callbacks, invalidate };
}

beforeEach(() => {
  vi.useFakeTimers();
  installFakeWebSocket();
  localStorage.setItem("buildr_access_token", "jwt-123");
});

describe("useRealtimeSync — connexion", () => {
  it("ouvre /ws avec le jeton et la cle d'API", () => {
    setup();
    expect(FakeWebSocket.instances).toHaveLength(1);
    const url = new URL(FakeWebSocket.last.url);
    expect(url.protocol).toBe("ws:");
    expect(url.pathname).toBe("/ws");
    expect(url.searchParams.get("token")).toBe("jwt-123");
    expect(url.searchParams.get("api_key")).toBeTruthy();
  });

  it("desactive (utilisateur deconnecte), n'ouvre rien", () => {
    setup({ enabled: false });
    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  it("sans jeton, attend qu'il apparaisse avant d'ouvrir", () => {
    localStorage.removeItem("buildr_access_token");
    setup();
    expect(FakeWebSocket.instances).toHaveLength(0);
    localStorage.setItem("buildr_access_token", "jwt-tardif");
    act(() => vi.advanceTimersByTime(1000));
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(new URL(FakeWebSocket.last.url).searchParams.get("token")).toBe("jwt-tardif");
  });

  it("se demonter ferme la connexion et ne reconnecte pas", () => {
    const { unmount } = setup();
    const ws = FakeWebSocket.last;
    unmount();
    expect(ws.close).toHaveBeenCalledWith(1000, "unmount");
    act(() => ws.simulateClose(1000));
    act(() => vi.advanceTimersByTime(60_000));
    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});

describe("useRealtimeSync — fins de session", () => {
  it.each([
    [4001, "onSessionReplaced"],
    [4002, "onAccountDisabled"],
    [4003, "onAccountDeleted"],
  ] as const)("le code %i appelle %s, et rien d'autre, sans reconnexion", (code, callback) => {
    const cbs = setup();
    act(() => FakeWebSocket.last.simulateOpen());
    act(() => FakeWebSocket.last.simulateClose(code));
    expect(cbs[callback]).toHaveBeenCalledTimes(1);
    for (const other of ["onSessionReplaced", "onAccountDisabled", "onAccountDeleted"] as const) {
      if (other !== callback) expect(cbs[other]).not.toHaveBeenCalled();
    }
    act(() => vi.advanceTimersByTime(120_000));
    expect(FakeWebSocket.instances).toHaveLength(1);
  });
});

describe("useRealtimeSync — reconnexion", () => {
  it("une autre fermeture reconnecte apres 1 s, puis 2 s, puis 5 s", () => {
    setup();
    act(() => FakeWebSocket.last.simulateClose(1006));
    act(() => vi.advanceTimersByTime(999));
    expect(FakeWebSocket.instances).toHaveLength(1);
    act(() => vi.advanceTimersByTime(1));
    expect(FakeWebSocket.instances).toHaveLength(2);

    act(() => FakeWebSocket.last.simulateClose(1006));
    act(() => vi.advanceTimersByTime(1999));
    expect(FakeWebSocket.instances).toHaveLength(2);
    act(() => vi.advanceTimersByTime(1));
    expect(FakeWebSocket.instances).toHaveLength(3);

    act(() => FakeWebSocket.last.simulateClose(1006));
    act(() => vi.advanceTimersByTime(5000));
    expect(FakeWebSocket.instances).toHaveLength(4);
  });

  it("une connexion etablie remet le delai a 1 s", () => {
    setup();
    act(() => FakeWebSocket.last.simulateClose(1006));
    act(() => vi.advanceTimersByTime(1000));
    act(() => FakeWebSocket.last.simulateClose(1006));
    act(() => vi.advanceTimersByTime(2000));
    act(() => FakeWebSocket.last.simulateOpen());
    act(() => FakeWebSocket.last.simulateClose(1001));
    act(() => vi.advanceTimersByTime(1000));
    expect(FakeWebSocket.instances).toHaveLength(4);
  });

  it("le delai plafonne a 30 s", () => {
    setup();
    for (const delay of [1000, 2000, 5000, 10000, 30000, 30000]) {
      act(() => FakeWebSocket.last.simulateClose(1006));
      const before = FakeWebSocket.instances.length;
      act(() => vi.advanceTimersByTime(delay - 1));
      expect(FakeWebSocket.instances).toHaveLength(before);
      act(() => vi.advanceTimersByTime(1));
      expect(FakeWebSocket.instances).toHaveLength(before + 1);
    }
  });
});

describe("useRealtimeSync — evenements", () => {
  it("report.created invalide [\"reports\"] et appelle onReportCreated", () => {
    const { invalidate, onReportCreated } = setup();
    act(() => FakeWebSocket.last.simulateMessage({ type: "report.created", resource_id: "r-1" }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["reports"] });
    expect(onReportCreated).toHaveBeenCalledTimes(1);
  });

  it("comment.created invalide les messages et les non-lus du chantier concerne", () => {
    const { invalidate } = setup();
    act(() => FakeWebSocket.last.simulateMessage({ type: "comment.created", chantier_id: "c-1" }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["comments", "c-1"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["chantier-views", "unread", "c-1"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["chantier-views", "unread-summary"] });
  });

  it("membership.updated relit tout", () => {
    const { invalidate } = setup();
    act(() => FakeWebSocket.last.simulateMessage({ type: "membership.updated" }));
    expect(invalidate).toHaveBeenCalledWith();
  });

  it("un message illisible est ignore sans casser le canal", () => {
    const { invalidate, onReportCreated } = setup();
    act(() => FakeWebSocket.last.simulateMessage("pas du json"));
    act(() => FakeWebSocket.last.simulateMessage({ type: "report.created" }));
    expect(onReportCreated).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});
