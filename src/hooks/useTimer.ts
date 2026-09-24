import { useState, useEffect } from 'react';
import { EventState } from '../types/database';

export function useTimer(eventState: EventState | null) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!eventState) return;

    if (eventState.timer_state === 'stopped') {
      setTimeLeft(eventState.timer_remaining_seconds);
      return;
    }

    if (eventState.timer_state === 'paused') {
      setTimeLeft(eventState.timer_remaining_seconds);
      return;
    }

    if (eventState.timer_state === 'expired') {
      setTimeLeft(0);
      return;
    }

    if (eventState.timer_state === 'running' && eventState.timer_started_at) {
      const interval = setInterval(() => {
        const start = new Date(eventState.timer_started_at!).getTime();
        const now = new Date().getTime();
        const elapsed = Math.floor((now - start) / 1000);
        const remaining = Math.max(0, eventState.timer_duration_seconds - elapsed);
        
        setTimeLeft(remaining);

        if (remaining === 0) {
          clearInterval(interval);
        }
      }, 200); // Check frequently to keep UI smooth

      return () => clearInterval(interval);
    }
  }, [eventState]);

  // Format to MM:SS
  const mins = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const secs = (timeLeft % 60).toString().padStart(2, '0');
  
  return {
    timeLeft,
    formatted: `${mins}:${secs}`,
    isExpired: timeLeft === 0 && eventState?.timer_state === 'running'
  };
}
