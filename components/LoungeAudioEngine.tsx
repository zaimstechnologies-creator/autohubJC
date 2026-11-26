'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { JobCard } from '@/types';

type AnnouncementJobCard = Pick<JobCard, 'id' | 'make_model' | 'plate_number'>;

interface LoungeAudioEngineProps {
  queue: AnnouncementJobCard[];
  onAnnouncementStart?: (cardId: string) => void;
  onAnnouncementComplete?: (cardId: string) => void;
  playerRef: React.MutableRefObject<any>;
}

const YOUTUBE_ANNOUNCEMENT_VOLUME = 18;
const ANNOUNCEMENT_BELL_SOURCE = '/chime.mp3';

async function fetchAnnouncementAudio(source: string) {
  const response = await fetch(source, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Could not load the announcement audio.');
  }
  return URL.createObjectURL(await response.blob());
}

function isAutoplayBlocked(error: unknown) {
  return error instanceof DOMException && error.name === 'NotAllowedError';
}

export default function LoungeAudioEngine({
  queue,
  onAnnouncementStart,
  onAnnouncementComplete,
  playerRef,
}: LoungeAudioEngineProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isProcessingRef = useRef(false);
  const retryPlaybackRef = useRef<null | (() => void)>(null);
  const [audioBlocked, setAudioBlocked] = useState(false);

  const playAudio = useCallback(async (source: string) => {
    const audio = audioRef.current;
    if (!audio) throw new Error('Audio playback is not supported by this browser.');

    audio.src = source;
    audio.load();

    try {
      await audio.play();
    } catch (error) {
      if (!isAutoplayBlocked(error)) throw error;

      setAudioBlocked(true);
      await new Promise<void>((resolve, reject) => {
        retryPlaybackRef.current = () => {
          retryPlaybackRef.current = null;
          audio.play().then(resolve).catch(reject);
        };
      });
      setAudioBlocked(false);
    }

    await new Promise<void>((resolve, reject) => {
      const onEnded = () => {
        removeListeners();
        resolve();
      };
      const onError = () => {
        removeListeners();
        reject(new Error('The TV could not play the announcement audio.'));
      };
      const removeListeners = () => {
        audio.removeEventListener('ended', onEnded);
        audio.removeEventListener('error', onError);
      };

      audio.addEventListener('ended', onEnded);
      audio.addEventListener('error', onError);
    });
  }, []);

  const processQueue = useCallback(async () => {
    if (queue.length === 0 || isProcessingRef.current) return;

    const nextCard = queue[0];
    const plateNumber = (nextCard.plate_number || '').trim();
    if (!plateNumber) {
      console.error('TV announcement skipped: vehicle has no plate number.', nextCard.id);
      if (onAnnouncementComplete) onAnnouncementComplete(nextCard.id);
      return;
    }

    isProcessingRef.current = true;
    if (onAnnouncementStart) onAnnouncementStart(nextCard.id);

    try {
      const player = playerRef.current;
      if (player && typeof player.setVolume === 'function') {
        player.setVolume(YOUTUBE_ANNOUNCEMENT_VOLUME);
      }

      const source = '/api/tts?plate=' + encodeURIComponent(plateNumber);
      const announcementAudio = fetchAnnouncementAudio(source);
      await playAudio(ANNOUNCEMENT_BELL_SOURCE);

      const announcementSource = await announcementAudio;
      try {
        await playAudio(announcementSource);
      } finally {
        URL.revokeObjectURL(announcementSource);
      }

      if (onAnnouncementComplete) onAnnouncementComplete(nextCard.id);
    } catch (error) {
      console.error('TV announcement failed:', error);
    } finally {
      const player = playerRef.current;
      if (player && typeof player.setVolume === 'function') {
        player.setVolume(100);
      }
      isProcessingRef.current = false;
    }
  }, [onAnnouncementComplete, onAnnouncementStart, playAudio, playerRef, queue]);

  useEffect(() => {
    if (queue.length > 0 && !isProcessingRef.current) {
      void processQueue();
    }
  }, [processQueue, queue]);

  useEffect(() => {
    const unlockAudio = () => {
      const retryPlayback = retryPlaybackRef.current;
      if (retryPlayback) retryPlayback();
    };

    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);

    return () => {
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  return (
    <>
      <audio ref={audioRef} preload="auto" />
      {audioBlocked && (
        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold text-amber-200">
          Press any remote key to enable audio
        </span>
      )}
    </>
  );
}
