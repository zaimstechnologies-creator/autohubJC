import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BELLA_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL';
const responseCache = new Map<string, ArrayBuffer>();

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ELEVENLABS_API_KEY is not configured.' },
      { status: 503 }
    );
  }

  const body = await req.json();
  const text = typeof body.text === 'string' ? body.text.trim() : '';

  if (!text || text.length > 300) {
    return NextResponse.json(
      { error: 'A valid announcement text is required.' },
      { status: 400 }
    );
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID || BELLA_VOICE_ID;
  const cacheKey = `${voiceId}:${text}`;
  const cached = responseCache.get(cacheKey);
  if (cached) {
    return new NextResponse(cached.slice(0), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        method: 'POST',
        headers: {
          Accept: 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.78,
            style: 0.15,
            use_speaker_boost: true,
          },
        }),
        signal: AbortSignal.timeout(20_000),
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error('ElevenLabs voice request failed:', response.status, detail);
      return NextResponse.json(
        { error: `ElevenLabs voice request failed (${response.status}).` },
        { status: 502 }
      );
    }

    const audio = await response.arrayBuffer();
    if (responseCache.size >= 100) {
      const oldestKey = responseCache.keys().next().value as string | undefined;
      if (oldestKey) responseCache.delete(oldestKey);
    }
    responseCache.set(cacheKey, audio);

    return new NextResponse(audio.slice(0), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error: any) {
    console.error('ElevenLabs voice request error:', error?.message || error);
    return NextResponse.json(
      { error: 'ElevenLabs voice request timed out or failed.' },
      { status: 502 }
    );
  }
}
