import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdoptionListing = {
  id: string;
  pet_id: string;
  shelter_id: string;
  status: "available" | "pending" | "adopted";
  description?: string | null;
  city?: string | null;
  listed_at: string;
  // joined
  pets?: {
    name: string;
    species: string;
    breed?: string | null;
    gender?: string | null;
    dob?: string | null;
    photo_url?: string | null;
    notes?: string | null;
  } | null;
  profiles?: { full_name: string; city?: string | null } | null;
};

export type AdoptionApplication = {
  id: string;
  listing_id: string;
  applicant_id: string;
  status: "pending" | "approved" | "rejected";
  statement?: string | null;
  applied_at: string;
};

// ─── AdoptionService ──────────────────────────────────────────────────────────

export const AdoptionService = {
  /** Public: all available adoption listings */
  async getAvailableListings(city?: string): Promise<AdoptionListing[]> {
    if (!supabase) return [];
    let query = supabase
      .from("adoption_listings")
      .select(
        "*, pets(name, species, breed, gender, dob, photo_url, notes), profiles(full_name, city)"
      )
      .eq("status", "available")
      .order("listed_at", { ascending: false });

    if (city?.trim()) {
      query = query.ilike("city", `%${city}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data as AdoptionListing[]) ?? [];
  },

  /** Get listings managed by a shelter admin */
  async getMyListings(shelterId: string): Promise<AdoptionListing[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("adoption_listings")
      .select("*, pets(name, species, breed, photo_url)")
      .eq("shelter_id", shelterId)
      .order("listed_at", { ascending: false });
    if (error) throw error;
    return (data as AdoptionListing[]) ?? [];
  },

  /** Create a new adoption listing */
  async createListing(
    listing: Omit<AdoptionListing, "id" | "listed_at" | "pets" | "profiles">
  ): Promise<AdoptionListing> {
    if (!supabase) throw new Error("Supabase not configured");
    const { data, error } = await supabase
      .from("adoption_listings")
      .insert(listing)
      .select()
      .single();
    if (error) throw error;
    return data as AdoptionListing;
  },

  /** Apply to adopt a pet */
  async applyForAdoption(
    listingId: string,
    applicantId: string,
    statement: string
  ): Promise<AdoptionApplication> {
    if (!supabase) throw new Error("Supabase not configured");
    const { data, error } = await supabase
      .from("adoption_applications")
      .insert({ listing_id: listingId, applicant_id: applicantId, statement })
      .select()
      .single();
    if (error) throw error;
    return data as AdoptionApplication;
  },

  /** Get applications submitted by the current user */
  async getMyApplications(applicantId: string): Promise<AdoptionApplication[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from("adoption_applications")
      .select("*")
      .eq("applicant_id", applicantId)
      .order("applied_at", { ascending: false });
    if (error) throw error;
    return (data as AdoptionApplication[]) ?? [];
  },
};
