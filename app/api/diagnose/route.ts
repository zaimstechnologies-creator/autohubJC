import { NextRequest, NextResponse } from 'next/server';
import { runAIDiagnosis } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { make_model, variant, mileage_km, customer_concern, apiKeyOverride } = body;

    if (!customer_concern || typeof customer_concern !== 'string' || customer_concern.trim().length === 0) {
      return NextResponse.json(
        { error: 'Customer concern is required for AI diagnosis.' },
        { status: 400 }
      );
    }

    const diagnosis = await runAIDiagnosis({
      make_model: make_model || 'Vehicle',
      variant: variant || '',
      mileage_km: Number(mileage_km) || 0,
      customer_concern: customer_concern.trim(),
      apiKeyOverride,
    });

    return NextResponse.json({
      success: true,
      diagnosis,
    });
  } catch (error: any) {
    console.error('API /api/diagnose error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal AI Diagnostic service error' },
      { status: 500 }
    );
  }
}
