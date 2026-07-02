export interface Pet {
  id: string;
  user_id: string;
  name: string;
  species: string;
  breed?: string;
  age_years?: number;
  birthday?: string;
  weight_kg?: number;
  color?: string;
  microchip_id?: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface HealthLog {
  id: string;
  pet_id: string;
  user_id: string;
  logged_at: string;
  raw_input: string;
  extracted_symptoms: string[];
  extracted_behaviors: string[];
  extracted_mood?: string;
  flagged: boolean;
  flag_reason?: string;
  severity?: "low" | "medium" | "high";
  created_at: string;
}

export interface Medication {
  id: string;
  pet_id: string;
  user_id: string;
  name: string;
  dose?: string;
  frequency?: string;
  start_date?: string;
  end_date?: string;
  notes?: string;
  active: boolean;
  created_at: string;
}

export interface VetVisit {
  id: string;
  pet_id: string;
  user_id: string;
  visit_date: string;
  vet_name?: string;
  clinic_name?: string;
  reason?: string;
  notes?: string;
  created_at: string;
}

export interface VetSummary {
  id: string;
  pet_id: string;
  user_id: string;
  generated_at: string;
  date_range_start?: string;
  date_range_end?: string;
  content: string;
  key_concerns: string[];
  recommended_questions: string[];
}

export interface Profile {
  id: string;
  role: "owner" | "vet";
  full_name?: string;
  clinic_name?: string;
  license_number?: string;
  created_at: string;
}

export interface PetShare {
  id: string;
  pet_id: string;
  vet_id?: string;
  owner_id: string;
  vet_email?: string;
  status: "pending" | "accepted" | "revoked";
  invite_token: string;
  created_at: string;
}

export interface VetNote {
  id: string;
  pet_id: string;
  vet_id: string;
  log_id?: string;
  content: string;
  note_type: "observation" | "diagnosis" | "treatment" | "followup";
  created_at: string;
  profiles?: { full_name?: string };
}

export interface Appointment {
  id: string;
  pet_id: string;
  vet_id?: string;
  owner_id: string;
  scheduled_at: string;
  notes?: string;
  status: "upcoming" | "completed" | "cancelled";
  created_at: string;
}

export interface ShareLink {
  id: string;
  pet_id: string;
  owner_id: string;
  token: string;
  label?: string;
  expires_at?: string;
  created_at: string;
}

export interface LabResult {
  id: string;
  pet_id: string;
  user_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  notes?: string;
  test_date?: string;
  created_at: string;
}

export interface CoOwner {
  id: string;
  pet_id: string;
  owner_id: string;
  invited_email: string;
  status: "pending" | "accepted" | "revoked";
  invite_token: string;
  created_at: string;
}

export interface AgentLogResponse {
  log: HealthLog;
  analysis: {
    patterns_detected: string[];
    flagged: boolean;
    flag_reason?: string;
    severity?: string;
  };
}

export interface AgentSummaryResponse {
  summary: VetSummary;
}
