import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseServerConfigured, supabaseServer } from '@/lib/supabaseServerClient';
import { PublicVehicleStatus } from '@/types';

export const dynamic = 'force-dynamic';

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

  if (!isSupabaseServerConfigured || !supabaseServer) {
    return trackResponse(
      { error: 'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' },
      503
    );
  }

  const { data: rpcData, error: rpcError } = await supabaseServer.rpc(
    'get_public_vehicle_status',
    { p_plate: cleanQuery }
  );

  if (!rpcError && rpcData?.length) {
    return trackResponse({ success: true, data: rpcData[0] });
  }

  const { data, error } = await supabaseServer
    .from('job_cards')
    .select(
      'job_card_number, plate_number, make_model, variant, bay_category, bay_number, status, departments, updated_at, created_at'
    )
    .neq('status', 'CLOSED_PAID')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase public tracking query failed:', error.message);
    return trackResponse(
      { error: `Supabase job_cards query failed: ${error.message}` },
      503
    );
  }

  const match = data.find(
    (card) => card.plate_number.toUpperCase().replace(/\s+/g, '') === cleanQuery
  );
  if (match) return trackResponse({ success: true, data: match as PublicVehicleStatus });

  return trackResponse(
    { error: `No active job card found for registration plate: ${plateQuery}` },
    404
  );
}
