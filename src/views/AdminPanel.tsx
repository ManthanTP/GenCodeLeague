import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Trophy,
  History as HistoryIcon,
  AlertCircle,
  Users,
  Play,
  RefreshCw,
  Plus,
  Minus,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  Undo2,
  CheckCircle2,
  XCircle,
  Check,
  Crown,
  Flag,
  FileText,
  Loader2,
  Hammer,
  Clock,
  Pause,
  RotateCcw,
  Medal,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useEventState, broadcastStateChange } from '../hooks/useEventState';
import { useTeams, broadcastTeamsChange } from '../hooks/useTeams';
import { useTeamItems, broadcastItemsChange } from '../hooks/useTeamItems';
import { useTimer } from '../hooks/useTimer';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';
import ConnectionHealth from '../components/ConnectionHealth';
import TeamRemoveModal from '../components/TeamRemoveModal';
import { formatCurrency } from '../utils/formatters';
import { DEFAULT_ROUNDS_DATA, BASE_PRICE, MIN_INCREMENT } from '../data/roundsData';
import type { Team, PastRoundSnapshot, TransactionEntry, TeamItem, EventState, GameState } from '../types/database';

export default function AdminPanel() {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const { eventState, setEventState, edition, setEdition, loading: stateLoading } = useEventState();
  const { teams, setTeams } = useTeams(edition?.id);
  const { items, setItems } = useTeamItems(edition?.id);
  const {
    formatted: timerFormatted,
    isRunning: isTimerRunning,
    isPaused: isTimerPaused,
    isRevealed,
    isExpired,
  } = useTimer(eventState);

  // Authentication check (allows session profile OR local session flag)
  const isMasterAuthed = sessionStorage.getItem('gcl_admin_authenticated') === 'true';
  const isAdmin = isMasterAuthed || profile?.role === 'admin';

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/123456789/GCL-0321/admin/login');
    }
  }, [authLoading, isAdmin, navigate]);

  // UI States
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [teamToRemove, setTeamToRemove] = useState<Team | null>(null);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  // 4 Confirmation Dialog States (Point 7)
  const [isConfirmingSold, setIsConfirmingSold] = useState(false);
  const [isConfirmingUndo, setIsConfirmingUndo] = useState(false);
  const [editingTeamNames, setEditingTeamNames] = useState<Record<string, string>>({});
  const [teamPendingEdit, setTeamPendingEdit] = useState<{ id: string; oldName: string; newName: string } | null>(null);

  // Setup form states
  const [budgetInput, setBudgetInput] = useState<string>('50000000');
  const [newTeamName, setNewTeamName] = useState<string>('');

  // Active round auction states
  const [bidAmount, setBidAmount] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean>(false);
  const [currentItem, setCurrentItem] = useState<string>('');

  // Persistent Transaction History across page reloads
  const [localHistory, setLocalHistory] = useState<TransactionEntry[]>(() => {
    try {
      const saved = localStorage.getItem('gcl_transaction_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Podium Management State (matches Old GCL Admin UI)
  const [podiumState, setPodiumState] = useState({
    thirdTeamId: null as string | null,
    thirdRevealed: false,
    secondTeamId: null as string | null,
    secondRevealed: false,
    firstTeamId: null as string | null,
    firstRevealed: false,
  });

  // Debouncing refs for question typing to prevent websocket echo glitches
  const isTypingQuestionRef = useRef(false);
  const questionDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update budgetInput when edition loads
  useEffect(() => {
    if (edition?.starting_budget) {
      setBudgetInput(edition.starting_budget.toString());
    }
  }, [edition?.starting_budget]);

  // Keep currentItem in sync with eventState.current_item_name ONLY when admin is not typing
  useEffect(() => {
    if (!isTypingQuestionRef.current && eventState?.current_item_name !== undefined) {
      setCurrentItem(eventState.current_item_name || '');
    }
  }, [eventState?.current_item_name]);

  // Sync podium state from eventState.banner_message when available
  useEffect(() => {
    if (!eventState?.banner_message) return;
    try {
      const parsed = JSON.parse(eventState.banner_message);
      if (parsed && typeof parsed === 'object') {
        if (parsed.podium) {
          setPodiumState((prev) => ({ ...prev, ...parsed.podium }));
        } else if (parsed.firstRevealed !== undefined || parsed.thirdRevealed !== undefined) {
          setPodiumState((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch {}
  }, [eventState?.banner_message]);

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const addHistory = useCallback((action: string, details: string) => {
    const timestamp = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const entry: TransactionEntry = {
      id: Date.now(),
      time: timestamp,
      action,
      details,
    };
    setLocalHistory((prev) => {
      const updated = [entry, ...prev];
      try {
        localStorage.setItem('gcl_transaction_history', JSON.stringify(updated.slice(0, 100)));
      } catch {}
      return updated;
    });
  }, []);

  // Compute team stats (spent, won count)
  const teamsWithStats = useMemo(() => {
    return teams.map((team) => {
      const teamItems = items.filter((item) => item.team_id === team.id);
      const spent = teamItems.reduce((acc, it) => acc + (it.cost || 0), 0);
      return {
        ...team,
        itemsCount: teamItems.length,
        totalSpent: spent,
      };
    });
  }, [teams, items]);

  const totalSpent = useMemo(
    () => teamsWithStats.reduce((acc, t) => acc + t.totalSpent, 0),
    [teamsWithStats]
  );
  const totalAvailable = useMemo(
    () => teamsWithStats.reduce((acc, t) => acc + t.budget, 0),
    [teamsWithStats]
  );

  const pastRounds = useMemo<PastRoundSnapshot[]>(() => {
    if (!eventState?.banner_message) return [];
    try {
      const parsed = JSON.parse(eventState.banner_message);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.pastRounds)) return parsed.pastRounds;
      return [];
    } catch {
      return [];
    }
  }, [eventState?.banner_message]);

  const currentRoundIndex = eventState?.current_round_index ?? 0;

  // Stats for the current active round
  const currentRoundStats = useMemo(() => {
    return teams.map((team) => {
      const roundItems = items.filter(
        (it) => it.team_id === team.id && it.round_index === currentRoundIndex
      );
      const roundScore = roundItems.filter((it) => it.is_correct).length;
      const roundSpent = roundItems.reduce((acc, it) => acc + (it.cost || 0), 0);
      return {
        ...team,
        roundScore,
        roundItemsCount: roundItems.length,
        roundSpent,
        remainingBudget: team.budget,
      };
    }).sort((a, b) => {
      if (b.roundScore !== a.roundScore) return b.roundScore - a.roundScore;
      if (b.roundItemsCount !== a.roundItemsCount) return b.roundItemsCount - a.roundItemsCount;
      return b.remainingBudget - a.remainingBudget;
    });
  }, [teams, items, currentRoundIndex]);

  // Overall Stats across ALL rounds combined (Point 5: matching winner 2025 2.png)
  const overallStats = useMemo(() => {
    const standardBudget = edition?.starting_budget || parseInt(budgetInput) || 50000000;
    const roundsCount = Math.max(1, currentRoundIndex + 1);

    return teams.map((team) => {
      const allTeamItems = items.filter((it) => it.team_id === team.id);
      const totalScore = team.score || 0;
      const totalItems = allTeamItems.length;
      const totalSpent = allTeamItems.reduce((acc, it) => acc + (it.cost || 0), 0);
      const totalAllocated = roundsCount * standardBudget;
      const totalRemaining = Math.max(0, totalAllocated - totalSpent);

      return {
        ...team,
        totalScore,
        totalItems,
        totalSpent,
        totalRemaining,
      };
    }).sort((a, b) => {
      // 1. Highest total score
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      // 2. Highest total items
      if (b.totalItems !== a.totalItems) return b.totalItems - a.totalItems;
      // 3. Highest total remaining budget
      return b.totalRemaining - a.totalRemaining;
    });
  }, [teams, items, edition?.starting_budget, budgetInput, currentRoundIndex]);

  const selectedWinningTeam = useMemo(
    () => teams.find((t) => t.id === selectedTeamId),
    [teams, selectedTeamId]
  );
  const lastItem = items[0] || null;
  const lastItemTeam = useMemo(
    () => (lastItem ? teams.find((t) => t.id === lastItem.team_id) : null),
    [teams, lastItem]
  );

  const previewUpdateTimeout = useRef<any>(null);

  const broadcastBidPreview = (teamId: string | null, amount: number, questionRef: string) => {
    if (!eventState?.id) return;
    const previewData = teamId && amount > 0 ? { teamId, amount, questionRef } : null;

    setEventState((prev) => (prev ? { ...prev, current_bid_preview: previewData } : null));
    broadcastStateChange({ current_bid_preview: previewData });

    if (previewUpdateTimeout.current) clearTimeout(previewUpdateTimeout.current);
    previewUpdateTimeout.current = setTimeout(async () => {
      try {
        await supabase
          .from('event_state')
          .update({
            current_bid_preview: previewData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', eventState.id);
      } catch (err) {
        console.error('Error broadcasting preview:', err);
      }
    }, 250);
  };

  // --- ACTIONS ---

  const handleUpdateBudget = async () => {
    if (!edition?.id) return;
    const val = parseInt(budgetInput) || 50000000;
    setEdition((prev) => (prev ? { ...prev, starting_budget: val } : null));

    const { error } = await supabase
      .from('editions')
      .update({ starting_budget: val })
      .eq('id', edition.id);

    if (error) {
      showNotification('Failed to update starting budget', 'error');
    } else {
      // If still in setup state, update all teams' budgets immediately
      if (eventState?.game_state === 'setup') {
        const updatedTeams = teams.map((t) => ({ ...t, budget: val }));
        setTeams(updatedTeams);
        broadcastTeamsChange(updatedTeams);
        for (const t of updatedTeams) {
          supabase.from('teams').update({ budget: val }).eq('id', t.id).then();
        }
      }
      showNotification(`Starting budget updated to ${formatCurrency(val)}`, 'success');
      addHistory('Budget Updated', `Starting budget set to ${formatCurrency(val)}`);
    }
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !edition?.id) return;

    const initialBudget = parseInt(budgetInput) || edition.starting_budget || 50000000;
    const newTeamObj: Team = {
      id: 'team_' + Date.now(),
      edition_id: edition.id,
      name: newTeamName.trim(),
      budget: initialBudget,
      score: 0,
      status: 'active',
      sort_order: teams.length + 1,
      created_at: new Date().toISOString(),
    };

    const updated = [...teams, newTeamObj];
    setTeams(updated);
    broadcastTeamsChange(updated);
    setNewTeamName('');
    showNotification(`Team "${newTeamName.trim()}" added!`, 'success');
    addHistory('Team Added', `Team "${newTeamName.trim()}" registered.`);

    supabase
      .from('teams')
      .insert({
        edition_id: edition.id,
        name: newTeamObj.name,
        budget: newTeamObj.budget,
        score: 0,
        sort_order: newTeamObj.sort_order,
      })
      .then();
  };

  const handleTeamNameChange = async (teamId: string, newName: string) => {
    const updated = teams.map((t) => (t.id === teamId ? { ...t, name: newName } : t));
    setTeams(updated);
    broadcastTeamsChange(updated);
    supabase.from('teams').update({ name: newName }).eq('id', teamId).then();
  };

  const handleConfirmTeamRename = async () => {
    if (!teamPendingEdit) return;
    const { id, newName, oldName } = teamPendingEdit;
    if (!newName.trim()) {
      showNotification('Team name cannot be empty.', 'error');
      setTeamPendingEdit(null);
      return;
    }
    const updated = teams.map((t) => (t.id === id ? { ...t, name: newName.trim() } : t));
    setTeams(updated);
    broadcastTeamsChange(updated);
    supabase.from('teams').update({ name: newName.trim() }).eq('id', id).then();
    showNotification(`Team renamed to "${newName.trim()}"!`, 'success');
    addHistory('Team Renamed', `Renamed "${oldName}" to "${newName.trim()}".`);
    setEditingTeamNames((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setTeamPendingEdit(null);
  };

  const handleConfirmRemoveTeam = async () => {
    if (!teamToRemove) return;
    const updated = teams.filter((t) => t.id !== teamToRemove.id);
    setTeams(updated);
    broadcastTeamsChange(updated);
    supabase.from('teams').delete().eq('id', teamToRemove.id).then();
    showNotification(`Team ${teamToRemove.name} removed!`, 'success');
    addHistory('Team Removed', `${teamToRemove.name} was removed.`);
    setTeamToRemove(null);
  };

  const handleStartLiveAuction = async () => {
    if (teams.length === 0) {
      showNotification('Please add at least one team before starting.', 'error');
      return;
    }
    if (!eventState?.id) return;

    // Reset teams to full budget and 0 score
    const targetBudget = parseInt(budgetInput) || edition?.starting_budget || 50000000;
    if (edition?.id) {
      setEdition((prev) => (prev ? { ...prev, starting_budget: targetBudget } : null));
      supabase.from('editions').update({ starting_budget: targetBudget }).eq('id', edition.id).then();
    }

    const resetTeams = teams.map((t) => ({ ...t, budget: targetBudget, score: 0 }));
    setTeams(resetTeams);
    broadcastTeamsChange(resetTeams);

    const nextState: Partial<EventState> = {
      game_state: 'waiting_start',
      current_round_index: 0,
      current_question_index: 0,
      current_item_name: '',
      current_bid_preview: null,
      timer_state: 'stopped',
      timer_duration_seconds: 180,
      timer_remaining_seconds: 180,
      timer_started_at: null,
      timer_paused_at: null,
      updated_at: new Date().toISOString(),
    };

    setEventState((prev) => (prev ? { ...prev, ...nextState } : null));
    broadcastStateChange(nextState);

    showNotification('Auction Initialized! Live screen is in Starting Soon mode.', 'success');
    addHistory('Event Initialized', 'Auction setup complete. Waiting for Round 1.');

    for (const team of resetTeams) {
      supabase.from('teams').update({ budget: targetBudget, score: 0 }).eq('id', team.id).then();
    }
    supabase.from('event_state').update(nextState).eq('id', eventState.id).then();
  };

  const handleStartNextRound = async () => {
    const rIdx = eventState?.current_round_index || 0;
    const roundData = DEFAULT_ROUNDS_DATA[rIdx] || { name: `Round ${rIdx + 1}`, questions: [] };
    const firstQ = roundData.questions[0] || '';

    // If entering from intermission, reset round budgets to starting budget
    const standardBudget = edition?.starting_budget || parseInt(budgetInput) || 50000000;
    const refreshedTeams = teams.map((t) => ({ ...t, budget: standardBudget }));
    setTeams(refreshedTeams);
    broadcastTeamsChange(refreshedTeams);
    for (const t of refreshedTeams) {
      supabase.from('teams').update({ budget: standardBudget }).eq('id', t.id).then();
    }

    const nextState: Partial<EventState> = {
      game_state: 'active',
      current_round_index: rIdx,
      current_question_index: 0,
      current_item_name: firstQ,
      current_bid_preview: null,
      timer_state: 'stopped',
      timer_duration_seconds: 180,
      timer_remaining_seconds: 180,
      timer_started_at: null,
      timer_paused_at: null,
      updated_at: new Date().toISOString(),
    };

    // 1. Immediate optimistic UI transition
    setEventState((prev) => (prev ? { ...prev, ...nextState } : (nextState as EventState)));
    setCurrentItem(firstQ);

    // 2. Broadcast immediately to Live View across all browser windows
    broadcastStateChange(nextState);

    showNotification(`${roundData.name} has officially started!`, 'success');
    addHistory('Round Started', `${roundData.name} started.`);

    // 3. Persist to database in background
    if (eventState?.id) {
      supabase
        .from('event_state')
        .update(nextState)
        .eq('id', eventState.id)
        .then(({ error }) => {
          if (error) console.warn('Supabase state update notice:', error.message);
        });
    }
  };

  // Debounced item name change - prevents websocket broadcast loop erasing user keystrokes
  const handleItemNameChange = (text: string) => {
    setCurrentItem(text);
    isTypingQuestionRef.current = true;

    if (questionDebounceTimerRef.current) {
      clearTimeout(questionDebounceTimerRef.current);
    }

    questionDebounceTimerRef.current = setTimeout(() => {
      isTypingQuestionRef.current = false;
      if (!eventState?.id) return;
      setEventState((prev) => (prev ? { ...prev, current_item_name: text } : null));
      broadcastStateChange({ current_item_name: text });
      supabase
        .from('event_state')
        .update({ current_item_name: text, updated_at: new Date().toISOString() })
        .eq('id', eventState.id)
        .then();
    }, 400);
  };

  // Explicit Advance button for Question 20 (Round End)
  const handleAdvanceToNextStage = async () => {
    if (!eventState?.id) return;
    const rIdx = eventState.current_round_index ?? 0;
    const currentRoundData = DEFAULT_ROUNDS_DATA[rIdx] || {
      name: `Round ${rIdx + 1}`,
      questions: [],
    };
    const standardBudget = edition?.starting_budget || parseInt(budgetInput) || 50000000;

    // Snapshot current round results
    const roundSnapshotResults = teamsWithStats.map((t) => ({
      id: t.id,
      name: t.name,
      score: t.score || 0,
      itemsCount: t.itemsCount,
      totalSpent: t.totalSpent,
      remainingBudget: t.budget,
    }));

    const newSnapshot: PastRoundSnapshot = {
      roundIndex: rIdx,
      roundName: currentRoundData.name || `Round ${rIdx + 1}`,
      results: roundSnapshotResults,
      timestamp: Date.now(),
    };

    let existingPastRounds: PastRoundSnapshot[] = [];
    try {
      if (eventState.banner_message) {
        const parsed = JSON.parse(eventState.banner_message);
        if (Array.isArray(parsed)) existingPastRounds = parsed;
        else if (Array.isArray(parsed?.pastRounds)) existingPastRounds = parsed.pastRounds;
      }
    } catch {}
    const updatedPastRounds = [...existingPastRounds, newSnapshot];

    let nextGameState: GameState = 'intermission';
    let nextRoundIdx = rIdx;

    if (rIdx === 2) {
      // Round 3 completed -> Enter Intermission with Tie Breaker & Podium options
      nextGameState = 'intermission';
      nextRoundIdx = 2;
      showNotification('Round 3 Completed! Intermission active.', 'success');
      addHistory('Round 3 Complete', 'Ready for Tie Breaker or Winner Announcement.');
    } else if (rIdx < 2) {
      nextGameState = 'intermission';
      nextRoundIdx = rIdx + 1;
      showNotification(`Round ${rIdx + 1} completed! Entering Intermission.`, 'success');
      addHistory('Round Complete', `Round ${rIdx + 1} finished.`);
    } else {
      // Tie Breaker finished
      nextGameState = 'winner_reveal';
      showNotification('Tie Breaker completed! Ready for Podium Reveal.', 'success');
      addHistory('Tie Breaker Complete', 'Revealing Podium.');
    }

    // Reset teams to fresh round budget
    const refreshedTeams = teams.map((t) => ({ ...t, budget: standardBudget }));
    setTeams(refreshedTeams);
    broadcastTeamsChange(refreshedTeams);
    for (const t of refreshedTeams) {
      supabase.from('teams').update({ budget: standardBudget }).eq('id', t.id).then();
    }

    const payload = {
      pastRounds: updatedPastRounds,
      podium: podiumState,
    };

    const nextState: Partial<EventState> = {
      game_state: nextGameState,
      current_round_index: nextRoundIdx,
      current_question_index: 0,
      current_item_name: '',
      current_bid_preview: null,
      timer_state: 'stopped',
      timer_duration_seconds: 180,
      timer_remaining_seconds: 180,
      timer_started_at: null,
      timer_paused_at: null,
      banner_message: JSON.stringify(payload),
      updated_at: new Date().toISOString(),
    };

    setEventState((prev) => (prev ? { ...prev, ...nextState } : null));
    setCurrentItem('');
    broadcastStateChange(nextState);
    supabase.from('event_state').update(nextState).eq('id', eventState.id).then();
  };

  // Tie Breaker Round Handler
  const handleStartTieBreaker = async () => {
    if (!eventState?.id) return;
    const tieItem = DEFAULT_ROUNDS_DATA[3]?.questions[0] || 'Tie Breaker Question';
    const standardBudget = edition?.starting_budget || parseInt(budgetInput) || 50000000;

    const refreshedTeams = teams.map((t) => ({ ...t, budget: standardBudget }));
    setTeams(refreshedTeams);
    broadcastTeamsChange(refreshedTeams);
    for (const t of refreshedTeams) {
      supabase.from('teams').update({ budget: standardBudget }).eq('id', t.id).then();
    }

    const tieState: Partial<EventState> = {
      game_state: 'active',
      current_round_index: 3,
      current_question_index: 0,
      current_item_name: tieItem,
      current_bid_preview: null,
      timer_state: 'stopped',
      timer_duration_seconds: 180,
      timer_remaining_seconds: 180,
      timer_started_at: null,
      timer_paused_at: null,
      updated_at: new Date().toISOString(),
    };

    setEventState((prev) => (prev ? { ...prev, ...tieState } : null));
    setCurrentItem(tieItem);
    broadcastStateChange(tieState);
    supabase.from('event_state').update(tieState).eq('id', eventState.id).then();
    showNotification('Started Tie Breaker Round (R4)!', 'success');
    addHistory('Tie Breaker Started', 'Round 4 Tie Breaker initialized.');
  };

  // Podium Navigation & Manual Winner Reveal Handlers
  const handleGoToWinnerReveal = async () => {
    if (!eventState?.id) return;

    // Default podium to auto top 3 if unselected
    const sorted = [...teamsWithStats].sort(
      (a, b) => (b.score || 0) - (a.score || 0) || b.budget - a.budget
    );
    const initialPodium = {
      thirdTeamId: podiumState.thirdTeamId || sorted[2]?.id || null,
      thirdRevealed: podiumState.thirdRevealed,
      secondTeamId: podiumState.secondTeamId || sorted[1]?.id || null,
      secondRevealed: podiumState.secondRevealed,
      firstTeamId: podiumState.firstTeamId || sorted[0]?.id || null,
      firstRevealed: podiumState.firstRevealed,
    };
    setPodiumState(initialPodium);

    let existingPastRounds: PastRoundSnapshot[] = [];
    try {
      if (eventState.banner_message) {
        const parsed = JSON.parse(eventState.banner_message);
        if (Array.isArray(parsed)) existingPastRounds = parsed;
        else if (Array.isArray(parsed?.pastRounds)) existingPastRounds = parsed.pastRounds;
      }
    } catch {}

    const payload = {
      pastRounds: existingPastRounds,
      podium: initialPodium,
    };

    const nextState: Partial<EventState> = {
      game_state: 'winner_reveal',
      current_item_name: '',
      current_bid_preview: null,
      timer_state: 'stopped',
      banner_message: JSON.stringify(payload),
      updated_at: new Date().toISOString(),
    };

    setEventState((prev) => (prev ? { ...prev, ...nextState } : null));
    broadcastStateChange(nextState);
    supabase.from('event_state').update(nextState).eq('id', eventState.id).then();
    showNotification('Entered Podium Management!', 'success');
    addHistory('Podium Management', 'Admin controlling manual winner reveal.');
  };

  const updatePodiumTeam = (place: 'third' | 'second' | 'first', teamId: string) => {
    const updated = {
      ...podiumState,
      [`${place}TeamId`]: teamId || null,
    };
    setPodiumState(updated);
    savePodiumState(updated);
  };

  const togglePodiumReveal = (place: 'third' | 'second' | 'first') => {
    const key = `${place}Revealed` as 'thirdRevealed' | 'secondRevealed' | 'firstRevealed';
    const updated = {
      ...podiumState,
      [key]: !podiumState[key],
    };
    setPodiumState(updated);
    savePodiumState(updated);
    showNotification(
      `${place.toUpperCase()} place ${updated[key] ? 'REVEALED' : 'HIDDEN'} on live screen!`,
      'success'
    );
  };

  const savePodiumState = (newPodium: typeof podiumState) => {
    if (!eventState?.id) return;
    let existingPastRounds: PastRoundSnapshot[] = [];
    try {
      if (eventState.banner_message) {
        const parsed = JSON.parse(eventState.banner_message);
        if (Array.isArray(parsed)) existingPastRounds = parsed;
        else if (Array.isArray(parsed?.pastRounds)) existingPastRounds = parsed.pastRounds;
      }
    } catch {}

    const payload = {
      pastRounds: existingPastRounds,
      podium: newPodium,
    };

    const nextState = { banner_message: JSON.stringify(payload) };
    setEventState((prev) => (prev ? { ...prev, ...nextState } : null));
    broadcastStateChange(nextState);
    supabase
      .from('event_state')
      .update({ banner_message: JSON.stringify(payload), updated_at: new Date().toISOString() })
      .eq('id', eventState.id)
      .then();
  };

  const handleLoadQuestionFromData = () => {
    const rIdx = eventState?.current_round_index ?? 0;
    const qIdx = eventState?.current_question_index ?? 0;
    const qText = DEFAULT_ROUNDS_DATA[rIdx]?.questions[qIdx] || '';
    if (qText) {
      setCurrentItem(qText);
      const updates: Partial<EventState> = {
        current_item_name: qText,
        timer_state: 'stopped',
        timer_remaining_seconds: 180,
        timer_duration_seconds: 180,
        timer_started_at: null,
        timer_paused_at: null,
        updated_at: new Date().toISOString(),
      };
      setEventState((prev) => (prev ? { ...prev, ...updates } : null));
      broadcastStateChange(updates);
      if (eventState?.id) {
        supabase.from('event_state').update(updates).eq('id', eventState.id).then();
      }
      showNotification(`Loaded question Q${qIdx + 1} (hidden until timer starts)`, 'success');
    }
  };

  const handleManualSetTracker = async (r: number, q: number) => {
    if (!eventState?.id) return;
    const autoText = DEFAULT_ROUNDS_DATA[r]?.questions[q] || '';
    setCurrentItem(autoText);

    const updates: Partial<EventState> = {
      current_round_index: r,
      current_question_index: q,
      current_item_name: autoText,
      current_bid_preview: null,
      timer_state: 'stopped',
      timer_remaining_seconds: 180,
      timer_duration_seconds: 180,
      timer_started_at: null,
      timer_paused_at: null,
      updated_at: new Date().toISOString(),
    };

    setEventState((prev) => (prev ? { ...prev, ...updates } : (updates as EventState)));
    broadcastStateChange(updates);

    if (eventState?.id) {
      supabase
        .from('event_state')
        .update(updates)
        .eq('id', eventState.id)
        .then();
    }

    addHistory('Tracker Changed', `Set to Round ${r + 1}, Q${q + 1}`);
  };

  const handleStartTimer = () => {
    const now = new Date().toISOString();
    let updates: Partial<EventState>;

    if (isTimerPaused && eventState?.timer_remaining_seconds) {
      // Resume from paused state
      updates = {
        timer_state: 'running',
        timer_started_at: now,
        timer_paused_at: null,
        updated_at: now,
      };
    } else {
      // Start fresh
      updates = {
        timer_state: 'running',
        timer_duration_seconds: 180,
        timer_remaining_seconds: 180,
        timer_started_at: now,
        timer_paused_at: null,
        updated_at: now,
      };
    }

    setEventState((prev) => (prev ? { ...prev, ...updates } : (updates as EventState)));
    broadcastStateChange(updates);
    if (eventState?.id) {
      supabase.from('event_state').update(updates).eq('id', eventState.id).then();
    }
    showNotification('Timer started! Question is now revealed to players.', 'success');
    addHistory('Timer Started', `Question revealed for Round ${roundIdx + 1} - Q${questionIdx + 1}`);
  };

  const handlePauseTimer = () => {
    const start = eventState?.timer_started_at ? new Date(eventState.timer_started_at).getTime() : Date.now();
    const elapsed = Math.floor((Date.now() - start) / 1000);
    const currentRemaining = Math.max(0, (eventState?.timer_remaining_seconds ?? 180) - elapsed);
    const now = new Date().toISOString();

    const updates: Partial<EventState> = {
      timer_state: 'paused',
      timer_remaining_seconds: currentRemaining,
      timer_paused_at: now,
      updated_at: now,
    };

    setEventState((prev) => (prev ? { ...prev, ...updates } : (updates as EventState)));
    broadcastStateChange(updates);
    if (eventState?.id) {
      supabase.from('event_state').update(updates).eq('id', eventState.id).then();
    }
    showNotification('Timer paused.', 'success');
  };

  const handleResetTimer = () => {
    const now = new Date().toISOString();
    const updates: Partial<EventState> = {
      timer_state: 'stopped',
      timer_duration_seconds: 180,
      timer_remaining_seconds: 180,
      timer_started_at: null,
      timer_paused_at: null,
      updated_at: now,
    };

    setEventState((prev) => (prev ? { ...prev, ...updates } : (updates as EventState)));
    broadcastStateChange(updates);
    if (eventState?.id) {
      supabase.from('event_state').update(updates).eq('id', eventState.id).then();
    }
    showNotification('Timer reset to 03:00. Question is now hidden.', 'success');
  };

  const handleTeamSelection = (id: string) => {
    setSelectedTeamId(id);
    const rIdx = eventState?.current_round_index ?? 0;
    const qIdx = eventState?.current_question_index ?? 0;
    broadcastBidPreview(id, parseFloat(bidAmount) || 0, `R${rIdx + 1} - Q${qIdx + 1}`);
  };

  const handleBidAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
    setBidAmount(value);
    const rIdx = eventState?.current_round_index ?? 0;
    const qIdx = eventState?.current_question_index ?? 0;
    broadcastBidPreview(selectedTeamId, parseFloat(value) || 0, `R${rIdx + 1} - Q${qIdx + 1}`);
  };

  const handleQuickAdd = (val: number) => {
    const cur = parseFloat(bidAmount.replace(/[^0-9.]/g, '')) || 0;
    const next = Math.max(0, cur + val);
    setBidAmount(String(next));
    const rIdx = eventState?.current_round_index ?? 0;
    const qIdx = eventState?.current_question_index ?? 0;
    broadcastBidPreview(selectedTeamId, next, `R${rIdx + 1} - Q${qIdx + 1}`);
  };

  const handleQuickSet = (val: number) => {
    setBidAmount(String(val));
    const rIdx = eventState?.current_round_index ?? 0;
    const qIdx = eventState?.current_question_index ?? 0;
    broadcastBidPreview(selectedTeamId, val, `R${rIdx + 1} - Q${qIdx + 1}`);
  };

  // --- SOLD SUBMISSION WITH CONFIRMATION (Point 7) ---
  const handlePromptBidSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventState?.id || !edition?.id) return;
    if (!selectedTeamId) {
      showNotification('Please select the winning team.', 'error');
      return;
    }
    if (!currentItem.trim()) {
      showNotification('Please enter or load a question/item.', 'error');
      return;
    }

    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount < BASE_PRICE) {
      showNotification(`Bid amount must be at least ${formatCurrency(BASE_PRICE)}.`, 'error');
      return;
    }

    const winningTeam = teams.find((t) => t.id === selectedTeamId);
    if (!winningTeam) return;

    if (winningTeam.budget < amount) {
      showNotification(
        `Insufficient funds! ${winningTeam.name} only has ${formatCurrency(winningTeam.budget)}.`,
        'error'
      );
      return;
    }

    setIsConfirmingSold(true);
  };

  const handleExecuteBidSubmit = async () => {
    if (!eventState?.id || !edition?.id) return;
    const amount = parseFloat(bidAmount);
    const winningTeam = teams.find((t) => t.id === selectedTeamId);
    if (!winningTeam) return;

    const rIdx = eventState.current_round_index ?? 0;
    const qIdx = eventState.current_question_index ?? 0;
    const currentRoundData = DEFAULT_ROUNDS_DATA[rIdx] || { name: `Round ${rIdx + 1}`, questions: [] };
    const qRef = `R${rIdx + 1} - Q${qIdx + 1}`;

    // 1. Deduct budget and add score to team locally & sync
    const newBudget = winningTeam.budget - amount;
    const newScore = (winningTeam.score || 0) + (isAnswerCorrect ? 1 : 0);
    const updatedTeams = teams.map((t) =>
      t.id === winningTeam.id ? { ...t, budget: newBudget, score: newScore } : t
    );
    setTeams(updatedTeams);
    broadcastTeamsChange(updatedTeams);
    supabase.from('teams').update({ budget: newBudget, score: newScore }).eq('id', winningTeam.id).then();

    // 2. Insert into team_items locally & sync
    const newItem: TeamItem = {
      id: 'item_' + Date.now(),
      edition_id: edition.id,
      team_id: winningTeam.id,
      item_name: currentItem,
      cost: amount,
      is_correct: isAnswerCorrect,
      round_index: rIdx,
      question_index: qIdx,
      question_ref: qRef,
      created_at: new Date().toISOString(),
    };
    const updatedItems = [newItem, ...items];
    setItems(updatedItems);
    broadcastItemsChange(updatedItems);
    supabase.from('team_items').insert({
      edition_id: edition.id,
      team_id: winningTeam.id,
      item_name: currentItem,
      cost: amount,
      is_correct: isAnswerCorrect,
      round_index: rIdx,
      question_index: qIdx,
      question_ref: qRef,
    }).then();

    // 3. Log transaction
    const resText = isAnswerCorrect ? 'CORRECT (+1 Pt)' : 'WRONG (0 Pt)';
    addHistory(
      'SOLD',
      `${winningTeam.name} bought "${currentItem.split('\n')[0]}..." (${qRef}) for ${formatCurrency(
        amount
      )} - ${resText}`
    );

    // 4. Determine next game state
    const isLastQuestionOfRound = qIdx >= currentRoundData.questions.length - 1;

    let nextGameState = eventState.game_state;
    let nextRoundIdx = rIdx;
    let nextQuestionIdx = qIdx + 1;
    let nextItemText = '';

    if (isLastQuestionOfRound) {
      // Save round snapshot into past rounds
      const roundSnapshotResults = teamsWithStats.map((t) => ({
        id: t.id,
        name: t.name,
        score: t.id === winningTeam.id ? newScore : t.score || 0,
        itemsCount: t.id === winningTeam.id ? t.itemsCount + 1 : t.itemsCount,
        totalSpent: t.id === winningTeam.id ? t.totalSpent + amount : t.totalSpent,
        remainingBudget: t.id === winningTeam.id ? newBudget : t.budget,
      }));

      const newSnapshot: PastRoundSnapshot = {
        roundIndex: rIdx,
        roundName: currentRoundData.name || `Round ${rIdx + 1}`,
        results: roundSnapshotResults,
        timestamp: Date.now(),
      };

      let existingPastRounds: PastRoundSnapshot[] = [];
      try {
        if (eventState.banner_message) {
          const parsed = JSON.parse(eventState.banner_message);
          if (Array.isArray(parsed)) existingPastRounds = parsed;
          else if (Array.isArray(parsed?.pastRounds)) existingPastRounds = parsed.pastRounds;
        }
      } catch {}
      const updatedPastRounds = [...existingPastRounds, newSnapshot];

      const standardBudget = edition?.starting_budget || parseInt(budgetInput) || 50000000;
      const refreshedTeams = teams.map((t) => ({ ...t, budget: standardBudget }));
      setTeams(refreshedTeams);
      broadcastTeamsChange(refreshedTeams);
      for (const t of refreshedTeams) {
        supabase.from('teams').update({ budget: standardBudget }).eq('id', t.id).then();
      }

      if (rIdx === 2) {
        // Round 3 completed -> Enter Intermission with Tie Breaker & Reveal options
        nextGameState = 'intermission';
        nextRoundIdx = 2;
        nextQuestionIdx = 0;
        showNotification('Round 3 Finished! Intermission active.', 'success');
        addHistory('Round 3 Complete', 'Ready for Tie Breaker or Winner Announcement.');
      } else if (rIdx + 1 < DEFAULT_ROUNDS_DATA.length) {
        // Intermission before next round
        nextGameState = 'intermission';
        nextRoundIdx = rIdx + 1;
        nextQuestionIdx = 0;
        showNotification(`Round ${rIdx + 1} completed! Entering Intermission.`, 'success');
        addHistory('Round Complete', `Round ${rIdx + 1} finished.`);
      } else {
        nextGameState = 'winner_reveal';
      }

      const payload = {
        pastRounds: updatedPastRounds,
        podium: podiumState,
      };

      const nextState: Partial<EventState> = {
        game_state: nextGameState,
        current_round_index: nextRoundIdx,
        current_question_index: nextQuestionIdx,
        current_item_name: '',
        current_bid_preview: null,
        timer_state: 'stopped',
        timer_duration_seconds: 180,
        timer_remaining_seconds: 180,
        timer_started_at: null,
        timer_paused_at: null,
        banner_message: JSON.stringify(payload),
        updated_at: new Date().toISOString(),
      };

      setEventState((prev) => (prev ? { ...prev, ...nextState } : null));
      setCurrentItem('');
      broadcastStateChange(nextState);
      supabase.from('event_state').update(nextState).eq('id', eventState.id).then();
    } else {
      // Advance to next question in same round (starts hidden until admin starts timer)
      nextItemText = currentRoundData.questions[nextQuestionIdx] || '';
      const nextState: Partial<EventState> = {
        current_question_index: nextQuestionIdx,
        current_item_name: nextItemText,
        current_bid_preview: null,
        timer_state: 'stopped',
        timer_duration_seconds: 180,
        timer_remaining_seconds: 180,
        timer_started_at: null,
        timer_paused_at: null,
        updated_at: new Date().toISOString(),
      };

      setEventState((prev) => (prev ? { ...prev, ...nextState } : null));
      setCurrentItem(nextItemText);
      broadcastStateChange(nextState);
      if (eventState?.id) supabase.from('event_state').update(nextState).eq('id', eventState.id).then();

      showNotification(`Sold to ${winningTeam.name}! Question ${nextQuestionIdx + 1} ready (hidden until timer starts).`, 'success');
    }

    // Reset bid inputs
    setBidAmount('');
    setSelectedTeamId(null);
    setIsAnswerCorrect(false);
  };

  // --- UNDO LAST BID WITH CONFIRMATION (Point 7) ---
  const handlePromptUndoLastBid = () => {
    if (!items || items.length === 0 || !eventState?.id) {
      showNotification('No transactions to undo.', 'error');
      return;
    }
    setIsConfirmingUndo(true);
  };

  const handleExecuteUndoLastBid = async () => {
    if (!items || items.length === 0 || !eventState?.id) return;

    const lastItem = items[0];
    const teamToRefund = teams.find((t) => t.id === lastItem.team_id);
    if (!teamToRefund) return;

    // Refund team budget and deduct score
    const refundedBudget = teamToRefund.budget + lastItem.cost;
    const revertedScore = Math.max(0, (teamToRefund.score || 0) - (lastItem.is_correct ? 1 : 0));
    const updatedTeams = teams.map((t) =>
      t.id === teamToRefund.id ? { ...t, budget: refundedBudget, score: revertedScore } : t
    );
    setTeams(updatedTeams);
    broadcastTeamsChange(updatedTeams);
    supabase.from('teams').update({ budget: refundedBudget, score: revertedScore }).eq('id', teamToRefund.id).then();

    // Delete item record locally & sync
    const updatedItems = items.slice(1);
    setItems(updatedItems);
    broadcastItemsChange(updatedItems);
    supabase.from('team_items').delete().eq('id', lastItem.id).then();

    // Step back question tracker
    const newQIdx = Math.max(0, (eventState.current_question_index ?? 1) - 1);
    const updates: Partial<EventState> = {
      current_question_index: newQIdx,
      current_item_name: lastItem.item_name,
      current_bid_preview: null,
      timer_state: 'stopped',
      timer_duration_seconds: 180,
      timer_remaining_seconds: 180,
      timer_started_at: null,
      timer_paused_at: null,
      updated_at: new Date().toISOString(),
    };
    setEventState((prev) => (prev ? { ...prev, ...updates } : null));
    setCurrentItem(lastItem.item_name);
    broadcastStateChange(updates);
    supabase.from('event_state').update(updates).eq('id', eventState.id).then();

    showNotification(`Undid sale to ${teamToRefund.name}. Refunded ${formatCurrency(lastItem.cost)}.`, 'success');
    addHistory('UNDO', `Reverted sale to ${teamToRefund.name} (${formatCurrency(lastItem.cost)}).`);
  };

  // --- FULL RESET ---
  const resetGameAndDatabase = async () => {
    if (!edition?.id || !eventState?.id) return;

    const standardBudget = edition.starting_budget || 50000000;
    const resetTeams = teams.map((t) => ({ ...t, budget: standardBudget, score: 0 }));
    setTeams(resetTeams);
    broadcastTeamsChange(resetTeams);

    setItems([]);
    broadcastItemsChange([]);

    const resetUpdates: Partial<EventState> = {
      game_state: 'setup',
      current_round_index: 0,
      current_question_index: 0,
      current_item_name: '',
      current_bid_preview: null,
      banner_message: null,
      timer_state: 'stopped',
      timer_duration_seconds: 180,
      timer_remaining_seconds: 180,
      timer_started_at: null,
      timer_paused_at: null,
      updated_at: new Date().toISOString(),
    };

    setEventState((prev) => (prev ? { ...prev, ...resetUpdates } : null));
    broadcastStateChange(resetUpdates);

    setIsConfirmingReset(false);
    setBidAmount('');
    setSelectedTeamId(null);
    setCurrentItem('');
    setLocalHistory([]);
    showNotification('Auction reset to initial setup state.', 'success');

    for (const t of teams) {
      supabase.from('teams').update({ budget: standardBudget, score: 0 }).eq('id', t.id).then();
    }
    supabase.from('team_items').delete().eq('edition_id', edition.id).then();
    supabase.from('event_state').update(resetUpdates).eq('id', eventState.id).then();
  };

  const handleLogout = async () => {
    sessionStorage.removeItem('gcl_admin_authenticated');
    await supabase.auth.signOut();
    navigate('/');
  };

  if (stateLoading || authLoading) {
    return (
      <div className="gcl-loading-screen">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading Admin Console...</p>
      </div>
    );
  }

  const gameState = eventState?.game_state || 'setup';
  const roundIdx = eventState?.current_round_index ?? 0;
  const questionIdx = eventState?.current_question_index ?? 0;
  const currentRoundData = DEFAULT_ROUNDS_DATA[roundIdx] || {
    name: `Round ${roundIdx + 1}`,
    questions: [],
  };
  const totalQuestions = currentRoundData.questions.length || 20;
  const maxIdx = totalQuestions > 0 ? totalQuestions - 1 : 0;
  const isLastQuestion = questionIdx === maxIdx && totalQuestions > 0;
  const isRoundEnd = roundIdx >= DEFAULT_ROUNDS_DATA.length;

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-16 font-sans">
      <Header
        totalSpent={totalSpent}
        totalAvailable={totalAvailable}
        teamCount={teams.length}
        viewMode="admin"
        onToggleView={() => navigate('/')}
        isAdminAuthenticated={true}
        onLogout={handleLogout}
      />

      <Notification notification={notification} />
      <ConnectionHealth isConnected={true} />

      {teamToRemove && (
        <TeamRemoveModal
          team={teamToRemove}
          gameState={gameState}
          onConfirm={handleConfirmRemoveTeam}
          onCancel={() => setTeamToRemove(null)}
        />
      )}

      {/* 1. SETUP STATE */}
      {gameState === 'setup' && (
        <div className="admin-setup-container">
          <div className="admin-card">
            <div className="flex items-center gap-3 mb-6 text-blue-400">
              <Settings size={32} />
              <h1 className="text-3xl font-bold text-white">Event Configuration</h1>
            </div>

            <div className="space-y-6">
              {/* Budget Setting */}
              <div>
                <label className="input-label">Starting Budget</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="number"
                    value={budgetInput}
                    onChange={(e) => setBudgetInput(e.target.value)}
                    className="gcl-input flex-1"
                  />
                  <button onClick={handleUpdateBudget} className="btn-primary-compact">
                    Update
                  </button>
                  <span className="badge-preview">
                    {formatCurrency(parseInt(budgetInput) || 0)}
                  </span>
                </div>
              </div>

              {/* Team Management */}
              <div className="pt-4 border-t border-slate-800">
                <div className="flex justify-between items-center mb-4">
                  <label className="input-label">Teams ({teams.length})</label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-2 mb-4">
                  {teams.map((team, idx) => (
                    <div key={team.id} className="team-manage-item">
                      <span className="font-mono text-slate-500 w-6">{idx + 1}.</span>
                      <input
                        type="text"
                        value={team.name}
                        onChange={(e) => handleTeamNameChange(team.id, e.target.value)}
                        className="gcl-input-inline"
                        placeholder={`Team ${idx + 1}`}
                      />
                      <button
                        onClick={() => setTeamToRemove(team)}
                        disabled={teams.length <= 1}
                        className="btn-remove-circle"
                      >
                        <Minus size={14} />
                      </button>
                    </div>
                  ))}
                  {teams.length === 0 && (
                    <p className="col-span-2 text-slate-500 italic text-center py-4">
                      No teams added yet. Add your participating teams below.
                    </p>
                  )}
                </div>

                <form onSubmit={handleAddTeam} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="New Team Name..."
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="gcl-input flex-1"
                  />
                  <button
                    type="submit"
                    disabled={!newTeamName.trim()}
                    className="btn-primary-add"
                  >
                    <Plus size={18} /> Add Team
                  </button>
                </form>
              </div>

              {/* Start Live Auction Button */}
              <div className="pt-6 border-t border-slate-800">
                <button
                  onClick={handleStartLiveAuction}
                  disabled={teams.length === 0}
                  className="btn-start-auction"
                >
                  <Play size={22} fill="currentColor" /> Start Live Auction
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. WAITING START STATE */}
      {gameState === 'waiting_start' && (
        <div className="admin-waiting-container">
          <div className="admin-card text-center space-y-6">
            <div className="flex flex-col items-center text-indigo-400">
              <div className="relative mb-4">
                <div className="trophy-glow"></div>
                <Trophy size={68} className="relative text-yellow-400" />
              </div>
              <h2 className="text-3xl font-extrabold text-white">Auction Initialized</h2>
              <p className="text-lg text-slate-400 mt-2">
                The live screen is showing the "Starting Soon" banner.
                <br />
                Click below when you are ready to begin <strong>Round 1</strong>.
              </p>
            </div>
            <button
              type="button"
              onClick={handleStartNextRound}
              className="btn-start-round"
              style={{ cursor: 'pointer', position: 'relative', zIndex: 30 }}
            >
              <Play size={24} fill="currentColor" /> OFFICIALLY START ROUND 1
            </button>
          </div>
        </div>
      )}

      {/* 3. ACTIVE ROUND CONTROLS */}
      {gameState === 'active' && (
        <div className="admin-page-container max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Main Left Column (2 Cols Wide) */}
            <div className="lg:col-span-2 space-y-6">
              {/* 1. Round Progression Card */}
              <div className="admin-card space-y-4">
                <h2 className="card-title text-indigo-400">
                  <RefreshCw size={22} /> Round Progression
                </h2>
                <div className="round-progress-banner">
                  {isRoundEnd ? (
                    <span className="font-mono text-2xl font-bold text-red-300">
                      AUCTION FINISHED
                    </span>
                  ) : (
                    <span className="font-mono text-2xl font-bold text-yellow-300">
                      R{roundIdx + 1} - Q{questionIdx + 1} of {totalQuestions}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="input-label">Manual Round Selection</label>
                    <select
                      value={roundIdx}
                      onChange={(e) => handleManualSetTracker(Number(e.target.value), questionIdx)}
                      className="gcl-select"
                    >
                      {DEFAULT_ROUNDS_DATA.map((r, idx) => (
                        <option key={r.name} value={idx}>
                          Round {idx + 1} ({r.name})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Question Index</label>
                    <div className="stepper-box">
                      <button
                        type="button"
                        onClick={() => handleManualSetTracker(roundIdx, Math.max(0, questionIdx - 1))}
                        disabled={questionIdx === 0}
                        className="stepper-btn"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <div className="flex-grow text-center">
                        <span className="font-mono text-xl font-bold text-yellow-300">
                          {questionIdx + 1}
                        </span>
                        <span className="text-slate-400 text-sm"> of {totalQuestions}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleManualSetTracker(roundIdx, Math.min(maxIdx, questionIdx + 1))}
                        disabled={questionIdx === maxIdx}
                        className="stepper-btn"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </div>
                  </div>
                </div>

                {isLastQuestion && (
                  <div className="advance-notice-box space-y-3">
                    <div>
                      <p className="advance-title">Round End: Ready to Advance</p>
                      <p className="advance-desc">
                        Question {questionIdx + 1} of {totalQuestions} reached. Click below to advance the auction to the next stage!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAdvanceToNextStage}
                      className="btn-advance-intermission"
                    >
                      <ChevronRight size={20} />
                      {roundIdx === 2
                        ? 'End Round 3 & Go to Tie Breaker / Winner Selection'
                        : `Advance to Round ${roundIdx + 2} Intermission`}
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Question & Timer Card */}
              <div className="admin-card">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <HelpCircle size={22} />
                    <h2 className="text-xl font-bold text-white">Question & Timer</h2>
                  </div>
                  <div>
                    {isRevealed ? (
                      <span className="badge-revealed-to-players">● REVEALED TO PLAYERS</span>
                    ) : (
                      <span className="badge-hidden-from-players">HIDDEN FROM PLAYERS</span>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="input-label mb-0">Item / Question Name</label>
                    <button type="button" onClick={handleLoadQuestionFromData} className="btn-secondary-load">
                      <FileText size={15} /> Load Q{questionIdx + 1} from Data
                    </button>
                  </div>
                  <textarea
                    value={currentItem}
                    onChange={(e) => handleItemNameChange(e.target.value)}
                    placeholder={`Enter question for Round ${roundIdx + 1} - Q${questionIdx + 1}...`}
                    rows={4}
                    className="gcl-textarea"
                  />
                </div>

                {/* Timer Controls Row */}
                <div className="timer-controls-bar">
                  <div className="flex items-center gap-3">
                    <div className="timer-icon-badge">
                      <Clock size={20} className={isTimerRunning ? 'text-cyan-400 animate-spin-slow' : 'text-slate-400'} />
                    </div>
                    <div>
                      <p className="timer-label">BID TIMER</p>
                      <p className={`font-mono text-2xl font-black ${isExpired ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                        {timerFormatted}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isTimerRunning ? (
                      <button
                        type="button"
                        onClick={handleStartTimer}
                        className="btn-timer-start"
                      >
                        <Play size={18} fill="currentColor" /> {isTimerPaused ? 'Resume Timer' : 'Start (Reveals Q)'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handlePauseTimer}
                        className="btn-timer-pause"
                      >
                        <Pause size={18} /> Pause
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleResetTimer}
                      className="btn-timer-reset"
                    >
                      <RotateCcw size={16} /> Reset
                    </button>
                  </div>
                </div>
              </div>

              {/* 3. Final Bid & Answer Form (Spacious full-width team grid & clear evaluation) */}
              <form onSubmit={handlePromptBidSubmit} className="admin-card space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="card-title text-blue-400 mb-0">
                    <Hammer size={22} /> Final Bid & Answer Evaluation
                  </h2>
                  {selectedTeamId && (
                    <span className="text-xs text-blue-300 font-mono bg-blue-950/80 px-2.5 py-1 rounded-full border border-blue-800">
                      Selected: <strong>{teams.find(t => t.id === selectedTeamId)?.name}</strong>
                    </span>
                  )}
                </div>

                {/* Team Selection: Full Width Grid - ALL teams visible without scrolling */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="input-label mb-0">Select Winning Team</label>
                    <span className="text-xs text-slate-400">{teams.length} teams available</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    {teams.map((t) => {
                      const isSelected = selectedTeamId === t.id;
                      const isExhausted = t.budget <= 0;
                      const isLow = !isExhausted && t.budget <= 5000000;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleTeamSelection(t.id)}
                          className={`team-select-btn ${
                            isSelected ? 'team-btn-selected' : 'team-btn-default'
                          } ${isExhausted ? 'border-red-500/80 bg-red-950/20' : ''}`}
                        >
                          <div className="flex flex-col w-full text-left">
                            <span className="font-bold text-sm truncate w-full text-white">{t.name}</span>
                            {isExhausted ? (
                              <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider mt-0.5">⚠️ NO BUDGET</span>
                            ) : isLow ? (
                              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mt-0.5">⚠️ {formatCurrency(t.budget)}</span>
                            ) : (
                              <span className="text-[11px] text-green-400 font-mono font-semibold mt-0.5">{formatCurrency(t.budget)}</span>
                            )}
                          </div>
                          <div className="flex justify-between items-center w-full mt-1.5 pt-1 border-t border-slate-700/50">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Score</span>
                            <span className="badge-team-score">★ {t.score || 0}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Bid Amount & Answer Evaluation: Side-by-Side Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-700/60">
                  {/* Left: Bid Amount & Fast Buttons */}
                  <div>
                    <label className="input-label">
                      Bid Amount (Base: {formatCurrency(BASE_PRICE)})
                    </label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={bidAmount}
                        onChange={handleBidAmountChange}
                        placeholder={String(BASE_PRICE)}
                        className="gcl-input font-mono text-xl"
                      />
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuickSet(BASE_PRICE)}
                          className="quick-btn-base"
                        >
                          {formatCurrency(BASE_PRICE)}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickAdd(MIN_INCREMENT)}
                          className="quick-btn-inc"
                        >
                          +{formatCurrency(MIN_INCREMENT)}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickAdd(5000000)}
                          className="quick-btn-green"
                        >
                          + 50 L
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickAdd(-1000000)}
                          className="quick-btn-red"
                        >
                          - 10 L
                        </button>
                      </div>
                    </div>
                    {bidAmount && parseFloat(bidAmount) > 0 && (
                      <p className="mt-2 text-sm text-slate-400">
                        Formatted Bid:{' '}
                        <span className="text-white font-bold font-mono">
                          {formatCurrency(parseFloat(bidAmount))}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Right: Answer Result Evaluation Toggle */}
                  <div>
                    <label className="input-label">Answer Evaluation</label>
                    <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-700 space-y-3">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="text-yellow-400 shrink-0" size={20} />
                        <div>
                          <p className="text-white font-bold text-sm">Did the team answer correctly?</p>
                          <p className="text-slate-400 text-xs">Correct gives +1 score; Incorrect gives 0 score.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAnswerCorrect(false)}
                          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-lg font-bold text-sm transition-all ${
                            !isAnswerCorrect
                              ? 'bg-red-600 text-white shadow-lg shadow-red-900/40 ring-2 ring-red-400'
                              : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                          }`}
                        >
                          <XCircle size={18} /> Incorrect (0)
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAnswerCorrect(true)}
                          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-lg font-bold text-sm transition-all ${
                            isAnswerCorrect
                              ? 'bg-green-600 text-white shadow-lg shadow-green-900/40 ring-2 ring-green-400'
                              : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                          }`}
                        >
                          <Check size={18} /> Correct (+1)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SOLD Action Button */}
                <button
                  type="submit"
                  disabled={!selectedTeamId || !currentItem.trim() || parseFloat(bidAmount) < BASE_PRICE}
                  className={`btn-sold-action ${
                    !selectedTeamId || !currentItem.trim() || parseFloat(bidAmount) < BASE_PRICE
                      ? 'btn-sold-disabled'
                      : 'btn-sold-ready'
                  }`}
                >
                  <CheckCircle2 size={22} fill="currentColor" />
                  {isAnswerCorrect
                    ? 'SOLD! (Correct Answer +1 Score)'
                    : 'SOLD! (Incorrect Answer +0 Score)'}
                </button>
              </form>

              {/* 4. Corrections Bar: Sleek Horizontal Strip Directly Below Final Bid */}
              <div className="admin-card border-l-4 border-l-orange-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 px-6">
                <div>
                  <h2 className="card-title text-orange-400 mb-0.5 text-lg">
                    <Undo2 size={20} /> Corrections
                  </h2>
                  <p className="text-xs text-slate-400">
                    Revert the latest item sale, refund the team's bid, and adjust score.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handlePromptUndoLastBid}
                  disabled={items.length === 0}
                  className={`btn-undo-action w-auto px-6 py-2.5 shrink-0 ${items.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Undo2 size={18} /> Undo Last Transaction
                </button>
              </div>

              {/* 5. Team Management Card: Wide 2-Column Grid (Comfortable & Clean) */}
              <div className="admin-card space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-teal-400">
                    <Users size={22} />
                    <h2 className="text-xl font-bold text-white">Team Management</h2>
                  </div>
                  <span className="text-xs text-slate-400">Click ✓ to save edit</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {teams.map((team, idx) => {
                    const isEdited = editingTeamNames[team.id] !== undefined && editingTeamNames[team.id] !== team.name;
                    const currentNameVal = editingTeamNames[team.id] !== undefined ? editingTeamNames[team.id] : team.name;
                    return (
                      <div key={team.id} className="team-manage-item">
                        <span className="font-mono text-slate-500 text-sm w-5">{idx + 1}.</span>
                        <input
                          type="text"
                          value={currentNameVal}
                          onChange={(e) => setEditingTeamNames((prev) => ({ ...prev, [team.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && isEdited) {
                              e.preventDefault();
                              setTeamPendingEdit({ id: team.id, oldName: team.name, newName: currentNameVal });
                            }
                          }}
                          className={`gcl-input-inline ${isEdited ? 'border-cyan-400 ring-1 ring-cyan-400/50' : ''}`}
                        />
                        {isEdited && (
                          <button
                            type="button"
                            title="Save Name Change"
                            onClick={() => setTeamPendingEdit({ id: team.id, oldName: team.name, newName: currentNameVal })}
                            className="p-1.5 rounded-md bg-green-600 hover:bg-green-500 text-white transition-all shadow-md flex items-center justify-center shrink-0"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setTeamToRemove(team)}
                          disabled={teams.length <= 1}
                          className="btn-remove-circle shrink-0"
                          title="Remove Team"
                        >
                          <Minus size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <form onSubmit={handleAddTeam} className="flex gap-2 pt-3 border-t border-slate-700/60">
                  <input
                    type="text"
                    placeholder="Add New Team Name..."
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="gcl-input flex-1 py-1.5 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!newTeamName.trim()}
                    className="btn-primary-add py-1.5 px-4 text-sm"
                  >
                    <Plus size={16} /> Add Team
                  </button>
                </form>
              </div>

              {/* 6. CURRENT ROUND SCOREBOARD (Clean table, inline badge, NO stretched borders!) */}
              <div className="scoreboard-card-current">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <Trophy size={22} className="text-cyan-400" />
                    <h2 className="text-xl font-bold text-white">Current Round Scoreboard</h2>
                    <span className="inline-flex items-center px-2.5 py-0.5 bg-cyan-950/90 border border-cyan-500/60 rounded-full text-cyan-300 text-xs font-bold font-mono">
                      Round {roundIdx + 1}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Live performance for {currentRoundData.name || `Round ${roundIdx + 1}`}
                  </p>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-700/80">
                  <table className="table-attractive">
                    <thead>
                      <tr>
                        <th className="text-center w-16">Rank</th>
                        <th>Team Name</th>
                        <th className="text-center text-yellow-400">Round Score</th>
                        <th className="text-center">Items Won</th>
                        <th className="text-right">Round Spent</th>
                        <th className="text-right text-green-400">Remaining Budget</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentRoundStats.map((team, idx) => {
                        const isOutOfBudget = team.remainingBudget <= 0;
                        const isLowBudget = !isOutOfBudget && team.remainingBudget <= 5000000;
                        return (
                          <tr key={team.id}>
                            <td className="text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                            <td>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-white text-base">{team.name}</span>
                                {isOutOfBudget && (
                                  <span className="badge-out-of-budget">⚠️ OUT OF BUDGET</span>
                                )}
                                {isLowBudget && (
                                  <span className="badge-low-budget">⚠️ LOW</span>
                                )}
                              </div>
                            </td>
                            <td className="text-center font-black text-yellow-400 text-xl font-mono">
                              {team.roundScore}
                            </td>
                            <td className="text-center font-semibold text-indigo-300 font-mono">
                              {team.roundItemsCount}
                            </td>
                            <td className="text-right font-mono text-red-400 font-semibold">
                              {formatCurrency(team.roundSpent)}
                            </td>
                            <td className="text-right font-mono font-bold text-green-400 text-base">
                              {formatCurrency(team.remainingBudget)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 7. OVERALL SCOREBOARD (ALL ROUNDS COMBINED - Matching winner 2025 2.png) */}
              <div className="scoreboard-card-overall">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <Crown size={22} className="text-yellow-400" />
                    <h2 className="text-xl font-bold text-white">Overall Scoreboard (All Rounds Combined)</h2>
                    <span className="inline-flex items-center px-2.5 py-0.5 bg-amber-950/90 border border-yellow-500/60 rounded-full text-yellow-300 text-xs font-bold font-mono">
                      {Math.max(1, currentRoundIndex + 1)} Rounds
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Total Score → Total Items → Total Remaining Budget
                  </p>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-700/80">
                  <table className="table-attractive">
                    <thead>
                      <tr>
                        <th className="text-left">TEAM NAME</th>
                        <th className="text-center text-yellow-400 font-black">TOTAL SCORE</th>
                        <th className="text-center text-slate-300">TOTAL ITEMS</th>
                        <th className="text-right text-red-400">TOTAL SPENT</th>
                        <th className="text-right text-green-400 font-black">TOTAL REM.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overallStats.map((team, idx) => {
                        const isGrandChampion = idx === 0 && team.totalScore > 0;
                        const isOutOfBudget = team.totalRemaining <= 0;
                        return (
                          <tr
                            key={team.id}
                            className={isGrandChampion ? 'tr-grand-champion' : ''}
                          >
                            <td>
                              <div className="flex items-center gap-3">
                                <span className={`font-mono font-bold text-lg ${isGrandChampion ? 'text-yellow-400' : 'text-blue-400'}`}>
                                  {idx + 1}.
                                </span>
                                <div>
                                  <span className="font-bold text-white text-base">{team.name}</span>
                                  {isGrandChampion && (
                                    <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase block">
                                      GRAND CHAMPION
                                    </span>
                                  )}
                                  {isOutOfBudget && (
                                    <span className="badge-out-of-budget ml-2">⚠️ OUT OF BUDGET</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="text-center font-black text-yellow-400 text-2xl font-mono">
                              {team.totalScore}
                            </td>
                            <td className="text-center font-bold text-slate-200 text-lg font-mono">
                              {team.totalItems}
                            </td>
                            <td className="text-right font-mono text-red-400 font-bold text-base">
                              {formatCurrency(team.totalSpent)}
                            </td>
                            <td className="text-right font-mono font-black text-green-400 text-lg">
                              {formatCurrency(team.totalRemaining)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 8. PREVIOUS ROUND SCOREBOARD */}
              <div className="scoreboard-card-previous">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <HistoryIcon size={22} className="text-indigo-400" />
                    <h2 className="text-xl font-bold text-white">Previous Round Scoreboard</h2>
                  </div>
                  <p className="text-xs text-slate-400">
                    Archived final snapshot of completed rounds
                  </p>
                </div>

                {pastRounds.length === 0 ? (
                  <div className="p-8 text-center bg-slate-900/60 rounded-xl border border-dashed border-slate-700">
                    <p className="text-slate-400 font-medium">No previous round completed yet.</p>
                    <p className="text-slate-500 text-xs mt-1">
                      When Round 1 finishes and advances to the next stage, its completed scoreboard will be displayed here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {pastRounds.map((snap) => (
                      <div key={snap.roundIndex} className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <h3 className="font-bold text-indigo-300 text-sm uppercase tracking-wide">
                            {snap.roundName || `Round ${snap.roundIndex + 1}`} Final Results
                          </h3>
                          {snap.timestamp && (
                            <span className="text-slate-500 text-xs">
                              Finished at {new Date(snap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-slate-700/80">
                          <table className="table-attractive">
                            <thead>
                              <tr>
                                <th className="text-center w-16">Rank</th>
                                <th>Team</th>
                                <th className="text-center text-yellow-400">Score</th>
                                <th className="text-center">Items Won</th>
                                <th className="text-right">Total Spent</th>
                                <th className="text-right text-green-400">Remaining Budget</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[...(snap.results || [])]
                                .sort((a, b) => (b.score || 0) - (a.score || 0) || b.remainingBudget - a.remainingBudget)
                                .map((res, idx) => (
                                  <tr key={res.id || idx}>
                                    <td className="text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                                    <td className="font-bold text-white">{res.name}</td>
                                    <td className="text-center font-bold text-yellow-400 text-lg font-mono">
                                      {res.score || 0}
                                    </td>
                                    <td className="text-center font-semibold text-indigo-300 font-mono">
                                      {res.itemsCount || 0}
                                    </td>
                                    <td className="text-right font-mono text-red-400 font-semibold">
                                      {formatCurrency(res.totalSpent || 0)}
                                    </td>
                                    <td className="text-right font-mono font-bold text-green-400">
                                      {formatCurrency(res.remainingBudget || 0)}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 9. Danger Zone Bar: Sleek Horizontal Strip at the Bottom */}
              <div className="admin-card border-l-4 border-l-red-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 px-6">
                <div>
                  <h2 className="card-title text-red-400 mb-0.5 text-lg">
                    <AlertCircle size={20} /> Danger Zone
                  </h2>
                  <p className="text-xs text-slate-400">
                    Wipe all transactions, reset team scores to 0, and restore starting budgets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConfirmingReset(true)}
                  className="btn-danger-reset w-auto px-6 py-2.5 shrink-0"
                >
                  Full Reset (DANGER)
                </button>
              </div>
            </div>

            {/* Right Sidebar Column: Pinned Transaction Log (NO other cards competing!) */}
            <div className="lg:col-span-1 lg:sticky lg:top-20">
              <div className="admin-card transaction-log-card flex flex-col h-[750px] max-h-[calc(100vh-100px)] shadow-2xl">
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-700/60">
                  <h2 className="card-title text-purple-400 mb-0 flex items-center gap-2">
                    <HistoryIcon size={20} /> Transaction Log
                  </h2>
                  <span className="text-xs font-mono text-purple-300 bg-purple-950/80 px-2.5 py-0.5 rounded-full border border-purple-800">
                    {localHistory.length} events
                  </span>
                </div>
                <div className="space-y-3 transaction-log-scroll flex-grow overflow-y-auto pr-1">
                  {localHistory.length === 0 ? (
                    <p className="text-slate-500 italic text-sm py-4 text-center">
                      No transactions recorded yet. Submit bids to see live logs!
                    </p>
                  ) : (
                    localHistory.map((item) => {
                      const isSold = item.action === 'SOLD';
                      const isUndo = item.action === 'UNDO';
                      return (
                        <div
                          key={item.id}
                          className={`log-item ${
                            isSold
                              ? 'log-sold'
                              : isUndo
                              ? 'log-undo'
                              : 'log-default'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="log-action">{item.action}</span>
                            <span className="log-time">{item.time}</span>
                          </div>
                          <p className="log-details">{item.details}</p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. INTERMISSION STATE */}
      {gameState === 'intermission' && (
        <div className="admin-intermission-container space-y-8 max-w-4xl mx-auto">
          <div className="admin-card text-center p-8 space-y-6">
            <div className="flex flex-col items-center text-cyan-400">
              <Loader2 size={60} className="animate-spin mb-4" />
              <h2 className="text-3xl font-extrabold text-white">Intermission in Progress</h2>
              <p className="text-base text-slate-400 mt-2 max-w-xl">
                {roundIdx === 2 ? (
                  <>
                    Round 3 results are currently displayed on the live screen.
                    <br />
                    Teams have been reset. Waiting to start Round 4.
                  </>
                ) : (
                  <>
                    Round {roundIdx} results are currently displayed on the live screen.
                    <br />
                    Teams will receive their reset round budgets. Ready to start {currentRoundData.name}.
                  </>
                )}
              </p>
            </div>

            {roundIdx === 2 ? (
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-6">
                <button
                  type="button"
                  onClick={handleStartTieBreaker}
                  className="btn-intermission-tie w-full sm:w-auto"
                >
                  <Play size={20} fill="currentColor" /> START Tie Breaker
                </button>
                <button
                  type="button"
                  onClick={handleGoToWinnerReveal}
                  className="btn-intermission-reveal w-full sm:w-auto"
                >
                  <Trophy size={20} /> SKIP & REVEAL WINNERS
                </button>
              </div>
            ) : (
              <div className="flex justify-center mt-6">
                <button
                  type="button"
                  onClick={handleStartNextRound}
                  className="btn-start-round"
                >
                  <Play size={24} fill="currentColor" /> START {currentRoundData.name}
                </button>
              </div>
            )}
          </div>

          {/* Team Management (Intermission) matching reference screenshot */}
          <div className="admin-card">
            <h2 className="card-title text-cyan-400 mb-1 flex items-center gap-2">
              <Users size={20} /> Team Management (Intermission)
            </h2>
            <p className="text-slate-400 text-sm mb-4">Updates made here are live.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {teams.map((team, idx) => (
                <div key={team.id} className="team-manage-item">
                  <span className="font-mono text-slate-500 text-sm w-5">{idx + 1}.</span>
                  <input
                    type="text"
                    value={team.name}
                    onChange={(e) => handleTeamNameChange(team.id, e.target.value)}
                    className="gcl-input-inline"
                  />
                  <button
                    onClick={() => setTeamToRemove(team)}
                    disabled={teams.length <= 1}
                    className="btn-remove-circle"
                  >
                    <Minus size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. WINNER REVEAL STATE (Manual Podium Management matching Old GCL reference) */}
      {gameState === 'winner_reveal' && (
        <div className="admin-reveal-container space-y-8 max-w-5xl mx-auto">
          {/* Podium Management Card */}
          <div className="podium-mgmt-card">
            <div className="text-center mb-6">
              <Crown size={48} className="text-yellow-400 mx-auto mb-2" />
              <h2 className="text-3xl font-black text-white">Podium Management</h2>
              <p className="text-slate-400 text-sm md:text-base mt-1">
                Manually select winners and reveal them one by one. Live updates immediately.
              </p>
            </div>

            <div className="podium-mgmt-grid mb-4">
              {/* 3rd Place (Bronze) */}
              <div className="podium-col-card podium-col-bronze">
                <div className="podium-col-header text-orange-400">
                  <Medal size={20} />
                  <span>3RD PLACE</span>
                </div>
                <select
                  value={podiumState.thirdTeamId || ''}
                  onChange={(e) => updatePodiumTeam('third', e.target.value)}
                  className="gcl-select"
                >
                  <option value="">-- Select Team --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Pts: {t.score || 0})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => togglePodiumReveal('third')}
                  className={`btn-reveal-toggle ${
                    podiumState.thirdRevealed ? 'btn-reveal-bronze' : 'btn-reveal-hidden'
                  }`}
                >
                  {podiumState.thirdRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
                  {podiumState.thirdRevealed ? 'Hide 3rd Place' : 'Reveal 3rd Place'}
                </button>
              </div>

              {/* 2nd Place (Silver) */}
              <div className="podium-col-card podium-col-silver">
                <div className="podium-col-header text-slate-300">
                  <Medal size={20} />
                  <span>2ND PLACE</span>
                </div>
                <select
                  value={podiumState.secondTeamId || ''}
                  onChange={(e) => updatePodiumTeam('second', e.target.value)}
                  className="gcl-select"
                >
                  <option value="">-- Select Team --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Pts: {t.score || 0})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => togglePodiumReveal('second')}
                  className={`btn-reveal-toggle ${
                    podiumState.secondRevealed ? 'btn-reveal-silver' : 'btn-reveal-hidden'
                  }`}
                >
                  {podiumState.secondRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
                  {podiumState.secondRevealed ? 'Hide 2nd Place' : 'Reveal 2nd Place'}
                </button>
              </div>

              {/* Champion (1st) (Gold) */}
              <div className="podium-col-card podium-col-gold">
                <div className="podium-col-header text-yellow-400">
                  <Crown size={20} />
                  <span>CHAMPION (1ST)</span>
                </div>
                <select
                  value={podiumState.firstTeamId || ''}
                  onChange={(e) => updatePodiumTeam('first', e.target.value)}
                  className="gcl-select"
                >
                  <option value="">-- Select Team --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (Pts: {t.score || 0})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => togglePodiumReveal('first')}
                  className={`btn-reveal-toggle ${
                    podiumState.firstRevealed ? 'btn-reveal-gold' : 'btn-reveal-hidden'
                  }`}
                >
                  {podiumState.firstRevealed ? <EyeOff size={16} /> : <Eye size={16} />}
                  {podiumState.firstRevealed ? 'Hide Champion' : 'Reveal Champion'}
                </button>
              </div>
            </div>
          </div>

          {/* Reference: Calculated Stats (All Rounds) */}
          <div className="admin-card">
            <h3 className="card-title text-indigo-400 mb-4">
              Reference: Calculated Stats (All Rounds)
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left">
                <thead className="bg-slate-900 border-b border-slate-700">
                  <tr className="text-slate-400 text-xs uppercase tracking-wider">
                    <th className="p-3">RANK (AUTO)</th>
                    <th className="p-3">TEAM</th>
                    <th className="p-3 text-center">TOTAL SCORE</th>
                    <th className="p-3 text-center">TOTAL ITEMS</th>
                    <th className="p-3 text-right">TOTAL REM.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {overallStats.map((team, idx) => (
                    <tr key={team.id} className="hover:bg-slate-800/40">
                      <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3 font-bold text-white">{team.name}</td>
                      <td className="p-3 text-center font-bold text-yellow-400 font-mono text-lg">
                        {team.totalScore}
                      </td>
                      <td className="p-3 text-center text-slate-300 font-mono">{team.totalItems}</td>
                      <td className="p-3 text-right font-mono text-green-400 font-bold">
                        {formatCurrency(team.totalRemaining)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
              <button
                type="button"
                onClick={handleStartTieBreaker}
                className="btn-force-tie w-full sm:w-auto"
              >
                <Flag size={18} /> Force Tie Breaker (R4)
              </button>

              <button
                type="button"
                onClick={() => setIsConfirmingReset(true)}
                className="btn-end-reset w-full sm:w-auto"
              >
                <RefreshCw size={18} /> End Event & Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CONFIRMATION MODALS (Point 7) --- */}

      {/* 1. Confirm SOLD Modal */}
      {isConfirmingSold && selectedWinningTeam && (
        <div className="gcl-modal-overlay" onClick={() => setIsConfirmingSold(false)}>
          <div className="gcl-modal-box border-green-500/60" onClick={(e) => e.stopPropagation()}>
            <h3 className="gcl-modal-title text-green-400">
              <CheckCircle2 size={26} className="text-green-400" />
              Confirm Winning Bid (SOLD!)
            </h3>
            <p className="gcl-modal-body">
              Please review and confirm this auction sale before recording it:
            </p>

            <div className="gcl-modal-details">
              <div className="flex justify-between items-center text-sm py-1 border-b border-slate-700/60">
                <span className="text-slate-400">Winning Team:</span>
                <span className="font-bold text-white text-base">{selectedWinningTeam.name}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-slate-700/60">
                <span className="text-slate-400">Question Ref:</span>
                <span className="font-mono font-bold text-yellow-400">R{roundIdx + 1} - Q{questionIdx + 1}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-slate-700/60">
                <span className="text-slate-400">Final Bid Amount:</span>
                <span className="font-mono font-bold text-cyan-400 text-lg">{formatCurrency(parseFloat(bidAmount))}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-slate-700/60">
                <span className="text-slate-400">Answer Evaluation:</span>
                <span className={`font-bold ${isAnswerCorrect ? 'text-green-400' : 'text-red-400'}`}>
                  {isAnswerCorrect ? '✓ CORRECT (+1 Point Score)' : '✗ INCORRECT (0 Points Score)'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm py-1">
                <span className="text-slate-400">Remaining Budget After:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatCurrency(Math.max(0, selectedWinningTeam.budget - parseFloat(bidAmount)))}
                </span>
              </div>
            </div>

            <div className="gcl-modal-actions">
              <button
                type="button"
                onClick={() => setIsConfirmingSold(false)}
                className="btn-modal-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingSold(false);
                  handleExecuteBidSubmit();
                }}
                className="btn-modal-confirm-green"
              >
                Confirm & Mark SOLD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Confirm Undo Modal */}
      {isConfirmingUndo && lastItem && (
        <div className="gcl-modal-overlay" onClick={() => setIsConfirmingUndo(false)}>
          <div className="gcl-modal-box border-orange-500/70" onClick={(e) => e.stopPropagation()}>
            <h3 className="gcl-modal-title text-orange-400">
              <Undo2 size={26} className="text-orange-400" />
              Confirm Undo Last Transaction
            </h3>
            <p className="gcl-modal-body">
              Are you sure you want to revert the most recent sale? This will refund the bid amount and roll back the team's score.
            </p>

            <div className="gcl-modal-details">
              <div className="flex justify-between items-center text-sm py-1 border-b border-slate-700/60">
                <span className="text-slate-400">Transaction Item:</span>
                <span className="font-semibold text-white truncate max-w-[200px]">{lastItem.item_name}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-slate-700/60">
                <span className="text-slate-400">Question Ref:</span>
                <span className="font-mono font-bold text-yellow-400">{lastItem.question_ref || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-slate-700/60">
                <span className="text-slate-400">Team to Refund:</span>
                <span className="font-bold text-white">{lastItemTeam?.name || 'Unknown Team'}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-slate-700/60">
                <span className="text-slate-400">Refund Amount:</span>
                <span className="font-mono font-bold text-green-400">+{formatCurrency(lastItem.cost)}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1">
                <span className="text-slate-400">Score Reversion:</span>
                <span className="font-bold text-orange-400">
                  {lastItem.is_correct ? '-1 Point' : '0 Points (No change)'}
                </span>
              </div>
            </div>

            <div className="gcl-modal-actions">
              <button
                type="button"
                onClick={() => setIsConfirmingUndo(false)}
                className="btn-modal-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingUndo(false);
                  handleExecuteUndoLastBid();
                }}
                className="btn-modal-confirm-red bg-orange-600 hover:bg-orange-500 shadow-orange-600/40"
              >
                Yes, Undo Transaction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Confirm Full Reset (DANGER) Modal */}
      {isConfirmingReset && (
        <div className="gcl-modal-overlay" onClick={() => setIsConfirmingReset(false)}>
          <div className="gcl-modal-box border-red-500/80" onClick={(e) => e.stopPropagation()}>
            <h3 className="gcl-modal-title text-red-400">
              <AlertTriangle size={26} className="text-red-500 animate-pulse" />
              Full Reset (DANGER)
            </h3>
            <p className="gcl-modal-body">
              <strong className="text-red-300">Warning: You are about to initiate a complete system wipe!</strong>
              <br /><br />
              This will:
              <br />• Delete all recorded bids, sold items, and questions
              <br />• Reset all team scores to 0
              <br />• Restore team budgets to starting amount ({formatCurrency(parseInt(budgetInput) || 50000000)})
              <br />• Reset the entire auction back to initial setup
              <br /><br />
              <span className="text-red-400 font-bold">This action CANNOT be undone!</span>
            </p>

            <div className="gcl-modal-actions">
              <button
                type="button"
                onClick={() => setIsConfirmingReset(false)}
                className="btn-modal-cancel"
              >
                Cancel, Keep Everything
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsConfirmingReset(false);
                  resetGameAndDatabase();
                }}
                className="btn-modal-confirm-red"
              >
                Yes, Wipe & Reset Everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Confirm Team Rename Modal */}
      {teamPendingEdit && (
        <div className="gcl-modal-overlay" onClick={() => setTeamPendingEdit(null)}>
          <div className="gcl-modal-box border-cyan-500/70" onClick={(e) => e.stopPropagation()}>
            <h3 className="gcl-modal-title text-cyan-400">
              <Users size={24} className="text-cyan-400" />
              Confirm Team Name Change
            </h3>
            <p className="gcl-modal-body">
              Please confirm the new name for this team across the live auction:
            </p>

            <div className="gcl-modal-details">
              <div className="flex justify-between items-center text-sm py-1 border-b border-slate-700/60">
                <span className="text-slate-400">Current Name:</span>
                <span className="font-semibold text-slate-300 line-through">{teamPendingEdit.oldName}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1">
                <span className="text-slate-400">New Name:</span>
                <span className="font-bold text-cyan-300 text-base">{teamPendingEdit.newName}</span>
              </div>
            </div>

            <div className="gcl-modal-actions">
              <button
                type="button"
                onClick={() => setTeamPendingEdit(null)}
                className="btn-modal-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTeamRename}
                className="btn-modal-confirm-green bg-cyan-600 hover:bg-cyan-500 shadow-cyan-600/40"
              >
                Save & Rename Team
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Confirm Team Removal Modal */}
      {teamToRemove && (
        <TeamRemoveModal
          team={teamToRemove}
          gameState={gameState}
          onConfirm={handleConfirmRemoveTeam}
          onCancel={() => setTeamToRemove(null)}
        />
      )}
    </div>
  );
}
