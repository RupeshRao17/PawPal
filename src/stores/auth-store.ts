import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type SignUpInput = { fullName: string; email: string; password: string };
type AuthResult = { error: Error | null };

type AuthState = {
  session: Session | null;
  bootstrap: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (payload: SignUpInput) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const getSupabaseConfigError = () =>
  new Error("Supabase environment variables are missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.");

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  bootstrap: async () => {
    if (!supabase) {
      return;
    }
    const { data } = await supabase.auth.getSession();
    set({ session: data.session });
    supabase.auth.onAuthStateChange((_event, session) => set({ session }));
  },
  signIn: async (email, password) => {
    if (!supabase || !isSupabaseConfigured) {
      return { error: getSupabaseConfigError() };
    }
   const { data, error } = await supabase.auth.signInWithPassword({ email, password });
if (!error && data.session) {
  set({ session: data.session }); // ← syncs the store immediately
}
return { error: error as Error | null };
  },
  signUp: async ({ fullName, email, password }) => {
    if (!supabase || !isSupabaseConfigured) {
      return { error: getSupabaseConfigError() };
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (!error && data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: fullName,
        role: "owner",
      });
    }
    return { error: error as Error | null };
  },
  signOut: async () => {
    if (!supabase || !isSupabaseConfigured) {
      set({ session: null });
      return;
    }
    await supabase.auth.signOut();
    set({ session: null });
  },
}));
