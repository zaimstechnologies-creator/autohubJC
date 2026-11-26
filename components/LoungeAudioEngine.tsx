'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { JobCard } from '@/types';

type AnnouncementJobCard = Pick<
  JobCard,
  'id' | 'bay_category' | 'bay_number' | 'make_model' | 'plate_number'
>;

interface LoungeAudioEngineProps {
  queue: AnnouncementJobCard[];
  onAnnouncementStart?: (cardId: string) => void;
  onAnnouncementComplete?: (cardId: string) => void;
  playerRef: React.MutableRefObject<any>;
}

const YOUTUBE_ANNOUNCEMENT_VOLUME = 18;

function formatPlateForSpeech(plateNumber?: string | null) {
  const characters = (plateNumber || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .split('');
  return characters.length > 0 ? characters.join('. ') : '';
}

async function fetchElevenLabsAnnouncement(
  context: AudioContext,
  plateNumber: string
): Promise<AudioBuffer> {
  const plateSpeech = formatPlateForSpeech(plateNumber);
  const text = plateSpeech
    ? `Attention please. Registration number ${plateSpeech}. Vehicle is now ready for delivery. Please proceed to the counter. Thank you.`
    : 'Attention please. The vehicle is now ready for delivery. Please proceed to the counter. Thank you.';

  const response = await fetch('/api/tv/voice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || `ElevenLabs request failed (${response.status}).`);
  }

  const data = await response.arrayBuffer();
  return context.decodeAudioData(data);
}

export default function LoungeAudioEngine({
  queue,
  onAnnouncementStart,
  onAnnouncementComplete,
  playerRef,
}: LoungeAudioEngineProps) {
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [currentAnnouncementText, setCurrentAnnouncementText] = useState<string | null>(null);
  const [announcementError, setAnnouncementError] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const context = new AudioContextCtor();
    audioContextRef.current = context;

    const unlockAudio = async () => {
      if (context.state === 'suspended') {
        await context.resume();
      }
    };

    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      context.close().catch(() => {});
      audioContextRef.current = null;
    };
  }, []);

  const processQueue = useCallback(async () => {
    if (queue.length === 0 || isProcessingRef.current) return;

    const context = audioContextRef.current;
    if (!context) {
      setAnnouncementError('Audio playback is not supported by this browser.');
      return;
    }

    isProcessingRef.current = true;
    const nextCard = queue[0];
    const plateNumber = nextCard.plate_number?.trim();

    try {
      setAnnouncementError(null);
      setIsAnnouncing(true);
      setCurrentAnnouncementText(`Announcing: ${plateNumber || nextCard.make_model || 'Vehicle'}`);
      onAnnouncementStart?.(nextCard.id);

      try {
        playerRef.current?.setVolume?.(YOUTUBE_ANNOUNCEMENT_VOLUME);
      } catch (error) {
        console.warn('Could not lower lounge music volume:', error);
      }

      if (context.state === 'suspended') await context.resume();
      const audioBuffer = await fetchElevenLabsAnnouncement(context, plateNumber || '');
      await new Promise<void>((resolve) => {
        const source = context.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(context.destination);
        source.onended = () => resolve();
        source.start(context.currentTime + 0.02);
      });

      onAnnouncementComplete?.(nextCard.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'ElevenLabs announcement failed.';
      console.error('TV announcement failed:', message);
      setAnnouncementError(message);
    } finally {
      try {
        playerRef.current?.setVolume?.(100);
      } catch (error) {
        console.warn('Could not restore lounge music volume:', error);
      }
      setIsAnnouncing(false);
      setCurrentAnnouncementText(null);
      isProcessingRef.current = false;
    }
  }, [onAnnouncementComplete, onAnnouncementStart, playerRef, queue]);

  useEffect(() => {
    if (queue.length > 0 && !isProcessingRef.current) {
      processQueue();
    }
  }, [queue, processQueue]);

  if (!isAnnouncing && !currentAnnouncementText && !announcementError) return null;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold shadow-lg ${
      announcementError
        ? 'bg-red-500/20 border-red-500/60 text-red-200'
        : 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 animate-pulse'
    }`}>
      {!announcementError && <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />}
      <span>{announcementError || currentAnnouncementText || 'Broadcasting delivery announcement...'}</span>
      {announcementError && (
        <button
          type="button"
          onClick={() => {
            setAnnouncementError(null);
            processQueue();
          }}
          className="rounded bg-red-500/20 px-2 py-1 underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}
