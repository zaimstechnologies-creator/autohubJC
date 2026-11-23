import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseServerConfigured, supabaseServer } from '@/lib/supabaseServerClient';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_STATUSES = new Set(['INTAKE', 'IN_PROGRESS', 'READY_FOR_DELIVERY', 'CLOSED_PAID']);
const VALID_BAY_CATEGORIES = new Set(['WORKSHOP', 'CAR_WASH']);

export async function PATCH(req: NextRequest) {
  if (!isSupabaseServerConfigured || !supabaseServer) {
    return NextResponse.json(
      { error: 'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { id, bay_category, bay_number, status, lastUpdatedAt } = body;

    if (typeof id !== 'string' || !id.trim()) {
      return NextResponse.json({ error: 'Missing job card ID.' }, { status: 400 });
    }
    if (bay_category !== undefined && !VALID_BAY_CATEGORIES.has(bay_category)) {
      return NextResponse.json({ error: 'Invalid bay category.' }, { status: 400 });
    }
    if (
      bay_number !== undefined &&
      (!Number.isInteger(bay_number) || bay_number < 1 || bay_number > 6)
    ) {
      return NextResponse.json({ error: 'Bay number must be between 1 and 6.' }, { status: 400 });
    }
    if (status !== undefined && !VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid job card status.' }, { status: 400 });
    }

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (bay_category !== undefined) update.bay_category = bay_category;
    if (bay_number !== undefined) update.bay_number = bay_number;
    if (status !== undefined) {
      update.status = status;
      if (status === 'CLOSED_PAID') update.closed_at = update.updated_at;
    }

    let query = supabaseServer
      .from('job_cards')
      .update(update)
      .eq(UUID_PATTERN.test(id) ? 'id' : 'job_card_number', id);

    if (typeof lastUpdatedAt === 'string' && lastUpdatedAt) {
      query = query.eq('updated_at', lastUpdatedAt);
    }

    const { data, error } = await query.select('*').maybeSingle();
    if (error) {
      console.error('Supabase job-card status update failed:', error.message);
      return NextResponse.json(
        { error: `Supabase job_cards update failed: ${error.message}` },
        { status: 503 }
      );
    }
    if (!data) {
      return NextResponse.json(
        {
          error: lastUpdatedAt
            ? 'Conflict: This job card changed. Reload the latest status and try again.'
            : 'Job card not found.',
        },
        { status: lastUpdatedAt ? 409 : 404 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request body.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
