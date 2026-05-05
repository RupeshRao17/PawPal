import { supabase } from "@/lib/supabase";

export type Profile = {
  id: string;
  full_name: string;
  avatar_url?: string | null;
  role: "owner" | "vet" | "shelter_admin" | "superadmin";
  phone?: string | null;
  city?: string | null;
  created_at: string;
};

export const ProfileService = {
  /** Fetch a profile by user id */
  async getProfile(userId: string): Promise<Profile | null> {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) throw error;
    return data as Profile;
  },

  /** Upsert (create or update) a profile */
  async upsertProfile(
    userId: string,
    updates: Partial<Omit<Profile, "id" | "created_at">>
  ): Promise<Profile> {
    if (!supabase) throw new Error("Supabase not configured");
    const { data, error } = await supabase
      .from("profiles")
      .upsert({ id: userId, ...updates })
      .select()
      .single();
    if (error) throw error;
    return data as Profile;
  },

  /** Upload an avatar to the 'avatars' bucket and return public URL */
  async uploadAvatar(userId: string, fileUri: string): Promise<string> {
    if (!supabase) throw new Error("Supabase not configured");
    const ext = fileUri.split(".").pop() ?? "jpg";
    const fileName = `${userId}/avatar.${ext}`;
    const response = await fetch(fileUri);
    const blob = await response.blob();
    const { error } = await supabase.storage
      .from("avatars")
      .upload(fileName, blob, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
    return data.publicUrl;
  },
};
