import fs from 'fs';
import path from 'path';
import os from 'os';
import { JobCard } from '@/types';

// Bundled seed file in project (read-only on Vercel/serverless: /var/task/data/jobcards.json)
const SEED_FILE = path.join(process.cwd(), 'data', 'jobcards.json');

// Writable temporary directory on Vercel/AWS Lambda / Linux / Windows
const TMP_FILE = path.join(os.tmpdir(), 'alshaheen_jobcards.json');

declare global {
  // eslint-disable-next-line no-var
  var __AL_SHAHEEN_JOBCARDS_CACHE: JobCard[] | undefined;
}

export function normalizeJobCard(item: any): JobCard {
  const id = item.id || `ASH-${Math.floor(100000 + Math.random() * 900000)}`;
  const job_card_number = item.job_card_number || item.id || id;
  const customer_name = item.customer_name || item.customer?.name || 'Walk-in Customer';
  const customer_phone = item.customer_phone || item.customer?.phone || '';
  const customer_address = item.customer_address || item.customer?.address || '';
  const plate_number = item.plate_number || item.vehicle?.plateNo || '';
  const make_model = item.make_model || item.vehicle?.makeModel || 'Vehicle';
  const variant = item.variant || item.vehicle?.variant || '';
  const mileage_km = Number(item.mileage_km || item.vehicle?.mileage || 0);
  const body_color = item.body_color || item.vehicle?.color || '';
  const service_advisor = item.service_advisor || item.advisor || 'Master Advisor';

  let bay_category = item.bay_category || 'WORKSHOP';
  let bay_number = Number(item.bay_number || 1);
  if (item.currentBay) {
    if (item.currentBay.toLowerCase().includes('wash')) {
      bay_category = 'CAR_WASH';
      const match = item.currentBay.match(/\d+/);
      bay_number = match ? parseInt(match[0], 10) : 1;
    } else {
      bay_category = 'WORKSHOP';
      const match = item.currentBay.match(/\d+/);
      bay_number = match ? parseInt(match[0], 10) : 1;
    }
  }

  let status = item.status || 'IN_PROGRESS';
  if (status === 'In Progress') status = 'IN_PROGRESS';
  if (status === 'Ready for Delivery' || status === 'Ready') status = 'READY_FOR_DELIVERY';
  if (status === 'Closed & Paid' || status === 'Paid' || status === 'Closed') status = 'CLOSED_PAID';

  const parts = Array.isArray(item.itemized_parts)
    ? item.itemized_parts
    : Array.isArray(item.parts)
    ? item.parts.map((p: any, idx: number) => ({
        id: p.id || `P-${idx + 1}`,
        sku: p.sku || '',
        description: p.description || p.desc || 'Part Item',
        qty: Number(p.qty || 1),
        rate: Number(p.rate || p.rate_pkr || 0),
        amount: Number(p.amount || p.amount_pkr || (Number(p.qty || 1) * Number(p.rate || 0))),
        classification: p.classification || 'OEM Parts',
      }))
    : [];

  const labor_charges = Number(item.labor_charges ?? item.labour_charges_pkr ?? item.labourCost ?? 0);
  const alignment_charges = Number(item.alignment_charges ?? item.other_charges_pkr ?? 0);
  const discount_amount = Number(item.discount_amount ?? item.discount_pkr ?? 0);
  const advance_deposit = Number(item.advance_deposit ?? item.advance_received_pkr ?? 0);
  const parts_total = parts.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0);
  const net_payable = parts_total + labor_charges + alignment_charges - discount_amount;
  const balance_remaining = Math.max(0, net_payable - advance_deposit);

  return {
    id,
    job_card_number,
    customer_name,
    customer_phone,
    customer_address,
    plate_number,
    make_model,
    variant,
    mileage_km,
    body_color,
    service_advisor,
    bay_category: bay_category as 'WORKSHOP' | 'CAR_WASH',
    bay_number,
    status: status as any,
    fuel_level_percent: Number(item.fuel_level_percent ?? 50),
    handed_over_inventory: {
      spare_wheel: Boolean(item.handed_over_inventory?.spare_wheel),
      tools: Boolean(item.handed_over_inventory?.tools),
      mats: Boolean(item.handed_over_inventory?.mats),
      valuables_cleared: Boolean(item.handed_over_inventory?.valuables_cleared),
    },
    inspection_markers: Array.isArray(item.inspection_markers) ? item.inspection_markers : [],
    departments: Array.isArray(item.departments) && item.departments.length > 0 ? item.departments : ['Mechanical'],
    customer_concern: item.customer_concern || item.customerConcern || '',
    ai_diagnosis_result: item.ai_diagnosis_result || null,
    work_to_be_done: item.work_to_be_done || item.scopeOfWork || '',
    itemized_parts: parts,
    labor_charges,
    alignment_charges,
    discount_amount,
    advance_deposit,
    parts_total,
    net_payable,
    balance_remaining,
    quality_checks: {
      exterior_clean: Boolean(item.quality_checks?.exterior_clean),
      interior_clean: Boolean(item.quality_checks?.interior_clean),
      engine_area_clean: Boolean(item.quality_checks?.engine_area_clean),
      all_systems_checked: Boolean(item.quality_checks?.all_systems_checked),
      test_drive_done: Boolean(item.quality_checks?.test_drive_done),
      no_warning_lights: Boolean(item.quality_checks?.no_warning_lights),
      work_completed: Boolean(item.quality_checks?.work_completed),
      customer_satisfied: Boolean(item.quality_checks?.customer_satisfied),
    },
    received_by: item.received_by || item.vehicle_received_by || 'Staff Advisor',
    delivered_by: item.delivered_by || item.vehicle_delivered_by || '',
    created_at: item.created_at || item.createdAt || new Date().toISOString(),
    updated_at: item.updated_at || item.updatedAt || new Date().toISOString(),
    closed_at: item.closed_at || item.closedAt || null,
  };
}

export function getLocalJobCards(): JobCard[] {
  // 1. Check in-memory process cache first
  if (globalThis.__AL_SHAHEEN_JOBCARDS_CACHE && globalThis.__AL_SHAHEEN_JOBCARDS_CACHE.length > 0) {
    return globalThis.__AL_SHAHEEN_JOBCARDS_CACHE;
  }

  // 2. Try reading from writable TMP_FILE
  try {
    if (fs.existsSync(TMP_FILE)) {
      const raw = fs.readFileSync(TMP_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const normalized = parsed.map(normalizeJobCard);
        globalThis.__AL_SHAHEEN_JOBCARDS_CACHE = normalized;
        return normalized;
      }
    }
  } catch (err) {
    console.warn('Could not read from tmp data file:', err);
  }

  // 3. Fallback to bundled SEED_FILE (read-only safe)
  try {
    if (fs.existsSync(SEED_FILE)) {
      const raw = fs.readFileSync(SEED_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const normalized = parsed.map(normalizeJobCard);
        globalThis.__AL_SHAHEEN_JOBCARDS_CACHE = normalized;

        // Populate TMP_FILE for subsequent writes
        try {
          fs.writeFileSync(TMP_FILE, JSON.stringify(normalized, null, 2), 'utf-8');
        } catch {
          // Ignore write error if tmp is also restricted
        }

        return normalized;
      }
    }
  } catch (err) {
    console.warn('Could not read seed data file:', err);
  }

  return [];
}

export function saveLocalJobCards(cards: JobCard[]): void {
  // 1. Always update in-memory cache
  globalThis.__AL_SHAHEEN_JOBCARDS_CACHE = cards;

  // 2. Write to writable TMP_FILE (always safe on Vercel / serverless)
  try {
    fs.writeFileSync(TMP_FILE, JSON.stringify(cards, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Warning: Could not write to tmp data file:', err);
  }

  // 3. In local development only (NOT on Vercel serverless), write to project data file
  if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
    try {
      if (!fs.existsSync(path.dirname(SEED_FILE))) {
        fs.mkdirSync(path.dirname(SEED_FILE), { recursive: true });
      }
      fs.writeFileSync(SEED_FILE, JSON.stringify(cards, null, 2), 'utf-8');
    } catch {
      // Silently catch EROFS or permission errors so they NEVER crash the app
    }
  }
}
