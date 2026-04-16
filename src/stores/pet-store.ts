import { create } from "zustand";
import { supabase } from "@/lib/supabase";

export type Pet = {
  id: string;
  name: string;
  species: string;
  breed: string;
  dob?: string | null;
  gender?: string | null;
  photo_url?: string | null;
  owner_id: string;
  created_at?: string;
};

type PetState = {
  pets: Pet[];
  activePet: Pet | null;
  loading: boolean;
  fetchPets: (ownerId: string) => Promise<void>;
  setActivePet: (pet: Pet) => void;
  addPet: (pet: Pet) => void;
  removePet: (id: string) => void;
};

export const usePetStore = create<PetState>((set, get) => ({
  pets: [],
  activePet: null,
  loading: false,

  fetchPets: async (ownerId) => {
    if (!supabase) return;
    set({ loading: true });
    const { data } = await supabase
      .from("pets")
      .select("*")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: false });
    const pets = (data as Pet[]) ?? [];
    set({
      pets,
      activePet: get().activePet ?? pets[0] ?? null,
      loading: false,
    });
  },

  setActivePet: (pet) => set({ activePet: pet }),

  addPet: (pet) =>
    set((s) => ({
      pets: [pet, ...s.pets],
      activePet: s.activePet ?? pet,
    })),

  removePet: (id) =>
    set((s) => {
      const pets = s.pets.filter((p) => p.id !== id);
      return { pets, activePet: s.activePet?.id === id ? pets[0] ?? null : s.activePet };
    }),
}));
