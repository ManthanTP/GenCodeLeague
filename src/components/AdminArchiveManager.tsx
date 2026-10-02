import React, { useState, useEffect, useMemo } from 'react';
import {
  Archive,
  Trophy,
  Crown,
  Medal,
  Award,
  Upload,
  Download,
  Image,
  Sparkles,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  FileText,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  HelpCircle,
  Edit3,
  Radio,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logAdminAction } from '../utils/certificateUtils';
import { formatCurrency } from '../utils/formatters';
import type { Edition, Team, Sponsor, GalleryPhoto, FaqEntry } from '../types/database';

interface AdminArchiveManagerProps {
  currentEdition: Edition | null;
  teams: Team[];
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
  onEditionUpdated?: () => void;
  autoOpenCreate?: boolean;
  onCloseAutoCreate?: () => void;
}

const SEGMENTS = [
  'Opening Ceremony',
  'Round 1',
  'Round 2',
  'Round 3',
  'Live Auction',
  'Finale',
  'Winner Ceremony',
];

const SPONSOR_TIERS = ['Title Sponsor', 'Gold Partner', 'Partner', 'Supporter'];

export default function AdminArchiveManager({
  currentEdition,
  teams,
  onShowToast,
  onEditionUpdated,
  autoOpenCreate,
  onCloseAutoCreate,
}: AdminArchiveManagerProps) {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [selectedEditionId, setSelectedEditionId] = useState<string>(
    currentEdition?.id || ''
  );

  // Edition CRUD Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmittingEdition, setIsSubmittingEdition] = useState(false);

  // New Edition Form State
  const [newEditionForm, setNewEditionForm] = useState({
    name: '',
    year: new Date().getFullYear(),
    startingBudget: '50000000',
    totalRounds: '3',
    questionsPerRound: '20',
    basePrice: '2000000',
    minIncrement: '1000000',
    isCurrent: false,
    isArchived: false,
  });

  // Edit Edition Form State
  const [editEditionForm, setEditEditionForm] = useState({
    name: '',
    year: new Date().getFullYear(),
    startingBudget: '50000000',
    totalRounds: '3',
    questionsPerRound: '20',
    basePrice: '2000000',
    minIncrement: '1000000',
    isArchived: false,
  });

  // Open create modal if autoOpenCreate prop is triggered
  useEffect(() => {
    if (autoOpenCreate) {
      setIsCreateModalOpen(true);
      if (onCloseAutoCreate) onCloseAutoCreate();
    }
  }, [autoOpenCreate, onCloseAutoCreate]);

  // Archive Form States
  const [championId, setChampionId] = useState<string>('');
  const [runnerUpId, setRunnerUpId] = useState<string>('');
  const [thirdPlaceId, setThirdPlaceId] = useState<string>('');
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Sponsor Manager States
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorLogoUrl, setSponsorLogoUrl] = useState('');
  const [sponsorTier, setSponsorTier] = useState('Partner');
  const [sponsorWebsite, setSponsorWebsite] = useState('');
  const [showSponsorsOnCerts, setShowSponsorsOnCerts] = useState(false);
  const [savingSponsor, setSavingSponsor] = useState(false);

  // Gallery Uploader States
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [photoSegment, setPhotoSegment] = useState('Live Auction');
  const [photoCaption, setPhotoCaption] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Export / Import States
  const [exporting, setExporting] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [overrideEditionName, setOverrideEditionName] = useState('');

  // FAQ Manager States
  const [faqs, setFaqs] = useState<FaqEntry[]>([]);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqSortOrder, setFaqSortOrder] = useState('0');
  const [savingFaq, setSavingFaq] = useState(false);

  // Subtab navigation state
  const [archiveSubTab, setArchiveSubTab] = useState<'podium' | 'sponsors' | 'gallery' | 'faqs' | 'backup'>('podium');

  // Active Edition Object
  const activeEdition = useMemo(() => {
    return editions.find((e) => e.id === selectedEditionId) || currentEdition || null;
  }, [editions, selectedEditionId, currentEdition]);

  // Load Editions
  const loadEditions = async () => {
    const { data } = await supabase
      .from('editions')
      .select('*')
      .order('year', { ascending: false });

    if (data && data.length > 0) {
      setEditions(data);
      if (!selectedEditionId) {
        setSelectedEditionId(data[0].id);
      }
    }
  };

  useEffect(() => {
    loadEditions();
  }, []);

  // Open Edit Edition Modal with active edition values
  const handleOpenEditModal = () => {
    if (!activeEdition) return;
    setEditEditionForm({
      name: activeEdition.name || '',
      year: activeEdition.year || new Date().getFullYear(),
      startingBudget: String(activeEdition.starting_budget || 50000000),
      totalRounds: String(activeEdition.total_rounds || 3),
      questionsPerRound: String(activeEdition.questions_per_round || 20),
      basePrice: String(activeEdition.base_price || 2000000),
      minIncrement: String(activeEdition.min_increment || 1000000),
      isArchived: Boolean(activeEdition.is_archived),
    });
    setIsEditModalOpen(true);
  };

  // Create New Edition / Archive
  const handleCreateEdition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEditionForm.name.trim()) {
      onShowToast('Please enter an edition name', 'error');
      return;
    }

    setIsSubmittingEdition(true);
    try {
      const budget = parseInt(newEditionForm.startingBudget) || 50000000;
      const rounds = parseInt(newEditionForm.totalRounds) || 3;
      const qPerRound = parseInt(newEditionForm.questionsPerRound) || 20;
      const basePr = parseInt(newEditionForm.basePrice) || 2000000;
      const minInc = parseInt(newEditionForm.minIncrement) || 1000000;
      const yr = newEditionForm.year || new Date().getFullYear();

      // If set as current, unset others first
      if (newEditionForm.isCurrent) {
        await supabase.from('editions').update({ is_current: false }).neq('id', '00000000-0000-0000-0000-000000000000');
      }

      const { data: newEd, error } = await supabase
        .from('editions')
        .insert({
          name: newEditionForm.name.trim(),
          year: yr,
          starting_budget: budget,
          total_rounds: rounds,
          questions_per_round: qPerRound,
          base_price: basePr,
          min_increment: minInc,
          is_current: newEditionForm.isCurrent,
          is_archived: newEditionForm.isArchived,
          archived_at: newEditionForm.isArchived ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Create initial event_state for this new edition
      await supabase.from('event_state').insert({
        edition_id: newEd.id,
        game_state: 'setup',
        round_state: 'ROUND_SETUP',
        current_round_index: 0,
        current_question_index: 0,
        timer_duration_seconds: 180,
        timer_remaining_seconds: 180,
        timer_state: 'stopped',
      });

      await logAdminAction('EDITION_CREATED', {
        edition_id: newEd.id,
        name: newEd.name,
        is_current: newEd.is_current,
        is_archived: newEd.is_archived,
      });

      onShowToast(`Edition "${newEd.name}" created successfully!`, 'success');
      setIsCreateModalOpen(false);
      setNewEditionForm({
        name: '',
        year: new Date().getFullYear() + 1,
        startingBudget: '50000000',
        totalRounds: '3',
        questionsPerRound: '20',
        basePrice: '2000000',
        minIncrement: '1000000',
        isCurrent: false,
        isArchived: false,
      });

      await loadEditions();
      setSelectedEditionId(newEd.id);
      if (onEditionUpdated) onEditionUpdated();
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to create edition', 'error');
    } finally {
      setIsSubmittingEdition(false);
    }
  };

  // Edit / Update Edition
  const handleUpdateEdition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEditionId || !editEditionForm.name.trim()) return;

    setIsSubmittingEdition(true);
    try {
      const budget = parseInt(editEditionForm.startingBudget) || 50000000;
      const rounds = parseInt(editEditionForm.totalRounds) || 3;
      const qPerRound = parseInt(editEditionForm.questionsPerRound) || 20;
      const basePr = parseInt(editEditionForm.basePrice) || 2000000;
      const minInc = parseInt(editEditionForm.minIncrement) || 1000000;
      const yr = editEditionForm.year || new Date().getFullYear();

      const { error } = await supabase
        .from('editions')
        .update({
          name: editEditionForm.name.trim(),
          year: yr,
          starting_budget: budget,
          total_rounds: rounds,
          questions_per_round: qPerRound,
          base_price: basePr,
          min_increment: minInc,
          is_archived: editEditionForm.isArchived,
          archived_at: editEditionForm.isArchived
            ? activeEdition?.archived_at || new Date().toISOString()
            : null,
        })
        .eq('id', selectedEditionId);

      if (error) throw error;

      await logAdminAction('EDITION_UPDATED', {
        edition_id: selectedEditionId,
        name: editEditionForm.name.trim(),
      });

      onShowToast(`Edition "${editEditionForm.name}" updated successfully!`, 'success');
      setIsEditModalOpen(false);
      await loadEditions();
      if (onEditionUpdated) onEditionUpdated();
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to update edition', 'error');
    } finally {
      setIsSubmittingEdition(false);
    }
  };

  // Delete Edition
  const handleDeleteEdition = async () => {
    if (!selectedEditionId || !activeEdition) return;
    if (editions.length <= 1) {
      onShowToast('Cannot delete the only existing edition in the database.', 'error');
      return;
    }

    const confirmMsg = activeEdition.is_current
      ? `WARNING: "${activeEdition.name}" is currently the ACTIVE live edition!\n\nAre you sure you want to permanently delete it? All associated teams, scores, item auctions, and gallery assets will be deleted.`
      : `Are you sure you want to permanently delete "${activeEdition.name}"? All associated teams, scores, item auctions, and gallery assets will be deleted.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      // Find fallback edition
      const fallback = editions.find((e) => e.id !== selectedEditionId);

      // If active edition is being deleted, set fallback to is_current
      if (activeEdition.is_current && fallback) {
        await supabase.from('editions').update({ is_current: true }).eq('id', fallback.id);
      }

      const { error } = await supabase.from('editions').delete().eq('id', selectedEditionId);
      if (error) throw error;

      await logAdminAction('EDITION_DELETED', {
        edition_id: selectedEditionId,
        name: activeEdition.name,
      });

      onShowToast(`Edition "${activeEdition.name}" deleted.`, 'success');

      if (fallback) {
        setSelectedEditionId(fallback.id);
      }
      await loadEditions();
      if (onEditionUpdated) onEditionUpdated();
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to delete edition', 'error');
    }
  };

  // Set as Active Live Event
  const handleSetActiveEdition = async () => {
    if (!selectedEditionId || !activeEdition) return;
    if (activeEdition.is_current) {
      onShowToast('This edition is already the active live event.', 'success');
      return;
    }

    if (!window.confirm(`Switch the active live event to "${activeEdition.name}"? Live screens and leaderboards will switch to this tournament.`)) {
      return;
    }

    try {
      // Set all other editions to is_current = false
      await supabase.from('editions').update({ is_current: false }).neq('id', selectedEditionId);
      // Set selected to is_current = true
      const { error } = await supabase.from('editions').update({ is_current: true }).eq('id', selectedEditionId);
      if (error) throw error;

      await logAdminAction('EDITION_ACTIVATED', {
        edition_id: selectedEditionId,
        name: activeEdition.name,
      });

      onShowToast(`"${activeEdition.name}" is now the active live event!`, 'success');
      await loadEditions();
      if (onEditionUpdated) onEditionUpdated();
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to activate edition', 'error');
    }
  };

  // Sync selected edition archive properties
  useEffect(() => {
    if (activeEdition) {
      setChampionId(activeEdition.champion_team_id || '');
      setRunnerUpId(activeEdition.runner_up_team_id || '');
      setThirdPlaceId(activeEdition.third_place_team_id || '');
      setShowSponsorsOnCerts(Boolean(activeEdition.show_sponsors_on_certificates));
    }
  }, [activeEdition]);

  // Load Sponsors & Gallery for selected edition
  const loadEditionAssets = async () => {
    if (!selectedEditionId) return;

    // Sponsors
    const { data: sp } = await supabase
      .from('sponsors')
      .select('*')
      .eq('edition_id', selectedEditionId)
      .order('sort_order', { ascending: true });
    setSponsors(sp || []);

    // Gallery Photos
    const { data: gp } = await supabase
      .from('gallery_photos')
      .select('*')
      .eq('edition_id', selectedEditionId)
      .order('uploaded_at', { ascending: false });
    setGalleryPhotos((gp as unknown as GalleryPhoto[]) || []);
  };

  useEffect(() => {
    loadEditionAssets();
  }, [selectedEditionId]);

  // Finalize & Archive Edition
  const handleFinalizeEdition = async () => {
    if (!selectedEditionId) return;
    if (!championId) {
      onShowToast('Please select the Champion (1st Place) team', 'error');
      return;
    }
    if (!runnerUpId) {
      onShowToast('Please select the Runner-Up (2nd Place) team', 'error');
      return;
    }
    if (!thirdPlaceId) {
      onShowToast('Please select the 3rd Place team', 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently finalize and archive "${activeEdition?.name}"? Once archived, all scores and budgets become read-only historical records.`)) {
      return;
    }

    setIsFinalizing(true);
    try {
      const { error } = await supabase
        .from('editions')
        .update({
          is_archived: true,
          archived_at: new Date().toISOString(),
          champion_team_id: championId,
          runner_up_team_id: runnerUpId,
          third_place_team_id: thirdPlaceId,
        })
        .eq('id', selectedEditionId);

      if (error) throw error;

      await logAdminAction('EDITION_ARCHIVED_FINALIZED', {
        edition_id: selectedEditionId,
        champion_team_id: championId,
        runner_up_team_id: runnerUpId,
        third_place_team_id: thirdPlaceId,
      });

      onShowToast(`Edition "${activeEdition?.name}" successfully finalized and archived!`, 'success');
      await loadEditions();
      if (onEditionUpdated) onEditionUpdated();
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to archive edition', 'error');
    } finally {
      setIsFinalizing(false);
    }
  };

  // Toggle "Show sponsors on certificates"
  const handleToggleSponsorsOnCerts = async () => {
    if (!selectedEditionId) return;
    const newVal = !showSponsorsOnCerts;
    setShowSponsorsOnCerts(newVal);

    try {
      const { error } = await supabase
        .from('editions')
        .update({ show_sponsors_on_certificates: newVal })
        .eq('id', selectedEditionId);

      if (error) throw error;

      onShowToast(
        `Sponsors on certificates: ${newVal ? 'ENABLED' : 'DISABLED'} for this edition`,
        'success'
      );
      loadEditions();
    } catch (err: any) {
      onShowToast('Failed to update sponsor toggle', 'error');
    }
  };

  // Add Sponsor
  const handleAddSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sponsorName.trim() || !selectedEditionId) return;

    setSavingSponsor(true);
    try {
      const { error } = await supabase.from('sponsors').insert({
        edition_id: selectedEditionId,
        name: sponsorName.trim(),
        logo_url: sponsorLogoUrl.trim() || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop',
        tier: sponsorTier,
        website_url: sponsorWebsite.trim() || null,
        sort_order: sponsors.length,
      });

      if (error) throw error;

      onShowToast(`Sponsor "${sponsorName}" added!`, 'success');
      setSponsorName('');
      setSponsorLogoUrl('');
      setSponsorWebsite('');
      loadEditionAssets();
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to add sponsor', 'error');
    } finally {
      setSavingSponsor(false);
    }
  };

  // Delete Sponsor
  const handleDeleteSponsor = async (id: string, name: string) => {
    if (!window.confirm(`Remove sponsor "${name}"?`)) return;
    try {
      await supabase.from('sponsors').delete().eq('id', id);
      onShowToast('Sponsor removed', 'success');
      loadEditionAssets();
    } catch (err) {
      onShowToast('Failed to remove sponsor', 'error');
    }
  };

  // Upload Gallery Photo
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedEditionId) return;

    setUploadingPhoto(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${selectedEditionId}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('gallery')
        .getPublicUrl(path);

      const publicUrl = publicUrlData?.publicUrl || '';

      const { error: dbError } = await supabase.from('gallery_photos').insert({
        edition_id: selectedEditionId,
        segment: photoSegment,
        image_url: publicUrl,
        caption: photoCaption.trim() || null,
      });

      if (dbError) throw dbError;

      onShowToast('Photo uploaded and tagged to gallery!', 'success');
      setPhotoCaption('');
      loadEditionAssets();
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to upload photo', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Delete Gallery Photo
  const handleDeletePhoto = async (id: string) => {
    if (!window.confirm('Delete this event photo from the gallery?')) return;
    try {
      await supabase.from('gallery_photos').delete().eq('id', id);
      onShowToast('Photo deleted from gallery', 'success');
      loadEditionAssets();
    } catch {
      onShowToast('Failed to delete photo', 'error');
    }
  };


  // Load FAQ Entries
  const loadFaqs = async () => {
    const { data } = await supabase.from('faq_entries').select('*').order('sort_order', { ascending: true });
    setFaqs(data || []);
  };

  useEffect(() => {
    loadFaqs();
  }, []);

  const handleAddFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) {
      onShowToast('Please provide both question and answer', 'error');
      return;
    }
    setSavingFaq(true);
    try {
      const { error } = await supabase.from('faq_entries').insert({
        question: faqQuestion.trim(),
        answer: faqAnswer.trim(),
        sort_order: parseInt(faqSortOrder, 10) || 0,
      });
      if (error) throw error;
      await logAdminAction('FAQ_CREATED', { question: faqQuestion.trim() });
      onShowToast('FAQ entry added successfully!', 'success');
      setFaqQuestion('');
      setFaqAnswer('');
      setFaqSortOrder('0');
      loadFaqs();
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to save FAQ entry', 'error');
    } finally {
      setSavingFaq(false);
    }
  };

  const handleDeleteFaq = async (id: string, q: string) => {
    if (!window.confirm(`Delete question: "${q}"?`)) return;
    try {
      const { error } = await supabase.from('faq_entries').delete().eq('id', id);
      if (error) throw error;
      await logAdminAction('FAQ_DELETED', { faq_id: id, question: q });
      onShowToast('FAQ entry deleted', 'success');
      loadFaqs();
    } catch (err: any) {
      onShowToast('Failed to delete FAQ entry', 'error');
    }
  };

  // EXPORT EDITION DATA (Single JSON)
  const handleExportEdition = async () => {
    if (!selectedEditionId) return;
    setExporting(true);
    try {
      // 1. Fetch Edition
      const { data: ed } = await supabase.from('editions').select('*').eq('id', selectedEditionId).single();

      // 2. Fetch Teams
      const { data: tm } = await supabase.from('teams').select('*').eq('edition_id', selectedEditionId);

      // 3. Fetch Team Members
      const teamIds = (tm || []).map((t) => t.id);
      const { data: members } = await supabase.from('team_members').select('*').in('team_id', teamIds);

      // 4. Fetch Team Items
      const { data: items } = await supabase.from('team_items').select('*').eq('edition_id', selectedEditionId);

      // 5. Fetch Certificates (Metadata only, no PDF binary)
      const { data: certs } = await supabase.from('certificates').select('certificate_id, recipient_name, certificate_type, template_version, issued_at, status, verify_view_count, team_id').eq('edition_id', selectedEditionId);

      // 6. Fetch Sponsors
      const { data: sp } = await supabase.from('sponsors').select('name, logo_url, tier, website_url, sort_order').eq('edition_id', selectedEditionId);

      // 7. Fetch Gallery Photos (metadata only)
      const { data: gp } = await supabase.from('gallery_photos').select('segment, image_url, caption, uploaded_at').eq('edition_id', selectedEditionId);

      const exportBundle = {
        gcl_export_version: '1.0',
        exported_at: new Date().toISOString(),
        edition: ed,
        teams: tm || [],
        team_members: members || [],
        team_items: items || [],
        certificates: certs || [],
        sponsors: sp || [],
        gallery_photos: gp || [],
      };

      const jsonString = JSON.stringify(exportBundle, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${ed?.name.replace(/[^a-zA-Z0-9]/g, '_')}_Archive_Bundle.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      await logAdminAction('EDITION_DATA_EXPORTED', { edition_id: selectedEditionId });
      onShowToast('Edition data exported successfully!', 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  // Parse JSON for Import Preview
  const handleParseImportJson = (text: string) => {
    setImportJsonText(text);
    try {
      const parsed = JSON.parse(text);
      if (!parsed.edition || !Array.isArray(parsed.teams)) {
        onShowToast('Invalid GCL export structure.', 'error');
        setImportPreview(null);
        return;
      }
      setImportPreview(parsed);
      setOverrideEditionName(`${parsed.edition.name} (Imported)`);
    } catch {
      setImportPreview(null);
    }
  };

  // EXECUTE IMPORT (Creates Brand New Edition)
  const handleExecuteImport = async () => {
    if (!importPreview) return;
    setIsImporting(true);

    try {
      const newEditionName = overrideEditionName.trim() || `${importPreview.edition.name} (Imported)`;

      // 1. Insert new Edition
      const { data: newEdition, error: edError } = await supabase
        .from('editions')
        .insert({
          name: newEditionName,
          year: importPreview.edition.year || new Date().getFullYear(),
          is_current: false, // Imported is never set active current by default
          is_archived: Boolean(importPreview.edition.is_archived),
          starting_budget: importPreview.edition.starting_budget || 50000000,
          total_rounds: importPreview.edition.total_rounds || 3,
        })
        .select()
        .single();

      if (edError || !newEdition) throw edError;

      // 2. Map & insert Teams
      const oldToNewTeamId = new Map<string, string>();

      for (const t of importPreview.teams) {
        const { data: newTeam } = await supabase
          .from('teams')
          .insert({
            edition_id: newEdition.id,
            name: t.name,
            budget: t.budget,
            score: t.score,
            status: t.status || 'active',
            sort_order: t.sort_order || 0,
          })
          .select()
          .single();

        if (newTeam) {
          oldToNewTeamId.set(t.id, newTeam.id);
        }
      }

      // 3. Map & insert Team Items
      if (Array.isArray(importPreview.team_items)) {
        for (const item of importPreview.team_items) {
          const mappedTeamId = oldToNewTeamId.get(item.team_id);
          if (mappedTeamId) {
            await supabase.from('team_items').insert({
              edition_id: newEdition.id,
              team_id: mappedTeamId,
              item_name: item.item_name,
              cost: item.cost,
              is_correct: item.is_correct,
              round_index: item.round_index,
              question_index: item.question_index,
              question_ref: item.question_ref || '',
            });
          }
        }
      }

      // 4. Map & insert Sponsors
      if (Array.isArray(importPreview.sponsors)) {
        for (const sp of importPreview.sponsors) {
          await supabase.from('sponsors').insert({
            edition_id: newEdition.id,
            name: sp.name,
            logo_url: sp.logo_url,
            tier: sp.tier,
            website_url: sp.website_url,
            sort_order: sp.sort_order || 0,
          });
        }
      }

      await logAdminAction('EDITION_DATA_IMPORTED', {
        new_edition_id: newEdition.id,
        new_edition_name: newEditionName,
        teams_count: importPreview.teams.length,
      });

      onShowToast(`Successfully imported edition "${newEditionName}"!`, 'success');
      setImportPreview(null);
      setImportJsonText('');
      await loadEditions();
      setSelectedEditionId(newEdition.id);
    } catch (err: any) {
      onShowToast(err?.message || 'Import failed', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Archive Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-yellow-500/30 backdrop-blur-md shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-400/40 flex items-center justify-center text-yellow-400 shadow-glow-gold">
            <Archive size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              Archive & Heritage Control Center
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                LAYER B
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Finalize tournaments, record grand champions, configure sponsor branding, and export full edition bundles.
            </p>
          </div>
        </div>

        {/* Edition Selector & Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-wrap">
          <div className="w-full sm:w-60">
            <select
              value={selectedEditionId}
              onChange={(e) => setSelectedEditionId(e.target.value)}
              className="gcl-input w-full font-mono text-xs"
            >
              {editions.map((ed) => (
                <option key={ed.id} value={ed.id}>
                  {ed.name} {ed.is_current ? '★ [CURRENT]' : ed.is_archived ? '— [ARCHIVED]' : '— [STANDBY]'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono rounded-xl transition flex items-center gap-1 shadow-sm cursor-pointer"
              title="Create New Edition / Archive"
            >
              <Plus size={14} /> New Edition
            </button>

            <button
              type="button"
              onClick={handleOpenEditModal}
              disabled={!activeEdition}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold font-mono rounded-xl border border-slate-700 transition flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-50"
              title="Edit Selected Edition"
            >
              <Edit3 size={14} /> Edit
            </button>

            <button
              type="button"
              onClick={handleDeleteEdition}
              disabled={!activeEdition || editions.length <= 1}
              className="px-3 py-2 bg-red-950/60 hover:bg-red-900/80 text-red-300 hover:text-white text-xs font-bold font-mono rounded-xl border border-red-800/60 transition flex items-center gap-1 shadow-sm cursor-pointer disabled:opacity-40"
              title="Delete Selected Edition"
            >
              <Trash2 size={14} /> Delete
            </button>

            {activeEdition && !activeEdition.is_current && (
              <button
                type="button"
                onClick={handleSetActiveEdition}
                className="px-3 py-2 bg-[#18181c] hover:bg-[#202025] text-emerald-400 border border-emerald-500/40 text-xs font-bold font-mono rounded-xl transition flex items-center gap-1 shadow-sm cursor-pointer"
                title="Make this edition the active live event"
              >
                <Radio size={14} /> Set Active
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Subtab Navigation Strip */}
      <div className="flex items-center gap-2 p-1.5 bg-[#131316] border border-[#26262b] rounded-2xl w-fit flex-wrap shadow-xl">
        <button
          type="button"
          onClick={() => setArchiveSubTab('podium')}
          className={`px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            archiveSubTab === 'podium'
              ? 'bg-[var(--accent-red)] text-white shadow-[0_2px_12px_rgba(224,38,63,0.3)]'
              : 'text-[#71717a] hover:text-white hover:bg-[#18181c]'
          }`}
        >
          <Crown size={15} /> 1. PODIUM & FINALIZE
        </button>
        <button
          type="button"
          onClick={() => setArchiveSubTab('sponsors')}
          className={`px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            archiveSubTab === 'sponsors'
              ? 'bg-[var(--accent-red)] text-white shadow-[0_2px_12px_rgba(224,38,63,0.3)]'
              : 'text-[#71717a] hover:text-white hover:bg-[#18181c]'
          }`}
        >
          <Sparkles size={15} /> 2. SPONSORS ({sponsors.length})
        </button>
        <button
          type="button"
          onClick={() => setArchiveSubTab('gallery')}
          className={`px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            archiveSubTab === 'gallery'
              ? 'bg-[var(--accent-red)] text-white shadow-[0_2px_12px_rgba(224,38,63,0.3)]'
              : 'text-[#71717a] hover:text-white hover:bg-[#18181c]'
          }`}
        >
          <Image size={15} /> 3. EVENT GALLERY ({galleryPhotos.length})
        </button>
        <button
          type="button"
          onClick={() => setArchiveSubTab('faqs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            archiveSubTab === 'faqs'
              ? 'bg-[var(--accent-red)] text-white shadow-[0_2px_12px_rgba(224,38,63,0.3)]'
              : 'text-[#71717a] hover:text-white hover:bg-[#18181c]'
          }`}
        >
          <HelpCircle size={15} /> 4. FAQ HUB ({faqs.length})
        </button>
        <button
          type="button"
          onClick={() => setArchiveSubTab('backup')}
          className={`px-4 py-2 rounded-xl text-xs font-bold font-mono tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
            archiveSubTab === 'backup'
              ? 'bg-[var(--accent-red)] text-white shadow-[0_2px_12px_rgba(224,38,63,0.3)]'
              : 'text-[#71717a] hover:text-white hover:bg-[#18181c]'
          }`}
        >
          <Download size={15} /> 5. BACKUP & EXPORT
        </button>
      </div>

      {/* 1. PODIUM & FINALIZE SUBTAB */}
      {archiveSubTab === 'podium' && (
        <div className="space-y-6">
          {/* ARCHIVE LOCK STATUS BANNER */}
          {activeEdition?.is_archived ? (
            <div className="p-6 rounded-3xl bg-yellow-950/30 border border-yellow-500/50 backdrop-blur-md flex items-center gap-5 shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-yellow-500/20 border border-yellow-500 flex items-center justify-center text-yellow-400 shrink-0 shadow-glow-gold">
                <Lock size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-yellow-400 uppercase tracking-widest px-2 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30">
                    IMMUTABLE ARCHIVE RECORD
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Archived: {new Date(activeEdition.archived_at || '').toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mt-1">
                  "{activeEdition.name}" is Permanently Finalized and Read-Only
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Live bidding, team budgets, and question evaluations are permanently locked. Standings and podium results are published publicly in the Hall of Fame.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                    <Crown size={22} className="text-yellow-400" />
                    Finalize Edition & Record Podium
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Select the official 1st, 2nd, and 3rd place teams. Finalizing will lock this edition into the permanent historical archives.
                  </p>
                </div>
                <span className="text-xs font-mono text-amber-400 bg-amber-950/60 border border-amber-500/30 px-3 py-1 rounded-full">
                  ⚠️ Irreversible Action
                </span>
              </div>

              {/* 3 Metallic Pedestal Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1st Place - Gold Pedestal */}
                <div className="p-6 rounded-2xl bg-gradient-to-b from-yellow-950/30 via-slate-900/90 to-slate-950 border-2 border-yellow-500/60 shadow-glow-gold relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-yellow-500 text-black text-[10px] font-black font-mono tracking-widest uppercase rounded-bl-xl">
                    1ST PLACE
                  </div>
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-yellow-500/20 border border-yellow-400 flex items-center justify-center text-yellow-400 mb-4 shadow-glow-gold">
                      <Crown size={26} />
                    </div>
                    <h3 className="text-sm font-black text-yellow-400 uppercase tracking-widest mb-1">
                      Grand Champion
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-4">
                      Overall tournament victor & trophy recipient
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] text-yellow-400 uppercase font-black tracking-wider block mb-1.5">
                      Select Winning Team *
                    </label>
                    <select
                      value={championId}
                      onChange={(e) => setChampionId(e.target.value)}
                      className="gcl-input w-full font-bold text-xs"
                      required
                    >
                      <option value="">Select Champion...</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} (★ {t.score} pts)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2nd Place - Silver Pedestal */}
                <div className="p-6 rounded-2xl bg-gradient-to-b from-slate-800/40 via-slate-900/90 to-slate-950 border-2 border-slate-400/50 shadow-xl relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-slate-300 text-black text-[10px] font-black font-mono tracking-widest uppercase rounded-bl-xl">
                    2ND PLACE
                  </div>
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-slate-400/20 border border-slate-300 flex items-center justify-center text-slate-200 mb-4">
                      <Medal size={26} />
                    </div>
                    <h3 className="text-sm font-black text-slate-200 uppercase tracking-widest mb-1">
                      Runner-Up
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-4">
                      Second place podium finisher
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-300 uppercase font-black tracking-wider block mb-1.5">
                      Select Runner-Up Team *
                    </label>
                    <select
                      value={runnerUpId}
                      onChange={(e) => setRunnerUpId(e.target.value)}
                      className="gcl-input w-full font-bold text-xs"
                      required
                    >
                      <option value="">Select Runner-Up...</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} (★ {t.score} pts)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3rd Place - Bronze Pedestal */}
                <div className="p-6 rounded-2xl bg-gradient-to-b from-amber-950/20 via-slate-900/90 to-slate-950 border-2 border-amber-700/50 shadow-xl relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 px-3 py-1 bg-amber-600 text-black text-[10px] font-black font-mono tracking-widest uppercase rounded-bl-xl">
                    3RD PLACE
                  </div>
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-amber-700/20 border border-amber-600 flex items-center justify-center text-amber-500 mb-4">
                      <Award size={26} />
                    </div>
                    <h3 className="text-sm font-black text-amber-400 uppercase tracking-widest mb-1">
                      Third Place
                    </h3>
                    <p className="text-[11px] text-slate-400 mb-4">
                      Bronze podium medal finisher
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] text-amber-400 uppercase font-black tracking-wider block mb-1.5">
                      Select 3rd Place Team *
                    </label>
                    <select
                      value={thirdPlaceId}
                      onChange={(e) => setThirdPlaceId(e.target.value)}
                      className="gcl-input w-full font-bold text-xs"
                      required
                    >
                      <option value="">Select 3rd Place...</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} (★ {t.score} pts)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleFinalizeEdition}
                  disabled={isFinalizing || !championId || !runnerUpId || !thirdPlaceId}
                  className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-black font-black text-sm shadow-glow-gold disabled:opacity-40 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <Lock size={18} />
                  {isFinalizing ? 'Finalizing Archive...' : 'Finalize & Lock Into Permanent Archives'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. SPONSORS SUBTAB */}
      {archiveSubTab === 'sponsors' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Add Sponsor Form */}
          <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sparkles size={18} className="text-[var(--accent-red)]" />
                Add Sponsor / Partner
              </h3>
              <span className="text-xs font-mono text-[var(--accent-red)] bg-[#0a0a0c] px-2 py-0.5 rounded border border-[#26262b]">
                {sponsors.length} registered
              </span>
            </div>

            {/* Toggle: Show sponsors on certificates */}
            <div className="p-4 rounded-xl bg-[#0a0a0c] border border-[#202024] flex items-center justify-between gap-3 shadow-inner">
              <div>
                <span className="text-xs font-bold text-white block">
                  Show Sponsors on Certificates
                </span>
                <span className="text-[10px] text-[#71717a]">
                  Off by default. Applies to certificates for this edition only.
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleSponsorsOnCerts}
                className="text-[var(--accent-red)] hover:text-red-400 transition-colors cursor-pointer"
              >
                {showSponsorsOnCerts ? (
                  <ToggleRight size={32} className="text-[var(--accent-red)]" />
                ) : (
                  <ToggleLeft size={32} className="text-[#4e4e58]" />
                )}
              </button>
            </div>

            <form onSubmit={handleAddSponsor} className="space-y-4 pt-2">
              <div>
                <label className="text-xs text-[#71717a] uppercase font-bold block mb-1">
                  Sponsor Name *
                </label>
                <input
                  type="text"
                  value={sponsorName}
                  onChange={(e) => setSponsorName(e.target.value)}
                  placeholder="e.g. Acme Tech Labs"
                  className="gcl-input w-full py-2 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#71717a] uppercase font-bold block mb-1">
                    Tier
                  </label>
                  <select
                    value={sponsorTier}
                    onChange={(e) => setSponsorTier(e.target.value)}
                    className="gcl-input w-full py-2 text-xs"
                  >
                    {SPONSOR_TIERS.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-[#71717a] uppercase font-bold block mb-1">
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={sponsorWebsite}
                    onChange={(e) => setSponsorWebsite(e.target.value)}
                    placeholder="https://..."
                    className="gcl-input w-full py-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-[#71717a] uppercase font-bold block mb-1">
                  Logo URL (Direct Image Link)
                </label>
                <input
                  type="text"
                  value={sponsorLogoUrl}
                  onChange={(e) => setSponsorLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  className="gcl-input w-full py-2 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={savingSponsor || !sponsorName.trim()}
                className="w-full py-3 rounded-xl bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white font-black text-xs transition-all shadow-[0_2px_12px_rgba(224,38,63,0.3)] disabled:opacity-50 cursor-pointer"
              >
                {savingSponsor ? 'Adding Sponsor...' : '+ Register Sponsor'}
              </button>
            </form>
          </div>

          {/* Right: Existing Sponsors List */}
          <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center justify-between pb-3 border-b border-slate-800">
              <span>Edition Sponsors & Partners</span>
              <span className="text-xs font-mono text-slate-400">{sponsors.length} Total</span>
            </h3>

            {sponsors.length === 0 ? (
              <div className="p-12 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                <Sparkles size={32} className="text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">No sponsors registered for this edition yet.</p>
                <p className="text-[10px] text-slate-500 mt-1">Add brand logos using the form on the left.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {sponsors.map((sp) => (
                  <div
                    key={sp.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-3 shadow-md hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {sp.logo_url ? (
                        <img
                          src={sp.logo_url}
                          alt={sp.name}
                          className="w-10 h-10 object-contain rounded-lg bg-slate-900 border border-slate-800 p-1"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                          <Sparkles size={16} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-bold text-white text-xs truncate">
                          {sp.name}
                        </h4>
                        <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                          {sp.tier}
                        </span>
                        {sp.website_url && (
                          <a
                            href={sp.website_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[9px] text-slate-500 hover:text-slate-300 block truncate"
                          >
                            {sp.website_url.replace(/^https?:\/\//, '')}
                          </a>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteSponsor(sp.id, sp.name)}
                      className="p-2 rounded-lg hover:bg-red-950/60 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                      title="Remove Sponsor"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. EVENT GALLERY SUBTAB */}
      {archiveSubTab === 'gallery' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Upload Photo Form */}
          <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Image size={18} className="text-purple-400" />
                Upload Photo to Gallery
              </h3>
              <span className="text-xs font-mono text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
                {galleryPhotos.length} photos
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 uppercase font-bold block mb-1">
                  Event Segment
                </label>
                <select
                  value={photoSegment}
                  onChange={(e) => setPhotoSegment(e.target.value)}
                  className="gcl-input w-full py-2 text-xs"
                >
                  {SEGMENTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 uppercase font-bold block mb-1">
                  Caption (Optional)
                </label>
                <input
                  type="text"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  placeholder="e.g. Heated bidding duel in Round 2"
                  className="gcl-input w-full py-2 text-xs"
                />
              </div>

              <div>
                <label className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-glow-purple transition-all">
                  <Upload size={16} />
                  {uploadingPhoto ? 'Uploading to Supabase...' : 'Select & Upload Photo File'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Right: Gallery Grid */}
          <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center justify-between pb-3 border-b border-slate-800">
              <span>Event Photo Records</span>
              <span className="text-xs font-mono text-slate-400">{galleryPhotos.length} Total</span>
            </h3>

            {galleryPhotos.length === 0 ? (
              <div className="p-12 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                <Image size={32} className="text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">No photos uploaded for this edition yet.</p>
                <p className="text-[10px] text-slate-500 mt-1">Upload event photos on the left to show in /gallery.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {galleryPhotos.map((gp) => (
                  <div
                    key={gp.id}
                    className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video shadow-md"
                  >
                    <img
                      src={gp.image_url}
                      alt={gp.caption || 'Event photo'}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex flex-col justify-end p-2 opacity-90">
                      <span className="text-[9px] font-mono text-cyan-300 font-semibold truncate">
                        {gp.segment}
                      </span>
                      {gp.caption && (
                        <p className="text-[10px] text-slate-200 truncate">
                          {gp.caption}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeletePhoto(gp.id)}
                      className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/70 hover:bg-red-950 text-slate-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Delete Photo"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. FAQ HUB SUBTAB */}
      {archiveSubTab === 'faqs' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Add FAQ Form */}
          <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <HelpCircle size={18} className="text-emerald-400" />
                Add FAQ Entry
              </h3>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                {faqs.length} entries
              </span>
            </div>

            <form onSubmit={handleAddFaq} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Question *
                </label>
                <input
                  type="text"
                  value={faqQuestion}
                  onChange={(e) => setFaqQuestion(e.target.value)}
                  placeholder="e.g. How does team bidding work?"
                  className="gcl-input w-full text-xs font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={faqSortOrder}
                  onChange={(e) => setFaqSortOrder(e.target.value)}
                  className="gcl-input w-full text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                  Answer *
                </label>
                <textarea
                  rows={4}
                  value={faqAnswer}
                  onChange={(e) => setFaqAnswer(e.target.value)}
                  placeholder="Provide a detailed, clear explanation for participants..."
                  className="gcl-input w-full text-xs resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={savingFaq || !faqQuestion.trim() || !faqAnswer.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-600 hover:from-emerald-300 hover:to-teal-500 text-black font-black text-xs shadow-glow-emerald transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Plus size={16} /> {savingFaq ? 'Adding Question...' : 'Add FAQ Question'}
              </button>
            </form>
          </div>

          {/* Right: FAQ List */}
          <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center justify-between pb-3 border-b border-slate-800">
              <span>Published FAQ Knowledgebase</span>
              <span className="text-xs font-mono text-slate-400">Public at /faq</span>
            </h3>

            {faqs.length === 0 ? (
              <div className="p-12 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                <HelpCircle size={32} className="text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">No FAQ questions published yet.</p>
                <p className="text-[10px] text-slate-500 mt-1">Create common questions on the left.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {faqs.map((f) => (
                  <div
                    key={f.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start justify-between gap-4 hover:border-slate-700 transition-all shadow-md"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                          #{f.sort_order}
                        </span>
                        <h4 className="text-xs font-bold text-white truncate">{f.question}</h4>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{f.answer}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteFaq(f.id, f.question)}
                      className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors shrink-0 cursor-pointer"
                      title="Delete FAQ"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. BACKUP & EXPORT SUBTAB */}
      {archiveSubTab === 'backup' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Export Panel */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
              <Download size={18} className="text-emerald-400" />
              Export Edition Data (JSON Bundle)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Download a complete, offline snapshot of <strong className="text-white">"{activeEdition?.name}"</strong>. Includes:
            </p>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 space-y-1.5">
              <div className="text-emerald-400">✓ Edition metadata & round settings</div>
              <div className="text-emerald-400">✓ Registered teams & budgets</div>
              <div className="text-emerald-400">✓ Team rosters & member details</div>
              <div className="text-emerald-400">✓ Sold items & final bid ledger</div>
              <div className="text-emerald-400">✓ Cryptographic certificate records</div>
              <div className="text-emerald-400">✓ Sponsor branding & tier configurations</div>
              <div className="text-emerald-400">✓ Event gallery photo metadata</div>
            </div>

            <button
              type="button"
              onClick={handleExportEdition}
              disabled={exporting || !selectedEditionId}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-black font-black text-xs shadow-glow-emerald transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Download size={16} />
              {exporting ? 'Packing JSON Bundle...' : 'Download Complete Archive Bundle (.json)'}
            </button>
          </div>

          {/* Import Panel */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 pb-3 border-b border-[#26262b]">
              <Upload size={18} className="text-[var(--accent-red)]" />
              Import Edition Snapshot (JSON)
            </h3>
            <p className="text-xs text-[#71717a] leading-relaxed">
              Upload or paste a previously exported GCL JSON archive. An integrity preview will be performed before creation.
            </p>

            <div>
              <textarea
                value={importJsonText}
                onChange={(e) => handleParseImportJson(e.target.value)}
                placeholder="Paste exported GCL edition JSON bundle here..."
                rows={4}
                className="gcl-input w-full font-mono text-xs resize-none"
              />
            </div>

            {importPreview && (
              <div className="p-4 rounded-xl bg-[#0a0a0c] border border-[#26262b] space-y-3 shadow-lg">
                <span className="text-[10px] font-mono text-[var(--accent-red)] uppercase font-black block">
                  ✓ Valid GCL Edition Structure Detected
                </span>
                <div className="text-xs text-[#e1e1e6] space-y-1">
                  <div>Original Edition: <strong className="text-white">{importPreview.edition.name}</strong></div>
                  <div>Teams Included: <strong className="text-[var(--accent-red)]">{importPreview.teams.length}</strong></div>
                  <div>Bids / Items: <strong className="text-[#a1a1aa]">{importPreview.team_items?.length || 0}</strong></div>
                  <div>Certificates: <strong className="text-[#d4af37]">{importPreview.certificates?.length || 0}</strong></div>
                </div>

                <div>
                  <label className="text-[10px] text-[#71717a] uppercase font-bold block mb-1">
                    Name for New Edition
                  </label>
                  <input
                    type="text"
                    value={overrideEditionName}
                    onChange={(e) => setOverrideEditionName(e.target.value)}
                    className="gcl-input w-full py-1 text-xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleExecuteImport}
                  disabled={isImporting}
                  className="w-full py-3 rounded-xl bg-[var(--accent-red)] hover:bg-[var(--accent-red-hover)] text-white font-black text-xs shadow-[0_2px_12px_rgba(224,38,63,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload size={16} />
                  {isImporting ? 'Executing Database Import...' : 'Confirm & Restore as New Edition'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* CREATE NEW EDITION MODAL */}
      {isCreateModalOpen && (
        <div className="gcl-modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="gcl-modal-box max-w-lg border-emerald-500/50" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
              <h3 className="gcl-modal-title text-emerald-400 flex items-center gap-2 m-0">
                <Plus size={22} />
                Create New Edition / Archive
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateEdition} className="space-y-4">
              <div>
                <label className="input-label">Edition Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GenCode League 2026"
                  value={newEditionForm.name}
                  onChange={(e) => setNewEditionForm((p) => ({ ...p, name: e.target.value }))}
                  className="gcl-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Year</label>
                  <input
                    type="number"
                    required
                    value={newEditionForm.year}
                    onChange={(e) => setNewEditionForm((p) => ({ ...p, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                    className="gcl-input font-mono"
                  />
                </div>
                <div>
                  <label className="input-label">Starting Budget</label>
                  <input
                    type="number"
                    required
                    value={newEditionForm.startingBudget}
                    onChange={(e) => setNewEditionForm((p) => ({ ...p, startingBudget: e.target.value }))}
                    className="gcl-input font-mono"
                  />
                  <span className="text-[10px] text-emerald-400 font-mono mt-0.5 block">
                    {formatCurrency(parseInt(newEditionForm.startingBudget) || 0)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Total Rounds</label>
                  <input
                    type="number"
                    value={newEditionForm.totalRounds}
                    onChange={(e) => setNewEditionForm((p) => ({ ...p, totalRounds: e.target.value }))}
                    className="gcl-input font-mono"
                  />
                </div>
                <div>
                  <label className="input-label">Questions Per Round</label>
                  <input
                    type="number"
                    value={newEditionForm.questionsPerRound}
                    onChange={(e) => setNewEditionForm((p) => ({ ...p, questionsPerRound: e.target.value }))}
                    className="gcl-input font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Base Price</label>
                  <input
                    type="number"
                    value={newEditionForm.basePrice}
                    onChange={(e) => setNewEditionForm((p) => ({ ...p, basePrice: e.target.value }))}
                    className="gcl-input font-mono"
                  />
                  <span className="text-[10px] text-cyan-400 font-mono mt-0.5 block">
                    {formatCurrency(parseInt(newEditionForm.basePrice) || 0)}
                  </span>
                </div>
                <div>
                  <label className="input-label">Min Increment</label>
                  <input
                    type="number"
                    value={newEditionForm.minIncrement}
                    onChange={(e) => setNewEditionForm((p) => ({ ...p, minIncrement: e.target.value }))}
                    className="gcl-input font-mono"
                  />
                  <span className="text-[10px] text-cyan-400 font-mono mt-0.5 block">
                    {formatCurrency(parseInt(newEditionForm.minIncrement) || 0)}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={newEditionForm.isCurrent}
                    onChange={(e) => setNewEditionForm((p) => ({ ...p, isCurrent: e.target.checked }))}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-0 bg-slate-900 border-slate-700"
                  />
                  <span>Set as Active Live Event immediately</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={newEditionForm.isArchived}
                    onChange={(e) => setNewEditionForm((p) => ({ ...p, isArchived: e.target.checked }))}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-slate-900 border-slate-700"
                  />
                  <span>Mark as Archived (Historical Record)</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdition}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm"
                >
                  {isSubmittingEdition ? 'Creating...' : 'Create Edition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EDITION MODAL */}
      {isEditModalOpen && activeEdition && (
        <div className="gcl-modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="gcl-modal-box max-w-lg border-[#26262b]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#202024]">
              <h3 className="gcl-modal-title text-white flex items-center gap-2 m-0">
                <Edit3 size={22} className="text-[var(--accent-red)]" />
                Edit Edition: {activeEdition.name}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-[#71717a] hover:text-white p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateEdition} className="space-y-4">
              <div>
                <label className="input-label">Edition Name</label>
                <input
                  type="text"
                  required
                  value={editEditionForm.name}
                  onChange={(e) => setEditEditionForm((p) => ({ ...p, name: e.target.value }))}
                  className="gcl-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Year</label>
                  <input
                    type="number"
                    required
                    value={editEditionForm.year}
                    onChange={(e) => setEditEditionForm((p) => ({ ...p, year: parseInt(e.target.value) || new Date().getFullYear() }))}
                    className="gcl-input font-mono"
                  />
                </div>
                <div>
                  <label className="input-label">Starting Budget</label>
                  <input
                    type="number"
                    required
                    value={editEditionForm.startingBudget}
                    onChange={(e) => setEditEditionForm((p) => ({ ...p, startingBudget: e.target.value }))}
                    className="gcl-input font-mono"
                  />
                  <span className="text-[10px] text-emerald-400 font-mono mt-0.5 block">
                    {formatCurrency(parseInt(editEditionForm.startingBudget) || 0)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Total Rounds</label>
                  <input
                    type="number"
                    value={editEditionForm.totalRounds}
                    onChange={(e) => setEditEditionForm((p) => ({ ...p, totalRounds: e.target.value }))}
                    className="gcl-input font-mono"
                  />
                </div>
                <div>
                  <label className="input-label">Questions Per Round</label>
                  <input
                    type="number"
                    value={editEditionForm.questionsPerRound}
                    onChange={(e) => setEditEditionForm((p) => ({ ...p, questionsPerRound: e.target.value }))}
                    className="gcl-input font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Base Price</label>
                  <input
                    type="number"
                    value={editEditionForm.basePrice}
                    onChange={(e) => setEditEditionForm((p) => ({ ...p, basePrice: e.target.value }))}
                    className="gcl-input font-mono"
                  />
                  <span className="text-[10px] text-[var(--accent-red)] font-mono mt-0.5 block">
                    {formatCurrency(parseInt(editEditionForm.basePrice) || 0)}
                  </span>
                </div>
                <div>
                  <label className="input-label">Min Increment</label>
                  <input
                    type="number"
                    value={editEditionForm.minIncrement}
                    onChange={(e) => setEditEditionForm((p) => ({ ...p, minIncrement: e.target.value }))}
                    className="gcl-input font-mono"
                  />
                  <span className="text-[10px] text-[var(--accent-red)] font-mono mt-0.5 block">
                    {formatCurrency(parseInt(editEditionForm.minIncrement) || 0)}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#202024] space-y-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-sm text-[#e1e1e6]">
                  <input
                    type="checkbox"
                    checked={editEditionForm.isArchived}
                    onChange={(e) => setEditEditionForm((p) => ({ ...p, isArchived: e.target.checked }))}
                    className="w-4 h-4 rounded text-[var(--accent-red)] focus:ring-0 bg-[#0a0a0c] border-[#26262b]"
                  />
                  <span>Mark as Archived (Read-Only)</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#202024]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="btn-cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdition}
                  className="btn-primary"
                >
                  {isSubmittingEdition ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
