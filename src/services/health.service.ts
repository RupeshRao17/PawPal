import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Vaccination = {
  id: string;
  pet_id: string;
  vaccine_name: string;
  administered_on: string;
  next_due_on?: string | null;
  vet_id?: string | null;
  notes?: string | null;
};

export type Medication = {
  id: string;
  pet_id: string;
  medication_name: string;
  dosage?: string | null;
  frequency?: string | null;
  start_date: string;
  end_date?: string | null;
  prescribed_by?: string | null;
};

export type WeightLog = {
  id: string;
  pet_id: string;
  weight_kg: number;
  logged_on: string;
  notes?: string | null;
};

// ─── Vaccinations ─────────────────────────────────────────────────────────────

export const HealthService = {
  // Vaccinations
  async getVaccinations(petId: string): Promise<Vaccination[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("health_vaccinations")
      .select("*")
      .eq("pet_id", petId)
      .order("administered_on", { ascending: false });
    if (error) throw error;
    return (data as Vaccination[]) ?? [];
  },

  async addVaccination(v: Omit<Vaccination, "id">): Promise<Vaccination> {
    if (!supabase) throw new Error("Supabase not configured");
    const { data, error } = await supabase
      .from("health_vaccinations")
      .insert(v)
      .select()
      .single();
    if (error) throw error;
    return data as Vaccination;
  },

  async deleteVaccination(id: string): Promise<void> {
    if (!supabase) throw new Error("Supabase not configured");
    const { error } = await supabase
      .from("health_vaccinations")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  // Medications
  async getMedications(petId: string): Promise<Medication[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("health_medications")
      .select("*")
      .eq("pet_id", petId)
      .order("start_date", { ascending: false });
    if (error) throw error;
    return (data as Medication[]) ?? [];
  },

  async addMedication(m: Omit<Medication, "id">): Promise<Medication> {
    if (!supabase) throw new Error("Supabase not configured");
    const { data, error } = await supabase
      .from("health_medications")
      .insert(m)
      .select()
      .single();
    if (error) throw error;
    return data as Medication;
  },

  async deleteMedication(id: string): Promise<void> {
    if (!supabase) throw new Error("Supabase not configured");
    const { error } = await supabase
      .from("health_medications")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  // Weight Logs
  async getWeightLogs(petId: string): Promise<WeightLog[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("health_weight_logs")
      .select("*")
      .eq("pet_id", petId)
      .order("logged_on", { ascending: false });
    if (error) throw error;
    return (data as WeightLog[]) ?? [];
  },

  async addWeightLog(w: Omit<WeightLog, "id">): Promise<WeightLog> {
    if (!supabase) throw new Error("Supabase not configured");
    const { data, error } = await supabase
      .from("health_weight_logs")
      .insert(w)
      .select()
      .single();
    if (error) throw error;
    return data as WeightLog;
  },

  async deleteWeightLog(id: string): Promise<void> {
    if (!supabase) throw new Error("Supabase not configured");
    const { error } = await supabase
      .from("health_weight_logs")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },
};
