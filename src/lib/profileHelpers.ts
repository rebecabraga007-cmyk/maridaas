import { supabase } from "@/integrations/supabase/safeClient";

export interface PublicProfile {
  user_id: string;
  full_name: string;
  bio: string | null;
  neighborhood: string;
  city: string;
  instagram: string | null;
  whatsapp: string | null;
  avatar_url: string | null;
  primary_neighborhood_id: string | null;
  secondary_neighborhood_id: string | null;
  is_same_neighborhood: boolean;
}

/**
 * Fetches public profile data using the security definer function.
 * This ensures sensitive data (CPF, address, birth_date) is never exposed.
 */
export const getPublicProfile = async (userId: string): Promise<PublicProfile | null> => {
  const { data, error } = await supabase.rpc("get_public_profile", { 
    target_user_id: userId 
  });
  
  if (error || !data || data.length === 0) {
    return null;
  }
  
  return data[0] as PublicProfile;
};

/**
 * Fetches multiple public profiles at once
 */
export const getPublicProfiles = async (userIds: string[]): Promise<Map<string, PublicProfile>> => {
  const profileMap = new Map<string, PublicProfile>();
  
  // Fetch profiles in parallel
  const results = await Promise.all(
    userIds.map(id => getPublicProfile(id))
  );
  
  userIds.forEach((id, index) => {
    const profile = results[index];
    if (profile) {
      profileMap.set(id, profile);
    }
  });
  
  return profileMap;
};

/**
 * Get just the full name for a user (common operation)
 */
export const getProfileName = async (userId: string): Promise<string> => {
  const profile = await getPublicProfile(userId);
  return profile?.full_name || "Usuária";
};
