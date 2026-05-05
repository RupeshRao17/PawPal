import { supabase } from "@/lib/supabase";
import type { Pet } from "@/stores/pet-store";

export type NewPet = Omit<Pet, "id" | "created_at">;

export const PetService = {
  /** Fetch all pets owned by the given user */
  async getMyPets(ownerId: string): Promise<Pet[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("pets")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as Pet[]) ?? [];
  },

  /** Add a new pet and return the created record */
  async addPet(pet: NewPet): Promise<Pet> {
    if (!supabase) throw new Error("Supabase not configured");
    const { data, error } = await supabase
      .from("pets")
      .insert(pet)
      .select()
      .single();
    if (error) throw error;
    return data as Pet;
  },

  /** Update pet fields */
  async updatePet(id: string, updates: Partial<NewPet>): Promise<void> {
    if (!supabase) throw new Error("Supabase not configured");
    const { error } = await supabase.from("pets").update(updates).eq("id", id);
    if (error) throw error;
  },

  /** Delete a pet by id */
  async deletePet(id: string): Promise<void> {
    if (!supabase) throw new Error("Supabase not configured");
    const { error } = await supabase.from("pets").delete().eq("id", id);
    if (error) throw error;
  },
};
