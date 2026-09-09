import { supabase } from "@/integrations/supabase/client";

/** Uploads a KYC document into the private kyc-docs vault under the user's own folder. Returns the storage path. */
export async function uploadKycDoc(userId: string, file: File, kind: string): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${userId}/${kind}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("kyc-docs").upload(path, file, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export const ID_PROOF_TYPES = ["Aadhaar", "Voter ID", "Passport", "Driving Licence"] as const;
export const VEHICLE_TYPES = [
  ["EV_SCOOTER", "EV scooter"],
  ["PETROL_SCOOTER", "Petrol scooter"],
  ["MOTORBIKE", "Motorbike"],
  ["BICYCLE", "Bicycle"],
] as const;
export const BBSR_ZONES = ["Khandagiri", "DumDuma", "Patia", "Chandrasekharpur", "Old Town", "Saheed Nagar", "Rasulgarh", "Kharavela Nagar"] as const;
