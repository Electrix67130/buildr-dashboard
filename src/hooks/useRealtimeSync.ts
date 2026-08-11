"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getAccessToken, API_URL } from "@/lib/api";

const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "change-me-in-production";

const WS_URL = API_URL.replace(/^http/, "ws");

const RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000, 30000];

export type RealtimeEventType =
  | "comment.created"
  | "comment.updated"
  | "comment.deleted"
  | "photo.created"
  | "photo.deleted"
  | "document.created"
  | "document.deleted"
  | "emergency.created"
  | "emergency.deleted"
  | "emergency-comment.created"
  | "emergency-comment.updated"
  | "emergency-comment.deleted"
  | "chantier-member.created"
  | "chantier-member.updated"
  | "chantier-member.deleted";

interface RealtimeEvent {
  type: RealtimeEventType;
  chantier_id: string;
  resource_id?: string;
  actor_id?: string;
}

interface Options {
  enabled: boolean;
  /** Appelé quand le serveur ferme avec code 4001 (session prise par une autre connexion). */
  onSessionReplaced?: () => void;
}

export function useRealtimeSync({ enabled, onSessionReplaced }: Options): void {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    cancelledRef.current = false;

    const handleEvent = (event: RealtimeEvent) => {
      const cid = event.chantier_id;
      switch (event.type) {
        case "comment.created":
        case "comment.updated":
        case "comment.deleted":
          queryClient.invalidateQueries({ queryKey: ["comments", cid] });
          queryClient.invalidateQueries({ queryKey: ["chantier-views", "unread", cid] });
          queryClient.invalidateQueries({ queryKey: ["chantier-views", "unread-summary"] });
          break;
        case "photo.created":
        case "photo.deleted":
          queryClient.invalidateQueries({ queryKey: ["photos", cid] });
          queryClient.invalidateQueries({ queryKey: ["chantier-views", "unread", cid] });
          queryClient.invalidateQueries({ queryKey: ["chantier-views", "unread-summary"] });
          break;
        case "document.created":
        case "document.deleted":
          queryClient.invalidateQueries({ queryKey: ["documents", cid] });
          queryClient.invalidateQueries({ queryKey: ["chantier-views", "unread", cid] });
          queryClient.invalidateQueries({ queryKey: ["chantier-views", "unread-summary"] });
          break;
        case "emergency.created":
        case "emergency.deleted":
          queryClient.invalidateQueries({ queryKey: ["emergencies", cid] });
          queryClient.invalidateQueries({ queryKey: ["chantier-views", "unread", cid] });
          queryClient.invalidateQueries({ queryKey: ["chantier-views", "unread-summary"] });
          break;
        case "emergency-comment.created":
        case "emergency-comment.updated":
        case "emergency-comment.deleted":
          queryClient.invalidateQueries({ queryKey: ["emergency-comments"] });
          queryClient.invalidateQueries({ queryKey: ["chantier-views", "unread", cid] });
          queryClient.invalidateQueries({ queryKey: ["chantier-views", "unread-summary"] });
          break;
        case "chantier-member.created":
        case "chantier-member.updated":
        case "chantier-member.deleted":
          queryClient.invalidateQueries({ queryKey: ["chantier-members", cid] });
          break;
      }
    };

    const connect = () => {
      if (cancelledRef.current) return;
      const token = getAccessToken();
      if (!token) {
        reconnectTimerRef.current = setTimeout(connect, 1000);
        return;
      }

      const url = `${WS_URL}/ws?token=${encodeURIComponent(token)}&api_key=${encodeURIComponent(API_KEY)}`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptRef.current = 0;
      };

      ws.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data as string) as RealtimeEvent;
          handleEvent(event);
        } catch {
          // ignore malformed
        }
      };

      ws.onclose = (e) => {
        wsRef.current = null;

        if (e.code === 4001) {
          cancelledRef.current = true;
          onSessionReplaced?.();
          return;
        }

        if (cancelledRef.current) return;

        const delay =
          RECONNECT_DELAYS_MS[
            Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS_MS.length - 1)
          ];
        reconnectAttemptRef.current += 1;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // Géré par onclose
      };
    };

    connect();

    return () => {
      cancelledRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        try {
          wsRef.current.close(1000, "unmount");
        } catch {
          // ignore
        }
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
