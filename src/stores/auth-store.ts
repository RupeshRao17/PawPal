import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type SignUpInput = { fullName: string; email: string; password: string };
type AuthResult  = { error: Error | null };

type AuthState = {
  session:   Session | null;
  bootstrap: () => Promise<void>;
  signIn:    (email: string, password: string) => Promise<AuthResult>;
  signUp:    (payload: SignUpInput) => Promise<AuthResult>;
  signOut:   () => Promise<void>;
};

const configErr = () =>
  new Error("Supabase env vars missing — set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");

export const useAuthStore = create<AuthState>((set) => ({
  session: null,

  bootstrap: async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        // Invalid / expired refresh token — clear session and force sign-in
        console.warn("Session bootstrap error:", error.message);
        await supabase.auth.signOut().catch(() => {});
        set({ session: null });
        return;
      }
      set({ session: data.session });
    } catch (e) {
      console.warn("Bootstrap failed:", e);
      set({ session: null });
    }

    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        set({ session });
      } else if (event === "SIGNED_OUT" || event === "USER_DELETED") {
        set({ session: null });
      }
    });
  },

  signIn: async (email, password) => {
    if (!supabase || !isSupabaseConfigured) return { error: configErr() };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.session) set({ session: data.session });
    return { error: error as Error | null };
  },

  signUp: async ({ fullName, email, password }) => {
    if (!supabase || !isSupabaseConfigured) return { error: configErr() };
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } },
    });
    if (!error && data.user) {
      await supabase.from("profiles").upsert({ id: data.user.id, full_name: fullName, role: "owner" });
    }
    return { error: error as Error | null };
  },

  signOut: async () => {
    if (supabase && isSupabaseConfigured) await supabase.auth.signOut();
    set({ session: null });
  },
}));
