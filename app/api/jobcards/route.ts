import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { JobCard } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

const DATA_FILE = path.join(process.cwd(), 'data', 'jobcards.json');

function ensureDataFile(): JobCard[] {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
      return [];
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    
    // Normalize any legacy format into JobCard
    return parsed.map((item: any) => normalizeJobCard(item));
  } catch (err) {
    console.error('Error reading data file:', err);
    return [];
  }
}

function saveDataFile(cards: JobCard[]) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(cards, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing data file:', err);
  }
}

function normalizeJobCard(item: any): JobCard {
  // Support both new schema and legacy schema
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
        rate: Number(p.rate || 0),
        amount: Number(p.amount || (Number(p.qty || 1) * Number(p.rate || 0))),
        classification: p.classification || 'OEM Parts',
      }))
    : [];

  const labor_charges = Number(item.labor_charges ?? item.labour ?? 0);
  const alignment_charges = Number(item.alignment_charges ?? item.otherCharges ?? 0);
  const discount_amount = Number(item.discount_amount ?? item.discount ?? 0);
  const advance_deposit = Number(item.advance_deposit ?? item.advance ?? 0);
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
    bay_category,
    bay_number,
    status,
    fuel_level_percent: Number(item.fuel_level_percent ?? item.vehicle?.fuelLevel ?? 50),
    handed_over_inventory: item.handed_over_inventory || {
      spare_wheel: Boolean(item.inventory?.spareWheel ?? true),
      tools: Boolean(item.inventory?.toolKit ?? true),
      mats: Boolean(item.inventory?.floorMats ?? true),
      valuables_cleared: Boolean(item.inventory?.valuablesOut ?? true),
    },
    inspection_markers: Array.isArray(item.inspection_markers)
      ? item.inspection_markers
      : Array.isArray(item.markers)
      ? item.markers
      : [],
    customer_concern: item.customer_concern || item.concern || '',
    ai_diagnosis_result: item.ai_diagnosis_result || null,
    work_to_be_done: item.work_to_be_done || item.workToBeDone || '',
    departments: Array.isArray(item.departments) ? item.departments : ['Mechanical'],
    itemized_parts: parts,
    labor_charges,
    alignment_charges,
    discount_amount,
    advance_deposit,
    parts_total,
    net_payable,
    balance_remaining,
    quality_checks: item.quality_checks || {
      exterior_clean: false,
      interior_clean: false,
      engine_area_clean: false,
      all_systems_checked: false,
      test_drive_done: false,
      no_warning_lights: false,
      work_completed: false,
      customer_satisfied: false,
    },
    received_by: item.received_by || item.receivedBy || 'Staff Advisor',
    delivered_by: item.delivered_by || item.deliveredBy || '',
    created_at: item.created_at || item.createdAt || new Date().toISOString(),
    updated_at: item.updated_at || item.updatedAt || new Date().toISOString(),
    closed_at: item.closed_at || item.closedAt || null,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  // If Supabase is configured, try querying Supabase first
  if (isSupabaseConfigured && supabase) {
    try {
      if (id) {
        const { data, error } = await supabase
          .from('job_cards')
          .select('*')
          .or(`id.eq.${id},job_card_number.eq.${id}`)
          .single();
        if (!error && data) {
          return NextResponse.json({ success: true, data: normalizeJobCard(data) });
        }
      } else {
        const { data, error } = await supabase
          .from('job_cards')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          return NextResponse.json({ success: true, data: data.map(normalizeJobCard) });
        }
      }
    } catch (err) {
      console.warn('Supabase GET failed, falling back to local file:', err);
    }
  }

  // File-based fallback
  const allCards = ensureDataFile();
  if (id) {
    const card = allCards.find(c => c.id === id || c.job_card_number === id);
    if (!card) {
      return NextResponse.json({ error: 'Job card not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: card });
  }

  return NextResponse.json({ success: true, data: allCards });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newId = body.id || `ASH-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toISOString();

    const normalized = normalizeJobCard({
      ...body,
      id: newId,
      job_card_number: body.job_card_number || newId,
      created_at: body.created_at || now,
      updated_at: now,
    });

    // Save to Supabase if configured
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('job_cards').insert([normalized]);
      } catch (err) {
        console.warn('Supabase POST insert failed:', err);
      }
    }

    // Always update local storage
    const cards = ensureDataFile();
    const existingIdx = cards.findIndex(c => c.id === normalized.id || c.job_card_number === normalized.job_card_number);
    if (existingIdx >= 0) {
      cards[existingIdx] = normalized;
    } else {
      cards.unshift(normalized);
    }
    saveDataFile(cards);

    return NextResponse.json({ success: true, data: normalized });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save job card' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id && !body.job_card_number) {
      return NextResponse.json({ error: 'Missing card identifier' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const normalized = normalizeJobCard({
      ...body,
      updated_at: now,
      ...(body.status === 'CLOSED_PAID' && !body.closed_at ? { closed_at: now } : {}),
    });

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('job_cards')
          .update(normalized)
          .eq('id', normalized.id);
      } catch (err) {
        console.warn('Supabase PUT update failed:', err);
      }
    }

    const cards = ensureDataFile();
    const existingIdx = cards.findIndex(c => c.id === normalized.id || c.job_card_number === normalized.job_card_number);
    if (existingIdx >= 0) {
      cards[existingIdx] = normalized;
    } else {
      cards.unshift(normalized);
    }
    saveDataFile(cards);

    return NextResponse.json({ success: true, data: normalized });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update job card' }, { status: 500 });
  }
}
