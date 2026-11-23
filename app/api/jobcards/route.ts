import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseServerConfigured, supabaseServer } from '@/lib/supabaseServerClient';
import { normalizeJobCard } from '@/lib/dataStore';

export const dynamic = 'force-dynamic';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function databaseUnavailable() {
  return NextResponse.json(
    { error: 'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' },
    { status: 503 }
  );
}

function databaseFailure(error: { message: string }) {
  console.error('Job-card database request failed:', error.message);
  return NextResponse.json(
    { error: `Supabase job_cards request failed: ${error.message}` },
    { status: 503 }
  );
}

function idFilter(identifier: string) {
  return UUID_PATTERN.test(identifier)
    ? { column: 'id', value: identifier }
    : { column: 'job_card_number', value: identifier };
}

export async function GET(req: NextRequest) {
  if (!isSupabaseServerConfigured || !supabaseServer) return databaseUnavailable();

  const identifier = new URL(req.url).searchParams.get('id');
  if (identifier) {
    const filter = idFilter(identifier);
    const { data, error } = await supabaseServer
      .from('job_cards')
      .select('*')
      .eq(filter.column, filter.value)
      .maybeSingle();

    if (error) return databaseFailure(error);
    if (!data) return NextResponse.json({ error: 'Job card not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: normalizeJobCard(data) });
  }

  const { data, error } = await supabaseServer
    .from('job_cards')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return databaseFailure(error);
  return NextResponse.json({ success: true, data: data.map(normalizeJobCard) });
}

export async function POST(req: NextRequest) {
  if (!isSupabaseServerConfigured || !supabaseServer) return databaseUnavailable();

  try {
    const body = await req.json();
    if (!body.job_card_number || !body.customer_name || !body.plate_number) {
      return NextResponse.json(
        { error: 'Job card number, customer name, and plate number are required.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const normalized = normalizeJobCard({
      ...body,
      job_card_number: body.job_card_number,
      created_at: body.created_at || now,
      updated_at: now,
    });
    const { id: _clientId, ...insertPayload } = normalized;
    if (typeof body.id === 'string' && UUID_PATTERN.test(body.id)) {
      Object.assign(insertPayload, { id: body.id });
    }

    const { data, error } = await supabaseServer
      .from('job_cards')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) return databaseFailure(error);
    return NextResponse.json(
      { success: true, data: normalizeJobCard(data) },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request body.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  if (!isSupabaseServerConfigured || !supabaseServer) return databaseUnavailable();

  try {
    const body = await req.json();
    const identifier = String(body.id || body.job_card_number || '');
    if (!identifier) {
      return NextResponse.json({ error: 'Missing job card identifier.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const normalized = normalizeJobCard({
      ...body,
      updated_at: now,
      ...(body.status === 'CLOSED_PAID' && !body.closed_at ? { closed_at: now } : {}),
    });
    const { id: _clientId, ...updatePayload } = normalized;
    const filter = idFilter(identifier);

    const { data, error } = await supabaseServer
      .from('job_cards')
      .update(updatePayload)
      .eq(filter.column, filter.value)
      .select('*')
      .maybeSingle();

    if (error) return databaseFailure(error);
    if (!data) return NextResponse.json({ error: 'Job card not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: normalizeJobCard(data) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request body.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
