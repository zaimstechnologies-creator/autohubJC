import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  TTS_ANNOUNCEMENT_INTRO,
  TTS_CACHE_MAX_AGE_MS,
  TTS_READY_MESSAGE,
} from '@/lib/ttsConfig';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const GOOGLE_TRANSLATE_TTS_URL = 'https://translate.google.com/translate_tts';
const MAX_MEMORY_CACHE_ENTRIES = 100;
const responseCache = new Map<string, { audio: Buffer; createdAt: number }>();
const activeGenerations = new Map<string, Promise<Buffer>>();

function getPlate(value: string | null) {
  const plate = (value || '').trim().toUpperCase();
  if (!plate || plate.length > 12 || !/^[A-Z0-9 -]+$/.test(plate)) return null;
  return plate;
}

function getSpeechText(plate: string) {
  const characters = plate.replace(/[^A-Z0-9]/g, '').split('');
  return TTS_ANNOUNCEMENT_INTRO + '. ' + characters.join(', ') + '. ' + TTS_READY_MESSAGE;
}

function removeExpiredCacheEntries() {
  const expiryTime = Date.now() - TTS_CACHE_MAX_AGE_MS;
  for (const [cacheKey, entry] of responseCache) {
    if (entry.createdAt < expiryTime) responseCache.delete(cacheKey);
  }
}

async function generateAudio(plate: string) {
  const url = new URL(GOOGLE_TRANSLATE_TTS_URL);
  url.searchParams.set('ie', 'UTF-8');
  url.searchParams.set('client', 'tw-ob');
  url.searchParams.set('tl', 'en-US');
  url.searchParams.set('q', getSpeechText(plate));

  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    throw new Error('Google Translate TTS failed with status ' + response.status + '.');
  }

  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.byteLength === 0) throw new Error('Google Translate TTS returned empty audio.');
  return audio;
}

export async function GET(request: NextRequest) {
  const plate = getPlate(request.nextUrl.searchParams.get('plate'));
  if (!plate) {
    return NextResponse.json(
      { error: 'Plate must be 1 to 12 letters, digits, spaces, or dashes.' },
      { status: 400 }
    );
  }

  const cacheKey = createHash('sha256')
    .update(TTS_ANNOUNCEMENT_INTRO + ':' + TTS_READY_MESSAGE + ':' + plate)
    .digest('hex');

  try {
    removeExpiredCacheEntries();
    const cached = responseCache.get(cacheKey);
    if (cached) {
      console.info('TTS cache hit:', plate);
      return new NextResponse(new Uint8Array(cached.audio), {
        headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
      });
    }

    let generation = activeGenerations.get(cacheKey);
    if (!generation) {
      console.info('TTS cache miss:', plate);
      generation = generateAudio(plate);
      activeGenerations.set(cacheKey, generation);
    }

    let audio: Buffer;
    try {
      audio = await generation;
    } finally {
      activeGenerations.delete(cacheKey);
    }

    if (responseCache.size >= MAX_MEMORY_CACHE_ENTRIES) {
      const oldestKey = responseCache.keys().next().value as string | undefined;
      if (oldestKey) responseCache.delete(oldestKey);
    }
    responseCache.set(cacheKey, { audio, createdAt: Date.now() });

    return new NextResponse(new Uint8Array(audio), {
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    console.error('TTS generation failed for plate:', plate, error);
    return NextResponse.json({ error: 'Could not generate the announcement audio.' }, { status: 502 });
  }
}
