-- =========================================================================
-- AL SHAHEEN AUTO HUB - ENTERPRISE WORKSHOP & LOUNGE TV SYSTEM
-- Supabase PostgreSQL Schema & Realtime Setup
-- Location: Main Bedian Road, Near Askari 11, DHA Phase 6, Lahore, Pakistan
-- Phone: +92 344-1411123
-- =========================================================================

-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE vehicle_status_enum AS ENUM (
    'INTAKE',
    'IN_PROGRESS',
    'READY_FOR_DELIVERY',
    'CLOSED_PAID'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE bay_category_enum AS ENUM (
    'WORKSHOP',
    'CAR_WASH'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. App Configuration & Settings Table
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_playlist_id TEXT NOT NULL DEFAULT 'PLw-VjHDlEOgs658kAHR_LAaILBXb-s6Q5',
  announcement_voice_rate NUMERIC(3, 2) DEFAULT 0.95,
  gemini_api_key_override TEXT,
  workshop_name TEXT DEFAULT 'Al Shaheen Auto Hub',
  workshop_address TEXT DEFAULT 'Main Bedian Road, Near Askari 11, DHA Phase 6, Lahore-Pakistan',
  workshop_phone TEXT DEFAULT '+92 344-1411123',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default settings if empty
INSERT INTO app_settings (id, youtube_playlist_id, announcement_voice_rate)
VALUES ('00000000-0000-0000-0000-000000000001', 'PLw-VjHDlEOgs658kAHR_LAaILBXb-s6Q5', 0.95)
ON CONFLICT (id) DO NOTHING;

-- 3. Master Job Cards Table
CREATE TABLE IF NOT EXISTS job_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_card_number TEXT UNIQUE NOT NULL, -- e.g. ASH-260301 or ASH-789412
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  plate_number TEXT NOT NULL,
  make_model TEXT NOT NULL,
  variant TEXT,
  mileage_km INTEGER DEFAULT 0,
  body_color TEXT,
  service_advisor TEXT NOT NULL DEFAULT 'Service Advisor',
  
  -- Bay Allocations
  bay_category bay_category_enum NOT NULL DEFAULT 'WORKSHOP',
  bay_number INTEGER NOT NULL CHECK (bay_number BETWEEN 1 AND 6),
  status vehicle_status_enum NOT NULL DEFAULT 'IN_PROGRESS',
  
  -- Inspection & Diagnosis
  fuel_level_percent INTEGER DEFAULT 50 CHECK (fuel_level_percent BETWEEN 0 AND 100),
  handed_over_inventory JSONB DEFAULT '{"spare_wheel": true, "tools": true, "mats": true, "valuables_cleared": true}'::jsonb,
  inspection_markers JSONB DEFAULT '[]'::jsonb, -- Array of { id, x, y, type: 'DENT'|'SCRATCH'|'CHIP'|'RUST', note }
  customer_concern TEXT,
  ai_diagnosis_result JSONB,
  work_to_be_done TEXT,
  departments TEXT[] DEFAULT '{}',
  
  -- Financial Ledger
  itemized_parts JSONB DEFAULT '[]'::jsonb, -- Array of { id, sku, description, qty, rate, amount, classification }
  labor_charges NUMERIC(10, 2) DEFAULT 0.00,
  alignment_charges NUMERIC(10, 2) DEFAULT 0.00,
  discount_amount NUMERIC(10, 2) DEFAULT 0.00,
  advance_deposit NUMERIC(10, 2) DEFAULT 0.00,
  parts_total NUMERIC(10, 2) DEFAULT 0.00,
  net_payable NUMERIC(10, 2) DEFAULT 0.00,
  balance_remaining NUMERIC(10, 2) DEFAULT 0.00,
  
  -- Quality Check & Delivery Signoffs
  quality_checks JSONB DEFAULT '{"exterior_clean": false, "interior_clean": false, "engine_area_clean": false, "all_systems_checked": false, "test_drive_done": false, "no_warning_lights": false, "work_completed": false, "customer_satisfied": false}'::jsonb,
  received_by TEXT,
  delivered_by TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_cards_plate ON job_cards (plate_number);
CREATE INDEX IF NOT EXISTS idx_job_cards_status ON job_cards (status);
CREATE INDEX IF NOT EXISTS idx_job_cards_bay ON job_cards (bay_category, bay_number);
CREATE INDEX IF NOT EXISTS idx_job_cards_updated_at ON job_cards (updated_at DESC);

-- 4. Enable Supabase Realtime Publication
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE job_cards;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_object THEN null;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE app_settings;
EXCEPTION
  WHEN duplicate_object THEN null;
  WHEN undefined_object THEN null;
END $$;

-- 5. Row Level Security (RLS)
ALTER TABLE job_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public full access to job_cards" ON job_cards;
DROP POLICY IF EXISTS "Allow public full access to app_settings" ON app_settings;

REVOKE ALL PRIVILEGES ON TABLE job_cards, app_settings
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE job_cards, app_settings
  TO service_role;

-- 6. Server-side Anonymized Tracking RPC Function (Strict Privacy Wall)
-- Returns only progress information and is callable only by the server service role.
CREATE OR REPLACE FUNCTION get_public_vehicle_status(p_plate TEXT)
RETURNS TABLE (
  job_card_number TEXT,
  plate_number TEXT,
  make_model TEXT,
  variant TEXT,
  bay_category bay_category_enum,
  bay_number INTEGER,
  status vehicle_status_enum,
  departments TEXT[],
  updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT 
    job_card_number,
    plate_number,
    make_model,
    variant,
    bay_category,
    bay_number,
    status,
    departments,
    updated_at,
    created_at
  FROM job_cards
  WHERE UPPER(REGEXP_REPLACE(plate_number, '\s+', '', 'g')) = UPPER(REGEXP_REPLACE(p_plate, '\s+', '', 'g'))
    AND status != 'CLOSED_PAID'
  ORDER BY created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION get_public_vehicle_status(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_public_vehicle_status(TEXT)
  TO service_role;
