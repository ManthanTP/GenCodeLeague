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
import type { Team, PastRoundSnapshot, TransactionEntry, TeamItem, EventState } from '../types/database';

export default function AdminPanel() {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const { eventState, setEventState, edition, loading: stateLoading } = useEventState();
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
      navigate('/123456789/GCL@admin');
    }
  }, [authLoading, isAdmin, navigate]);

  // UI States
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [teamToRemove, setTeamToRemove] = useState<Team | null>(null);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  // Setup form states
  const [budgetInput, setBudgetInput] = useState<string>('50000000');
  const [newTeamName, setNewTeamName] = useState<string>('');

  // Active round auction states
  const [bidAmount, setBidAmount] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean>(false);
  const [currentItem, setCurrentItem] = useState<string>('');
  const [localHistory, setLocalHistory] = useState<TransactionEntry[]>([]);

  // Update budgetInput when edition loads
  useEffect(() => {
    if (edition?.starting_budget) {
      setBudgetInput(edition.starting_budget.toString());
    }
  }, [edition?.starting_budget]);

  // Keep currentItem in sync with eventState.current_item_name
  useEffect(() => {
    if (eventState?.current_item_name !== undefined) {
      setCurrentItem(eventState.current_item_name || '');
    }
  }, [eventState?.current_item_name]);

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
    setLocalHistory((prev) => [entry, ...prev]);
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
    const { error } = await supabase
      .from('editions')
      .update({ starting_budget: val })
      .eq('id', edition.id);

    if (error) {
      showNotification('Failed to update starting budget', 'error');
    } else {
      showNotification(`Starting budget updated to ${formatCurrency(val)}`, 'success');
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
    const resetTeams = teams.map((t) => ({ ...t, budget: targetBudget, score: 0 }));
    setTeams(resetTeams);
    broadcastTeamsChange(resetTeams);

    const nextState: Partial<EventState> = {
      game_state: 'waiting_start',
      current_round_index: 0,
      current_question_index: 0,
      current_item_name: '',
      current_bid_preview: null,
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

    // If entering from intermission, reset round budgets
    if (eventState?.game_state === 'intermission') {
      const standardBudget = edition?.starting_budget || 50000000;
      const refreshedTeams = teams.map((t) => ({ ...t, budget: standardBudget }));
      setTeams(refreshedTeams);
      broadcastTeamsChange(refreshedTeams);
      for (const t of refreshedTeams) {
        supabase.from('teams').update({ budget: standardBudget }).eq('id', t.id).then();
      }
    }

    const nextState: Partial<EventState> = {
      game_state: 'active',
      current_round_index: rIdx,
      current_question_index: 0,
      current_item_name: firstQ,
      current_bid_preview: null,
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

  const handleItemNameChange = async (text: string) => {
    setCurrentItem(text);
    if (!eventState?.id) return;
    setEventState((prev) => (prev ? { ...prev, current_item_name: text } : null));
    broadcastStateChange({ current_item_name: text });
    supabase
      .from('event_state')
      .update({ current_item_name: text, updated_at: new Date().toISOString() })
      .eq('id', eventState.id)
      .then();
  };

  const handleLoadQuestionFromData = () => {
    const rIdx = eventState?.current_round_index ?? 0;
    const qIdx = eventState?.current_question_index ?? 0;
    const qText = DEFAULT_ROUNDS_DATA[rIdx]?.questions[qIdx] || '';
    if (qText) {
      handleItemNameChange(qText);
      showNotification(`Loaded question Q${qIdx + 1}`, 'success');
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

  // --- SOLD SUBMISSION ---
  const handleBidSubmit = async (e: React.FormEvent) => {
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

      const existingPastRounds: PastRoundSnapshot[] = eventState.banner_message
        ? JSON.parse(eventState.banner_message)
        : [];
      const updatedPastRounds = [...existingPastRounds, newSnapshot];

      if (rIdx === 2) {
        // Round 3 completed -> Grand Champions Reveal!
        nextGameState = 'winner_reveal';
        showNotification('Round 3 Finished! Revealing Grand Champions.', 'success');
        addHistory('Round 3 Complete', 'Showing Top 3 Podium and Grand Standings.');
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

      const nextState: Partial<EventState> = {
        game_state: nextGameState,
        current_round_index: nextRoundIdx,
        current_question_index: nextQuestionIdx,
        current_item_name: '',
        current_bid_preview: null,
        banner_message: JSON.stringify(updatedPastRounds),
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

  // --- UNDO LAST BID ---
  const handleUndoLastBid = async () => {
    if (!items || items.length === 0 || !eventState?.id) {
      showNotification('No transactions to undo.', 'error');
      return;
    }

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
        <div className="admin-page-container grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Controls Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Round Progression Card */}
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
                <div className="advance-notice-box">
                  <p className="advance-title">Round End: Ready to Advance</p>
                  <p className="advance-desc">
                    Selling this item will automatically advance the auction to the next stage!
                  </p>
                </div>
              )}
            </div>

            {/* Question & Timer Card */}
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

            {/* Final Bid & Answer Form */}
            <form onSubmit={handleBidSubmit} className="admin-card">
              <h2 className="card-title text-blue-400 mb-4">
                <Hammer size={22} /> Final Bid & Answer Evaluation
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Team Selection */}
                <div>
                  <label className="input-label">Select Winning Team</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                    {teams.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleTeamSelection(t.id)}
                        className={`team-select-btn ${
                          selectedTeamId === t.id ? 'team-btn-selected' : 'team-btn-default'
                        }`}
                      >
                        <span className="font-semibold text-sm truncate w-full">{t.name}</span>
                        <span className="badge-team-score">★ {t.score || 0}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bid Amount & Fast Buttons */}
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
                      <span className="text-white font-bold">
                        {formatCurrency(parseFloat(bidAmount))}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Answer Result Evaluation Toggle */}
              <div className="answer-toggle-row">
                <div className="flex items-center gap-2">
                  <HelpCircle className="text-yellow-400" size={24} />
                  <div>
                    <p className="text-white font-bold">Answer Evaluation</p>
                    <p className="text-slate-400 text-xs">Did the winning team answer correctly?</p>
                  </div>
                </div>
                <div className="toggle-pill-wrapper">
                  <button
                    type="button"
                    onClick={() => setIsAnswerCorrect(false)}
                    className={`btn-toggle-option ${
                      !isAnswerCorrect ? 'toggle-wrong' : 'toggle-inactive'
                    }`}
                  >
                    <XCircle size={18} /> Incorrect (0)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAnswerCorrect(true)}
                    className={`btn-toggle-option ${
                      isAnswerCorrect ? 'toggle-correct' : 'toggle-inactive'
                    }`}
                  >
                    <Check size={18} /> Correct (+1)
                  </button>
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

            {/* Corrections Section */}
            <div className="admin-card border-l-4 border-l-orange-500">
              <h2 className="card-title text-orange-400 mb-3">
                <Undo2 size={22} /> Corrections
              </h2>
              <button onClick={handleUndoLastBid} className="btn-undo-action">
                <Undo2 size={20} /> Undo Last Transaction
              </button>
            </div>

            {/* Admin Live Scoreboard */}
            <div className="admin-card">
              <h2 className="card-title text-yellow-400 mb-4">
                <Trophy size={22} /> Admin Live Scoreboard
              </h2>
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-slate-400 text-xs uppercase">
                    <tr>
                      <th className="p-3">Rank</th>
                      <th className="p-3">Team</th>
                      <th className="p-3 text-right text-yellow-400">Score</th>
                      <th className="p-3 text-right">Items</th>
                      <th className="p-3 text-right">Spent</th>
                      <th className="p-3 text-right">Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {[...teamsWithStats]
                      .sort((a, b) => (b.score || 0) - (a.score || 0) || b.budget - a.budget)
                      .map((t, idx) => (
                        <tr key={t.id} className="hover:bg-slate-800/40">
                          <td className="p-3 font-mono text-slate-500">{idx + 1}</td>
                          <td className="p-3 font-bold text-white">{t.name}</td>
                          <td className="p-3 text-right font-black text-yellow-400 text-lg">
                            {t.score || 0}
                          </td>
                          <td className="p-3 text-right text-indigo-300">{t.itemsCount}</td>
                          <td className="p-3 text-right text-red-400 font-semibold">
                            {formatCurrency(t.totalSpent)}
                          </td>
                          <td className="p-3 text-right text-green-400 font-bold">
                            {formatCurrency(t.budget)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Danger Zone: Full Reset */}
            <div className="admin-card border-l-4 border-l-red-500">
              <h2 className="card-title text-red-400 mb-3">
                <AlertCircle size={22} /> Danger Zone
              </h2>
              {!isConfirmingReset ? (
                <button
                  onClick={() => setIsConfirmingReset(true)}
                  className="btn-danger-reset"
                >
                  Full Reset (DANGER)
                </button>
              ) : (
                <div className="reset-confirmation-card">
                  <p className="text-white font-medium mb-3">
                    Are you sure? This will wipe all current scores and transactions, and restore default teams and starting budgets.
                  </p>
                  <div className="flex gap-3">
                    <button onClick={resetGameAndDatabase} className="btn-confirm-wipe">
                      Yes, Reset Everything
                    </button>
                    <button
                      onClick={() => setIsConfirmingReset(false)}
                      className="btn-cancel-wipe"
                    >
                      No, Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Live Team Management & Transaction Log */}
          <div className="space-y-8">
            {/* Live Team Management */}
            <div className="admin-card space-y-4">
              <h2 className="card-title text-teal-400">
                <Users size={22} /> Team Management
              </h2>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
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

            {/* Transaction Log */}
            <div className="admin-card flex flex-col h-[600px]">
              <h2 className="card-title text-purple-400 mb-4">
                <HistoryIcon size={22} /> Transaction Log
              </h2>
              <div className="space-y-3 overflow-y-auto pr-2 flex-grow">
                {localHistory.length === 0 ? (
                  <p className="text-slate-500 italic text-sm">
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
      )}

      {/* 4. INTERMISSION STATE */}
      {gameState === 'intermission' && (
        <div className="admin-intermission-container space-y-8">
          <div className="admin-card text-center p-8 space-y-6">
            <div className="flex flex-col items-center text-indigo-400">
              <Loader2 size={64} className="animate-spin mb-4" />
              <h2 className="text-3xl font-bold text-white">Intermission in Progress</h2>
              <p className="text-lg text-slate-400 mt-2">
                Round {roundIdx} results are currently displayed on the live screen.
                <br />
                Teams will receive their reset round budgets. Ready to start Round {roundIdx + 1}.
              </p>
            </div>
            <button onClick={handleStartNextRound} className="btn-start-round">
              <Play size={24} fill="currentColor" /> START {currentRoundData.name}
            </button>
          </div>
        </div>
      )}

      {/* 5. WINNER REVEAL STATE */}
      {gameState === 'winner_reveal' && (
        <div className="admin-reveal-container space-y-8">
          {(() => {
            const sorted = [...teamsWithStats].sort(
              (a, b) => (b.score || 0) - (a.score || 0) || b.budget - a.budget
            );
            const winner = sorted[0];
            const runnerUp = sorted[1];
            const isDraw =
              winner && runnerUp && (winner.score || 0) === (runnerUp.score || 0);

            return (
              <div className="admin-card text-center p-8 space-y-6">
                <div className="flex flex-col items-center">
                  {isDraw ? (
                    <Flag size={64} className="text-orange-400 animate-bounce mb-4" />
                  ) : (
                    <Crown size={64} className="text-yellow-400 animate-bounce mb-4" />
                  )}
                  <h2 className="text-3xl font-extrabold text-white">
                    {isDraw ? 'Tie Detected!' : 'Top 3 Winners Revealed!'}
                  </h2>
                  <p className="text-lg text-slate-400 mt-2">
                    {isDraw
                      ? `Scores are tied between ${winner?.name} and ${runnerUp?.name} (${winner?.score} pts). You may start a Tie Breaker round.`
                      : `The Live Screen is proudly displaying the Top 3 Podium and Grand Standings.`}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <button
                    onClick={async () => {
                      if (!eventState?.id) return;
                      const tieItem = DEFAULT_ROUNDS_DATA[3]?.questions[0] || '';
                      const tieState: Partial<EventState> = {
                        game_state: 'active',
                        current_round_index: 3,
                        current_question_index: 0,
                        current_item_name: tieItem,
                        current_bid_preview: null,
                        updated_at: new Date().toISOString(),
                      };
                      setEventState((prev) => (prev ? { ...prev, ...tieState } : null));
                      setCurrentItem(tieItem);
                      broadcastStateChange(tieState);
                      supabase.from('event_state').update(tieState).eq('id', eventState.id).then();
                      showNotification('Started Tie Breaker Round!', 'success');
                    }}
                    className={`btn-tie-action ${
                      isDraw ? 'btn-tie-active' : 'btn-tie-default'
                    }`}
                  >
                    <Flag size={20} /> {isDraw ? 'START TIE BREAKER (R4)' : 'Start Tie Breaker'}
                  </button>

                  <button onClick={resetGameAndDatabase} className="btn-end-event">
                    <RefreshCw size={20} /> End Event & Reset
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
