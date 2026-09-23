"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export function RealtimeSync() {
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null;
    let isSubscribed = false;

    // Disparar evento global de refresh
    const dispatchRefresh = () => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("finance-refresh"));
      }
    };

    // 1. Detección de Foco y Visibilidad (Revalidación silenciosa instantánea)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        dispatchRefresh();
      }
    };

    const handleFocus = () => {
      dispatchRefresh();
    };

    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    // 2. Supabase Realtime Channels
    const setupRealtime = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return; // Sólo sincronizar usuarios autenticados

      channel = supabase
        .channel("schema-db-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "transactions",
            filter: `user_id=eq.${user.id}`,
          },
          () => dispatchRefresh()
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "accounts",
            filter: `user_id=eq.${user.id}`,
          },
          () => dispatchRefresh()
        )
        .subscribe();
      
      isSubscribed = true;
    };

    setupRealtime();

    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      if (isSubscribed && channel) {
        channel.unsubscribe();
      }
    };
  }, []);

  return null;
}
