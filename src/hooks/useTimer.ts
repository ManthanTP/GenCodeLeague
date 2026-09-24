import { useState, useEffect } from 'react';
import type { EventState } from '../types/database';

export function useTimer(eventState: EventState | null) {
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    return eventState?.timer_remaining_seconds || 180;
  });

  useEffect(() => {
    if (!eventState) return;

    if (eventState.timer_state === 'stopped') {
      setTimeLeft(eventState.timer_remaining_seconds || 180);
      return;
    }

    if (eventState.timer_state === 'paused') {
      setTimeLeft(eventState.timer_remaining_seconds !== undefined ? eventState.timer_remaining_seconds : 180);
      return;
    }

    if (eventState.timer_state === 'expired') {
      setTimeLeft(0);
      return;
    }

    if (eventState.timer_state === 'running' && eventState.timer_started_at) {
      const calcRemaining = () => {
        const start = new Date(eventState.timer_started_at!).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - start) / 1000);
        const base = eventState.timer_remaining_seconds !== undefined ? eventState.timer_remaining_seconds : (eventState.timer_duration_seconds || 180);
        return Math.max(0, base - elapsed);
      };

      setTimeLeft(calcRemaining());

      const interval = setInterval(() => {
        const remaining = calcRemaining();
        setTimeLeft(remaining);

        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 250);

      return () => clearInterval(interval);
    }
  }, [
    eventState?.timer_state,
    eventState?.timer_started_at,
    eventState?.timer_remaining_seconds,
    eventState?.timer_duration_seconds,
  ]);

  // Format to MM:SS
  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const secs = (timeLeft % 60).toString().padStart(2, '0');

  const isRunning = eventState?.timer_state === 'running';
  const isPaused = eventState?.timer_state === 'paused';
  const isExpired = timeLeft === 0 && (isRunning || eventState?.timer_state === 'expired');

  // Question is strictly HIDDEN until the admin explicitly starts the timer.
  // It is ONLY revealed when timer_state is 'running', 'paused' (after start), or 'expired'.
  // Any 'stopped', null, or uninitialized state keeps the question hidden.
  const isRevealed = Boolean(
    eventState &&
    (eventState.timer_state === 'running' ||
     eventState.timer_state === 'paused' ||
     eventState.timer_state === 'expired')
  );

  return {
    timeLeft,
    formatted: `${mins}:${secs}`,
    isExpired,
    isRunning,
    isPaused,
    isRevealed,
  };
}
