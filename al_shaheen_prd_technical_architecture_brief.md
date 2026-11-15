# Product Requirements Document (PRD) & Technical Architecture Brief
**Project:** Al Shaheen Precision Automotive OS  
**Organization:** Al Shaheen Auto Hub (Main Bedian Road, Near Askari 11, DHA Phase 6, Lahore, Pakistan)  
**Document Version:** 1.0.0 (Production Release Specification)  
**Target Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL + Realtime), Google Gemini API (`@google/genai`), YouTube IFrame API, Web Speech / SpeechSynthesis API.

---

## 1. Executive Summary & Vision
Al Shaheen Auto Hub is a premier automotive engineering and diagnostics facility in Lahore, Pakistan. The platform bridges precision mechanical workshop management, proprietary multilingual AI intake (Urdu / Roman-Urdu / English), a broadcast 60" customer lounge TV display with smart audio ducking, and an encrypted privacy-compliant mobile vehicle tracking portal.

The platform's primary objectives:
1. **Zero Advisor Friction:** Empower non-technical workshop advisors to intake colloquial customer complaints via speech-to-text, translated by Gemini 2.5 Flash into standardized automotive root-cause repair tickets and billable OEM parts items.
2. **Real-time Workshop Orchestration:** Manage a 12-bay matrix (6 Mechanical/Diagnostics Bays + 6 Car Wash/Detailing Bays) with atomic concurrency locking to eliminate race conditions.
3. **Lounge Experience & Seamless Audio Handoff:** Continuous automotive media playback on a 60" 4K TV lounge screen with automatic FIFO voice announcements and volume ducking when cars become ready.
4. **Customer Transparency & Privacy:** Instant mobile tracking by registration plate without exposing private owner identity, telephone numbers, or internal profit ledgers.

---

## 2. User Personas & Permissions

| Persona | Primary Interface | Key Capabilities |
| :--- | :--- | :--- |
| **Service Advisor / Incharge** | `/workshop`, `/workshop/job-card/new` | Create Job Cards, audio intake, trigger Gemini AI diagnosis, plot vehicle 360° defects, assign bays, print A4 job cards, finalize settlement. |
| **Master Technician** | `/workshop` (12-Bay Matrix) | View assigned work orders, update bay progression stages, report torque/clearance checks. |
| **Cashier / Accounts Desk** | `/workshop` (Settlement Ledger) | Record advance deposits, process balance payments (Raast / POS / Cash), issue digital gate passes. |
| **Lounge Customers** | `/tv` (Wall-Mounted 60" Display) | View queue status, watch media stream, listen for audio delivery chimes and announcements. |
| **Public Customers / Car Owners** | `/track` (Mobile Web) | Input registration plate number, inspect real-time bay stage, view live telemetry metrics & lounge amenities. |

---

## 3. System Architecture & Routes

```
                          ┌───────────────────────────┐
                          │    Google Gemini API      │
                          │   (gemini-2.5-flash JSON) │
                          └─────────────▲─────────────┘
                                        │
┌─────────────────────────┐   POST /api/diagnose   ┌──────────────────────────┐
│  Service Advisor Intake │ ─────────────────────> │   Next.js App Router     │
│   (Voice Speech-to-Text)│                        │    (/workshop, /tv,      │
└─────────────────────────┘                        │     /track, /api)        │
                                                   └────────────┬─────────────┘
                                                                │
                                                   Supabase Realtime (WebSocket)
                                                   PostgreSQL DB + RPC
                                                                │
                                   ┌────────────────────────────┴───────────────────────────┐
                                   ▼                                                        ▼
                    ┌────────────────────────────┐                           ┌────────────────────────────┐
                    │   /tv (60" Lounge TV)      │                           │  /track (Customer Mobile)  │
                    │ - YouTube IFrame API       │                           │ - Anonymized RPC status    │
                    │ - FIFO Queue + Ducking     │                           │ - Sensor Telemetry         │
                    │ - SpeechSynthesis Chimes   │                           │ - WhatsApp Integration     │
                    └────────────────────────────┘                           └────────────────────────────┘
```

### Route 1: `/workshop` (Operations Portal & 12-Bay Matrix)
- **Executive Operations HUD:**
  - Real-time counters: Active in Workshop, Ready for Exit, Completed Today, Total Invoiced Revenue (PKR), Average Turnaround Time, AI First-Pass Accuracy.
- **12-Bay Matrix:**
  - **Workshop Wing A (6 Bays):** Bay 1 (Diagnostics & Scan), Bay 2 (Electrical & AC), Bay 3 (Suspension & Brakes), Bay 4 (Denting & Body Shop), Bay 5 (Detailing Studio), Bay 6 (Delivery & Inspection).
  - **Wash Wing B (6 Bays):** Wash Bays 1 through 6 (Foam Wash, Steam, Underbody, Ceramic Quick Coat).
  - One-click vehicle migration across bays.
- **Concurrency Locking (Pessimistic / Mutex):**
  - UI-level action locking (`lockedCardIds` Set) and SQL optimistic conditional updates (`WHERE id = $1 AND updated_at = $2`) preventing multiple advisors from overwriting records concurrently.
- **Active Job Cards Registry:**
  - Searchable list (Registration Plate, Customer Name, RO Number). Filterable by *All Active*, *In Progress*, *Ready for Delivery*, *Closed & Paid Today*, *Archive*.
  - Direct action: **"💳 Settle & Close"** (transitions state to `CLOSED_PAID`, archives card, updates revenue ledgers, and purges vehicle from `/tv` and `/track`).

### Route 2: `/workshop/job-card/[id]` (Interactive Job Card & AI Diagnostics)
- **Customer & Vehicle Profile:**
  - Name, Phone, Lahore Registration Plate (`LEA-20-7860`), Make/Model, Year, Odometer KM, Fuel Level (Slider 0–100%), Handed-over items checklist (Spare Wheel, Jack/Tools, Mats, Valuables).
- **Interactive 360° Vehicle Inspection Blueprint:**
  - Orthographic SVG vehicle blueprint (Engine Hood, Windshield, Panoramic Roof, Doors, Tailgate).
  - Interactive marker placement: **[D] Dent**, **[S] Scratch**, **[C] Chip**, **[R] Rust**.
  - Persistent marker coordinates `(x, y, panel_code, severity)` with Undo/Clear buttons and signed liability waiver.
- **Bilingual Voice Intake & Gemini 2.5 Flash Engine:**
  - Browser `webkitSpeechRecognition` configured for `ur-PK` and `en-US`.
  - Captures colloquial complaints (e.g., *"gari khady main lagti hai tu tik tik awaz aati hai"*).
  - Invokes `POST /api/diagnose` via `@google/genai` (structured JSON schema).
  - Auto-selects matching Repair Departments, writes step-by-step master technician instructions, and auto-populates required spare parts with estimated PKR pricing.
- **Itemized Billing & Print Engine:**
  - Parts SKU table (OEM vs Aftermarket), Labor Charges, 3D Wheel Alignment, Discounts, Advance Deposit, Net Balance Due.
  - `@media print` A4 official job card export with customer and advisor signatures.

### Route 3: `/tv` (60" Waiting Lounge Broadcast TV)
- **Display Specifications:** 100vw × 100vh full-screen responsive layout, ultra-dark contrast (`#0B1221`), anti-burn-in spacing.
- **Header:** Brand emblem, live Lahore time (PKT), "Unmute & Fullscreen" one-tap audio policy bypass button, Test Chime trigger.
- **Left 50% — YouTube Channel Player:**
  - YouTube IFrame API loop for Al Shaheen Auto Hub media playlist.
- **Right 50% — Live 12-Bay Queue:**
  - Pulsing emerald cards for cars **READY FOR IMMEDIATE DELIVERY** with Gate Pass badges.
  - Active timeline cards for **IN PROGRESS** workshop and wash bays with elapsed timers.
- **Smart Audio Ducking & FIFO Voice Engine:**
  - On vehicle transition to `READY_FOR_DELIVERY`:
    1. Append vehicle to client-side FIFO announcement queue.
    2. Duck YouTube video volume from 100% to 10% via `player.setVolume(10)`.
    3. Play audio chime (`/chime.mp3` or Web Audio API harmonic chime).
    4. Announce via `window.speechSynthesis`: *"Attention please. Vehicle number [Spaced Plate], [Make & Model], at [Bay Name], is now ready for delivery."*
    5. Wait 1.2s post-speech; if queue empty, restore YouTube volume to 100% (`player.setVolume(100)`).

### Route 4: `/track` (Public Customer Mobile Vehicle Tracker)
- **Lookup Form:** Case and space-insensitive plate search (e.g., `lea 20 7860` -> `LEA207860`).
- **Telemetry & Progression:**
  - 4-Stage visual timeline: *Intake & 360° Scan* -> *Bay 3: Suspension & Brakes* (Active) -> *Quality Control Audit* -> *Ready for Handover*.
  - Bay sensor readouts: Hydraulic Lift Pressure (`218.4 BAR`), Laser Camber (`-0.45° / -0.42°`), Torque Target (`112 NM`), Active DTCs (`0 Codes`).
  - CCTV Bay preview snapshot.
  - Executive Lounge details (Guest Wi-Fi, Espresso bar, WhatsApp advisor concierge).
- **Privacy Hard Wall:** Never transmits customer contact numbers, full names, or billable financial totals to unauthenticated callers.

---

## 4. Database Schema (Supabase PostgreSQL)

```sql
-- 1. App Configuration & Settings
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_playlist_id TEXT NOT NULL DEFAULT 'PL_AL_SHAHEEN_DEFAULT',
  announcement_voice_rate NUMERIC(3, 2) DEFAULT 0.95,
  gemini_api_key_override TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Master Job Cards
CREATE TYPE vehicle_status_enum AS ENUM (
  'INTAKE',
  'IN_PROGRESS',
  'READY_FOR_DELIVERY',
  'CLOSED_PAID'
);

CREATE TYPE bay_category_enum AS ENUM ('WORKSHOP', 'CAR_WASH');

CREATE TABLE job_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_card_number TEXT UNIQUE NOT NULL, -- Format: ASH-240819
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  plate_number TEXT NOT NULL,
  make_model TEXT NOT NULL,
  variant TEXT,
  mileage_km INTEGER DEFAULT 0,
  body_color TEXT,
  service_advisor TEXT NOT NULL,
  
  -- Bay Allocations
  bay_category bay_category_enum NOT NULL DEFAULT 'WORKSHOP',
  bay_number INTEGER NOT NULL CHECK (bay_number BETWEEN 1 AND 6),
  status vehicle_status_enum NOT NULL DEFAULT 'IN_PROGRESS',
  
  -- Inspection & Diagnosis
  fuel_level_percent INTEGER DEFAULT 50,
  handed_over_inventory JSONB DEFAULT '{"spare_wheel": true, "tools": true, "mats": true, "valuables_cleared": true}'::jsonB,
  inspection_markers JSONB DEFAULT '[]'::jsonB, -- [{ x: 45.2, y: 78.1, type: 'DENT', panel: 'DOOR_RR' }]
  customer_concern TEXT,
  ai_diagnosis_result JSONB,
  work_to_be_done TEXT,
  departments TEXT[] DEFAULT '{}',
  
  -- Financial Ledger
  itemized_parts JSONB DEFAULT '[]'::jsonB, -- [{ sku: '...', desc: '...', qty: 1, rate: 4500, total: 4500 }]
  labor_charges NUMERIC(10, 2) DEFAULT 0.00,
  alignment_charges NUMERIC(10, 2) DEFAULT 0.00,
  discount_amount NUMERIC(10, 2) DEFAULT 0.00,
  advance_deposit NUMERIC(10, 2) DEFAULT 0.00,
  net_payable NUMERIC(10, 2) GENERATED ALWAYS AS (
    labor_charges + alignment_charges - discount_amount
  ) STORED,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- Indexes for high-frequency lookup
CREATE INDEX idx_job_cards_plate ON job_cards (plate_number);
CREATE INDEX idx_job_cards_status ON job_cards (status);
CREATE INDEX idx_job_cards_bay ON job_cards (bay_category, bay_number);

-- Enable Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE job_cards;
ALTER PUBLICATION supabase_realtime ADD TABLE app_settings;

-- 3. Public Anonymized Tracking RPC Function
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
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
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
    updated_at
  FROM job_cards
  WHERE UPPER(REGEXP_REPLACE(plate_number, '\s+', '', 'g')) = UPPER(REGEXP_REPLACE(p_plate, '\s+', '', 'g'))
    AND status != 'CLOSED_PAID'
  ORDER BY created_at DESC
  LIMIT 1;
$$;
```

---

## 5. Google Gemini AI Diagnostics API Specification

**Endpoint:** `POST /api/diagnose`  
**Model:** `gemini-2.5-flash`  
**MIME Type:** `application/json`

### Prompt Engineering & System Context:
```text
You are the Chief Diagnostic Mechanical Specialist at Al Shaheen Auto Hub, Lahore.
Translate colloquial customer complaints (Urdu, Roman Urdu, or English) into mechanical root-cause analyses, technician scopes of repair, workshop department assignments, and spare parts estimates in Pakistani Rupees (PKR).
```

### JSON Schema Output:
```json
{
  "type": "object",
  "properties": {
    "plain_english_explanation": {
      "type": "string",
      "description": "Clear, non-technical explanation for the advisor to articulate to the customer."
    },
    "mechanical_root_cause": {
      "type": "string",
      "description": "Technical engineering diagnosis."
    },
    "recommended_departments": {
      "type": "array",
      "items": { "type": "string" }
    },
    "work_to_be_done": {
      "type": "string",
      "description": "Numbered step-by-step master technician instructions."
    },
    "suggested_parts": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "sku": { "type": "string" },
          "description": { "type": "string" },
          "qty": { "type": "number" },
          "estimated_rate_pkr": { "type": "number" },
          "classification": { "type": "string", "enum": ["OEM Parts", "Consumables", "Aftermarket"] }
        },
        "required": ["description", "qty", "estimated_rate_pkr"]
      }
    }
  },
  "required": [
    "plain_english_explanation",
    "mechanical_root_cause",
    "recommended_departments",
    "work_to_be_done",
    "suggested_parts"
  ]
}
```

---

## 6. Non-Functional Requirements & Security
1. **Concurrency Lock Safety:** Optimistic verification guarantees that two advisors updating Bay allocations simultaneously never overwrite each other.
2. **Audio Autoplay Compliance:** The TV route embeds an explicit user-gesture interaction button ("Unmute & Fullscreen") that instantiates the Web Audio context, ensuring browsers don't block audio announcement playback.
3. **Data Protection (Zero Leaks):** Customer phone numbers and internal accounts margins are strictly withheld from `/track` via the PostgreSQL `SECURITY DEFINER` RPC wrapper.
4. **Network Resiliency & Offline Fallback:** Web Audio API synthesizes a 3-tone harmonic chime if `/public/chime.mp3` fails to load.

---

## 7. Deliverables & Repository Structure
```
al-shaheen-auto-hub/
├── app/
│   ├── api/
│   │   └── diagnose/route.ts       # Gemini 2.5 Flash Structured JSON handler
│   ├── workshop/
│   │   ├── page.tsx                # Master 12-Bay Matrix & Registry
│   │   └── job-card/
│   │       └── [id]/page.tsx       # Intake & Interactive 360° Blueprint
│   ├── tv/
│   │   └── page.tsx                # 60" Lounge Broadcast + FIFO Voice Ducking
│   ├── track/
│   │   └── page.tsx                # Mobile Customer Status Lookup
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── CarBlueprint.tsx            # SVG Top-Down Defect Plotter
│   ├── JobCardForm.tsx             # Voice Recognition + Ledger Form
│   ├── PrintJobCardA4.tsx          # @media print Certified A4 Template
│   ├── LoungeAudioEngine.tsx       # FIFO Queue & YouTube Volume Ducking
│   └── BayMatrixCard.tsx           # Bay Card with Mutex State
├── lib/
│   ├── supabaseClient.ts           # Supabase Realtime Client
│   └── gemini.ts                   # @google/genai Initializer
├── supabase/
│   └── schema.sql                  # Complete Migration Script
├── .env.example
├── package.json
└── README.md
```
