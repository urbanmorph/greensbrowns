"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface UseRealtimeOptions {
  table: string;
  schema?: string;
  filter?: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  channelName?: string;
  onData: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
}

export function useRealtime({
  table,
  schema = "public",
  filter,
  event = "*",
  channelName,
  onData,
}: UseRealtimeOptions) {
  const supabase = createClient();
  const onDataRef = useRef(onData);
  onDataRef.current = onData;

  useEffect(() => {
    const channelConfig: Record<string, string> = {
      event,
      schema,
      table,
    };
    if (filter) channelConfig.filter = filter;

    const name = channelName ?? `realtime-${table}-${filter ?? "all"}`;

    const channel = supabase
      .channel(name)
      .on(
        "postgres_changes" as never,
        channelConfig,
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          onDataRef.current(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, table, schema, filter, event, channelName]);
}
