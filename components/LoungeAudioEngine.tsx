'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { JobCard } from '@/types';

type AnnouncementJobCard = Pick<
  JobCard,
  'id' | 'bay_category' | 'bay_number' | 'make_model' | 'plate_number'
>;

interface LoungeAudioEngineProps {
  queue: AnnouncementJobCard[];
  onAnnouncementComplete?: (cardId: string) => void;
  onAudioError?: (message: string | null) => void;
  playerRef: React.MutableRefObject<any>;
}

export function playWebAudioChime(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        resolve();
        return;
      }
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      // 3-tone harmonic elevator / airport chime: C5 (523.25), E5 (659.25), G5 (783.99)
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.18);

        gain.gain.setValueAtTime(0, now + idx * 0.18);
        gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.18 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.7);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.18);
        osc.stop(now + idx * 0.18 + 0.75);
      });

      setTimeout(() => {
        try {
          ctx.close();
        } catch (_) {}
        resolve();
      }, 900);
    } catch (err) {
      console.warn('Web Audio chime fallback error:', err);
      resolve();
    }
  });
}

export default function LoungeAudioEngine({
  queue,
  onAnnouncementComplete,
  onAudioError,
  playerRef,
}: LoungeAudioEngineProps) {
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [currentAnnouncementText, setCurrentAnnouncementText] = useState<string | null>(null);
  const isProcessingRef = useRef(false);
  const failedCardIdRef = useRef<string | null>(null);

  const processQueue = useCallback(async () => {
    if (queue.length === 0) {
      failedCardIdRef.current = null;
      return;
    }
    if (isProcessingRef.current || failedCardIdRef.current === queue[0].id) return;

    isProcessingRef.current = true;
    const nextCard = queue[0];
    const isWash = nextCard.bay_category === 'CAR_WASH';
    const bayTitle = isWash ? `Car Wash Bay ${nextCard.bay_number}` : `Workshop Bay ${nextCard.bay_number}`;
    const vehicleName = nextCard.make_model?.trim() || 'vehicle';
    const plateNumber = nextCard.plate_number?.trim();
    const registration = plateNumber
      ? `Registration number ${plateNumber.split('').join(' ')}`
      : 'The vehicle';
    const speechMessage = `Attention please. ${registration}, ${vehicleName}, is now ready for delivery. Please proceed to the accounts counter. Thank you.`;

    try {
      if (!('speechSynthesis' in window)) {
        failedCardIdRef.current = nextCard.id;
        onAudioError?.('This browser does not support spoken announcements.');
        return;
      }

      onAudioError?.(null);
      window.speechSynthesis.resume();
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) =>
          v.lang?.toLowerCase().startsWith('en') &&
          /natural|neural|google us|jenny|aria|samantha|david|zira/i.test(v.name)
        ) ||
        voices.find((v) => v.lang?.toLowerCase().startsWith('en-us')) ||
        voices.find((v) => v.lang?.toLowerCase().startsWith('en'));

      setIsAnnouncing(true);
      setCurrentAnnouncementText(`Announcing: ${nextCard.make_model || 'Vehicle'} - ${bayTitle}`);

      // Only duck after speech support is confirmed.
      try {
        if (playerRef.current?.setVolume) playerRef.current.setVolume(35);
      } catch (err) {
        console.warn('Could not duck YouTube volume:', err);
      }

      try {
        const audio = new Audio('/chime.mp3');
        await Promise.race([
          audio.play().catch((error) => {
            console.warn('Browser blocked announcement chime playback:', error);
            return playWebAudioChime();
          }),
          new Promise<void>((resolve) => window.setTimeout(resolve, 1500)),
        ]);
      } catch (_) {
        await playWebAudioChime();
      }

      const speechCompleted = await new Promise<boolean>((resolve) => {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(speechMessage);
        utterance.rate = 0.82;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        utterance.lang = 'en-US';
        if (preferred) utterance.voice = preferred;

        let started = false;
        let finished = false;
        const finish = (success: boolean) => {
          if (finished) return;
          finished = true;
          window.clearTimeout(startTimeout);
          window.clearTimeout(speechTimeout);
          resolve(success);
        };
        const startTimeout = window.setTimeout(() => {
          if (!started) {
            window.speechSynthesis.cancel();
            finish(false);
          }
        }, 5000);
        const speechTimeout = window.setTimeout(() => {
          window.speechSynthesis.cancel();
          finish(false);
        }, 20000);

        utterance.onstart = () => {
          started = true;
        };
        utterance.onend = () => {
          finish(true);
        };
        utterance.onerror = (event) => {
          console.error('Speech announcement failed:', event.error);
          finish(false);
        };

        window.speechSynthesis.speak(utterance);
      });

      if (!speechCompleted) {
        failedCardIdRef.current = nextCard.id;
        onAudioError?.('The browser could not start speech. Check browser autoplay and Android Text-to-Speech settings.');
        return;
      }

      failedCardIdRef.current = null;
      onAudioError?.(null);
      await new Promise((resolve) => window.setTimeout(resolve, 800));
      if (onAnnouncementComplete) onAnnouncementComplete(nextCard.id);
    } catch (error) {
      console.error('Vehicle announcement failed:', error);
      failedCardIdRef.current = nextCard.id;
      onAudioError?.('The browser could not play the announcement audio.');
    } finally {
      try {
        if (playerRef.current?.setVolume) playerRef.current.setVolume(100);
      } catch (err) {
        console.warn('Could not restore YouTube volume:', err);
      }
      setIsAnnouncing(false);
      setCurrentAnnouncementText(null);
      isProcessingRef.current = false;
    }
  }, [queue, onAnnouncementComplete, onAudioError, playerRef]);

  useEffect(() => {
    if (queue.length > 0 && !isProcessingRef.current) {
      processQueue();
    }
  }, [queue, processQueue]);

  if (!isAnnouncing && !currentAnnouncementText) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/60 text-emerald-300 text-xs font-semibold animate-pulse shadow-lg">
      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
      <span>{currentAnnouncementText || 'Broadcasting Delivery Announcement...'}</span>
    </div>
  );
}
