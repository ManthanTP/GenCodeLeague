import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import type { LandingSettings } from '../types/database';
import { useEventState } from './useEventState';
import { useTeams } from './useTeams';
import { useTeamItems } from './useTeamItems';

export type EventPhase = 'loading' | 'reg-open' | 'reg-closed' | 'starting-soon' | 'live';

const CACHE_KEY_SETTINGS = 'gcl_cached_landing_settings';

export function isRegOpen(s?: LandingSettings | null, nowMs: number = Date.now()): boolean {
  return (
    !!s?.registration_open &&
    /^https:\/\//i.test(s?.registration_url ?? '') &&
    (!s?.registration_closes_at || nowMs < new Date(s.registration_closes_at).getTime())
  );
}

export function getYear(editionLabel?: string | null): string {
  const label = editionLabel || 'GCL 2026';
  const match = label.match(/\b(20\d\d)\b/);
  return match ? match[1] : label.replace(/^GCL\s*/i, '').trim() || '2026';
}

export function formatClosesAt(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const formatted = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d);
    return formatted.replace(/\b(am|pm)\b/i, (m) => m.toUpperCase());
  } catch {
    return '';
  }
}

export function formatClosesDateShort(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
    }).format(d);
  } catch {
    return '';
  }
}

export interface TimeLeftResult {
  text: string;
  ariaLabel: string;
  statValue: string;
  statLabel: string;
  hasExpired: boolean;
}

export function getTimeLeft(closesAtStr?: string | null, nowMs: number = Date.now()): TimeLeftResult {
  if (!closesAtStr) {
    return { text: '', ariaLabel: '', statValue: '', statLabel: '', hasExpired: false };
  }
  const closeMs = new Date(closesAtStr).getTime();
  if (isNaN(closeMs)) {
    return { text: '', ariaLabel: '', statValue: '', statLabel: '', hasExpired: false };
  }
  const diffMs = closeMs - nowMs;
  if (diffMs <= 0) {
    return { text: '0m', ariaLabel: 'Registration has closed', statValue: '0', statLabel: 'Minutes left', hasExpired: true };
  }

  const totalSec = Math.floor(diffMs / 1000);
  const totalMin = Math.floor(totalSec / 60);
  const totalHours = Math.floor(totalMin / 60);
  const days = Math.floor(totalHours / 24);
  const remHours = totalHours % 24;
  const remMin = totalMin % 60;

  if (days >= 1) {
    const text = `${days}d ${String(remHours).padStart(2, '0')}h`;
    const ariaLabel = `Registration closes in ${days} ${days === 1 ? 'day' : 'days'} ${remHours} ${remHours === 1 ? 'hour' : 'hours'}`;
    return {
      text,
      ariaLabel,
      statValue: String(days),
      statLabel: 'Days left',
      hasExpired: false,
    };
  } else if (totalHours >= 1) {
    const text = `${String(totalHours).padStart(2, '0')}h ${String(remMin).padStart(2, '0')}m`;
    const ariaLabel = `Registration closes in ${totalHours} ${totalHours === 1 ? 'hour' : 'hours'} ${remMin} ${remMin === 1 ? 'minute' : 'minutes'}`;
    return {
      text,
      ariaLabel,
      statValue: String(totalHours),
      statLabel: 'Hours left',
      hasExpired: false,
    };
  } else {
    const mins = Math.max(1, remMin);
    const text = `${mins}m`;
    const ariaLabel = `Registration closes in ${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
    return {
      text,
      ariaLabel,
      statValue: String(mins),
      statLabel: 'Minutes left',
      hasExpired: false,
    };
  }
}

export interface UseEventPhaseResult {
  phase: EventPhase;
  settings: LandingSettings | null;
  settingsLoaded: boolean;
  liveStateLoaded: boolean;
  firstQuestionRevealed: boolean;
  configurationOver: boolean;
  year: string;
  editionLabel: string;
  closesText: string;
  closesDateShort: string;
  closesDateUpper: string;
  closesTextUpper: string;
  timeLeft: string;
  timeLeftAria: string;
  timeLeftStat: { value: string; label: string };
  hasClosesTime: boolean;
  nowMs: number;
}

export function useEventPhase(initialSettings?: LandingSettings | null): UseEventPhaseResult {
  const [settings, setSettings] = useState<LandingSettings | null>(() => {
    if (initialSettings) return initialSettings;
    try {
      const cached = localStorage.getItem(CACHE_KEY_SETTINGS);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [settingsLoaded, setSettingsLoaded] = useState<boolean>(() => !!initialSettings);

  const { eventState, edition, loading: eventLoading } = useEventState();
  const { teams } = useTeams(edition?.id);
  const { items: teamItems } = useTeamItems(edition?.id);

  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  // Track if event has already been live in this session
  const [hasEverBeenLive, setHasEverBeenLive] = useState<boolean>(() => {
    try {
      return localStorage.getItem('gcl_has_been_live') === 'true';
    } catch {
      return false;
    }
  });

  // Sync initialSettings if provided later
  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
      setSettingsLoaded(true);
      try {
        localStorage.setItem(CACHE_KEY_SETTINGS, JSON.stringify(initialSettings));
      } catch {}
    }
  }, [initialSettings]);

  // Read settings and subscribe to postgres_changes + 30s interval
  useEffect(() => {
    let isCancelled = false;

    async function loadSettings() {
      try {
        const { data, error } = await supabase
          .from('landing_settings')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (!error && data && !isCancelled) {
          setSettings(data as LandingSettings);
          setSettingsLoaded(true);
          try {
            localStorage.setItem(CACHE_KEY_SETTINGS, JSON.stringify(data));
          } catch {}
        } else if (!isCancelled) {
          setSettingsLoaded(true);
        }
      } catch (err) {
        console.warn('Failed to load landing settings for event phase:', err);
        if (!isCancelled) setSettingsLoaded(true);
      }
    }

    if (!settings) {
      loadSettings();
    } else {
      setSettingsLoaded(true);
    }

    // Postgres changes subscription
    const subId = Math.random().toString(36).slice(2, 7);
    const channel = supabase
      .channel(`landing-settings-phase-${subId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'landing_settings',
        },
        (payload) => {
          if (payload.new && !isCancelled) {
            const next = payload.new as LandingSettings;
            setSettings(next);
            setSettingsLoaded(true);
            try {
              localStorage.setItem(CACHE_KEY_SETTINGS, JSON.stringify(next));
            } catch {}
          }
        }
      )
      .subscribe();

    // 30-second interval: re-evaluates nowMs (time countdown) and re-reads settings
    const interval = setInterval(() => {
      if (isCancelled) return;
      setNowMs(Date.now());
      loadSettings();
    }, 30000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const liveStateLoaded = !eventLoading && eventState !== null;

  // Signal: configurationOver
  // Checks if admin Event Configuration is finished.
  // Primary signal: eventState.game_state !== 'setup' (moves to 'waiting_start' on finish).
  // Fallback: teams > 0 && rounds > 0 && questionsPerRound > 0 && budgetPerTeam > 0
  const configurationOver = Boolean(
    (eventState && eventState.game_state !== 'setup') ||
    ((teams && teams.length > 0) &&
      (edition?.total_rounds ?? 0) > 0 &&
      (edition?.questions_per_round ?? 0) > 0 &&
      (edition?.starting_budget ?? 0) > 0)
  );

  // Signal: firstQuestionRevealed
  // True if a current question exists or any question has already been revealed or sold
  const hasActiveOrPostState = Boolean(
    eventState?.game_state === 'active' ||
    eventState?.game_state === 'intermission' ||
    eventState?.game_state === 'leaderboard_reveal' ||
    eventState?.game_state === 'winner_reveal'
  );
  const hasCurrentQuestion = Boolean(eventState?.current_item_name && eventState.current_item_name.trim().length > 0);
  const hasAdvancedQuestion = Boolean(
    (eventState?.current_round_index ?? 0) > 0 || (eventState?.current_question_index ?? 0) > 0
  );
  const hasSoldItems = Boolean(teamItems && teamItems.length > 0);

  const firstQuestionRevealed = Boolean(
    hasActiveOrPostState || hasCurrentQuestion || hasAdvancedQuestion || hasSoldItems
  );

  // Once live, stay live for the rest of the event
  useEffect(() => {
    if (firstQuestionRevealed) {
      setHasEverBeenLive(true);
      try {
        localStorage.setItem('gcl_has_been_live', 'true');
      } catch {}
    }
  }, [firstQuestionRevealed]);

  // If reset to setup by admin, clear hasEverBeenLive
  useEffect(() => {
    if (eventState?.game_state === 'setup') {
      setHasEverBeenLive(false);
      try {
        localStorage.removeItem('gcl_has_been_live');
      } catch {}
    }
  }, [eventState?.game_state]);

  // ONE SOURCE OF TRUTH: THE PHASE
  // type EventPhase = "loading" | "reg-open" | "reg-closed" | "starting-soon" | "live"
  const phase = useMemo<EventPhase>(() => {
    if (!settingsLoaded || !liveStateLoaded) return 'loading';
    if (firstQuestionRevealed || hasEverBeenLive) return 'live';
    if (isRegOpen(settings, nowMs)) return 'reg-open';
    if (configurationOver) return 'starting-soon';
    return 'reg-closed';
  }, [settingsLoaded, liveStateLoaded, firstQuestionRevealed, hasEverBeenLive, settings, nowMs, configurationOver]);

  // Shared helpers
  const editionLabel = settings?.edition_label || 'GCL 2026';
  const year = useMemo(() => getYear(editionLabel), [editionLabel]);

  const closesText = useMemo(() => formatClosesAt(settings?.registration_closes_at), [settings?.registration_closes_at]);
  const closesDateShort = useMemo(() => formatClosesDateShort(settings?.registration_closes_at), [settings?.registration_closes_at]);
  const closesDateUpper = useMemo(() => closesDateShort.toUpperCase(), [closesDateShort]);
  const closesTextUpper = useMemo(() => closesText.toUpperCase(), [closesText]);

  const timeLeftData = useMemo(() => getTimeLeft(settings?.registration_closes_at, nowMs), [settings?.registration_closes_at, nowMs]);

  const hasClosesTime = Boolean(
    settings?.registration_closes_at &&
    !timeLeftData.hasExpired &&
    closesDateShort
  );

  return {
    phase,
    settings,
    settingsLoaded,
    liveStateLoaded,
    firstQuestionRevealed: firstQuestionRevealed || hasEverBeenLive,
    configurationOver,
    year,
    editionLabel,
    closesText,
    closesDateShort,
    closesDateUpper,
    closesTextUpper,
    timeLeft: timeLeftData.text,
    timeLeftAria: timeLeftData.ariaLabel,
    timeLeftStat: {
      value: timeLeftData.statValue,
      label: timeLeftData.statLabel,
    },
    hasClosesTime,
    nowMs,
  };
}
