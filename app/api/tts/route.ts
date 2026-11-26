import { createHash } from 'crypto';
import { mkdir, readFile, readdir, rename, stat, unlink } from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { EdgeTTS } from 'node-edge-tts';
import {
  TTS_ANNOUNCEMENT_INTRO,
  TTS_CACHE_MAX_AGE_MS,
  TTS_READY_MESSAGE,
  TTS_VOICE,
} from '@/lib/ttsConfig';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const CACHE_DIRECTORY = path.join(process.cwd(), '.cache', 'tts');
const activeGenerations = new Map<string, Promise<void>>();

function getPlate(value: string | null) {
  const plate = (value || '').trim().toUpperCase();
  if (!plate || plate.length > 12 || !/^[A-Z0-9 -]+$/.test(plate)) return null;
  return plate;
}

function getSpeechText(plate: string) {
  const characters = plate.replace(/[^A-Z0-9]/g, '').split('');
  return (
    TTS_ANNOUNCEMENT_INTRO +
    '. ' +
    characters.join(', ') +
    '. ' +
    TTS_READY_MESSAGE
  );
}

async function removeExpiredCacheFiles() {
  const now = Date.now();
  const files = await readdir(CACHE_DIRECTORY, { withFileTypes: true });

  await Promise.all(
    files
      .filter((file) => file.isFile() && file.name.endsWith('.mp3'))
      .map(async (file) => {
        const filePath = path.join(CACHE_DIRECTORY, file.name);
        const fileStats = await stat(filePath);
        if (now - fileStats.mtimeMs > TTS_CACHE_MAX_AGE_MS) {
          await unlink(filePath);
          console.info('TTS cache cleanup removed:', file.name);
        }
      })
  );
}

async function generateAudio(cachePath: string, plate: string) {
  const temporaryPath = cachePath + '.tmp';
  const tts = new EdgeTTS({
    voice: TTS_VOICE,
    lang: 'en-US',
    outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
    timeout: 20_000,
  });
  try {
    await tts.ttsPromise(getSpeechText(plate), temporaryPath);
    const generatedFile = await stat(temporaryPath);
    if (generatedFile.size === 0) throw new Error('TTS generated an empty audio file.');
    await rename(temporaryPath, cachePath);
  } finally {
    await unlink(temporaryPath).catch(() => undefined);
  }
}

async function readCachedAudio(cachePath: string) {
  const audio = await readFile(cachePath);
  if (audio.byteLength > 0) return audio;

  await unlink(cachePath).catch(() => undefined);
  throw new Error('Cached TTS file was empty.');
}

export async function GET(request: NextRequest) {
  const plate = getPlate(request.nextUrl.searchParams.get('plate'));
  if (!plate) {
    return NextResponse.json(
      { error: 'Plate must be 1 to 12 letters, digits, spaces, or dashes.' },
      { status: 400 }
    );
  }

  const cacheName = createHash('sha256')
    .update(
      TTS_VOICE +
        ':' +
        TTS_ANNOUNCEMENT_INTRO +
        ':' +
        TTS_READY_MESSAGE +
        ':' +
        plate
    )
    .digest('hex') + '.mp3';
  const cachePath = path.join(CACHE_DIRECTORY, cacheName);

  try {
    await mkdir(CACHE_DIRECTORY, { recursive: true });
    await removeExpiredCacheFiles();

    let audio: Buffer;
    try {
      audio = await readCachedAudio(cachePath);
      console.info('TTS cache hit:', plate);
    } catch {
      let generation = activeGenerations.get(cacheName);
      if (!generation) {
        console.info('TTS cache miss:', plate);
        generation = generateAudio(cachePath, plate);
        activeGenerations.set(cacheName, generation);
      }

      try {
        await generation;
      } finally {
        activeGenerations.delete(cacheName);
      }
      audio = await readCachedAudio(cachePath);
    }

    return new NextResponse(new Uint8Array(audio), {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('TTS generation failed for plate:', plate, error);
    return NextResponse.json({ error: 'Could not generate the announcement audio.' }, { status: 502 });
  }
}
