/**
 * WebSocket factice, installee a la place de la globale par
 * `installFakeWebSocket()`. Chaque connexion ouverte est gardee dans
 * `FakeWebSocket.instances` ; le test la pilote (open, message, close).
 */
import { vi } from "vitest";

export class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  url: string;
  onopen: ((e: Event) => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onclose: ((e: CloseEvent) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  close = vi.fn((code?: number, reason?: string) => {
    void code;
    void reason;
  });

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  static get last(): FakeWebSocket {
    const ws = FakeWebSocket.instances.at(-1);
    if (!ws) throw new Error("aucune WebSocket ouverte");
    return ws;
  }

  simulateOpen() {
    this.onopen?.(new Event("open"));
  }

  simulateMessage(data: unknown) {
    this.onmessage?.(new MessageEvent("message", { data: typeof data === "string" ? data : JSON.stringify(data) }));
  }

  /** Fermeture cote serveur, avec son code (4001 session remplacee, etc.). */
  simulateClose(code: number) {
    this.onclose?.(new CloseEvent("close", { code }));
  }
}

export function installFakeWebSocket() {
  FakeWebSocket.instances = [];
  vi.stubGlobal("WebSocket", FakeWebSocket);
}
