import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseServerConfigured, supabaseServer } from '@/lib/supabaseServerClient';
import { PublicVehicleStatus } from '@/types';
import { getLocalJobCards } from '@/lib/dataStore';

function trackResponse(body: object, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const plateQuery = searchParams.get('plate');

  if (!plateQuery || plateQuery.trim().length === 0) {
    return trackResponse({ error: 'Please enter a vehicle registration number.' }, 400);
  }

  const cleanQuery = plateQuery.toUpperCase().replace(/\s+/g, '');

  // 1. If Supabase configured, call RPC function or strict select
  if (isSupabaseServerConfigured && supabaseServer) {
    try {
      const { data, error } = await supabaseServer.rpc('get_public_vehicle_status', {
        p_plate: cleanQuery,
      });

      if (!error && data && data.length > 0) {
        return trackResponse({ success: true, data: data[0] });
      }

      // Safe fallback select
      const { data: directData, error: directErr } = await supabaseServer
        .from('job_cards')
        .select('job_card_number, plate_number, make_model, variant, bay_category, bay_number, status, departments, updated_at, created_at')
        .neq('status', 'CLOSED_PAID')
        .order('created_at', { ascending: false });

      if (!directErr && directData) {
        const match = directData.find((c: any) =>
          c.plate_number.toUpperCase().replace(/\s+/g, '') === cleanQuery
        );
        if (match) {
          return trackResponse({ success: true, data: match as PublicVehicleStatus });
        }
      }
    } catch (err) {
      console.warn('Supabase public track error:', err);
    }
  }

  // 2. Safe Local Store fallback
  try {
    const cards = getLocalJobCards();

    // Search matching non-closed cards
    const activeCards = cards.filter((c) => {
      const s = (c.status || '').toUpperCase();
      return s !== 'CLOSED_PAID';
    });

    const matchedCard = activeCards.find((c) => {
      const plate = (c.plate_number || '').toUpperCase().replace(/\s+/g, '');
      return plate === cleanQuery;
    });

    if (matchedCard) {
      // STRICT PRIVACY HARD-WALL: filter out customer_name, customer_phone, customer_address, financial numbers
      const safeResponse: PublicVehicleStatus = {
        job_card_number: matchedCard.job_card_number || matchedCard.id,
        plate_number: matchedCard.plate_number || cleanQuery,
        make_model: matchedCard.make_model || 'Vehicle',
        variant: matchedCard.variant || '',
        bay_category: matchedCard.bay_category || 'WORKSHOP',
        bay_number: matchedCard.bay_number || 1,
        status: matchedCard.status,
        departments: Array.isArray(matchedCard.departments) ? matchedCard.departments : ['General Service'],
        updated_at: matchedCard.updated_at || new Date().toISOString(),
        created_at: matchedCard.created_at || new Date().toISOString(),
      };

      return trackResponse({ success: true, data: safeResponse });
    }
  } catch (err) {
    console.error('File-based track error:', err);
  }

  return trackResponse(
    { error: `No active job card found for registration plate: ${plateQuery}` },
    404
  );
}
