import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type Message = {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  media_url?: string | null;
  type: "text" | "image" | "system";
  sent_at: string;
  // joined
  profiles?: { full_name: string; avatar_url?: string | null } | null;
};

export type NewMessage = {
  channel_id: string;
  sender_id: string;
  content: string;
  type?: "text" | "image" | "system";
};

export const CommunityService = {
  /** Fetch recent messages in a channel */
  async getMessages(channelId: string, limit = 50): Promise<Message[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("messages")
      .select("*, profiles(full_name, avatar_url)")
      .eq("channel_id", channelId)
      .order("sent_at", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return (data as Message[]) ?? [];
  },

  /** Send a message */
  async sendMessage(msg: NewMessage): Promise<Message> {
    if (!supabase) throw new Error("Supabase not configured");
    const { data, error } = await supabase
      .from("messages")
      .insert({ ...msg, type: msg.type ?? "text" })
      .select("*, profiles(full_name, avatar_url)")
      .single();
    if (error) throw error;
    return data as Message;
  },

  /**
   * Subscribe to realtime inserts on a channel.
   * Returns the RealtimeChannel so the caller can unsubscribe.
   *
   * Usage:
   *   const channel = CommunityService.subscribeToChannel('general', (msg) => ...);
   *   return () => channel.unsubscribe();
   */
  subscribeToChannel(
    channelId: string,
    onMessage: (msg: Message) => void
  ): RealtimeChannel | null {
    if (!supabase) return null;
    const channel = supabase
      .channel(`messages:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => onMessage(payload.new as Message)
      )
      .subscribe();
    return channel;
  },
};
