import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Vet = {
  id: string;
  clinic_name: string;
  city: string;
  address?: string | null;
  specializations: string[];
  avg_rating?: number | null;
  lat?: number | null;
  lng?: number | null;
  availability?: Record<string, string[]> | null;
  // joined from profiles
  profiles?: { full_name: string; avatar_url?: string | null } | null;
};

export type Appointment = {
  id: string;
  vet_id: string;
  owner_id: string;
  pet_id: string;
  scheduled_at: string;
  status: "confirmed" | "completed" | "cancelled" | "no_show";
  prescription_url?: string | null;
  clinical_notes?: string | null;
  // joined
  vets?: { clinic_name: string; city: string } | null;
  pets?: { name: string; species: string } | null;
};

export type NewAppointment = {
  vet_id: string;
  owner_id: string;
  pet_id: string;
  scheduled_at: string;
};

// ─── VetService ───────────────────────────────────────────────────────────────

export const VetService = {
  /** List all vets, highest rated first */
  async getAllVets(searchQuery?: string): Promise<Vet[]> {
    if (!supabase) return [];
    let query = supabase
      .from("vets")
      .select("*, profiles(full_name, avatar_url)")
      .order("avg_rating", { ascending: false });

    if (searchQuery?.trim()) {
      query = query.or(
        `clinic_name.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`
      );
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data as Vet[]) ?? [];
  },

  /** Get a single vet's profile */
  async getVetById(id: string): Promise<Vet | null> {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("vets")
      .select("*, profiles(full_name, avatar_url)")
      .eq("id", id)
      .single();
    if (error) throw error;
    return data as Vet;
  },

  // ── Appointments ─────────────────────────────────────────────────────────────

  /** Get upcoming/past appointments for the logged-in owner */
  async getMyAppointments(ownerId: string): Promise<Appointment[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("appointments")
      .select("*, vets(clinic_name, city), pets(name, species)")
      .eq("owner_id", ownerId)
      .order("scheduled_at", { ascending: false });
    if (error) throw error;
    return (data as Appointment[]) ?? [];
  },

  /** Book a new appointment */
  async bookAppointment(appt: NewAppointment): Promise<Appointment> {
    if (!supabase) throw new Error("Supabase not configured");
    const { data, error } = await supabase
      .from("appointments")
      .insert(appt)
      .select()
      .single();
    if (error) throw error;
    return data as Appointment;
  },

  /** Cancel an appointment */
  async cancelAppointment(id: string): Promise<void> {
    if (!supabase) throw new Error("Supabase not configured");
    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) throw error;
  },
};
