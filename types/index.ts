export type VehicleStatus = 'INTAKE' | 'IN_PROGRESS' | 'READY_FOR_DELIVERY' | 'CLOSED_PAID';

export type BayCategory = 'WORKSHOP' | 'CAR_WASH';

export interface InspectionMarker {
  id: string;
  x: number; // percentage (0-100) or SVG units
  y: number; // percentage (0-100) or SVG units
  type: 'DENT' | 'SCRATCH' | 'CHIP' | 'RUST';
  note?: string;
  createdAt?: string;
}

export interface ItemizedPart {
  id: string;
  sku?: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
  classification?: 'OEM Parts' | 'Consumables' | 'Aftermarket';
}

export interface HandedOverInventory {
  spare_wheel: boolean;
  tools: boolean;
  mats: boolean;
  valuables_cleared: boolean;
}

export interface QualityChecks {
  exterior_clean: boolean;
  interior_clean: boolean;
  engine_area_clean: boolean;
  all_systems_checked: boolean;
  test_drive_done: boolean;
  no_warning_lights: boolean;
  work_completed: boolean;
  customer_satisfied: boolean;
}

export interface AIDiagnosisResult {
  response_language: 'roman_urdu' | 'english';
  plain_english_explanation: string;
  roman_urdu_explanation?: string;
  mechanical_root_cause: string;
  recommended_departments: string[];
  work_to_be_done: string;
  suggested_parts: Array<{
    sku?: string;
    description: string;
    qty: number;
    estimated_rate_pkr: number;
    classification?: string;
  }>;
}

export interface JobCard {
  id: string;
  job_card_number: string; // e.g. ASH-260301
  customer_name: string;
  customer_phone: string;
  customer_address?: string;
  plate_number: string;
  make_model: string;
  variant?: string;
  mileage_km: number;
  body_color?: string;
  service_advisor: string;

  // Bay & Workflow
  bay_category: BayCategory;
  bay_number: number; // 1 to 6
  status: VehicleStatus;

  // Inspection & Diagnostics
  fuel_level_percent: number;
  handed_over_inventory: HandedOverInventory;
  inspection_markers: InspectionMarker[];
  customer_concern?: string;
  ai_diagnosis_result?: AIDiagnosisResult | null;
  work_to_be_done?: string;
  departments: string[];

  // Financial Ledger
  itemized_parts: ItemizedPart[];
  labor_charges: number;
  alignment_charges: number;
  discount_amount: number;
  advance_deposit: number;
  parts_total: number;
  net_payable: number;
  balance_remaining: number;

  // Delivery & Signoffs
  quality_checks: QualityChecks;
  received_by?: string;
  delivered_by?: string;

  created_at: string;
  updated_at: string;
  closed_at?: string | null;
}

export interface AppSettings {
  id?: string;
  youtube_playlist_id: string;
  announcement_voice_rate: number;
  gemini_api_key_override?: string;
  workshop_name?: string;
  workshop_address?: string;
  workshop_phone?: string;
  updated_at?: string;
}

export interface PublicVehicleStatus {
  job_card_number: string;
  plate_number: string;
  make_model: string;
  variant?: string;
  bay_category: BayCategory;
  bay_number: number;
  status: VehicleStatus;
  departments: string[];
  updated_at: string;
  created_at?: string;
}

export const WORKSHOP_BAYS = [
  { id: 1, name: 'Bay 1: Diagnostics & Scan', short: 'Diagnostics' },
  { id: 2, name: 'Bay 2: Electrical & AC', short: 'Electrical & AC' },
  { id: 3, name: 'Bay 3: Suspension & Brakes', short: 'Suspension & Brakes' },
  { id: 4, name: 'Bay 4: Denting & Body Shop', short: 'Denting & Body' },
  { id: 5, name: 'Bay 5: Detailing Studio', short: 'Detailing' },
  { id: 6, name: 'Bay 6: Delivery / Inspection', short: 'Delivery / Inspection' },
] as const;

export const CAR_WASH_BAYS = [
  { id: 1, name: 'Wash Bay 1 (Foam & Underbody)', short: 'Wash Bay 1' },
  { id: 2, name: 'Wash Bay 2 (Shampoo & Rinse)', short: 'Wash Bay 2' },
  { id: 3, name: 'Wash Bay 3 (Steam & Engine Bay)', short: 'Wash Bay 3' },
  { id: 4, name: 'Wash Bay 4 (Interior Vacuum)', short: 'Wash Bay 4' },
  { id: 5, name: 'Wash Bay 5 (Polish & Tire Shine)', short: 'Wash Bay 5' },
  { id: 6, name: 'Wash Bay 6 (Ceramic Quick Coat)', short: 'Wash Bay 6' },
] as const;

export const ALL_DEPARTMENTS = [
  'Mechanical',
  'Electrical',
  'AC Service',
  'Suspension',
  'Brakes',
  'Alignment',
  'Balancing',
  'Denting',
  'Painting',
  'Car Wash',
  'Detailing',
  'Tyres Works',
  'Inspection',
  'General Service'
];
