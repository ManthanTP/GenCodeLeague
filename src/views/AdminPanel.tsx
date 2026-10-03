import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Award,
  Archive,
  Calculator,
  Lock,
  KeyRound,
  Search,
  Trash2,
  Edit3,
  Save,
  Sparkles,
  Filter,
} from 'lucide-react';
import AdminCertificateManager from '../components/AdminCertificateManager';
import AdminArchiveManager from '../components/AdminArchiveManager';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useEventState, broadcastStateChange } from '../hooks/useEventState';
import { useTeams, broadcastTeamsChange } from '../hooks/useTeams';
import { useTeamItems, broadcastItemsChange } from '../hooks/useTeamItems';
import { useTimer } from '../hooks/useTimer';
import { useLeaderboardReveal, broadcastLeaderboardRevealChange } from '../hooks/useLeaderboardReveal';
import Header from '../components/Header';
import Notification, { type NotificationState } from '../components/Notification';
import ConnectionHealth from '../components/ConnectionHealth';
import TeamRemoveModal from '../components/TeamRemoveModal';
import { formatCurrency } from '../utils/formatters';
import { DEFAULT_ROUNDS_DATA, MIN_INCREMENT, getRoundBasePrice } from '../data/roundsData';
import type { Team, PastRoundSnapshot, TransactionEntry, TeamItem, EventState, LeaderboardRevealEntry, TeamMember } from '../types/database';

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

  // Pure Supabase Admin Authentication check
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/123456789/GCL-0321/admin/login');
    }
  }, [authLoading, isAdmin, navigate]);

  // UI States & URL Tab Sync
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const validTab: 'auction' | 'teams' | 'certificates' | 'archive' =
    urlTab === 'certificates' || urlTab === 'archive' || urlTab === 'auction' || urlTab === 'teams'
      ? urlTab
      : 'auction';

  const [adminActiveTab, setAdminActiveTab] = useState<'auction' | 'teams' | 'certificates' | 'archive'>(validTab);

  useEffect(() => {
    if (urlTab && (urlTab === 'certificates' || urlTab === 'archive' || urlTab === 'auction' || urlTab === 'teams')) {
      setAdminActiveTab(urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (tab: 'auction' | 'teams' | 'certificates' | 'archive') => {
    setAdminActiveTab(tab);
    setSearchParams({ tab });
  };

  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [teamToRemove, setTeamToRemove] = useState<Team | null>(null);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);
  const [isFinalizingArchive, setIsFinalizingArchive] = useState(false);
  const [isNewEditionModalOpen, setIsNewEditionModalOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // 4 Confirmation Dialog States (Point 7)
  const [isConfirmingSold, setIsConfirmingSold] = useState(false);
  const [isConfirmingUndo, setIsConfirmingUndo] = useState(false);
  const [isTeamManagementModalOpen, setIsTeamManagementModalOpen] = useState(false);
  const [editingTeamNames, setEditingTeamNames] = useState<Record<string, string>>({});
  const [teamPendingEdit, setTeamPendingEdit] = useState<{ id: string; oldName: string; newName: string } | null>(null);

  // Setup form states
  const [budgetInput, setBudgetInput] = useState<string>('50000000');
  const [newTeamName, setNewTeamName] = useState<string>('');
  const [newTeamMembers, setNewTeamMembers] = useState<string>('');
  const [teamMembersMap, setTeamMembersMap] = useState<Record<string, TeamMember[]>>({});
  const [expandedTeamMembers, setExpandedTeamMembers] = useState<Record<string, boolean>>({});
  const [newMemberInputs, setNewMemberInputs] = useState<Record<string, string>>({});
  const [addingMemberTeamId, setAddingMemberTeamId] = useState<string | null>(null);

  // Dedicated Team Management tab states
  const [teamSearchQuery, setTeamSearchQuery] = useState<string>('');
  const [teamFilterStatus, setTeamFilterStatus] = useState<'all' | 'with-members' | 'no-members'>('all');
  const [showAddTeamPanel, setShowAddTeamPanel] = useState<boolean>(true);
  const [editingBudgetTeamId, setEditingBudgetTeamId] = useState<string | null>(null);
  const [editingBudgetValue, setEditingBudgetValue] = useState<string>('');

  // Active round auction states
  const [bidAmount, setBidAmount] = useState<string>('');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean>(false);
  const [currentItem, setCurrentItem] = useState<string>('');

  // Persistent Transaction History scoped strictly to current active edition
  const [localHistory, setLocalHistory] = useState<TransactionEntry[]>([]);

  useEffect(() => {
    if (!edition?.id) {
      setLocalHistory([]);
      return;
    }
    try {
      const saved = localStorage.getItem(`gcl_transaction_history_${edition.id}`);
      setLocalHistory(saved ? JSON.parse(saved) : []);
    } catch {
      setLocalHistory([]);
    }
  }, [edition?.id]);

  // Podium Management State (matches Old GCL Admin UI)
  const [podiumState, setPodiumState] = useState({
    thirdTeamId: null as string | null,
    thirdTeamName: null as string | null,
    thirdRevealed: false,
    secondTeamId: null as string | null,
    secondTeamName: null as string | null,
    secondRevealed: false,
    firstTeamId: null as string | null,
    firstTeamName: null as string | null,
    firstRevealed: false,
  });

  // Round 1 Leaderboard Reveal State
  const { reveals: r1Reveals, setReveals: setR1Reveals } = useLeaderboardReveal(edition?.id, 0);
  const [selectedRevealTeamId, setSelectedRevealTeamId] = useState<string>('');

  // Round 2 -> Round 3 Budget Verification & Confirmation State
  const [isConfirmingR3Budgets, setIsConfirmingR3Budgets] = useState<boolean>(false);
  const [r3BudgetsConfirmed, setR3BudgetsConfirmed] = useState<boolean>(false);

  // Ordinal position helper (e.g. 7TH, 6TH, 1ST)
  const formatOrdinal = (n: number) => {
    const s = ['TH', 'ST', 'ND', 'RD'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  // Podium Management Table Filter Tab ('all' | 'overall' | roundIndex)
  const [podiumTab, setPodiumTab] = useState<'all' | 'overall' | number>('all');

  // Debouncing refs for question typing to prevent websocket echo glitches
  const isTypingQuestionRef = useRef(false);
  const questionDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const teamNameDebounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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

  // Sync podium state from eventState.banner_message when available (resets if cleared/null)
  useEffect(() => {
    if (!eventState?.banner_message) {
      setPodiumState({
        thirdTeamId: null,
        thirdTeamName: null,
        thirdRevealed: false,
        secondTeamId: null,
        secondTeamName: null,
        secondRevealed: false,
        firstTeamId: null,
        firstTeamName: null,
        firstRevealed: false,
      });
      return;
    }
    try {
      const parsed = JSON.parse(eventState.banner_message);
      if (parsed && typeof parsed === 'object') {
        if (parsed.podium) {
          setPodiumState({
            thirdTeamId: parsed.podium.thirdTeamId || null,
            thirdTeamName: parsed.podium.thirdTeamName || null,
            thirdRevealed: Boolean(parsed.podium.thirdRevealed),
            secondTeamId: parsed.podium.secondTeamId || null,
            secondTeamName: parsed.podium.secondTeamName || null,
            secondRevealed: Boolean(parsed.podium.secondRevealed),
            firstTeamId: parsed.podium.firstTeamId || null,
            firstTeamName: parsed.podium.firstTeamName || null,
            firstRevealed: Boolean(parsed.podium.firstRevealed),
          });
        } else if (parsed.firstRevealed !== undefined || parsed.thirdRevealed !== undefined) {
          setPodiumState((prev) => ({ ...prev, ...parsed }));
        } else {
          setPodiumState({
            thirdTeamId: null,
            thirdTeamName: null,
            thirdRevealed: false,
            secondTeamId: null,
            secondTeamName: null,
            secondRevealed: false,
            firstTeamId: null,
            firstTeamName: null,
            firstRevealed: false,
          });
        }
      }
    } catch {
      setPodiumState({
        thirdTeamId: null,
        thirdTeamName: null,
        thirdRevealed: false,
        secondTeamId: null,
        secondTeamName: null,
        secondRevealed: false,
        firstTeamId: null,
        firstTeamName: null,
        firstRevealed: false,
      });
    }
  }, [eventState?.banner_message]);

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const addHistory = useCallback((action: string, details: string) => {
    if (!edition?.id) return;
    const timestamp = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const entry: TransactionEntry = {
      id: Date.now(),
      edition_id: edition.id,
      time: timestamp,
      action,
      details,
    };
    setLocalHistory((prev) => {
      const updated = [entry, ...prev];
      try {
        localStorage.setItem(`gcl_transaction_history_${edition.id}`, JSON.stringify(updated.slice(0, 100)));
      } catch {}
      return updated;
    });
  }, [edition?.id]);

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

  // Detailed scored tables for ALL individual rounds (Round 1, Round 2, Round 3, Tie Breaker)
  const allRoundScoreboards = useMemo(() => {
    const standardBudget = edition?.starting_budget || parseInt(budgetInput) || 50000000;

    // Determine all rounds to display: at least Round 1, Round 2, Round 3
    const roundIndices = new Set<number>([0, 1, 2]);
    items.forEach((it) => {
      if (typeof it.round_index === 'number') roundIndices.add(it.round_index);
    });
    pastRounds.forEach((p) => {
      if (typeof p.roundIndex === 'number') roundIndices.add(p.roundIndex);
    });

    const sortedIndices = Array.from(roundIndices).sort((a, b) => a - b);

    return sortedIndices.map((rIdx) => {
      const snap = pastRounds.find((p) => p.roundIndex === rIdx);
      const roundName =
        snap?.roundName ||
        DEFAULT_ROUNDS_DATA[rIdx]?.name ||
        (rIdx === 3 ? 'Round 4 (Tie Breaker)' : `Round ${rIdx + 1}`);

      // Calculate each team's score and performance specifically for this round
      const results = teams.map((team) => {
        const roundItems = items.filter(
          (it) => it.team_id === team.id && it.round_index === rIdx
        );
        const roundScore = roundItems.filter((it) => it.is_correct).length;
        const itemsCount = roundItems.length;
        const totalSpent = roundItems.reduce((acc, it) => acc + (it.cost || 0), 0);
        // If snapshot has recorded remainingBudget, check if available
        const snapTeam = snap?.results?.find((r) => r.id === team.id);
        let roundAllocated = standardBudget;
        if (rIdx === 2) {
          // Round 3 budget: Starting Budget + Round 2 Remaining Budget
          const r2Spent = items
            .filter((it) => it.team_id === team.id && it.round_index === 1)
            .reduce((acc, it) => acc + (it.cost || 0), 0);
          roundAllocated = standardBudget + Math.max(0, standardBudget - r2Spent);
        }
        const remainingBudget =
          snapTeam && typeof snapTeam.remainingBudget === 'number'
            ? snapTeam.remainingBudget
            : (currentRoundIndex === rIdx ? team.budget : Math.max(0, roundAllocated - totalSpent));

        return {
          id: team.id,
          name: team.name,
          score: roundScore,
          itemsCount,
          totalSpent,
          remainingBudget,
        };
      }).sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.itemsCount !== a.itemsCount) return b.itemsCount - a.itemsCount;
        return b.remainingBudget - a.remainingBudget;
      });

      return {
        roundIndex: rIdx,
        roundName,
        timestamp: snap?.timestamp,
        results,
      };
    });
  }, [teams, items, pastRounds, edition?.starting_budget, budgetInput]);

  // Filtered teams & computed stats for Dedicated Team Management Studio
  const teamManagementMetrics = useMemo(() => {
    let totalParticipants = 0;
    Object.values(teamMembersMap).forEach((mList) => {
      totalParticipants += (mList || []).length;
    });
    const totalCommittedBudget = teams.reduce((acc, t) => acc + (t.budget || 0), 0);
    const totalItemsWon = items.length;

    const filtered = teams.filter((t) => {
      const members = teamMembersMap[t.id] || [];
      const query = teamSearchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        t.name.toLowerCase().includes(query) ||
        members.some((m) => (m.full_name || m.name || '').toLowerCase().includes(query));
      if (!matchesSearch) return false;
      if (teamFilterStatus === 'with-members') return members.length > 0;
      if (teamFilterStatus === 'no-members') return members.length === 0;
      return true;
    });

    return {
      totalParticipants,
      totalCommittedBudget,
      totalItemsWon,
      filteredTeams: filtered,
    };
  }, [teams, teamMembersMap, items.length, teamSearchQuery, teamFilterStatus]);

  const selectedWinningTeam = useMemo(
    () => teams.find((t) => t.id === selectedTeamId),
    [teams, selectedTeamId]
  );
  const lastItem = items[0] || null;
  const lastItemTeam = useMemo(
    () => (lastItem ? teams.find((t) => t.id === lastItem.team_id) : null),
    [teams, lastItem]
  );

  const currentQIndex = Number(eventState?.current_question_index ?? 0);
  const alreadySoldItem = useMemo(() => {
    return items.find(
      (item) => Number(item.round_index) === Number(currentRoundIndex) && Number(item.question_index) === currentQIndex
    );
  }, [items, currentRoundIndex, currentQIndex]);

  const buyerTeam = useMemo(() => {
    if (!alreadySoldItem) return null;
    return teams.find((t) => t.id === alreadySoldItem.team_id) || null;
  }, [alreadySoldItem, teams]);

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
        broadcastTeamsChange(updatedTeams, edition.id);
        await Promise.all(
          updatedTeams.map((t) =>
            supabase.from('teams').update({ budget: val }).eq('id', t.id)
          )
        );
      }
      showNotification(`Starting budget updated to ${formatCurrency(val)}`, 'success');
      addHistory('Budget Updated', `Starting budget set to ${formatCurrency(val)}`);
    }
  };

  // Load all team members for current teams
  const loadAllTeamMembers = useCallback(async (teamList: Team[]) => {
    if (!teamList || teamList.length === 0) {
      setTeamMembersMap({});
      return;
    }
    const teamIds = teamList.map((t) => t.id);
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .in('team_id', teamIds)
      .order('created_at', { ascending: true });
    if (!error && data) {
      const map: Record<string, TeamMember[]> = {};
      for (const m of data as TeamMember[]) {
        if (!map[m.team_id]) map[m.team_id] = [];
        map[m.team_id].push(m);
      }
      setTeamMembersMap(map);
    }
  }, []);

  useEffect(() => {
    loadAllTeamMembers(teams);
  }, [teams, loadAllTeamMembers]);

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !edition?.id) return;

    const initialBudget = parseInt(budgetInput) || edition.starting_budget || 50000000;
    const newTeamId = crypto.randomUUID();
    const addedTeamName = newTeamName.trim();
    const rawMembers = newTeamMembers.trim();

    const newTeamObj: Team = {
      id: newTeamId,
      edition_id: edition.id,
      name: addedTeamName,
      budget: initialBudget,
      score: 0,
      status: 'active',
      sort_order: teams.length + 1,
      created_at: new Date().toISOString(),
    };

    const updated = [...teams, newTeamObj];
    setTeams(updated);
    broadcastTeamsChange(updated, edition.id);
    setNewTeamName('');
    setNewTeamMembers('');

    const { error } = await supabase
      .from('teams')
      .insert({
        id: newTeamObj.id,
        edition_id: edition.id,
        name: newTeamObj.name,
        budget: newTeamObj.budget,
        score: 0,
        sort_order: newTeamObj.sort_order,
      });

    if (error) {
      console.error('Error inserting team:', error);
      showNotification(`Failed to save team: ${error.message}`, 'error');
      return;
    }

    // Process optional member names
    if (rawMembers) {
      const memberNames = rawMembers
        .split(/[,;\n]/)
        .map((n) => n.trim())
        .filter((n) => n.length > 0);

      if (memberNames.length > 0) {
        const memberRecords = memberNames.map((name) => ({
          id: crypto.randomUUID(),
          team_id: newTeamId,
          full_name: name,
          name: name,
          role: 'member',
          created_at: new Date().toISOString(),
        }));

        const { error: memberError } = await supabase.from('team_members').insert(memberRecords);
        if (!memberError) {
          setTeamMembersMap((prev) => ({
            ...prev,
            [newTeamId]: memberRecords as TeamMember[],
          }));
          showNotification(`Team "${addedTeamName}" added with ${memberNames.length} member(s)!`, 'success');
        } else {
          console.error('Error adding members:', memberError);
          showNotification(`Team "${addedTeamName}" added, but failed to save members: ${memberError.message}`, 'error');
        }
      } else {
        showNotification(`Team "${addedTeamName}" added!`, 'success');
      }
    } else {
      showNotification(`Team "${addedTeamName}" added!`, 'success');
    }

    addHistory('Team Added', `Team "${addedTeamName}" registered.`);
  };

  const handleAddMemberToTeam = async (teamId: string) => {
    const rawInput = newMemberInputs[teamId]?.trim();
    if (!rawInput) return;

    setAddingMemberTeamId(teamId);
    try {
      const names = rawInput
        .split(/[,;\n]/)
        .map((n) => n.trim())
        .filter((n) => n.length > 0);

      if (names.length === 0) return;

      const records = names.map((name) => ({
        id: crypto.randomUUID(),
        team_id: teamId,
        full_name: name,
        name: name,
        role: 'member',
        created_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('team_members').insert(records);
      if (error) throw error;

      setTeamMembersMap((prev) => ({
        ...prev,
        [teamId]: [...(prev[teamId] || []), ...(records as TeamMember[])],
      }));

      setNewMemberInputs((prev) => ({ ...prev, [teamId]: '' }));
      showNotification(`Added ${names.length} member(s) to team!`, 'success');
    } catch (err: any) {
      showNotification(err?.message || 'Failed to add member', 'error');
    } finally {
      setAddingMemberTeamId(null);
    }
  };

  const handleRemoveMemberFromTeam = async (memberId: string, teamId: string) => {
    try {
      const { error } = await supabase.from('team_members').delete().eq('id', memberId);
      if (error) throw error;

      setTeamMembersMap((prev) => ({
        ...prev,
        [teamId]: (prev[teamId] || []).filter((m) => m.id !== memberId),
      }));
      showNotification('Member removed.', 'success');
    } catch (err: any) {
      showNotification(err?.message || 'Failed to remove member', 'error');
    }
  };

  const toggleTeamMembersExpanded = (teamId: string) => {
    setExpandedTeamMembers((prev) => ({
      ...prev,
      [teamId]: !prev[teamId],
    }));
  };

  const handleTeamNameChange = (teamId: string, newName: string) => {
    // 1. Immediately update local state so user's typing never lags or flickers
    const updated = teams.map((t) => (t.id === teamId ? { ...t, name: newName } : t));
    setTeams(updated);

    // 2. Debounce database update and broadcast
    if (teamNameDebounceTimers.current[teamId]) {
      clearTimeout(teamNameDebounceTimers.current[teamId]);
    }

    teamNameDebounceTimers.current[teamId] = setTimeout(async () => {
      broadcastTeamsChange(updated, edition?.id);
      await supabase.from('teams').update({ name: newName.trim() }).eq('id', teamId);
    }, 400);
  };

  const handleTeamNameBlur = async (teamId: string) => {
    if (teamNameDebounceTimers.current[teamId]) {
      clearTimeout(teamNameDebounceTimers.current[teamId]);
    }
    const currentTeam = teams.find((t) => t.id === teamId);
    if (!currentTeam) return;
    const finalName = currentTeam.name.trim();
    const updated = teams.map((t) => (t.id === teamId ? { ...t, name: finalName } : t));
    setTeams(updated);
    broadcastTeamsChange(updated, edition?.id);
    await supabase.from('teams').update({ name: finalName }).eq('id', teamId);
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
    broadcastTeamsChange(updated, edition?.id);
    await supabase.from('teams').update({ name: newName.trim() }).eq('id', id);
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
    broadcastTeamsChange(updated, edition?.id);
    const { error } = await supabase.from('teams').delete().eq('id', teamToRemove.id);
    if (error) {
      console.error('Error removing team:', error);
      showNotification(`Failed to remove team: ${error.message}`, 'error');
    } else {
      showNotification(`Team ${teamToRemove.name} removed!`, 'success');
      addHistory('Team Removed', `${teamToRemove.name} was removed.`);
    }
    setTeamMembersMap((prev) => {
      const copy = { ...prev };
      delete copy[teamToRemove.id];
      return copy;
    });
    setTeamToRemove(null);
  };

  const handleSaveTeamBudget = async (teamId: string) => {
    const parsed = parseInt(editingBudgetValue.replace(/[^0-9]/g, ''), 10);
    if (isNaN(parsed) || parsed < 0) {
      showNotification('Please enter a valid budget amount.', 'error');
      return;
    }
    const targetTeam = teams.find((t) => t.id === teamId);
    const updated = teams.map((t) => (t.id === teamId ? { ...t, budget: parsed } : t));
    setTeams(updated);
    broadcastTeamsChange(updated, edition?.id);
    await supabase.from('teams').update({ budget: parsed }).eq('id', teamId);
    showNotification(`Updated budget for ${targetTeam?.name || 'team'} to ${formatCurrency(parsed)}`, 'success');
    addHistory('Budget Adjusted', `${targetTeam?.name || 'Team'} budget adjusted to ${formatCurrency(parsed)}`);
    setEditingBudgetTeamId(null);
  };

  const handleQuickAdjustTeamBudget = async (teamId: string, delta: number) => {
    const targetTeam = teams.find((t) => t.id === teamId);
    if (!targetTeam) return;
    const newBudget = Math.max(0, targetTeam.budget + delta);
    const updated = teams.map((t) => (t.id === teamId ? { ...t, budget: newBudget } : t));
    setTeams(updated);
    broadcastTeamsChange(updated, edition?.id);
    await supabase.from('teams').update({ budget: newBudget }).eq('id', teamId);
    showNotification(`${targetTeam.name}: ${delta > 0 ? '+' : ''}${formatCurrency(delta)} (New: ${formatCurrency(newBudget)})`, 'success');
    addHistory('Budget Adjusted', `${targetTeam.name} budget changed by ${formatCurrency(delta)} to ${formatCurrency(newBudget)}`);
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
      await supabase.from('editions').update({ starting_budget: targetBudget }).eq('id', edition.id);
    }

    const resetTeams = teams.map((t) => ({ ...t, budget: targetBudget, score: 0 }));
    setTeams(resetTeams);
    broadcastTeamsChange(resetTeams, edition?.id);

    const nextState: Partial<EventState> = {
      game_state: 'waiting_start',
      round_state: 'ROUND_SETUP',
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

    await Promise.all(
      resetTeams.map((team) =>
        supabase.from('teams').update({ budget: targetBudget, score: 0 }).eq('id', team.id)
      )
    );
    await supabase.from('event_state').update(nextState).eq('id', eventState.id);
  };

  const handleItemNameChange = (text: string) => {
    const rIdx = eventState?.current_round_index ?? 0;
    const qIdx = eventState?.current_question_index ?? 0;
    const sold = items.find((it) => it.round_index === rIdx && it.question_index === qIdx);
    if (sold) {
      showNotification('This question is already sold and locked. Editing is blocked.', 'error');
      return;
    }

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

  // --- GCL ROUND SYSTEM STATE MACHINE HANDLERS ---

  // 1. Round 1 Completion: Finalize internally, lock results, enter manual reveal
  const handleCompleteRound1 = async (itemsOverride?: TeamItem[], teamsOverride?: Team[]) => {
    if (!eventState?.id || !edition?.id) return;

    const sourceItems = itemsOverride || items;
    const sourceTeams = teamsOverride || teams;
    const startingBudget = edition.starting_budget || 50000000;

    // Snapshot Round 1 results internally
    const r1Results = sourceTeams.map((t) => {
      const tItems = sourceItems.filter((it) => it.team_id === t.id && Number(it.round_index) === 0);
      const score = tItems.filter((it) => it.is_correct).length;
      const spent = tItems.reduce((acc, it) => acc + (it.cost || 0), 0);
      const remainingBudget = Math.max(0, startingBudget - spent);
      return {
        id: t.id,
        name: t.name,
        score,
        itemsCount: tItems.length,
        totalSpent: spent,
        remainingBudget,
        startingBudget,
      };
    });

    // Internal ranking for Round 1 (Score DESC -> Items Count DESC -> Remaining Budget DESC -> Name ASC)
    const sortedR1 = [...r1Results].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.itemsCount !== a.itemsCount) return b.itemsCount - a.itemsCount;
      if (b.remainingBudget !== a.remainingBudget) return b.remainingBudget - a.remainingBudget;
      return a.name.localeCompare(b.name);
    });

    const newSnapshot: PastRoundSnapshot = {
      roundIndex: 0,
      roundName: 'Round 1',
      results: sortedR1,
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
    const updatedPastRounds = [
      ...existingPastRounds.filter((r) => r.roundIndex !== 0),
      newSnapshot,
    ];

    // Save snapshot to round_snapshots table
    supabase
      .from('round_snapshots')
      .upsert({
        edition_id: edition.id,
        round_index: 0,
        round_name: 'Round 1',
        results: sortedR1,
      })
      .then();

    // Initialize leaderboard_reveals rows for Round 1
    const revealRows: LeaderboardRevealEntry[] = sortedR1.map((t, idx) => ({
      edition_id: edition.id,
      round_index: 0,
      position: idx + 1,
      team_id: t.id,
      team_name: t.name,
      is_revealed: false,
      revealed_by: 'admin',
      revealed_at: null,
    }));

    setR1Reveals(revealRows);
    broadcastLeaderboardRevealChange(revealRows);

    for (const row of revealRows) {
      supabase.from('leaderboard_reveals').upsert(row, {
        onConflict: 'edition_id,round_index,position',
      }).then();
    }

    const payload = {
      pastRounds: updatedPastRounds,
      podium: podiumState,
      r1Reveals: revealRows,
    };

    const nextState: Partial<EventState> = {
      game_state: 'leaderboard_reveal',
      round_state: 'LEADERBOARD_REVEAL',
      current_round_index: 0,
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

    showNotification('Round 1 Completed! Entering Manual Leaderboard Reveal.', 'success');
    addHistory('Round 1 Complete', 'Round 1 finished. Starting bottom-up manual leaderboard reveal.');
  };

  // 2. Round 1 Manual Reveal: Admin reveals position by position bottom-up
  const handleConfirmAndRevealPosition = async (targetPosition: number, targetTeamId: string) => {
    if (!eventState?.id || !edition?.id) return;
    const chosenTeam = teams.find((t) => t.id === targetTeamId);
    if (!chosenTeam) {
      showNotification('Please select a team to reveal.', 'error');
      return;
    }

    // Check if chosenTeam was previously assigned to another unrevealed position
    // If so, swap with the team currently at targetPosition to prevent duplicates or missing teams
    const currentTargetEntry = r1Reveals.find((r) => r.position === targetPosition);
    const prevAssignedPos = r1Reveals.find(
      (r) => r.position !== targetPosition && r.team_id === chosenTeam.id && !r.is_revealed
    );

    const updatedReveals = r1Reveals.map((r) => {
      if (r.position === targetPosition) {
        return {
          ...r,
          team_id: chosenTeam.id,
          team_name: chosenTeam.name,
          is_revealed: true,
          revealed_by: 'admin',
          revealed_at: new Date().toISOString(),
        };
      }
      if (prevAssignedPos && r.position === prevAssignedPos.position && currentTargetEntry) {
        return {
          ...r,
          team_id: currentTargetEntry.team_id,
          team_name: currentTargetEntry.team_name,
        };
      }
      return r;
    });

    setR1Reveals(updatedReveals);
    broadcastLeaderboardRevealChange(updatedReveals);
    setSelectedRevealTeamId('');

    // Persist to Supabase
    supabase
      .from('leaderboard_reveals')
      .update({
        team_id: chosenTeam.id,
        team_name: chosenTeam.name,
        is_revealed: true,
        revealed_by: 'admin',
        revealed_at: new Date().toISOString(),
      })
      .match({
        edition_id: edition.id,
        round_index: 0,
        position: targetPosition,
      })
      .then();

    // Also persist into event_state.banner_message so all live screens get immediate real-time sync
    let existingPastRounds: PastRoundSnapshot[] = [];
    let existingPodium = podiumState;
    try {
      if (eventState.banner_message) {
        const parsed = JSON.parse(eventState.banner_message);
        if (Array.isArray(parsed)) existingPastRounds = parsed;
        else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.pastRounds)) existingPastRounds = parsed.pastRounds;
          if (parsed.podium) existingPodium = parsed.podium;
        }
      }
    } catch {}

    const payload = {
      pastRounds: existingPastRounds,
      podium: existingPodium,
      r1Reveals: updatedReveals,
    };
    const bannerMsg = JSON.stringify(payload);
    supabase.from('event_state').update({ banner_message: bannerMsg, updated_at: new Date().toISOString() }).eq('id', eventState.id).then();
    setEventState((prev) => (prev ? { ...prev, banner_message: bannerMsg } : null));
    broadcastStateChange({ banner_message: bannerMsg });

    showNotification(
      `Position ${formatOrdinal(targetPosition)} (${chosenTeam.name}) REVEALED on live screen!`,
      'success'
    );
    addHistory(
      'Leaderboard Reveal',
      `Revealed ${formatOrdinal(targetPosition)}: ${chosenTeam.name}`
    );
  };

  // 3. Round 1 Reveal Completed -> Admin Manually Starts Intermission
  const handleStartIntermissionAfterReveal = async () => {
    if (!eventState?.id) return;
    const nextState: Partial<EventState> = {
      game_state: 'intermission',
      round_state: 'INTERMISSION',
      current_round_index: 0,
      updated_at: new Date().toISOString(),
    };

    setEventState((prev) => (prev ? { ...prev, ...nextState } : null));
    broadcastStateChange(nextState);
    supabase.from('event_state').update(nextState).eq('id', eventState.id).then();
    showNotification('Round 1 Leaderboard reveal complete! Intermission started.', 'success');
    addHistory('Intermission Started', 'Round 1 intermission active. Ready for Round 2 budget reset.');
  };

  // 4. Round 1 -> Round 2 Transition: Reset each team's current budget to Starting Budget
  const handleStartRound2WithReset = async () => {
    if (!eventState?.id || !edition?.id) return;
    const startingBudget = edition.starting_budget || 50000000;

    // Reset CURRENT round budget for each team without overwriting Round 1 history
    const refreshedTeams = teams.map((t) => ({ ...t, budget: startingBudget }));
    setTeams(refreshedTeams);
    broadcastTeamsChange(refreshedTeams);
    for (const t of refreshedTeams) {
      supabase.from('teams').update({ budget: startingBudget }).eq('id', t.id).then();
    }

    const roundData = DEFAULT_ROUNDS_DATA[1] || { name: 'Round 2', questions: [] };
    const firstQ = roundData.questions[0] || '';

    const nextState: Partial<EventState> = {
      game_state: 'active',
      round_state: 'ROUND_ACTIVE',
      current_round_index: 1,
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

    setEventState((prev) => (prev ? { ...prev, ...nextState } : null));
    setCurrentItem(firstQ);
    broadcastStateChange(nextState);
    supabase.from('event_state').update(nextState).eq('id', eventState.id).then();

    showNotification(
      `Round 2 started! All teams reset to Starting Budget (${formatCurrency(startingBudget)}).`,
      'success'
    );
    addHistory(
      'Round 2 Started',
      `Current budgets reset to ${formatCurrency(startingBudget)}. Round 1 history preserved.`
    );
  };

  // 5. Round 2 Completion: Direct to Intermission (NO reveal)
  const handleCompleteRound2 = async (itemsOverride?: TeamItem[], teamsOverride?: Team[]) => {
    if (!eventState?.id || !edition?.id) return;

    const sourceItems = itemsOverride || items;
    const sourceTeams = teamsOverride || teams;
    const startingBudget = edition.starting_budget || 50000000;

    // Snapshot Round 2 results internally
    const r2Results = sourceTeams.map((t) => {
      const tItems = sourceItems.filter((it) => it.team_id === t.id && Number(it.round_index) === 1);
      const score = tItems.filter((it) => it.is_correct).length;
      const spent = tItems.reduce((acc, it) => acc + (it.cost || 0), 0);
      const remainingBudget = Math.max(0, startingBudget - spent);
      return {
        id: t.id,
        name: t.name,
        score,
        itemsCount: tItems.length,
        totalSpent: spent,
        remainingBudget,
        startingBudget,
      };
    });

    const newSnapshot: PastRoundSnapshot = {
      roundIndex: 1,
      roundName: 'Round 2',
      results: r2Results,
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
    const updatedPastRounds = [
      ...existingPastRounds.filter((r) => r.roundIndex !== 1),
      newSnapshot,
    ];

    supabase
      .from('round_snapshots')
      .upsert({
        edition_id: edition.id,
        round_index: 1,
        round_name: 'Round 2',
        results: r2Results,
      })
      .then();

    // IMPORTANT: Round 2 does NOT use leaderboard reveal!
    // Go DIRECTLY to INTERMISSION with NO reveal of positions or scores.
    const payload = {
      pastRounds: updatedPastRounds,
      podium: podiumState,
    };

    const nextState: Partial<EventState> = {
      game_state: 'intermission',
      round_state: 'INTERMISSION',
      current_round_index: 1,
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

    setR3BudgetsConfirmed(false);
    setEventState((prev) => (prev ? { ...prev, ...nextState } : null));
    setCurrentItem('');
    broadcastStateChange(nextState);
    supabase.from('event_state').update(nextState).eq('id', eventState.id).then();

    showNotification('Round 2 Completed! Direct to Intermission.', 'success');
    addHistory('Round 2 Complete', 'Round 2 ended. Direct to Intermission. No reveal.');
  };

  // 6. Round 2 -> Round 3: Budget Calculation & Confirmation
  const handleConfirmRound3Budgets = async () => {
    if (!edition?.id || !eventState?.id) return;
    setIsConfirmingR3Budgets(true);
    try {
      const startingBudget = edition.starting_budget || 50000000;

      // Calculate: Round 3 Budget = Starting Budget + Round 2 Remaining Budget
      const calculations = teams.map((team) => {
        const r2Items = items.filter((it) => it.team_id === team.id && it.round_index === 1);
        const r2Spent = r2Items.reduce((acc, it) => acc + (it.cost || 0), 0);
        const r2Remaining = Math.max(0, startingBudget - r2Spent);
        const r3Budget = startingBudget + r2Remaining;
        return {
          teamId: team.id,
          teamName: team.name,
          startingBudget,
          r2Spent,
          r2Remaining,
          r3Budget,
        };
      });

      // Update each team's budget
      const updatedTeams = teams.map((team) => {
        const calc = calculations.find((c) => c.teamId === team.id);
        return {
          ...team,
          budget: calc ? calc.r3Budget : startingBudget,
        };
      });

      setTeams(updatedTeams);
      broadcastTeamsChange(updatedTeams, edition.id);

      await Promise.all(
        updatedTeams.map((t) =>
          supabase.from('teams').update({ budget: t.budget }).eq('id', t.id)
        )
      );

      // Insert audit record
      await supabase.from('audit_log').insert({
        admin_id: 'admin',
        action: 'ROUND_3_BUDGET_CALCULATION',
        details: {
          formula: 'ROUND 3 BUDGET = STARTING BUDGET + ROUND 2 REMAINING BUDGET',
          starting_budget: startingBudget,
          calculations,
          confirmed_at: new Date().toISOString(),
        },
      });

      addHistory(
        'Round 3 Budgets Confirmed',
        `Budgets confirmed: Starting Budget (${formatCurrency(startingBudget)}) + Round 2 Remaining funds applied.`
      );

      setR3BudgetsConfirmed(true);

      const nextState: Partial<EventState> = {
        round_state: 'NEXT_ROUND_READY',
        updated_at: new Date().toISOString(),
      };
      setEventState((prev) => (prev ? { ...prev, ...nextState } : null));
      broadcastStateChange(nextState);
      await supabase.from('event_state').update(nextState).eq('id', eventState.id);

      showNotification('Round 3 Budgets Confirmed! Ready to Start Round 3.', 'success');
    } catch (err: any) {
      console.error('Error confirming Round 3 budgets:', err);
      showNotification(`Failed to confirm Round 3 budgets: ${err?.message || 'Error'}`, 'error');
    } finally {
      setIsConfirmingR3Budgets(false);
    }
  };

  // 7. Start Round 3 with confirmed budgets
  const handleStartRound3 = async () => {
    if (!eventState?.id || !edition?.id) return;
    const startingBudget = edition.starting_budget || 50000000;

    // Safety guarantee: Ensure Round 3 budgets have Round 2 carryover applied
    const updatedTeams = teams.map((team) => {
      const r2Items = items.filter((it) => it.team_id === team.id && it.round_index === 1);
      const r2Spent = r2Items.reduce((acc, it) => acc + (it.cost || 0), 0);
      const r2Remaining = Math.max(0, startingBudget - r2Spent);
      const r3Budget = startingBudget + r2Remaining;
      return {
        ...team,
        budget: r3Budget,
      };
    });

    setTeams(updatedTeams);
    broadcastTeamsChange(updatedTeams, edition.id);

    await Promise.all(
      updatedTeams.map((t) =>
        supabase.from('teams').update({ budget: t.budget }).eq('id', t.id)
      )
    );

    const roundData = DEFAULT_ROUNDS_DATA[2] || { name: 'Round 3', questions: [] };
    const firstQ = roundData.questions[0] || '';

    const nextState: Partial<EventState> = {
      game_state: 'active',
      round_state: 'ROUND_ACTIVE',
      current_round_index: 2,
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

    setEventState((prev) => (prev ? { ...prev, ...nextState } : null));
    setCurrentItem(firstQ);
    broadcastStateChange(nextState);
    await supabase.from('event_state').update(nextState).eq('id', eventState.id);

    showNotification('Round 3 has officially started with confirmed budgets!', 'success');
    addHistory('Round 3 Started', 'Round 3 auction begins.');
  };

  // 8. Round 3 Completion: Final results & Podium transition
  const handleCompleteRound3 = async (itemsOverride?: TeamItem[], teamsOverride?: Team[]) => {
    if (!eventState?.id || !edition?.id) return;

    const sourceItems = itemsOverride || items;
    const sourceTeams = teamsOverride || teams;
    const startingBudget = edition.starting_budget || 50000000;

    const r3Results = sourceTeams.map((t) => {
      const tItems = sourceItems.filter((it) => it.team_id === t.id && Number(it.round_index) === 2);
      const score = tItems.filter((it) => it.is_correct).length;
      const spent = tItems.reduce((acc, it) => acc + (it.cost || 0), 0);
      const r2Spent = sourceItems
        .filter((it) => it.team_id === t.id && Number(it.round_index) === 1)
        .reduce((acc, it) => acc + (it.cost || 0), 0);
      const r2Remaining = Math.max(0, startingBudget - r2Spent);
      const r3Allocated = startingBudget + r2Remaining;
      const remainingBudget = Math.max(0, r3Allocated - spent);
      return {
        id: t.id,
        name: t.name,
        score,
        itemsCount: tItems.length,
        totalSpent: spent,
        remainingBudget,
      };
    });

    const newSnapshot: PastRoundSnapshot = {
      roundIndex: 2,
      roundName: 'Round 3',
      results: r3Results,
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
    const updatedPastRounds = [
      ...existingPastRounds.filter((r) => r.roundIndex !== 2),
      newSnapshot,
    ];

    supabase
      .from('round_snapshots')
      .upsert({
        edition_id: edition.id,
        round_index: 2,
        round_name: 'Round 3',
        results: r3Results,
      })
      .then();

    const payload = {
      pastRounds: updatedPastRounds,
      podium: podiumState,
    };

    const nextState: Partial<EventState> = {
      game_state: 'intermission',
      round_state: 'INTERMISSION',
      current_round_index: 3,
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

    showNotification('Round 3 Completed! Ready for Tie Breaker or Winner Announcement.', 'success');
    addHistory('Round 3 Complete', 'Round 3 finished. Final results ready.');
  };

  // 9. Centralized router to advance stages based on current round
  const handleAdvanceToNextStage = async (itemsOverride?: TeamItem[], teamsOverride?: Team[]) => {
    const rIdx = eventState?.current_round_index ?? 0;
    if (rIdx === 0) {
      await handleCompleteRound1(itemsOverride, teamsOverride);
    } else if (rIdx === 1) {
      await handleCompleteRound2(itemsOverride, teamsOverride);
    } else if (rIdx === 2) {
      await handleCompleteRound3(itemsOverride, teamsOverride);
    } else {
      await handleGoToWinnerReveal();
    }
  };

  // 1b. Start Round 1 directly from waiting_start
  const handleStartRound1 = async () => {
    if (!eventState?.id) return;
    const roundData = DEFAULT_ROUNDS_DATA[0] || { name: 'Round 1', questions: [] };
    const firstQ = roundData.questions[0] || '';

    const nextState: Partial<EventState> = {
      game_state: 'active',
      round_state: 'ROUND_ACTIVE',
      current_round_index: 0,
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

    setEventState((prev) => (prev ? { ...prev, ...nextState } : null));
    setCurrentItem(firstQ);
    broadcastStateChange(nextState);
    supabase.from('event_state').update(nextState).eq('id', eventState.id).then();

    showNotification('Round 1 has officially started!', 'success');
    addHistory('Round 1 Started', 'Round 1 auction begins.');
  };

  // Centralized starting handler from generic buttons
  const handleStartNextRound = async () => {
    if (eventState?.game_state === 'waiting_start') {
      await handleStartRound1();
      return;
    }
    const rIdx = eventState?.current_round_index || 0;
    if (rIdx === 0) {
      await handleStartRound2WithReset();
    } else if (rIdx === 1) {
      await handleStartRound3();
    } else {
      await handleStartTieBreaker();
    }
  };

  // Finalize & Archive Current Event handler
  const handleFinalizeAndArchiveCurrentEvent = async () => {
    if (!edition?.id) return;
    setIsFinalizingArchive(true);
    try {
      const updates = {
        is_archived: true,
        archived_at: new Date().toISOString(),
        champion_team_id: podiumState.firstTeamId || null,
        runner_up_team_id: podiumState.secondTeamId || null,
        third_place_team_id: podiumState.thirdTeamId || null,
      };

      const { error } = await supabase
        .from('editions')
        .update(updates)
        .eq('id', edition.id);

      if (error) throw error;

      setEdition((prev) => (prev ? { ...prev, ...updates } : null));
      showNotification(`"${edition.name}" successfully finalized and saved to Archive!`, 'success');
      addHistory('Edition Archived', `Edition "${edition.name}" permanently archived.`);
    } catch (err: any) {
      showNotification(err?.message || 'Failed to archive edition', 'error');
    } finally {
      setIsFinalizingArchive(false);
    }
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
    const firstTeam = teamsWithStats.find(t => t.id === (podiumState.firstTeamId || sorted[0]?.id));
    const secondTeam = teamsWithStats.find(t => t.id === (podiumState.secondTeamId || sorted[1]?.id));
    const thirdTeam = teamsWithStats.find(t => t.id === (podiumState.thirdTeamId || sorted[2]?.id));

    const initialPodium = {
      thirdTeamId: thirdTeam?.id || null,
      thirdTeamName: thirdTeam?.name || null,
      thirdRevealed: Boolean(podiumState.thirdRevealed),
      secondTeamId: secondTeam?.id || null,
      secondTeamName: secondTeam?.name || null,
      secondRevealed: Boolean(podiumState.secondRevealed),
      firstTeamId: firstTeam?.id || null,
      firstTeamName: firstTeam?.name || null,
      firstRevealed: Boolean(podiumState.firstRevealed),
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
    const teamObj = teams.find((t) => t.id === teamId);
    const updated = {
      ...podiumState,
      [`${place}TeamId`]: teamId || null,
      [`${place}TeamName`]: teamObj?.name || null,
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

  const handleHideAllReveals = () => {
    const updated = {
      ...podiumState,
      firstRevealed: false,
      secondRevealed: false,
      thirdRevealed: false,
    };
    setPodiumState(updated);
    savePodiumState(updated);
    showNotification('All podium reveals hidden on live screen!', 'success');
  };

  const handleResetPodium = () => {
    const updated = {
      thirdTeamId: null,
      thirdTeamName: null,
      thirdRevealed: false,
      secondTeamId: null,
      secondTeamName: null,
      secondRevealed: false,
      firstTeamId: null,
      firstTeamName: null,
      firstRevealed: false,
    };
    setPodiumState(updated);
    savePodiumState(updated);
    showNotification('Podium assignments and reveals reset.', 'success');
  };

  const savePodiumState = (newPodium: typeof podiumState) => {
    if (!eventState?.id) return;
    let existingPastRounds: PastRoundSnapshot[] = [];
    let existingR1Reveals: any[] = [];
    try {
      if (eventState.banner_message) {
        const parsed = JSON.parse(eventState.banner_message);
        if (Array.isArray(parsed)) existingPastRounds = parsed;
        else if (Array.isArray(parsed?.pastRounds)) existingPastRounds = parsed.pastRounds;
        if (Array.isArray(parsed?.r1Reveals)) existingR1Reveals = parsed.r1Reveals;
      }
    } catch {}

    const payload = {
      pastRounds: existingPastRounds,
      podium: newPodium,
      r1Reveals: existingR1Reveals,
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
    const sold = items.find((it) => it.round_index === rIdx && it.question_index === qIdx);
    if (sold) {
      const buyer = teams.find((t) => t.id === sold.team_id);
      showNotification(`Question R${rIdx + 1} - Q${qIdx + 1} is already SOLD to ${buyer?.name || 'a team'}. Loading is blocked.`, 'error');
      return;
    }
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

    const sold = items.find((it) => it.round_index === r && it.question_index === q);
    if (sold) {
      const buyer = teams.find((t) => t.id === sold.team_id);
      showNotification(`Round ${r + 1} Question ${q + 1} is already SOLD to ${buyer?.name || 'a team'}. Auction is locked.`, 'error');
    }

    addHistory('Tracker Changed', `Set to Round ${r + 1}, Q${q + 1}`);
  };

  const handleJumpToNextUnsold = () => {
    const rIdx = eventState?.current_round_index ?? 0;
    const currentRound = DEFAULT_ROUNDS_DATA[rIdx] || { questions: [] };
    const totalQ = currentRound.questions.length || 20;
    for (let q = 0; q < totalQ; q++) {
      const isSold = items.some((it) => it.round_index === rIdx && it.question_index === q);
      if (!isSold) {
        handleManualSetTracker(rIdx, q);
        showNotification(`Jumped to unsold Question ${q + 1}`, 'success');
        return;
      }
    }
    showNotification(`All questions in Round ${rIdx + 1} have already been sold!`, 'error');
  };

  const handleStartTimer = () => {
    const rIdx = eventState?.current_round_index ?? 0;
    const qIdx = eventState?.current_question_index ?? 0;
    const sold = items.find((it) => it.round_index === rIdx && it.question_index === qIdx);
    if (sold) {
      const buyer = teams.find((t) => t.id === sold.team_id);
      showNotification(`Cannot start auction timer: Question is already SOLD to ${buyer?.name || 'a team'}.`, 'error');
      return;
    }

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
    showNotification('Timer reset to 03:00. Question is now hidden (awaiting).', 'success');
  };

  const handleRevealQuestion = () => {
    if (alreadySoldItem) return;
    const now = new Date().toISOString();
    const updates: Partial<EventState> = {
      timer_state: 'paused',
      timer_remaining_seconds: eventState?.timer_remaining_seconds ?? 180,
      timer_paused_at: now,
      updated_at: now,
    };
    setEventState((prev) => (prev ? { ...prev, ...updates } : (updates as EventState)));
    broadcastStateChange(updates);
    if (eventState?.id) {
      supabase.from('event_state').update(updates).eq('id', eventState.id).then();
    }
    showNotification('Question revealed to players! (Timer is paused/ready)', 'success');
    addHistory('Question Revealed', `Question revealed for Round ${roundIdx + 1} - Q${questionIdx + 1}`);
  };

  const handleHideQuestion = () => {
    if (alreadySoldItem) return;
    const now = new Date().toISOString();
    const updates: Partial<EventState> = {
      timer_state: 'stopped',
      timer_started_at: null,
      timer_paused_at: null,
      timer_remaining_seconds: 180,
      timer_duration_seconds: 180,
      updated_at: now,
    };
    setEventState((prev) => (prev ? { ...prev, ...updates } : (updates as EventState)));
    broadcastStateChange(updates);
    if (eventState?.id) {
      supabase.from('event_state').update(updates).eq('id', eventState.id).then();
    }
    showNotification('Question hidden from players (awaiting state).', 'success');
    addHistory('Question Hidden', `Question set to awaiting for Round ${roundIdx + 1} - Q${questionIdx + 1}`);
  };

  const handleTeamSelection = (id: string) => {
    const rIdx = eventState?.current_round_index ?? 0;
    const qIdx = eventState?.current_question_index ?? 0;
    const sold = items.find((it) => it.round_index === rIdx && it.question_index === qIdx);
    if (sold) {
      showNotification('This question is already SOLD and locked. Bidding is blocked.', 'error');
      return;
    }

    const roundBase = getRoundBasePrice(rIdx);
    const amount = parseFloat(bidAmount) || roundBase;
    const team = teams.find((t) => t.id === id);
    if (team && team.budget < amount) {
      showNotification(
        `Cannot select ${team.name}! Budget (${formatCurrency(team.budget)}) is less than the current bid (${formatCurrency(amount)}).`,
        'error'
      );
      return;
    }
    setSelectedTeamId(id);
    broadcastBidPreview(id, amount, `R${rIdx + 1} - Q${qIdx + 1}`);
  };

  const handleBidAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rIdx = eventState?.current_round_index ?? 0;
    const qIdx = eventState?.current_question_index ?? 0;
    const sold = items.find((it) => it.round_index === rIdx && it.question_index === qIdx);
    if (sold) return;

    let value = e.target.value.replace(/[^0-9.]/g, '');
    const parts = value.split('.');
    if (parts.length > 2) value = parts[0] + '.' + parts.slice(1).join('');
    setBidAmount(value);
    broadcastBidPreview(selectedTeamId, parseFloat(value) || 0, `R${rIdx + 1} - Q${qIdx + 1}`);
  };

  const handleQuickAdd = (val: number) => {
    const rIdx = eventState?.current_round_index ?? 0;
    const qIdx = eventState?.current_question_index ?? 0;
    const sold = items.find((it) => it.round_index === rIdx && it.question_index === qIdx);
    if (sold) return;

    const roundBase = getRoundBasePrice(rIdx);
    const parsed = parseFloat(bidAmount.replace(/[^0-9.]/g, ''));
    // If empty or less than round base price, start at roundBase!
    const cur = isNaN(parsed) || parsed < roundBase ? roundBase : parsed;
    const next = Math.max(roundBase, cur + val);
    setBidAmount(String(next));
    broadcastBidPreview(selectedTeamId, next, `R${rIdx + 1} - Q${qIdx + 1}`);
  };

  const handleQuickSet = (val: number) => {
    const rIdx = eventState?.current_round_index ?? 0;
    const qIdx = eventState?.current_question_index ?? 0;
    const sold = items.find((it) => it.round_index === rIdx && it.question_index === qIdx);
    if (sold) return;

    setBidAmount(String(val));
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

    const rIdx = eventState?.current_round_index ?? 0;
    const qIdx = eventState?.current_question_index ?? 0;
    const alreadySold = items.find(
      (it) => it.round_index === rIdx && it.question_index === qIdx
    );
    if (alreadySold) {
      const buyer = teams.find((t) => t.id === alreadySold.team_id);
      showNotification(
        `This question was already SOLD to ${buyer?.name || 'a team'} for ${formatCurrency(alreadySold.cost)}. It cannot be sold again.`,
        'error'
      );
      return;
    }

    const roundBase = getRoundBasePrice(rIdx);
    const amount = parseFloat(bidAmount) || roundBase;
    if (isNaN(amount) || amount < roundBase) {
      showNotification(`Bid amount must be at least ${formatCurrency(roundBase)}.`, 'error');
      return;
    }

    const winningTeam = teams.find((t) => t.id === selectedTeamId);
    if (!winningTeam) return;

    if (winningTeam.budget < amount) {
      showNotification(
        `Insufficient funds! ${winningTeam.name} only has ${formatCurrency(winningTeam.budget)}, but the bid is ${formatCurrency(amount)}.`,
        'error'
      );
      return;
    }

    setIsConfirmingSold(true);
  };

  const handleExecuteBidSubmit = async () => {
    if (!eventState?.id || !edition?.id) return;
    const rIdx = eventState.current_round_index ?? 0;
    const qIdx = eventState.current_question_index ?? 0;

    const alreadySold = items.find(
      (it) => it.round_index === rIdx && it.question_index === qIdx
    );
    if (alreadySold) {
      showNotification('Cannot execute bid: This question is already sold and locked.', 'error');
      return;
    }

    const roundBase = getRoundBasePrice(rIdx);
    const amount = parseFloat(bidAmount) || roundBase;
    const winningTeam = teams.find((t) => t.id === selectedTeamId);
    if (!winningTeam) return;

    if (winningTeam.budget < amount) {
      showNotification(`Cannot execute bid: ${winningTeam.name} only has ${formatCurrency(winningTeam.budget)}, but the bid is ${formatCurrency(amount)}!`, 'error');
      return;
    }

    const currentRoundData = DEFAULT_ROUNDS_DATA[rIdx] || { name: `Round ${rIdx + 1}`, questions: [] };
    const qRef = `R${rIdx + 1} - Q${qIdx + 1}`;

    // 1. Deduct budget and add score to team locally & sync
    const newBudget = winningTeam.budget - amount;
    const newScore = (winningTeam.score || 0) + (isAnswerCorrect ? 1 : 0);
    const updatedTeams = teams.map((t) =>
      t.id === winningTeam.id ? { ...t, budget: newBudget, score: newScore } : t
    );
    setTeams(updatedTeams);
    broadcastTeamsChange(updatedTeams, edition.id);
    await supabase.from('teams').update({ budget: newBudget, score: newScore }).eq('id', winningTeam.id);

    // 2. Insert into team_items locally & sync
    const newItemId = crypto.randomUUID();
    const newItem: TeamItem = {
      id: newItemId,
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
    broadcastItemsChange(updatedItems, edition.id);
    await supabase.from('team_items').insert({
      id: newItemId,
      edition_id: edition.id,
      team_id: winningTeam.id,
      item_name: currentItem,
      cost: amount,
      is_correct: isAnswerCorrect,
      round_index: rIdx,
      question_index: qIdx,
      question_ref: qRef,
    });

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

    let nextQuestionIdx = qIdx + 1;
    let nextItemText = '';

    if (isLastQuestionOfRound) {
      await handleAdvanceToNextStage(updatedItems, updatedTeams);
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
      if (eventState?.id) await supabase.from('event_state').update(nextState).eq('id', eventState.id);

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
    broadcastTeamsChange(updatedTeams, edition?.id);
    await supabase.from('teams').update({ budget: refundedBudget, score: revertedScore }).eq('id', teamToRefund.id);

    // Delete item record locally & sync
    const updatedItems = items.slice(1);
    setItems(updatedItems);
    broadcastItemsChange(updatedItems, edition?.id);
    await supabase.from('team_items').delete().eq('id', lastItem.id);

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
    await supabase.from('event_state').update(updates).eq('id', eventState.id);

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

    const resetPodium = {
      thirdTeamId: null,
      thirdTeamName: null,
      thirdRevealed: false,
      secondTeamId: null,
      secondTeamName: null,
      secondRevealed: false,
      firstTeamId: null,
      firstTeamName: null,
      firstRevealed: false,
    };
    setPodiumState(resetPodium);

    const resetPayload = JSON.stringify({ pastRounds: [], podium: resetPodium });

    const resetUpdates: Partial<EventState> = {
      game_state: 'setup',
      round_state: 'ROUND_SETUP',
      current_round_index: 0,
      current_question_index: 0,
      current_item_name: '',
      current_bid_preview: null,
      banner_message: resetPayload,
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
    try {
      localStorage.removeItem('gcl_transaction_history');
    } catch {}
    showNotification('Auction & winners fully reset to initial setup state.', 'success');

    for (const t of teams) {
      supabase.from('teams').update({ budget: standardBudget, score: 0 }).eq('id', t.id).then();
    }
    supabase.from('team_items').delete().eq('edition_id', edition.id).then();
    supabase.from('event_state').update(resetUpdates).eq('id', eventState.id).then();
  };

  const handleLogout = async () => {
    try {
      sessionStorage.removeItem('gcl_admin_authenticated');
      localStorage.removeItem('gcl_admin_authenticated');
    } catch {}
    await supabase.auth.signOut();
    navigate('/123456789/GCL-0321/admin/login');
  };

  const handleUpdateAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordVal || newPasswordVal.length < 6) {
      showNotification('Password must be at least 6 characters.', 'error');
      return;
    }
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPasswordVal });
      if (error) throw error;
      showNotification('Admin password updated successfully!', 'success');
      setIsChangePasswordOpen(false);
      setNewPasswordVal('');
    } catch (err: any) {
      showNotification(err?.message || 'Failed to update password.', 'error');
    } finally {
      setIsChangingPassword(false);
    }
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
  const isAfterRound3 = pastRounds.some((r) => r.roundIndex === 2) || roundIdx >= 3;
  const roundBasePrice = getRoundBasePrice(roundIdx);

  // --- REUSABLE SCOREBOARDS (RENDERED IN BOTH ACTIVE & INTERMISSION MODES) ---
  const renderOverallScoreboard = () => (
    <div className="scoreboard-card-overall">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <Crown size={28} className="text-yellow-400 shrink-0" />
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-extrabold text-white tracking-tight leading-tight m-0">Overall Scoreboard</h2>
              <div className="gcl-tech-tag gcl-tech-tag-amber">
                <span className="gcl-tag-dot bg-yellow-400 shadow-glow-gold"></span>
                ALL ROUNDS CUMULATIVE
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1 m-0">
              Ranking Priority: Total Score → Total Items → Total Remaining Budget
            </p>
          </div>
        </div>
      </div>

      <div className="gcl-table-container">
        <div className="grid-overall-header">
          <div>TEAM NAME</div>
          <div className="text-center text-yellow-400 font-black">TOTAL SCORE</div>
          <div className="text-center">TOTAL ITEMS</div>
          <div className="text-right">TOTAL SPENT</div>
          <div className="text-right">TOTAL REM.</div>
        </div>

        <div className="space-y-1">
          {overallStats.map((team, idx) => {
            const isGrandChampion = idx === 0 && team.totalScore > 0;
            const isRunnerUp = idx === 1 && team.totalScore > 0;
            const isThirdPlace = idx === 2 && team.totalScore > 0;
            const isOutOfBudget = team.totalRemaining <= 0;
            return (
              <div
                key={team.id}
                className={`grid-overall-row ${
                  isGrandChampion
                    ? 'gcl-row-champion'
                    : isRunnerUp
                    ? 'gcl-row-runnerup'
                    : isThirdPlace
                    ? 'gcl-row-third'
                    : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <span
                    className={`font-mono font-bold text-lg ${
                      isGrandChampion
                        ? 'text-yellow-400'
                        : isRunnerUp
                        ? 'text-slate-300'
                        : isThirdPlace
                        ? 'text-amber-500'
                        : 'text-blue-400'
                    }`}
                  >
                    {idx + 1}.
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-base truncate">{team.name}</span>
                      {isOutOfBudget && (
                        <span className="badge-out-of-budget">⚠️ OUT OF BUDGET</span>
                      )}
                    </div>
                    {isGrandChampion && (
                      <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase block mt-0.5">
                        GRAND CHAMPION
                      </span>
                    )}
                    {isRunnerUp && (
                      <span className="text-[10px] font-black tracking-widest text-slate-200 uppercase block mt-0.5">
                        RUNNER-UP
                      </span>
                    )}
                    {isThirdPlace && (
                      <span className="text-[10px] font-black tracking-widest text-amber-500 uppercase block mt-0.5">
                        3RD PLACE
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-center font-black text-yellow-400 text-2xl font-mono">
                  {team.totalScore}
                </div>
                <div className="text-center font-bold text-slate-200 text-lg font-mono">
                  {team.totalItems}
                </div>
                <div className="text-right font-mono text-red-400 font-bold text-base">
                  {formatCurrency(team.totalSpent)}
                </div>
                <div className="text-right font-mono font-black text-green-400 text-lg">
                  {formatCurrency(team.totalRemaining)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderPreviousRoundScoreboard = () => (
    <div className="scoreboard-card-previous">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <HistoryIcon size={28} className="text-indigo-400 shrink-0" />
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-extrabold text-white tracking-tight leading-tight m-0">Previous Round Scoreboard</h2>
              <div className="gcl-tech-tag gcl-tech-tag-indigo">
                ARCHIVED DATA
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1 m-0">
              Archived final snapshot of completed rounds
            </p>
          </div>
        </div>
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
          {[...pastRounds].reverse().map((snap) => (
            <div key={snap.roundIndex} className="space-y-3">
              <div className="flex justify-between items-center px-1 flex-wrap gap-2 mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="gcl-tech-tag gcl-tech-tag-indigo">
                    {snap.roundName || `ROUND ${snap.roundIndex + 1}`}
                  </span>
                  <span className="text-slate-200 font-bold text-sm tracking-wide">FINAL SNAPSHOT</span>
                </div>
                {snap.timestamp && (
                  <span className="text-slate-400 text-xs font-mono bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800">
                    Finished at {new Date(snap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <div className="gcl-table-container">
                <div className="grid-admin-score-header">
                  <div className="text-center">RANK</div>
                  <div>TEAM</div>
                  <div className="text-center text-yellow-400">SCORE</div>
                  <div className="text-center">ITEMS WON</div>
                  <div className="text-right">TOTAL SPENT</div>
                  <div className="text-right text-green-400">REMAINING BUDGET</div>
                </div>
                <div className="space-y-1">
                  {[...(snap.results || [])]
                    .sort((a, b) => (b.score || 0) - (a.score || 0) || b.remainingBudget - a.remainingBudget)
                    .map((res, idx) => (
                      <div key={res.id || idx} className="grid-admin-score-row">
                        <div className="text-center font-mono text-slate-400 font-bold">{idx + 1}</div>
                        <div className="font-bold text-white truncate">{res.name}</div>
                        <div className="text-center font-bold text-yellow-400 text-lg font-mono">
                          {res.score || 0}
                        </div>
                        <div className="text-center font-semibold text-indigo-300 font-mono">
                          {res.itemsCount || 0}
                        </div>
                        <div className="text-right font-mono text-red-400 font-semibold">
                          {formatCurrency(res.totalSpent || 0)}
                        </div>
                        <div className="text-right font-mono font-bold text-green-400">
                          {formatCurrency(res.remainingBudget || 0)}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderTransactionLog = () => (
    <div className="admin-card transaction-log-card shadow-2xl mt-8">
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-700/60 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <HistoryIcon size={28} className="text-purple-400 shrink-0" />
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl font-extrabold text-white tracking-tight leading-tight m-0">Transaction Log</h2>
              <div className="gcl-tech-tag gcl-tech-tag-purple">
                <span className="gcl-tag-dot bg-purple-400 shadow-glow-purple"></span>
                {localHistory.length} EVENTS RECORDED
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1 m-0">
              Real-time audit log of all sold items, corrections, and budget updates
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2 transaction-log-scroll max-h-[380px] overflow-y-auto pr-1">
        {localHistory.length === 0 ? (
          <p className="text-slate-500 italic text-sm py-8 text-center">
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
                  <span className="log-time font-mono text-xs">{item.time}</span>
                </div>
                <p className="log-details mt-1">{item.details}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="gcl-live-page min-h-screen text-[#f4f4f6] pb-16 relative flex flex-col font-['Rajdhani',sans-serif] selection:bg-[var(--accent-red)] selection:text-white" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
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

      {/* Admin Change Password Modal */}
      {isChangePasswordOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131316] border border-[#26262b] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4 text-[var(--accent-red)]">
              <KeyRound size={24} />
              <h3 className="text-xl font-bold text-white">Set / Update Admin Password</h3>
            </div>
            <p className="text-xs text-[#a1a1aa] mb-4">
              Enter your new administrator password. This will update your login credentials in Supabase Auth immediately.
            </p>
            <form onSubmit={handleUpdateAdminPassword} className="space-y-4">
              <div>
                <label className="text-xs text-[#71717a] uppercase font-bold mb-1 block">
                  New Password (min 6 chars)
                </label>
                <input
                  type="password"
                  value={newPasswordVal}
                  onChange={(e) => setNewPasswordVal(e.target.value)}
                  placeholder="Enter new password"
                  className="gcl-input w-full"
                  minLength={6}
                  required
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsChangePasswordOpen(false);
                    setNewPasswordVal('');
                  }}
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isChangingPassword || !newPasswordVal}
                  className="btn-primary"
                >
                  {isChangingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cyber Admin Command Bar */}
      <div className="max-w-7xl mx-auto px-4 pt-4 pb-2 relative z-30">
        <div className="p-2.5 rounded-2xl bg-[#131316] border border-[#26262b] backdrop-blur-xl shadow-2xl flex items-center justify-between flex-wrap gap-3">
          {/* Main 4 Module Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleTabChange('auction')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black font-mono tracking-wider flex items-center gap-2.5 transition-all cursor-pointer ${
                adminActiveTab === 'auction'
                  ? 'bg-[var(--accent-red)] text-white shadow-[0_2px_12px_rgba(224,38,63,0.3)] border border-[var(--accent-red)]'
                  : 'text-[#71717a] hover:text-white hover:bg-[#18181c] border border-transparent'
              }`}
            >
              <Hammer size={16} className={adminActiveTab === 'auction' ? 'text-white' : 'text-[#71717a]'} />
              <span>LIVE AUCTION CONSOLE</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${adminActiveTab === 'auction' ? 'bg-[#0a0a0c]/60 text-white border border-white/20' : 'bg-[#0a0a0c] text-[#71717a]'}`}>
                LIVE
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('teams')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black font-mono tracking-wider flex items-center gap-2.5 transition-all cursor-pointer ${
                adminActiveTab === 'teams'
                  ? 'bg-[#18181c] text-white border border-[var(--accent-red)] shadow-[0_0_12px_rgba(232,33,46,0.25)]'
                  : 'text-[#71717a] hover:text-white hover:bg-[#18181c] border border-transparent'
              }`}
            >
              <Users size={16} className={adminActiveTab === 'teams' ? 'text-[var(--accent-red)]' : 'text-[#71717a]'} />
              <span>TEAM MANAGEMENT</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${adminActiveTab === 'teams' ? 'bg-[#0a0a0c] text-[var(--accent-red)] border border-[var(--accent-red)]/30' : 'bg-[#0a0a0c] text-[#71717a]'}`}>
                {teams.length} TEAMS
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('certificates')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black font-mono tracking-wider flex items-center gap-2.5 transition-all cursor-pointer ${
                adminActiveTab === 'certificates'
                  ? 'bg-[#18181c] text-white border border-[var(--accent-red)]'
                  : 'text-[#71717a] hover:text-white hover:bg-[#18181c] border border-transparent'
              }`}
            >
              <Award size={16} className={adminActiveTab === 'certificates' ? 'text-[var(--accent-red)]' : 'text-[#71717a]'} />
              <span>CERTIFICATE HUB</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${adminActiveTab === 'certificates' ? 'bg-[#0a0a0c] text-[var(--accent-red)] border border-[var(--accent-red)]/30' : 'bg-[#0a0a0c] text-[#71717a]'}`}>
                MODULE
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('archive')}
              className={`px-5 py-2.5 rounded-xl text-xs font-black font-mono tracking-wider flex items-center gap-2.5 transition-all cursor-pointer ${
                adminActiveTab === 'archive'
                  ? 'bg-[#18181c] text-white border border-[#d4af37]/60 shadow-[0_0_12px_rgba(212,175,55,0.1)]'
                  : 'text-[#71717a] hover:text-white hover:bg-[#18181c] border border-transparent'
              }`}
            >
              <Archive size={16} className={adminActiveTab === 'archive' ? 'text-[#d4af37]' : 'text-[#71717a]'} />
              <span>ARCHIVE & HERITAGE</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${adminActiveTab === 'archive' ? 'bg-[#0a0a0c] text-[#d4af37] border border-[#d4af37]/30' : 'bg-[#0a0a0c] text-[#71717a]'}`}>
                HERITAGE
              </span>
            </button>
          </div>

          {/* Quick Context & Public Portal Links */}
          <div className="hidden lg:flex items-center gap-2">
            {profile?.email && (
              <span className="text-xs font-mono text-[#e1e1e6] px-2.5 py-1.5 rounded-lg bg-[#0a0a0c] border border-[#202024] flex items-center gap-1.5" title={`Logged in as ${profile.email}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red)] animate-pulse"></span>
                <span className="max-w-[150px] truncate">{profile.email}</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsChangePasswordOpen(true)}
              className="text-xs font-mono px-2.5 py-1.5 rounded-lg text-[#a1a1aa] hover:text-white bg-[#0a0a0c] hover:bg-[#18181c] border border-[#202024] transition-all flex items-center gap-1.5 cursor-pointer"
              title="Set / Change Admin Password"
            >
              <KeyRound size={13} className="text-[#e1e1e6]" />
              <span>Password</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('teams')}
              className={`text-xs font-mono px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                adminActiveTab === 'teams'
                  ? 'bg-[#222228] text-white border border-[var(--accent-red)]'
                  : 'text-white bg-[#18181c] hover:bg-[#222228] border border-[#2e2e36] hover:border-[var(--accent-red)]'
              }`}
              title="Add or Manage Team Members at any time"
            >
              <Users size={14} className="text-[var(--accent-red)]" />
              <span>Team Roster ({teams.length})</span>
            </button>
            <span className="text-xs font-mono text-[#71717a] px-3 py-1.5 rounded-lg bg-[#0a0a0c] border border-[#202024]">
              Edition: <strong className="text-white">{edition?.name || 'GCL 2026'}</strong>
            </span>
            <button
              type="button"
              onClick={() => navigate('/hall-of-fame')}
              className="text-xs font-mono px-2.5 py-1.5 rounded-lg text-[#71717a] hover:text-[#d4af37] hover:bg-[#d4af37]/10 border border-transparent hover:border-[#d4af37]/30 transition-all flex items-center gap-1"
            >
              ★ Hall of Fame
            </button>
            <button
              type="button"
              onClick={() => navigate('/my-certificates')}
              className="text-xs font-mono px-2.5 py-1.5 rounded-lg text-[#71717a] hover:text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 border border-transparent hover:border-[var(--accent-red)]/30 transition-all flex items-center gap-1"
            >
              ◈ Certificates
            </button>
          </div>
        </div>
      </div>

      {/* TEAM MANAGEMENT TAB */}
      {adminActiveTab === 'teams' && (
        <div className="max-w-7xl mx-auto px-4 py-4 space-y-6">
          {/* Header Banner */}
          <div className="p-6 rounded-2xl bg-[#131316] border border-[#26262b] shadow-2xl relative overflow-hidden backdrop-blur-xl">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/40 flex items-center justify-center text-[var(--accent-red)] shadow-[0_0_20px_rgba(232,33,46,0.2)]">
                    <Users size={26} />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-wide uppercase font-['Rajdhani',sans-serif]">
                      TEAM ROSTER & MANAGEMENT
                    </h1>
                    <p className="text-xs md:text-sm text-[#a1a1aa] font-medium font-sans">
                      Register teams, manage player rosters, calibrate budgets & auto-sync participants with live certificates.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowAddTeamPanel((prev) => !prev)}
                  className="px-4 py-2.5 rounded-xl bg-[var(--accent-red)] hover:bg-[#c91824] text-white text-xs font-bold font-mono tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(232,33,46,0.3)]"
                >
                  <Plus size={16} />
                  <span>{showAddTeamPanel ? 'HIDE REGISTRATION' : '+ REGISTER NEW TEAM'}</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[#222228]">
              <div className="p-3.5 rounded-xl bg-[#0e0e11] border border-[#202026]">
                <div className="text-[11px] font-mono text-[#71717a] uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Trophy size={13} className="text-[#d4af37]" />
                  <span>Total Teams</span>
                </div>
                <div className="text-2xl font-black text-white font-mono">
                  {teams.length}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0e0e11] border border-[#202026]">
                <div className="text-[11px] font-mono text-[#71717a] uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Users size={13} className="text-[var(--accent-red)]" />
                  <span>Total Participants</span>
                </div>
                <div className="text-2xl font-black text-[var(--accent-red)] font-mono">
                  {teamManagementMetrics.totalParticipants}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0e0e11] border border-[#202026]">
                <div className="text-[11px] font-mono text-[#71717a] uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Calculator size={13} className="text-emerald-400" />
                  <span>Total Team Budget</span>
                </div>
                <div className="text-2xl font-black text-emerald-400 font-mono">
                  {formatCurrency(teamManagementMetrics.totalCommittedBudget)}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#0e0e11] border border-[#202026]">
                <div className="text-[11px] font-mono text-[#71717a] uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Award size={13} className="text-purple-400" />
                  <span>Items Acquired</span>
                </div>
                <div className="text-2xl font-black text-purple-400 font-mono">
                  {teamManagementMetrics.totalItemsWon}
                </div>
              </div>
            </div>
          </div>

          {/* Collapsible Register Team Form */}
          {showAddTeamPanel && (
            <div className="p-6 rounded-2xl bg-[#131316] border border-[#26262b] shadow-2xl relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-white font-black font-['Rajdhani',sans-serif] text-lg uppercase tracking-wider">
                  <Plus size={18} className="text-[var(--accent-red)]" />
                  <span>Register New Team</span>
                </div>
                <span className="text-[11px] font-mono text-[#71717a]">
                  Automatic Certificate ID generation enabled
                </span>
              </div>

              <form onSubmit={handleAddTeam} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-mono uppercase text-[#a1a1aa] block mb-1.5 font-bold">
                      Team Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Code Warriors, Byte Busters"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      className="gcl-input w-full text-sm font-semibold"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-mono uppercase text-[#a1a1aa] block mb-1.5 font-bold">
                      Starting Budget (₹)
                    </label>
                    <input
                      type="number"
                      placeholder="50000000"
                      value={budgetInput}
                      onChange={(e) => setBudgetInput(e.target.value)}
                      className="gcl-input w-full text-sm font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono uppercase text-[#a1a1aa] block mb-1.5 font-bold flex items-center justify-between">
                    <span>Member Names (Optional, comma or newline separated)</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Will be available for 1-click certificates</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Rahul Sharma, Priya Patel, Aman Gupta"
                    value={newTeamMembers}
                    onChange={(e) => setNewTeamMembers(e.target.value)}
                    className="gcl-input w-full text-xs text-white font-mono resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={!newTeamName.trim()}
                    className="px-6 py-2.5 rounded-xl bg-[var(--accent-red)] hover:bg-[#c91824] disabled:opacity-50 text-white font-bold font-mono tracking-wider text-xs transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(232,33,46,0.3)]"
                  >
                    <Plus size={16} />
                    <span>CREATE TEAM & SAVE ROSTER</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="p-3.5 rounded-xl bg-[#131316] border border-[#26262b] flex flex-col sm:flex-row items-center justify-between gap-3 flex-wrap">
            <div className="relative w-full sm:w-80">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" />
              <input
                type="text"
                placeholder="Search team or member..."
                value={teamSearchQuery}
                onChange={(e) => setTeamSearchQuery(e.target.value)}
                className="gcl-input w-full pl-9 py-2 text-xs font-mono"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setTeamFilterStatus('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  teamFilterStatus === 'all'
                    ? 'bg-[#26262f] text-white border border-white/20'
                    : 'text-[#71717a] hover:text-white bg-transparent border border-transparent'
                }`}
              >
                All ({teams.length})
              </button>
              <button
                type="button"
                onClick={() => setTeamFilterStatus('with-members')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  teamFilterStatus === 'with-members'
                    ? 'bg-[#26262f] text-white border border-white/20'
                    : 'text-[#71717a] hover:text-white bg-transparent border border-transparent'
                }`}
              >
                With Members ({teams.filter((t) => (teamMembersMap[t.id] || []).length > 0).length})
              </button>
              <button
                type="button"
                onClick={() => setTeamFilterStatus('no-members')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  teamFilterStatus === 'no-members'
                    ? 'bg-[#26262f] text-white border border-white/20'
                    : 'text-[#71717a] hover:text-white bg-transparent border border-transparent'
                }`}
              >
                No Members ({teams.filter((t) => (teamMembersMap[t.id] || []).length === 0).length})
              </button>
            </div>
          </div>

          {/* Teams Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {teamManagementMetrics.filteredTeams.length === 0 ? (
              <div className="col-span-full p-12 text-center rounded-2xl bg-[#131316] border border-[#26262b]">
                <Users size={40} className="mx-auto text-[#52525b] mb-3" />
                <h3 className="text-lg font-bold text-white mb-1">No matching teams found</h3>
                <p className="text-xs text-[#71717a]">
                  Try adjusting your search query or register a new team above.
                </p>
              </div>
            ) : (
              teamManagementMetrics.filteredTeams.map((team, idx) => {
                const members = teamMembersMap[team.id] || [];
                const teamItems = items.filter((it) => it.team_id === team.id);
                const isEditingBudget = editingBudgetTeamId === team.id;

                return (
                  <div
                    key={team.id}
                    className="p-5 rounded-2xl bg-[#131316] border border-[#26262b] hover:border-[#383842] shadow-xl flex flex-col justify-between transition-all relative overflow-hidden group"
                  >
                    <div>
                      {/* Top Bar: Team Number & Actions */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-8 h-8 rounded-lg bg-[#18181c] border border-[#2a2a32] flex items-center justify-center font-mono font-bold text-xs text-[var(--accent-red)] shrink-0">
                            #{String(idx + 1).padStart(2, '0')}
                          </span>

                          <div className="min-w-0">
                            {editingTeamNames[team.id] !== undefined ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={editingTeamNames[team.id]}
                                  onChange={(e) =>
                                    setEditingTeamNames((prev) => ({
                                      ...prev,
                                      [team.id]: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleConfirmTeamRename();
                                    }
                                  }}
                                  className="gcl-input py-1 text-sm font-bold w-40"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={handleConfirmTeamRename}
                                  className="p-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 cursor-pointer"
                                  title="Save Name"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingTeamNames((prev) => {
                                      const copy = { ...prev };
                                      delete copy[team.id];
                                      return copy;
                                    });
                                    setTeamPendingEdit(null);
                                  }}
                                  className="p-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 cursor-pointer"
                                  title="Cancel"
                                >
                                  <XCircle size={14} />
                                </button>
                              </div>
                            ) : (
                              <h3
                                className="font-extrabold text-white text-lg tracking-wide truncate uppercase font-['Rajdhani',sans-serif] cursor-pointer hover:text-[var(--accent-red)] transition-colors"
                                onClick={() => {
                                  setEditingTeamNames((prev) => ({ ...prev, [team.id]: team.name }));
                                  setTeamPendingEdit({ id: team.id, oldName: team.name, newName: team.name });
                                }}
                                title="Click to rename"
                              >
                                {team.name}
                              </h3>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTeamNames((prev) => ({ ...prev, [team.id]: team.name }));
                              setTeamPendingEdit({ id: team.id, oldName: team.name, newName: team.name });
                            }}
                            className="p-1.5 rounded-lg text-[#71717a] hover:text-cyan-400 hover:bg-[#1f1f26] transition-colors cursor-pointer"
                            title="Rename Team"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setTeamToRemove(team)}
                            className="p-1.5 rounded-lg text-[#71717a] hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Remove Team"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Financial Strip */}
                      <div className="p-3 rounded-xl bg-[#0e0e11] border border-[#202026] mb-4 space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-[#71717a] uppercase font-bold">Current Budget</span>
                          {isEditingBudget ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={editingBudgetValue}
                                onChange={(e) => setEditingBudgetValue(e.target.value)}
                                className="gcl-input py-0.5 px-2 text-xs font-mono w-28 text-right"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveTeamBudget(team.id)}
                                className="p-1 rounded bg-emerald-500/20 text-emerald-400 cursor-pointer"
                                title="Save"
                              >
                                <Check size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingBudgetTeamId(null)}
                                className="p-1 rounded bg-red-500/20 text-red-400 cursor-pointer"
                                title="Cancel"
                              >
                                <XCircle size={12} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-emerald-400 font-mono text-sm">
                                {formatCurrency(team.budget)}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingBudgetTeamId(team.id);
                                  setEditingBudgetValue(team.budget.toString());
                                }}
                                className="text-[10px] text-[#71717a] hover:text-emerald-400 underline font-mono cursor-pointer"
                              >
                                Edit
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Quick Adjust Buttons */}
                        <div className="flex items-center justify-between pt-1 border-t border-[#1a1a20] text-[11px] font-mono">
                          <span className="text-[#71717a]">Quick Adjust:</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustTeamBudget(team.id, -1000000)}
                              className="px-1.5 py-0.5 rounded bg-[#18181c] hover:bg-red-500/20 hover:text-red-400 text-[#a1a1aa] border border-[#2a2a32] transition-colors cursor-pointer"
                              title="Decrease budget by ₹10L"
                            >
                              -10L
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustTeamBudget(team.id, 1000000)}
                              className="px-1.5 py-0.5 rounded bg-[#18181c] hover:bg-emerald-500/20 hover:text-emerald-400 text-[#a1a1aa] border border-[#2a2a32] transition-colors cursor-pointer"
                              title="Increase budget by ₹10L"
                            >
                              +10L
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustTeamBudget(team.id, 5000000)}
                              className="px-1.5 py-0.5 rounded bg-[#18181c] hover:bg-emerald-500/20 hover:text-emerald-400 text-[#a1a1aa] border border-[#2a2a32] transition-colors cursor-pointer"
                              title="Increase budget by ₹50L"
                            >
                              +50L
                            </button>
                          </div>
                        </div>

                        {/* Stats Summary */}
                        <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-[#a1a1aa]">
                          <span>Items Won: <strong className="text-white">{teamItems.length}</strong></span>
                          <span>Score: <strong className="text-[var(--accent-red)]">{team.score || 0} PTS</strong></span>
                        </div>
                      </div>

                      {/* Roster Members Section */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-[#a1a1aa] uppercase font-bold tracking-wider">
                            Roster ({members.length})
                          </span>
                          <span className="text-[10px] text-emerald-400/80 font-mono">
                            ⚡ Synced to Certificates
                          </span>
                        </div>

                        {/* Member Chips */}
                        <div className="flex flex-wrap gap-1.5 min-h-[32px] max-h-36 overflow-y-auto pr-1">
                          {members.map((m) => (
                            <span
                              key={m.id}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#18181c] border border-[#26262f] text-xs text-white font-medium shadow-sm group/chip hover:border-[var(--accent-red)]/50 transition-colors"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red)]"></span>
                              <span className="max-w-[120px] truncate">{m.full_name || m.name}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveMemberFromTeam(m.id, team.id)}
                                className="text-[#71717a] hover:text-red-400 font-bold ml-0.5 cursor-pointer transition-colors"
                                title="Remove member"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          {members.length === 0 && (
                            <p className="text-xs text-[#71717a] italic py-1">
                              No members yet. Type below to add.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Inline Add Member Bar */}
                    <div className="pt-3 mt-3 border-t border-[#202026]">
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Add member name..."
                          value={newMemberInputs[team.id] || ''}
                          onChange={(e) =>
                            setNewMemberInputs((prev) => ({
                              ...prev,
                              [team.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddMemberToTeam(team.id);
                            }
                          }}
                          className="gcl-input flex-1 py-1.5 text-xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddMemberToTeam(team.id)}
                          disabled={!newMemberInputs[team.id]?.trim() || addingMemberTeamId === team.id}
                          className="px-3 py-1.5 rounded-lg bg-[var(--accent-red)] hover:bg-[#c91824] text-white text-xs font-bold font-mono transition-all disabled:opacity-40 flex items-center gap-1 cursor-pointer shrink-0"
                          title="Add Member"
                        >
                          <Plus size={13} />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* CERTIFICATES TAB */}
      {adminActiveTab === 'certificates' && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <AdminCertificateManager
            currentEdition={edition}
            teams={teams}
            onShowToast={showNotification}
            onNavigateBulk={() => navigate('/123456789/GCL-0321/admin/certificates/bulk')}
          />
        </div>
      )}

      {/* ARCHIVE TAB */}
      {adminActiveTab === 'archive' && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <AdminArchiveManager
            currentEdition={edition}
            teams={teams}
            onShowToast={showNotification}
            autoOpenCreate={isNewEditionModalOpen}
            onCloseAutoCreate={() => setIsNewEditionModalOpen(false)}
            onEditionUpdated={async () => {
              const { data: curEd } = await supabase
                .from('editions')
                .select('*')
                .eq('is_current', true)
                .single();
              if (curEd) {
                setEdition(curEd);
                const { data: st } = await supabase
                  .from('event_state')
                  .select('*')
                  .eq('edition_id', curEd.id)
                  .single();
                if (st) setEventState(st);
                const { data: tm } = await supabase
                  .from('teams')
                  .select('*')
                  .eq('edition_id', curEd.id)
                  .order('created_at', { ascending: true });
                if (tm) setTeams(tm);
              }
            }}
          />
        </div>
      )}

      {/* LIVE AUCTION CONSOLE */}
      {adminActiveTab === 'auction' && (
        <>
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
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <label className="input-label mb-0">Participating Teams ({teams.length})</label>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Configure teams and their member names. Members will be ready for 1-click certificate generation.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 max-h-[380px] overflow-y-auto pr-2 mb-4">
                  {teams.map((team, idx) => {
                    const members = teamMembersMap[team.id] || [];
                    const isExpanded = !!expandedTeamMembers[team.id];
                    return (
                      <div
                        key={team.id}
                        className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 transition-all hover:border-slate-700"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-500 w-6 font-bold">{idx + 1}.</span>
                          <input
                            type="text"
                            value={team.name}
                            onChange={(e) => handleTeamNameChange(team.id, e.target.value)}
                            onBlur={() => handleTeamNameBlur(team.id)}
                            className="gcl-input-inline flex-1 text-sm font-semibold"
                            placeholder={`Team ${idx + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => toggleTeamMembersExpanded(team.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                              isExpanded || members.length > 0
                                ? 'bg-[#18181c] text-[#e1e1e6] border border-[#26262b] hover:bg-[#202025]'
                                : 'bg-[#18181c] text-[#71717a] border border-[#202024] hover:text-white'
                            }`}
                            title="Manage Team Members"
                          >
                            <Users size={13} className={members.length > 0 ? 'text-[var(--accent-red)]' : 'text-[#71717a]'} />
                            <span>{members.length} {members.length === 1 ? 'Member' : 'Members'}</span>
                          </button>
                          <button
                            onClick={() => setTeamToRemove(team)}
                            disabled={teams.length <= 1}
                            className="btn-remove-circle"
                            title="Remove Team"
                          >
                            <Minus size={14} />
                          </button>
                        </div>

                        {/* Collapsible Members Section */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-[#202024] pl-8 pr-1 space-y-2.5">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <span className="text-[11px] font-mono uppercase tracking-wider text-[#71717a]">
                                Team Members ({members.length})
                              </span>
                              <span className="text-[10px] text-[#71717a] font-mono">
                                ⚡ Ready for 1-click certificate generation
                              </span>
                            </div>

                            {/* Member Chips */}
                            <div className="flex flex-wrap gap-1.5">
                              {members.map((m) => (
                                <span
                                  key={m.id}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#18181c] border border-[#26262b] text-xs text-[#e1e1e6]"
                                >
                                  <span>{m.full_name || m.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMemberFromTeam(m.id, team.id)}
                                    className="text-[#71717a] hover:text-red-400 transition-colors ml-0.5 cursor-pointer"
                                    title="Remove member"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                              {members.length === 0 && (
                                <span className="text-xs text-[#71717a] italic">
                                  No members registered yet. Type names below to add.
                                </span>
                              )}
                            </div>

                            {/* Add Member inline input */}
                            <div className="flex gap-2 pt-1">
                              <input
                                type="text"
                                placeholder="Add member name (or comma-separated)..."
                                value={newMemberInputs[team.id] || ''}
                                onChange={(e) =>
                                  setNewMemberInputs((prev) => ({
                                    ...prev,
                                    [team.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddMemberToTeam(team.id);
                                  }
                                }}
                                className="gcl-input flex-1 py-1.5 text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddMemberToTeam(team.id)}
                                disabled={!newMemberInputs[team.id]?.trim() || addingMemberTeamId === team.id}
                                className="px-3 py-1.5 rounded-lg bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                              >
                                <Plus size={13} /> Add
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {teams.length === 0 && (
                    <p className="text-slate-500 italic text-center py-4">
                      No teams added yet. Add your participating teams below.
                    </p>
                  )}
                </div>

                <form onSubmit={handleAddTeam} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Plus size={15} className="text-blue-400" /> Add Participating Team
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Team Name * (e.g. Code Warriors)"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      className="gcl-input flex-1 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={!newTeamName.trim()}
                      className="btn-primary-add shrink-0"
                    >
                      <Plus size={18} /> Add Team
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">
                      Member Names (Optional, comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma, Priya Patel, Aman Gupta"
                      value={newTeamMembers}
                      onChange={(e) => setNewTeamMembers(e.target.value)}
                      className="gcl-input w-full py-1.5 text-xs text-slate-200"
                    />
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Members added here will be automatically registered for instant 1-click certificate generation in the Certificate Hub.
                    </span>
                  </div>
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
              onClick={handleStartRound1}
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
        <div className="admin-page-container max-w-7xl mx-auto px-4 py-6 space-y-6">
          {/* Top Row: Round Progression & Question/Timer side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* 1. Round Progression Card */}
            <div className="admin-card space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="card-title text-indigo-400 mb-0">
                    <RefreshCw size={22} /> Round Progression
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsTeamManagementModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-[#18181c] hover:bg-[#222228] border border-[#2a2a34] text-xs font-semibold text-[#f4f4f6] flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Add or manage team members during the live event"
                  >
                    <Users size={14} className="text-[var(--accent-red)]" />
                    <span>Manage Teams ({teams.length})</span>
                  </button>
                </div>
                <div className="round-progress-banner mt-3">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
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
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          <span className="font-mono text-xl font-bold text-yellow-300">
                            {questionIdx + 1}
                          </span>
                          <span className="text-slate-400 text-sm"> of {totalQuestions}</span>
                          {alreadySoldItem && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-950/90 text-red-400 border border-red-700/60 uppercase tracking-wider">
                              <Lock size={11} /> Sold
                            </span>
                          )}
                        </div>
                        {alreadySoldItem && (
                          <div className="mt-1">
                            <button
                              type="button"
                              onClick={handleJumpToNextUnsold}
                              className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-semibold transition-colors"
                            >
                              Jump to next unsold →
                            </button>
                          </div>
                        )}
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
              </div>

              {isLastQuestion ? (
                <div className="advance-notice-box space-y-3 mt-4">
                  <div>
                    <p className="advance-title">Round End: Ready to Advance</p>
                    <p className="advance-desc">
                      Question {questionIdx + 1} of {totalQuestions} reached. Click below to advance the auction to the next stage!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleAdvanceToNextStage()}
                    className="btn-advance-intermission"
                  >
                    <ChevronRight size={20} />
                    {roundIdx === 0
                      ? 'End Round 1 & Go to Leaderboard Reveal'
                      : roundIdx === 1
                      ? 'End Round 2 & Go to Intermission'
                      : roundIdx === 2
                      ? 'End Round 3 & Go to Tie Breaker / Winner Selection'
                      : 'End Tie Breaker & Reveal Winners'}
                  </button>
                </div>
              ) : (
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-end">
                  <button
                    type="button"
                    onClick={() => void handleAdvanceToNextStage()}
                    className="text-xs text-slate-400 hover:text-yellow-400 flex items-center gap-1 font-semibold transition-colors"
                  >
                    <ChevronRight size={14} /> End {currentRoundData.name || `Round ${roundIdx + 1}`} Early
                  </button>
                </div>
              )}
            </div>

            {/* 2. Question & Timer Card */}
            <div className="admin-card flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <HelpCircle size={22} />
                    <h2 className="text-xl font-bold text-white">Question & Timer</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {isRevealed ? (
                      <span className="badge-revealed-to-players">● REVEALED TO PLAYERS</span>
                    ) : (
                      <span className="badge-hidden-from-players">HIDDEN FROM PLAYERS (AWAITING)</span>
                    )}

                    {!alreadySoldItem && (
                      isRevealed ? (
                        <button
                          type="button"
                          onClick={handleHideQuestion}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
                          title="Hide question from players (set back to Awaiting state)"
                        >
                          <EyeOff size={14} /> Hide Q
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleRevealQuestion}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/60 hover:text-emerald-100 transition flex items-center gap-1.5 cursor-pointer"
                          title="Reveal question to players on screen before starting countdown timer"
                        >
                          <Eye size={14} /> Reveal Q
                        </button>
                      )
                    )}
                  </div>
                </div>

                {alreadySoldItem && (
                  <div className="p-3 mb-4 bg-red-950/80 border-2 border-red-500/70 rounded-xl text-red-200 text-xs font-semibold flex items-center justify-between gap-3 shadow-inner">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-red-900/60 border border-red-600/60 flex items-center justify-center text-red-300 shrink-0">
                        <Lock size={16} />
                      </div>
                      <div>
                        <span className="font-extrabold uppercase tracking-wide text-red-300 block">
                          Question Locked & Already Sold
                        </span>
                        <span className="text-slate-300">
                          Purchased by <strong className="text-yellow-300 font-bold">{buyerTeam?.name || 'a team'}</strong> for <strong>{formatCurrency(alreadySoldItem.cost)}</strong> ({alreadySoldItem.is_correct ? 'Correct (+1 pt)' : 'Incorrect (0 pt)'}).
                        </span>
                      </div>
                    </div>
                    <div className="gcl-tech-tag gcl-tech-tag-red shrink-0">
                      <span className="gcl-tag-dot bg-red-400"></span>
                      BLOCKED
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="input-label mb-0">Item / Question Name</label>
                    <button
                      type="button"
                      onClick={handleLoadQuestionFromData}
                      disabled={Boolean(alreadySoldItem)}
                      className={`btn-secondary-load ${alreadySoldItem ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <FileText size={15} /> Load Q{questionIdx + 1} from Data
                    </button>
                  </div>
                  <textarea
                    value={currentItem}
                    onChange={(e) => handleItemNameChange(e.target.value)}
                    disabled={Boolean(alreadySoldItem)}
                    readOnly={Boolean(alreadySoldItem)}
                    placeholder={`Enter question for Round ${roundIdx + 1} - Q${questionIdx + 1}...`}
                    rows={4}
                    className={`gcl-textarea ${alreadySoldItem ? 'opacity-60 cursor-not-allowed bg-slate-900/60 border-red-900/40 text-slate-400' : ''}`}
                  />
                </div>
              </div>

              {/* Timer Controls Row */}
              <div className="timer-controls-bar mt-2">
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
                      disabled={Boolean(alreadySoldItem)}
                      className={`btn-timer-start ${alreadySoldItem ? 'opacity-40 cursor-not-allowed' : ''}`}
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
          </div>

          {/* 3. Final Bid & Answer Form (FULL WIDTH: Wide & Balanced with Vibrant Evaluation) */}
          <form onSubmit={handlePromptBidSubmit} className="admin-card space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#202024]">
              <h2 className="card-title text-white mb-0">
                <Hammer size={22} className="text-[var(--accent-red)]" /> Final Bid & Answer Evaluation
              </h2>
              {selectedTeamId && (
                <span className="gcl-tech-tag gcl-tech-tag-red">
                  <span className="gcl-tag-dot bg-[var(--accent-red)]"></span>
                  SELECTED: <strong>{teams.find(t => t.id === selectedTeamId)?.name}</strong>
                </span>
              )}
            </div>

            {alreadySoldItem && (
              <div className="p-4 bg-red-950/90 border-2 border-red-600 rounded-xl text-red-200 text-sm font-semibold flex items-center gap-3 shadow-lg">
                <Lock size={26} className="text-red-400 shrink-0" />
                <div>
                  <div className="font-extrabold text-red-300 uppercase tracking-wide flex items-center gap-2">
                    AUCTION BLOCKED — QUESTION ALREADY SOLD
                    <span className="px-2 py-0.5 rounded text-[10px] bg-red-800 text-white font-mono">
                      R{roundIdx + 1} - Q{questionIdx + 1}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    This question has already been purchased by <strong className="text-yellow-300 font-bold">{buyerTeam?.name || 'Unknown Team'}</strong> for {formatCurrency(alreadySoldItem.cost)} ({alreadySoldItem.is_correct ? 'Correct (+1 Point)' : 'Incorrect (0 Points)'}). It cannot be accessed or auctioned again.
                  </div>
                </div>
              </div>
            )}

            {/* Team Selection: Full Width Grid - ALL teams visible without scrolling */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <label className="input-label mb-0">Select Winning Team</label>
                <span className="text-xs text-slate-400">{teams.length} teams available</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {teams.map((t) => {
                  const isSelected = selectedTeamId === t.id;
                  const currentBidVal = parseFloat(bidAmount) || roundBasePrice;
                  const isExhausted = t.budget <= 0;
                  const cannotAfford = t.budget < currentBidVal;
                  const isLocked = isExhausted || cannotAfford || Boolean(alreadySoldItem);
                  const isLow = !isExhausted && !cannotAfford && t.budget <= 5000000;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={isLocked}
                      onClick={() => handleTeamSelection(t.id)}
                      className={`team-select-btn ${
                        isSelected ? 'team-btn-selected' : 'team-btn-default'
                      } ${
                        isLocked
                          ? 'opacity-40 cursor-not-allowed border-red-500/30 bg-slate-900/60'
                          : ''
                      }`}
                    >
                      <div className="flex flex-col w-full text-left">
                        <span className="font-bold text-sm truncate w-full text-white">{t.name}</span>
                        {isExhausted ? (
                          <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider mt-0.5">⚠️ OUT OF BUDGET</span>
                        ) : cannotAfford ? (
                          <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider mt-0.5">⚠️ INSUFFICIENT ({formatCurrency(t.budget)})</span>
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

            {/* Bid Amount & Answer Evaluation: Side-by-Side Grid (Wide, Balanced & Vibrant) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-slate-700/60 items-stretch">
              {/* Left: Bid Amount & Fast Buttons */}
              <div className="flex flex-col justify-between">
                <div>
                  <label className="input-label mb-2 block">
                    Bid Amount (Round {roundIdx + 1} Base: {formatCurrency(roundBasePrice)})
                  </label>
                  <div className="space-y-2.5">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={bidAmount}
                      onChange={handleBidAmountChange}
                      disabled={Boolean(alreadySoldItem)}
                      placeholder={String(roundBasePrice)}
                      className={`gcl-input font-mono text-xl ${alreadySoldItem ? 'opacity-40 cursor-not-allowed' : ''}`}
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => handleQuickSet(roundBasePrice)}
                        disabled={Boolean(alreadySoldItem)}
                        className={`quick-btn-base ${alreadySoldItem ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        Base ({formatCurrency(roundBasePrice)})
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(MIN_INCREMENT)}
                        disabled={Boolean(alreadySoldItem)}
                        className={`quick-btn-inc ${alreadySoldItem ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        + 10 L
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(5000000)}
                        disabled={Boolean(alreadySoldItem)}
                        className={`quick-btn-green ${alreadySoldItem ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        + 50 L
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(-1000000)}
                        disabled={Boolean(alreadySoldItem)}
                        className={`quick-btn-red ${alreadySoldItem ? 'opacity-40 cursor-not-allowed' : ''}`}
                      >
                        - 10 L
                      </button>
                    </div>
                  </div>
                </div>
                {bidAmount && parseFloat(bidAmount) > 0 && (
                  <p className="mt-3 text-sm text-slate-400">
                    Formatted Bid:{' '}
                    <span className="text-white font-bold font-mono text-base">
                      {formatCurrency(parseFloat(bidAmount))}
                    </span>
                  </p>
                )}
              </div>

              {/* Right: Answer Result Evaluation (Vibrant, Wide & Modern Design) */}
              <div className="flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <label className="input-label mb-0">Answer Evaluation</label>
                  {isAnswerCorrect ? (
                    <span className="gcl-tech-tag gcl-tech-tag-emerald">
                      <span className="gcl-tag-dot bg-emerald-400 shadow-glow-emerald animate-pulse"></span>
                      AWARD: +1 POINT
                    </span>
                  ) : (
                    <span className="gcl-tech-tag gcl-tech-tag-red">
                      <span className="gcl-tag-dot bg-red-400 shadow-glow-red"></span>
                      AWARD: 0 POINTS
                    </span>
                  )}
                </div>

                <div className="answer-eval-box">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center shrink-0">
                      <HelpCircle className="text-amber-400" size={18} />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">Did the team answer correctly?</p>
                      <p className="text-slate-400 text-xs mt-0.5">
                        Correct adds +1 to team score; Incorrect gives 0 score.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAnswerCorrect(false)}
                      disabled={Boolean(alreadySoldItem)}
                      className={`answer-eval-card ${
                        alreadySoldItem ? 'opacity-40 cursor-not-allowed' : ''
                      } ${
                        !isAnswerCorrect
                          ? 'answer-eval-incorrect-active'
                          : 'answer-eval-incorrect-inactive'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        !isAnswerCorrect ? 'bg-red-500 text-white' : 'bg-red-950/60 text-red-400 border border-red-800'
                      }`}>
                        <XCircle size={18} />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <span className={`block font-black text-sm uppercase tracking-wide ${
                          !isAnswerCorrect ? 'text-white' : 'text-slate-300'
                        }`}>
                          Incorrect (0)
                        </span>
                        <span className={`block text-xs font-mono mt-0.5 ${
                          !isAnswerCorrect ? 'text-red-200' : 'text-slate-400'
                        }`}>
                          0 Points Added
                        </span>
                      </div>
                      {!isAnswerCorrect && (
                        <span className="w-2.5 h-2.5 rounded-full bg-red-400 shadow-glow-red shrink-0"></span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsAnswerCorrect(true)}
                      disabled={Boolean(alreadySoldItem)}
                      className={`answer-eval-card ${
                        alreadySoldItem ? 'opacity-40 cursor-not-allowed' : ''
                      } ${
                        isAnswerCorrect
                          ? 'answer-eval-correct-active'
                          : 'answer-eval-correct-inactive'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        isAnswerCorrect ? 'bg-green-500 text-white' : 'bg-green-950/60 text-green-400 border border-green-800'
                      }`}>
                        <Check size={18} strokeWidth={3} />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <span className={`block font-black text-sm uppercase tracking-wide ${
                          isAnswerCorrect ? 'text-white' : 'text-slate-300'
                        }`}>
                          Correct (+1)
                        </span>
                        <span className={`block text-xs font-mono mt-0.5 ${
                          isAnswerCorrect ? 'text-green-200' : 'text-slate-400'
                        }`}>
                          +1 Point to Team
                        </span>
                      </div>
                      {isAnswerCorrect && (
                        <span className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-glow-emerald shrink-0"></span>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SOLD Action Button with Insufficient Budget Protection */}
            {(() => {
              const selectedTeam = teams.find((t) => t.id === selectedTeamId);
              const currentBidVal = parseFloat(bidAmount) || roundBasePrice;
              const cannotAfford = selectedTeam ? selectedTeam.budget < currentBidVal : false;

              return (
                <div className="space-y-3">
                  {cannotAfford && selectedTeam && !alreadySoldItem && (
                    <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-lg text-red-300 text-xs font-semibold flex items-center gap-2">
                      <AlertCircle size={16} className="text-red-400 shrink-0" />
                      <span>
                        Cannot execute bid: <strong>{selectedTeam.name}</strong> only has {formatCurrency(selectedTeam.budget)}, which is less than the current bid of {formatCurrency(currentBidVal)}.
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={
                      Boolean(alreadySoldItem) ||
                      !selectedTeamId ||
                      !currentItem.trim() ||
                      parseFloat(bidAmount || '0') < roundBasePrice ||
                      cannotAfford
                    }
                    className={`btn-sold-action ${
                      Boolean(alreadySoldItem) ||
                      !selectedTeamId ||
                      !currentItem.trim() ||
                      parseFloat(bidAmount || '0') < roundBasePrice ||
                      cannotAfford
                        ? 'btn-sold-disabled'
                        : 'btn-sold-ready'
                    }`}
                  >
                    <CheckCircle2 size={22} fill="currentColor" />
                    {alreadySoldItem
                      ? `QUESTION ALREADY SOLD TO ${buyerTeam?.name?.toUpperCase() || 'TEAM'} (BLOCKED)`
                      : cannotAfford
                      ? 'INSUFFICIENT BUDGET TO BID'
                      : isAnswerCorrect
                      ? 'SOLD! (Correct Answer +1 Score)'
                      : 'SOLD! (Incorrect Answer +0 Score)'}
                  </button>
                </div>
              );
            })()}
          </form>

          {/* 4. Action & Corrections Bar: Full Width below Final Bid */}
          <div className="admin-card border-l-4 border-l-amber-500 py-4 px-6 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="card-title text-amber-400 mb-0.5 text-lg">
                  <Undo2 size={20} /> Auction Actions & Corrections
                </h2>
                <p className="text-xs text-slate-400">
                  Quickly revert accidental bids or execute emergency administrative actions.
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handlePromptUndoLastBid}
                  disabled={items.length === 0}
                  className={`btn-undo-action w-auto px-5 py-2.5 shrink-0 ${items.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Undo2 size={18} /> Undo Last Transaction
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingReset(true)}
                  className="btn-danger-reset w-auto px-5 py-2.5 shrink-0"
                >
                  <AlertCircle size={18} /> Full Reset (DANGER)
                </button>
              </div>
            </div>
          </div>

          {/* FULL WIDTH: Team Management Section */}
          <div className="admin-card space-y-4 mt-8">
            <div className="flex justify-between items-center flex-wrap gap-2 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 text-teal-400">
                <Users size={22} />
                <h2 className="text-xl font-bold text-white">Team Management ({teams.length} Teams)</h2>
              </div>
              <span className="text-xs text-slate-400">Click ✓ to save edit or press Enter</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {teams.map((team, idx) => {
                const isEdited = editingTeamNames[team.id] !== undefined && editingTeamNames[team.id] !== team.name;
                const currentNameVal = editingTeamNames[team.id] !== undefined ? editingTeamNames[team.id] : team.name;
                return (
                  <div key={team.id} className="team-manage-item">
                    <span className="font-mono text-slate-500 text-sm w-5 shrink-0">{idx + 1}.</span>
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

            <form onSubmit={handleAddTeam} className="flex gap-2 pt-3 border-t border-slate-700/60 max-w-lg">
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
                className="btn-primary-add py-1.5 px-4 text-sm shrink-0"
              >
                <Plus size={16} /> Add Team
              </button>
            </form>
          </div>

          {/* FULL WIDTH: Scoreboards Section */}
          <div className="space-y-8 mt-8">
            {/* 1. CURRENT ROUND SCORE */}
            <div className="scoreboard-card-current">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3 pb-3 border-b border-[#202024]">
                <div className="flex items-center gap-4">
                  <Trophy size={28} className="text-[var(--accent-red)] shrink-0" />
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2 className="text-2xl font-extrabold text-white tracking-tight leading-tight m-0">Current Round Score</h2>
                      <div className="gcl-tech-tag gcl-tech-tag-red">
                        <span className="gcl-tag-dot bg-[var(--accent-red)] shadow-glow-red animate-pulse"></span>
                        ROUND {roundIdx + 1}
                      </div>
                    </div>
                    <p className="text-xs text-[#71717a] mt-1 m-0">
                      Live performance for {currentRoundData.name || `Round ${roundIdx + 1}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="gcl-table-container">
                <div className="grid-admin-score-header">
                  <div className="text-center">RANK</div>
                  <div>TEAM NAME</div>
                  <div className="text-center text-yellow-400">ROUND SCORE</div>
                  <div className="text-center">ITEMS WON</div>
                  <div className="text-right">ROUND SPENT</div>
                  <div className="text-right text-green-400">REMAINING BUDGET</div>
                </div>

                <div className="space-y-1">
                  {currentRoundStats.map((team, idx) => {
                    const isOutOfBudget = team.remainingBudget <= 0;
                    const isLowBudget = !isOutOfBudget && team.remainingBudget <= 5000000;
                    return (
                      <div key={team.id} className="grid-admin-score-row">
                        <div className="text-center font-mono text-slate-400 font-bold">{idx + 1}</div>
                        <div className="flex items-center gap-2 flex-wrap min-w-0 pr-2">
                          <span className="font-bold text-white text-base truncate">{team.name}</span>
                          {isOutOfBudget && (
                            <span className="badge-out-of-budget">⚠️ OUT OF BUDGET</span>
                          )}
                          {isLowBudget && (
                            <span className="badge-low-budget">⚠️ LOW</span>
                          )}
                        </div>
                        <div className="text-center font-black text-yellow-400 text-xl font-mono">
                          {team.roundScore}
                        </div>
                        <div className="text-center font-semibold text-indigo-300 font-mono">
                          {team.roundItemsCount}
                        </div>
                        <div className="text-right font-mono text-red-400 font-semibold">
                          {formatCurrency(team.roundSpent)}
                        </div>
                        <div className="text-right font-mono font-bold text-green-400 text-base">
                          {formatCurrency(team.remainingBudget)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 2. OVERALL SCOREBOARD */}
            {renderOverallScoreboard()}

            {/* 3. PREVIOUS ROUND SCOREBOARD */}
            {renderPreviousRoundScoreboard()}

            {/* 4. TRANSACTION LOG */}
            {renderTransactionLog()}
          </div>
        </div>
      )}

      {/* LEADERBOARD REVEAL STATE (ROUND 1 MANUAL REVEAL) */}
      {(gameState === 'leaderboard_reveal' || eventState?.round_state === 'LEADERBOARD_REVEAL') && (
        <div className="admin-reveal-container space-y-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="admin-card space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#26262b] pb-4">
                <div>
                  <div className="flex items-center gap-2 text-[var(--accent-red)]">
                    <Trophy size={24} />
                    <h2 className="text-2xl font-extrabold text-white">Round 1 Leaderboard Reveal</h2>
                  </div>
                  <p className="text-sm text-[#71717a] mt-1">
                    Bottom-up manual reveal for the live screen. Scores remain 100% hidden from the audience.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-[#0a0a0c] border border-[#202024] px-4 py-2 rounded-lg text-right">
                    <span className="text-xs text-[#71717a] uppercase tracking-wider block font-mono">Progress</span>
                    <span className="font-mono text-lg font-bold text-[#d4af37]">
                      {r1Reveals.filter((r) => r.is_revealed).length} / {teams.length || r1Reveals.length} Revealed
                    </span>
                  </div>
                </div>
              </div>

              {/* Round 1 Standings & Analysis Table (Issue 6: full analysis with score, items won, total spent, and remaining budget) */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Calculator size={18} className="text-[#d4af37]" />
                    <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono">
                      Round 1 Performance & Analysis Table
                    </h3>
                  </div>
                  <span className="text-xs text-[#71717a] font-mono">
                    Official Round 1 totals — review metrics before confirming positions
                  </span>
                </div>

                <div className="border border-[#26262b] rounded-xl overflow-hidden bg-[#0a0a0c]">
                  <table className="w-full text-left border-collapse text-xs font-sans">
                    <thead>
                      <tr className="bg-[#141418] border-b border-[#26262b] text-[#71717a] uppercase font-mono tracking-wider">
                        <th className="py-2.5 px-3 text-center w-12 font-bold">#</th>
                        <th className="py-2.5 px-4 font-bold">Team Name</th>
                        <th className="py-2.5 px-3 text-center font-bold">Items Won</th>
                        <th className="py-2.5 px-3 text-center font-bold">Score</th>
                        <th className="py-2.5 px-4 text-right font-bold">Total Spent</th>
                        <th className="py-2.5 px-4 text-right font-bold">Remaining Budget</th>
                        <th className="py-2.5 px-3 text-center font-bold">Live Status</th>
                        <th className="py-2.5 px-3 text-center font-bold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1c1c22]">
                      {(() => {
                        const startingBudget = edition?.starting_budget || 50000000;
                        const r1List = teams.map((team) => {
                          const r1Items = items.filter((it) => it.team_id === team.id && Number(it.round_index) === 0);
                          const score = r1Items.filter((it) => it.is_correct).length;
                          const itemsCount = r1Items.length;
                          const totalSpent = r1Items.reduce((acc, it) => acc + (it.cost || 0), 0);
                          const remainingBudget = Math.max(0, startingBudget - totalSpent);
                          const rev = r1Reveals.find((r) => r.team_id === team.id);
                          return {
                            ...team,
                            score,
                            itemsCount,
                            totalSpent,
                            remainingBudget,
                            isRevealed: Boolean(rev?.is_revealed),
                            position: rev?.position,
                          };
                        }).sort((a, b) => {
                          if (b.score !== a.score) return b.score - a.score;
                          if (b.itemsCount !== a.itemsCount) return b.itemsCount - a.itemsCount;
                          if (b.remainingBudget !== a.remainingBudget) return b.remainingBudget - a.remainingBudget;
                          return a.name.localeCompare(b.name);
                        });

                        const unrevealed = r1Reveals.filter((r) => !r.is_revealed);
                        const sortedUnrevealed = [...unrevealed].sort((a, b) => b.position - a.position);
                        const nextTarget = sortedUnrevealed[0];

                        return r1List.map((tm, idx) => (
                          <tr
                            key={tm.id}
                            className={`transition-colors ${
                              tm.isRevealed
                                ? 'bg-[#121216]/60 text-slate-300'
                                : 'bg-[#0d0d10] hover:bg-[#16161b]'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-white text-sm">
                              {tm.name}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-[#1c1c24] text-slate-300 font-mono font-bold">
                                {tm.itemsCount}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="inline-flex items-center gap-1 font-bold text-yellow-400 font-mono text-sm">
                                ★ {tm.score}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-red-400">
                              {formatCurrency(tm.totalSpent)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-400">
                              {formatCurrency(tm.remainingBudget)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {tm.isRevealed ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 text-[11px]">
                                  <Check size={11} /> Revealed ({formatOrdinal(tm.position || idx + 1)})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#18181c] text-slate-400 border border-[#282830] text-[11px]">
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {!tm.isRevealed && nextTarget && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedRevealTeamId(tm.id);
                                    handleConfirmAndRevealPosition(nextTarget.position, tm.id);
                                  }}
                                  className="px-2.5 py-1 rounded bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white font-bold text-[11px] transition-colors cursor-pointer shadow-sm"
                                  title={`Reveal ${tm.name} as ${formatOrdinal(nextTarget.position)} place`}
                                >
                                  Assign {formatOrdinal(nextTarget.position)}
                                </button>
                              )}
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Reveal Controls */}
              {(() => {
                const totalCount = teams.length || r1Reveals.length;
                const unrevealed = r1Reveals.filter((r) => !r.is_revealed);
                // Sort descending: highest position number first (bottom-up e.g. 7th, 6th... down to 1st)
                const sortedUnrevealed = [...unrevealed].sort((a, b) => b.position - a.position);
                const nextTarget = sortedUnrevealed[0];
                const allRevealed = unrevealed.length === 0 && r1Reveals.length > 0;

                if (allRevealed) {
                  return (
                    <div className="p-6 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-center space-y-4">
                      <div className="inline-flex p-3 bg-emerald-500/20 rounded-full text-emerald-400">
                        <CheckCircle2 size={36} />
                      </div>
                      <h3 className="text-2xl font-bold text-white">All Positions Revealed!</h3>
                      <p className="text-[#a1a1aa] max-w-md mx-auto text-sm">
                        All teams from {formatOrdinal(totalCount)} up to 1ST Place have been announced on the live screen. Ready to start Intermission.
                      </p>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleStartIntermissionAfterReveal}
                          className="btn-start-round"
                        >
                          <Play size={20} fill="currentColor" /> START INTERMISSION
                        </button>
                      </div>
                    </div>
                  );
                }

                if (!nextTarget) {
                  return (
                    <div className="p-6 bg-[#0a0a0c] border border-[#202024] rounded-xl text-center space-y-4">
                      <p className="text-[#71717a] text-sm">
                        No reveal records found for Round 1. Click below to initialize the reveal table.
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleCompleteRound1()}
                        className="btn-advance-intermission py-2 px-4"
                      >
                        Initialize Round 1 Reveal Table
                      </button>
                    </div>
                  );
                }

                const assignedTeamId = selectedRevealTeamId || nextTarget.team_id;

                return (
                  <div className="p-6 bg-[#0a0a0c] border border-[#202024] rounded-xl space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#202024] pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-wider font-semibold text-[#71717a]">Next Action:</span>
                        <span className="px-3 py-1 bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/30 text-[var(--accent-red)] font-mono font-bold rounded text-sm">
                          Reveal {formatOrdinal(nextTarget.position)} Position
                        </span>
                      </div>
                      <span className="text-xs text-[#71717a]">
                        Revealing bottom-up from last place to 1st place
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="input-label mb-0">Select / Confirm Team for {formatOrdinal(nextTarget.position)} Place</label>
                        <select
                          value={assignedTeamId}
                          onChange={(e) => setSelectedRevealTeamId(e.target.value)}
                          className="gcl-select w-full"
                        >
                          {teams.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-[#71717a]">
                          Calculated rank team: <strong className="text-[#e1e1e6]">{nextTarget.team_name || teams.find(t => t.id === nextTarget.team_id)?.name || 'Unknown'}</strong>
                        </p>
                      </div>

                      <div>
                        <button
                          type="button"
                          onClick={() => handleConfirmAndRevealPosition(nextTarget.position, assignedTeamId)}
                          className="w-full py-3 px-4 bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-[0_2px_12px_rgba(224,38,63,0.3)] cursor-pointer"
                        >
                          <Eye size={18} /> CONFIRM & REVEAL
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Positions List */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-[#71717a]">
                  Round 1 Position Standings (Admin View)
                </h3>
                <div className="border border-[#202024] rounded-lg overflow-hidden divide-y divide-[#1c1c21] bg-[#0a0a0c]">
                  {r1Reveals
                    .slice()
                    .sort((a, b) => b.position - a.position) // Display bottom-up N to 1
                    .map((rev) => {
                      const team = teams.find((t) => t.id === rev.team_id);
                      return (
                        <div
                          key={rev.position}
                          className={`p-3.5 flex items-center justify-between gap-4 transition-colors ${
                            rev.is_revealed
                              ? 'bg-[#131316]'
                              : 'bg-transparent hover:bg-[#18181c]/40'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-9 h-9 rounded flex items-center justify-center font-mono font-bold text-sm ${
                                rev.is_revealed
                                  ? 'bg-[#18181c] text-[var(--accent-red)] border border-[var(--accent-red)]/50'
                                  : 'bg-[#18181c] text-[#71717a] border border-[#26262b]'
                              }`}
                            >
                              {String(rev.position).padStart(2, '0')}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white">
                                  {rev.team_name || team?.name || `Team (Pos ${rev.position})`}
                                </span>
                                {rev.is_revealed ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    <CheckCircle2 size={12} /> REVEALED
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-[#18181c] text-[#71717a] border border-[#26262b]">
                                    HIDDEN ON LIVE SCREEN
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-[#71717a] font-mono">
                                Live Screen shows: {rev.is_revealed ? (rev.team_name || team?.name) : '???'}
                              </span>
                            </div>
                          </div>

                          {!rev.is_revealed && (
                            <button
                              type="button"
                              onClick={() => handleConfirmAndRevealPosition(rev.position, rev.team_id)}
                              className="px-3 py-1.5 bg-[#18181c] hover:bg-[#202025] text-[#e1e1e6] hover:text-white text-xs font-semibold rounded border border-[#26262b] flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Eye size={14} /> Reveal Now
                            </button>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. INTERMISSION STATE */}
      {gameState === 'intermission' && (
        <div className="admin-intermission-container space-y-8">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="admin-card text-center p-8 space-y-6">
              <div className="flex flex-col items-center text-[var(--accent-red)]">
                <Loader2 size={60} className="animate-spin mb-4" />
                <h2 className="text-3xl font-extrabold text-white">Intermission in Progress</h2>
                <p className="text-base text-[#a1a1aa] mt-2 max-w-xl">
                  {isAfterRound3 ? (
                    <>
                      Round 3 results are currently displayed on the live screen.
                      <br />
                      All standard rounds completed. Ready to start Tie Breaker or announce winners.
                    </>
                  ) : roundIdx === 1 ? (
                    <>
                      Round 2 completed. The public view is displaying participating teams in alphabetical order without ranks or scores.
                      <br />
                      Verify and confirm Round 3 budgets below to begin Round 3.
                    </>
                  ) : (
                    <>
                      Round 1 results have been revealed. Round 1 history and scores are permanently preserved.
                      <br />
                      Ready to reset current round budgets to the starting budget and start Round 2.
                    </>
                  )}
                </p>
              </div>

              {isAfterRound3 ? (
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
              ) : roundIdx === 1 ? (
                /* ROUND 2 INTERMISSION -> ROUND 3 BUDGET VERIFICATION & LAUNCH */
                <div className="space-y-6 text-left">
                  {/* Budget Formula Box */}
                  <div className="bg-slate-900/80 border border-indigo-500/30 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm uppercase tracking-wider">
                      <Calculator size={16} /> Round 3 Budget Calculation Formula
                    </div>
                    <p className="font-mono text-white text-base font-semibold">
                      ROUND 3 BUDGET = STARTING BUDGET ({formatCurrency(edition?.starting_budget || 50000000)}) + ROUND 2 REMAINING BUDGET
                    </p>
                    <p className="text-xs text-slate-400">
                      Audit requirement: Admin must review and confirm calculated budgets before Round 3 can begin.
                    </p>
                  </div>

                  {/* Verification Table */}
                  <div className="overflow-x-auto border border-slate-800 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-900 text-slate-400 uppercase font-mono text-xs border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-4 text-left">Team</th>
                          <th className="py-2.5 px-4 text-right">Starting Budget</th>
                          <th className="py-2.5 px-4 text-right">Round 2 Remaining</th>
                          <th className="py-2.5 px-4 text-right text-emerald-400">Round 3 Budget</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80">
                        {teams.map((t) => {
                          const starting = edition?.starting_budget || 50000000;
                          const r2Items = items.filter((it) => it.team_id === t.id && it.round_index === 1);
                          const r2Spent = r2Items.reduce((acc, it) => acc + (it.cost || 0), 0);
                          const r2Rem = Math.max(0, starting - r2Spent);
                          const r3Calc = starting + r2Rem;
                          return (
                            <tr key={t.id} className="hover:bg-slate-900/30 font-mono">
                              <td className="py-2.5 px-4 font-sans font-semibold text-white">{t.name}</td>
                              <td className="py-2.5 px-4 text-right text-slate-400">{formatCurrency(starting)}</td>
                              <td className="py-2.5 px-4 text-right text-yellow-400">+{formatCurrency(r2Rem)}</td>
                              <td className="py-2.5 px-4 text-right font-bold text-emerald-400">{formatCurrency(r3Calc)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-2">
                    {!r3BudgetsConfirmed && eventState?.round_state !== 'NEXT_ROUND_READY' ? (
                      <button
                        type="button"
                        onClick={handleConfirmRound3Budgets}
                        disabled={isConfirmingR3Budgets}
                        className="btn-advance-intermission w-full sm:w-auto py-3 px-6 text-base font-bold flex items-center justify-center gap-2"
                      >
                        {isConfirmingR3Budgets ? (
                          <>
                            <Loader2 size={20} className="animate-spin" /> CONFIRMING...
                          </>
                        ) : (
                          <>
                            <Calculator size={20} /> CONFIRM ROUND 3 BUDGETS
                          </>
                        )}
                      </button>
                    ) : (
                      <>
                        <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-semibold rounded-lg">
                          <CheckCircle2 size={18} /> Round 3 Budgets Confirmed & Logged
                        </div>
                        <button
                          type="button"
                          onClick={handleStartRound3}
                          className="btn-start-round w-full sm:w-auto"
                        >
                          <Play size={24} fill="currentColor" /> START ROUND 3
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                /* ROUND 1 INTERMISSION -> START ROUND 2 WITH RESET */
                <div className="space-y-6">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 max-w-md mx-auto">
                    <span className="text-slate-400 block text-xs uppercase tracking-wider mb-1">Round 2 Starting Budget</span>
                    <span className="font-mono text-2xl font-bold text-emerald-400">
                      {formatCurrency(edition?.starting_budget || 50000000)}
                    </span>
                    <p className="text-xs text-slate-400 mt-2">
                      All teams reset to this budget for Round 2. Round 1 questions won and scores remain saved.
                    </p>
                  </div>
                  <div className="flex justify-center mt-6">
                    <button
                      type="button"
                      onClick={handleStartRound2WithReset}
                      className="btn-start-round"
                    >
                      <Play size={24} fill="currentColor" /> START ROUND 2 (RESET TO STARTING BUDGET)
                    </button>
                  </div>
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
                      onBlur={() => handleTeamNameBlur(team.id)}
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

          {/* FULL WIDTH: Intermission Scoreboards & Standings Section */}
          <div className="space-y-8 mt-8">
            {/* 1. PREVIOUS ROUND SCOREBOARD */}
            {renderPreviousRoundScoreboard()}

            {/* 2. OVERALL SCOREBOARD */}
            {renderOverallScoreboard()}

            {/* 3. TRANSACTION LOG */}
            {renderTransactionLog()}
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

            {/* Quick Actions for Podium */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-5 mt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleHideAllReveals}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-sm rounded-lg border border-slate-700 transition flex items-center gap-2 shadow-sm"
                title="Keep selected teams but hide all reveals on live screen"
              >
                <EyeOff size={16} className="text-amber-400" />
                Hide All Reveals
              </button>
              <button
                type="button"
                onClick={handleResetPodium}
                className="px-4 py-2.5 bg-red-950/40 hover:bg-red-900/60 text-red-200 hover:text-white font-bold text-sm rounded-lg border border-red-800/60 transition flex items-center gap-2 shadow-sm"
                title="Clear selected teams and hide all reveals on live screen"
              >
                <RotateCcw size={16} className="text-red-400" />
                Reset Podium (Clear & Hide)
              </button>
            </div>
          </div>

          {/* ALL ROUND SCORED TABLES & OVERALL SCOREBOARD (Admin Only Reference) */}
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Trophy size={28} className="text-yellow-400 shrink-0" />
                <div>
                  <h3 className="text-2xl font-black text-white m-0">All Round Scored Tables (Admin Reference)</h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Official scores per round and cumulative standings. Scores are strictly hidden on Live View.
                  </p>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 flex-wrap">
                <button
                  type="button"
                  onClick={() => setPodiumTab('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    podiumTab === 'all'
                      ? 'bg-blue-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Tables
                </button>
                <button
                  type="button"
                  onClick={() => setPodiumTab('overall')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    podiumTab === 'overall'
                      ? 'bg-yellow-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Overall Standings
                </button>
                {allRoundScoreboards.map((r) => (
                  <button
                    key={r.roundIndex}
                    type="button"
                    onClick={() => setPodiumTab(r.roundIndex)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      podiumTab === r.roundIndex
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {r.roundName}
                  </button>
                ))}
              </div>
            </div>

            {/* 1. Overall Scoreboard */}
            {(podiumTab === 'all' || podiumTab === 'overall') && renderOverallScoreboard()}

            {/* 2. Individual Round Scored Tables */}
            {allRoundScoreboards
              .filter((r) => podiumTab === 'all' || podiumTab === r.roundIndex)
              .map((round) => (
                <div key={round.roundIndex} className="admin-card space-y-3">
                  <div className="flex justify-between items-center px-1 flex-wrap gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="gcl-tech-tag gcl-tech-tag-indigo">
                        {round.roundName.toUpperCase()}
                      </span>
                      <span className="text-slate-200 font-bold text-base tracking-wide">
                        SCORED TABLE
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        ({round.results.length} Teams)
                      </span>
                    </div>
                    {round.timestamp && (
                      <span className="text-slate-400 text-xs font-mono bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800">
                        Completed at {new Date(round.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  <div className="gcl-table-container">
                    <div className="grid-admin-score-header">
                      <div className="text-center">RANK</div>
                      <div>TEAM</div>
                      <div className="text-center text-yellow-400">ROUND SCORE</div>
                      <div className="text-center">ITEMS WON</div>
                      <div className="text-right">ROUND SPENT</div>
                      <div className="text-right text-green-400">REMAINING BUDGET</div>
                    </div>
                    <div className="space-y-1">
                      {round.results.map((res, idx) => (
                        <div key={res.id || idx} className="grid-admin-score-row">
                          <div className="text-center font-mono text-slate-400 font-bold">
                            {idx + 1}
                          </div>
                          <div className="font-bold text-white truncate flex items-center gap-2">
                            <span>{res.name}</span>
                            {idx === 0 && (res.score || 0) > 0 && (
                              <span className="text-[10px] font-bold text-yellow-400 uppercase bg-yellow-500/20 border border-yellow-500/30 px-1.5 py-0.5 rounded">
                                Round Leader
                              </span>
                            )}
                          </div>
                          <div className="text-center font-black text-yellow-400 text-xl font-mono">
                            ★ {res.score || 0}
                          </div>
                          <div className="text-center font-semibold text-indigo-300 font-mono">
                            {res.itemsCount || 0}
                          </div>
                          <div className="text-right font-mono text-red-400 font-semibold">
                            {formatCurrency(res.totalSpent || 0)}
                          </div>
                          <div className="text-right font-mono font-bold text-green-400">
                            {formatCurrency(res.remainingBudget || 0)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

            {/* Actions: Force Tie Breaker & End Event */}
            <div className="admin-card">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 flex-wrap">
                <button
                  type="button"
                  onClick={handleStartTieBreaker}
                  className="btn-force-tie w-full sm:w-auto"
                >
                  <Flag size={18} /> Force Tie Breaker (R4)
                </button>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleFinalizeAndArchiveCurrentEvent}
                    disabled={isFinalizingArchive}
                    className="px-5 py-2.5 bg-[#18181c] hover:bg-[#202025] text-white border border-[#26262b] font-extrabold text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
                  >
                    {isFinalizingArchive ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Saving Archive...
                      </>
                    ) : (
                      <>
                        <Archive size={18} className="text-[#d4af37]" /> Save & Finalize to Archive
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      handleTabChange('archive');
                      setIsNewEditionModalOpen(true);
                    }}
                    className="px-5 py-2.5 bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white font-extrabold text-sm rounded-xl transition-all shadow-[0_2px_12px_rgba(224,38,63,0.3)] flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
                  >
                    <Plus size={18} /> Create New Archive / Edition
                  </button>
                </div>
              </div>
            </div>

            {/* Transaction Log at end */}
            {renderTransactionLog()}
          </div>
        </div>
      )}
        </>
      )}

      {/* --- CONFIRMATION MODALS (Point 7) --- */}

      {/* 1. Confirm SOLD Modal */}
      {isConfirmingSold && selectedWinningTeam && (
        <div className="gcl-modal-overlay" onClick={() => setIsConfirmingSold(false)}>
          <div className="gcl-modal-box border-emerald-500/60" onClick={(e) => e.stopPropagation()}>
            <h3 className="gcl-modal-title text-emerald-400">
              <CheckCircle2 size={26} className="text-emerald-400" />
              Confirm Winning Bid (SOLD!)
            </h3>
            <p className="gcl-modal-body">
              Please review and confirm this auction sale before recording it:
            </p>

            <div className="gcl-modal-details">
              <div className="flex justify-between items-center text-sm py-1 border-b border-[#202024]">
                <span className="text-[#71717a]">Winning Team:</span>
                <span className="font-bold text-white text-base">{selectedWinningTeam.name}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-[#202024]">
                <span className="text-[#71717a]">Question Ref:</span>
                <span className="font-mono font-bold text-[#d4af37]">R{roundIdx + 1} - Q{questionIdx + 1}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1 border-b border-[#202024]">
                <span className="text-[#71717a]">Final Bid Amount:</span>
                <span className="font-mono font-bold text-[var(--accent-red)] text-lg">{formatCurrency(parseFloat(bidAmount))}</span>
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
          <div className="gcl-modal-box border-[#26262b]" onClick={(e) => e.stopPropagation()}>
            <h3 className="gcl-modal-title text-white">
              <Users size={24} className="text-[var(--accent-red)]" />
              Confirm Team Name Change
            </h3>
            <p className="gcl-modal-body">
              Please confirm the new name for this team across the live auction:
            </p>

            <div className="gcl-modal-details">
              <div className="flex justify-between items-center text-sm py-1 border-b border-[#202024]">
                <span className="text-[#71717a]">Current Name:</span>
                <span className="font-semibold text-[#a1a1aa] line-through">{teamPendingEdit.oldName}</span>
              </div>
              <div className="flex justify-between items-center text-sm py-1">
                <span className="text-[#71717a]">New Name:</span>
                <span className="font-bold text-[var(--accent-red)] text-base">{teamPendingEdit.newName}</span>
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
                className="btn-modal-confirm-green bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] shadow-[0_2px_12px_rgba(224,38,63,0.3)] cursor-pointer"
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

      {/* 6. Universal Team & Member Management Modal (Available Anytime: Issue 3) */}
      {isTeamManagementModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121216] border border-[#282830] rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#24242c] bg-[#16161c] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/30 flex items-center justify-center text-[var(--accent-red)]">
                  <Users size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white m-0 font-sans">Team & Member Management</h3>
                  <p className="text-xs text-[#a1a1aa] m-0 mt-0.5">
                    Add new members, edit rosters, or register teams anytime during the live auction.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTeamManagementModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-[#202028] hover:bg-[#282834] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Scrollable team list */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Teams & Members Roster */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase font-bold tracking-wider text-[#a1a1aa] font-mono">
                    Participating Teams ({teams.length})
                  </span>
                  <span className="text-xs text-[#71717a]">
                    Total registered members: {Object.values(teamMembersMap).reduce((acc, m) => acc + (m?.length || 0), 0)}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {teams.map((team) => {
                    const members = teamMembersMap[team.id] || [];
                    const isExpanded = expandedTeamMembers[team.id] ?? true;

                    return (
                      <div
                        key={team.id}
                        className="p-3.5 rounded-xl bg-[#17171d] border border-[#262630] space-y-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-bold text-white text-base truncate">{team.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-[#202028] text-slate-300 font-mono">
                              {members.length} {members.length === 1 ? 'member' : 'members'}
                            </span>
                            <span className="text-xs text-emerald-400 font-mono font-semibold">
                              {formatCurrency(team.budget)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedTeamMembers((prev) => ({
                                  ...prev,
                                  [team.id]: !isExpanded,
                                }))
                              }
                              className="text-xs text-[#a1a1aa] hover:text-white underline cursor-pointer"
                            >
                              {isExpanded ? 'Collapse' : 'Expand'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTeamNames((prev) => ({ ...prev, [team.id]: team.name }));
                                setTeamPendingEdit({ id: team.id, oldName: team.name, newName: team.name });
                              }}
                              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold cursor-pointer"
                            >
                              Rename
                            </button>
                            <button
                              type="button"
                              onClick={() => setTeamToRemove(team)}
                              className="text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        </div>

                        {/* Expanded Member Chips + Inline Add */}
                        {isExpanded && (
                          <div className="pt-2 border-t border-[#22222a] space-y-2">
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {members.map((m) => (
                                <span
                                  key={m.id}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#202028] text-xs text-white border border-[#2d2d38]"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-red)]"></span>
                                  {m.full_name || m.name}
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMemberFromTeam(m.id, team.id)}
                                    className="text-[#71717a] hover:text-red-400 transition-colors ml-0.5 cursor-pointer font-bold"
                                    title="Remove member"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                              {members.length === 0 && (
                                <span className="text-xs text-[#71717a] italic">
                                  No members registered yet. Type names below to add.
                                </span>
                              )}
                            </div>

                            {/* Add Member inline input */}
                            <div className="flex gap-2 pt-1">
                              <input
                                type="text"
                                placeholder="Add member name (or comma-separated, e.g. Aman, Priya)..."
                                value={newMemberInputs[team.id] || ''}
                                onChange={(e) =>
                                  setNewMemberInputs((prev) => ({
                                    ...prev,
                                    [team.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddMemberToTeam(team.id);
                                  }
                                }}
                                className="gcl-input flex-1 py-1.5 text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddMemberToTeam(team.id)}
                                disabled={!newMemberInputs[team.id]?.trim() || addingMemberTeamId === team.id}
                                className="px-3.5 py-1.5 rounded-lg bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1 cursor-pointer shrink-0"
                              >
                                <Plus size={13} /> Add Member
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add New Team Form */}
              <form onSubmit={handleAddTeam} className="p-4 rounded-xl bg-[#15151b] border border-[#24242c] space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Plus size={15} className="text-blue-400" /> Add New Team
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Team Name * (e.g. Code Warriors)"
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="gcl-input flex-1 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!newTeamName.trim()}
                    className="btn-primary-add shrink-0"
                  >
                    <Plus size={18} /> Add Team
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Member Names (Optional, comma-separated)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rahul Sharma, Priya Patel, Aman Gupta"
                    value={newTeamMembers}
                    onChange={(e) => setNewTeamMembers(e.target.value)}
                    className="gcl-input w-full py-1.5 text-xs text-slate-200"
                  />
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-[#24242c] bg-[#16161c] flex justify-end">
              <button
                type="button"
                onClick={() => setIsTeamManagementModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#22222a] hover:bg-[#2c2c36] text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
