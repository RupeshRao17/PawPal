import { create } from "zustand";
import { supabase } from "@/lib/supabase";

type HealthState = {
  overdueCount: number;
  fetchOverdueCount: (ownerId: string) => Promise<void>;
};

export const useHealthStore = create<HealthState>((set) => ({
  overdueCount: 0,

  fetchOverdueCount: async (ownerId) => {
    if (!supabase) return;
    const today = new Date().toISOString().split("T")[0];
    const { data: petsData } = await supabase
      .from("pets").select("id").eq("owner_id", ownerId);
    const petIds = (petsData ?? []).map((p: any) => p.id);
    if (petIds.length === 0) { set({ overdueCount: 0 }); return; }
    const { count } = await supabase
      .from("health_vaccinations")
      .select("id", { count: "exact", head: true })
      .in("pet_id", petIds)
      .lt("next_due_on", today)
      .not("next_due_on", "is", null);
    set({ overdueCount: count ?? 0 });
  },
}));
