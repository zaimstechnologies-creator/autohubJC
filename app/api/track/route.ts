import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { PublicVehicleStatus } from '@/types';

const DATA_FILE = path.join(process.cwd(), 'data', 'jobcards.json');

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const plateQuery = searchParams.get('plate');

  if (!plateQuery || plateQuery.trim().length === 0) {
    return NextResponse.json({ error: 'Please enter a vehicle registration number.' }, { status: 400 });
  }

  const cleanQuery = plateQuery.toUpperCase().replace(/\s+/g, '');

  // 1. If Supabase configured, call RPC function or strict select
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc('get_public_vehicle_status', {
        p_plate: cleanQuery,
      });

      if (!error && data && data.length > 0) {
        return NextResponse.json({ success: true, data: data[0] });
      }

      // Safe fallback select
      const { data: directData, error: directErr } = await supabase
        .from('job_cards')
        .select('job_card_number, plate_number, make_model, variant, bay_category, bay_number, status, departments, updated_at, created_at')
        .neq('status', 'CLOSED_PAID')
        .order('created_at', { ascending: false });

      if (!directErr && directData) {
        const match = directData.find((c: any) =>
          c.plate_number.toUpperCase().replace(/\s+/g, '').includes(cleanQuery)
        );
        if (match) {
          return NextResponse.json({ success: true, data: match as PublicVehicleStatus });
        }
      }
    } catch (err) {
      console.warn('Supabase public track error:', err);
    }
  }

  // 2. Local fallback from JSON file
  if (fs.existsSync(DATA_FILE)) {
    try {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const cards = JSON.parse(raw);

      // Search matching non-closed cards
      const activeCards = cards.filter((c: any) => {
        const s = (c.status || '').toUpperCase();
        return s !== 'CLOSED_PAID' && s !== 'PAID' && s !== 'CLOSED & PAID';
      });

      const matchedCard = activeCards.find((c: any) => {
        const plate = (c.plate_number || c.vehicle?.plateNo || '').toUpperCase().replace(/\s+/g, '');
        return plate.includes(cleanQuery) || cleanQuery.includes(plate);
      });

      if (matchedCard) {
        // STRICT PRIVACY HARD-WALL: filter out customer_name, customer_phone, customer_address, financial numbers
        let bay_category = matchedCard.bay_category || 'WORKSHOP';
        let bay_number = matchedCard.bay_number || 1;
        if (matchedCard.currentBay) {
          bay_category = matchedCard.currentBay.toLowerCase().includes('wash') ? 'CAR_WASH' : 'WORKSHOP';
          const match = matchedCard.currentBay.match(/\d+/);
          bay_number = match ? parseInt(match[0], 10) : 1;
        }

        let status = matchedCard.status || 'IN_PROGRESS';
        if (status === 'In Progress') status = 'IN_PROGRESS';
        if (status === 'Ready for Delivery' || status === 'Ready') status = 'READY_FOR_DELIVERY';

        const safeResponse: PublicVehicleStatus = {
          job_card_number: matchedCard.job_card_number || matchedCard.id,
          plate_number: matchedCard.plate_number || matchedCard.vehicle?.plateNo || cleanQuery,
          make_model: matchedCard.make_model || matchedCard.vehicle?.makeModel || 'Vehicle',
          variant: matchedCard.variant || matchedCard.vehicle?.variant || '',
          bay_category,
          bay_number,
          status,
          departments: Array.isArray(matchedCard.departments) ? matchedCard.departments : ['General Service'],
          updated_at: matchedCard.updated_at || matchedCard.updatedAt || new Date().toISOString(),
          created_at: matchedCard.created_at || matchedCard.createdAt || new Date().toISOString(),
        };

        return NextResponse.json({ success: true, data: safeResponse });
      }
    } catch (err) {
      console.error('File-based track error:', err);
    }
  }

  return NextResponse.json({ error: 'No active job card found for registration plate: ' + plateQuery }, { status: 404 });
}
