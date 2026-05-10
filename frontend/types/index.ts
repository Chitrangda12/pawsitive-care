// Shared TypeScript types for Pawsitive Care

export enum BreedEnum {
  LABRADOR = "Labrador Retriever",
  SHIH_TZU = "Shih-Tzu",
  GOLDEN = "Golden Retriever",
  BEAGLE = "Beagle",
  GERMAN_SHEPHERD = "German Shepherd",
}

export enum AllergyCategory {
  FOOD = "food",
  ENVIRONMENTAL = "environmental",
  MEDICATION = "medication",
  CONTACT = "contact",
  SENSITIVITY = "sensitivity",
}

export enum AllergySeverity {
  MILD = "mild",
  MODERATE = "moderate",
  SEVERE = "severe",
}

export enum VaccineStatus {
  SAFE = "safe",
  CONDITIONAL = "conditional",
  UNSAFE = "unsafe",
}

export enum UrgencyLevel {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

// Dog
export interface Allergy {
  id: number;
  name: string;
  category: AllergyCategory;
  severity: AllergySeverity;
  notes?: string;
}

export interface Dog {
  id: number;
  name: string;
  breed: BreedEnum;
  age_years: number;
  weight_kg: number;
  owner_name: string;
  image_url?: string;
  created_at?: string;
  allergies: Allergy[];
}

export interface DogCreate {
  name: string;
  breed: BreedEnum;
  age_years: number;
  weight_kg: number;
  owner_name: string;
  image_url?: string;
  allergy_ids?: number[];
}

export interface AllergyCreate {
  name: string;
  category: AllergyCategory;
  severity?: AllergySeverity;
  notes?: string;
}

// Vaccination
export interface VaccineEvaluation {
  vaccine_name: string;
  status: VaccineStatus;
  contraindications: string[];
  reason: string;
}

export interface VaccinationReport {
  dog_id: number;
  dog_name: string;
  breed: string;
  allergies: string[];
  evaluations: VaccineEvaluation[];
  disclaimer: string;
}

// Diet
export interface MealPlan {
  dog_name: string;
  breed: string;
  age_years: number;
  weight_kg: number;
  allergies: string[];
  meal_plan: Record<string, string>;
  avoid_list: string[];
  supplements: string[];
  feeding_schedule: Record<string, string | number>;
  disclaimer: string;
}

// Environment
export interface EnvironmentRisk {
  dog_name: string;
  location: { latitude: number; longitude: number };
  risk_level: string;
  environmental_risk_score: number;
  ml_model_contribution: number;
  allergy_impact_score: number;
  allergy_severity_level: string;
  allergy_trigger_detected: boolean;
  trigger_factors: string[];
  vaccine_recommendations: {
    safe: { name: string; type: string; contraindications: string[]; reason: string }[];
    restricted: { name: string; type: string; contraindications: string[]; reason: string }[];
  };
  urgency: string;
  explanation: string;
  disclaimer: string;
  activity_guidance: { activity: string; recommendation: string; icon: string }[];
  environmental_data: Record<string, string | number>;
  is_fallback?: boolean;
  fallback_reasons?: string[];
}

// FIR
export interface FIRReport {
  observations: string;
  possible_concerns: string;
  risk_level: string;
  urgency: string;
  allergy_trigger_detected: boolean;
  environmental_summary: string;
  explanation: string;
  disclaimer: string;
}
