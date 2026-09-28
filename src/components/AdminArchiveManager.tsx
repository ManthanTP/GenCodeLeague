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
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logAdminAction } from '../utils/certificateUtils';
import type { Edition, Team, Sponsor, GalleryPhoto } from '../types/database';

interface AdminArchiveManagerProps {
  currentEdition: Edition | null;
  teams: Team[];
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
  onEditionUpdated?: () => void;
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
}: AdminArchiveManagerProps) {
  const [editions, setEditions] = useState<Edition[]>([]);
  const [selectedEditionId, setSelectedEditionId] = useState<string>(
    currentEdition?.id || ''
  );

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

        {/* Edition Selector */}
        <div className="sm:w-64">
          <select
            value={selectedEditionId}
            onChange={(e) => setSelectedEditionId(e.target.value)}
            className="gcl-input w-full font-mono text-xs"
          >
            {editions.map((ed) => (
              <option key={ed.id} value={ed.id}>
                {ed.name} {ed.is_archived ? '— [ARCHIVED]' : '— [ACTIVE]'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ARCHIVE LOCK STATUS BANNER */}
      {activeEdition?.is_archived && (
        <div className="p-5 rounded-2xl bg-yellow-950/30 border border-yellow-500/50 backdrop-blur-md flex items-center gap-4 shadow-xl">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/20 border border-yellow-500 flex items-center justify-center text-yellow-400 shrink-0">
            <Lock size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-yellow-400 uppercase tracking-widest">
                IMMUTABLE ARCHIVE RECORD
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Archived: {new Date(activeEdition.archived_at || '').toLocaleDateString()}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white mt-0.5">
              "{activeEdition.name}" is Finalized and Read-Only
            </h3>
            <p className="text-xs text-slate-400">
              Live bidding, team budgets, and question evaluations are locked. Standings are permanently published in the Hall of Fame.
            </p>
          </div>
        </div>
      )}

      {/* 1. EDITION FINALIZE & PODIUM FORM */}
      {!activeEdition?.is_archived && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-yellow-400 font-bold text-lg">
            <Crown size={22} />
            <span>Finalize Edition & Record Podium</span>
          </div>

          <p className="text-xs text-slate-400">
            Select the definitive 1st, 2nd, and 3rd place teams. Finalizing will lock this edition into the permanent historical archives.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="text-xs text-yellow-400 uppercase font-black tracking-wider block mb-1.5 flex items-center gap-1.5">
                <Crown size={14} /> Grand Champion (1st) *
              </label>
              <select
                value={championId}
                onChange={(e) => setChampionId(e.target.value)}
                className="gcl-input w-full font-bold"
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

            <div>
              <label className="text-xs text-slate-300 uppercase font-bold tracking-wider block mb-1.5 flex items-center gap-1.5">
                <Medal size={14} /> Runner-Up (2nd) *
              </label>
              <select
                value={runnerUpId}
                onChange={(e) => setRunnerUpId(e.target.value)}
                className="gcl-input w-full font-semibold"
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

            <div>
              <label className="text-xs text-amber-500 uppercase font-bold tracking-wider block mb-1.5 flex items-center gap-1.5">
                <Award size={14} /> Third Place (3rd) *
              </label>
              <select
                value={thirdPlaceId}
                onChange={(e) => setThirdPlaceId(e.target.value)}
                className="gcl-input w-full font-semibold"
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

          <button
            type="button"
            onClick={handleFinalizeEdition}
            disabled={isFinalizing || !championId || !runnerUpId || !thirdPlaceId}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-extrabold text-sm shadow-glow-gold disabled:opacity-40 transition-all flex items-center justify-center gap-2"
          >
            {isFinalizing ? 'Finalizing Archive...' : 'Finalize & Lock Edition'}
          </button>
        </div>
      )}

      {/* 2. SPONSOR & PARTNER LOGOS MANAGER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Add Sponsor Form */}
        <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-3xl p-6 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles size={18} className="text-cyan-400" />
              Sponsors & Partners
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {sponsors.length} active
            </span>
          </div>

          {/* Toggle: Show sponsors on certificates */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-white block">
                Show Sponsors on Certificates
              </span>
              <span className="text-[10px] text-slate-400">
                Off by default. Applies to certificates for this edition only.
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleSponsorsOnCerts}
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {showSponsorsOnCerts ? (
                <ToggleRight size={28} className="text-cyan-400" />
              ) : (
                <ToggleLeft size={28} className="text-slate-600" />
              )}
            </button>
          </div>

          <form onSubmit={handleAddSponsor} className="space-y-3 pt-2">
            <div>
              <label className="text-xs text-slate-400 uppercase font-bold block mb-1">
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
                <label className="text-xs text-slate-400 uppercase font-bold block mb-1">
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
                <label className="text-xs text-slate-400 uppercase font-bold block mb-1">
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
              <label className="text-xs text-slate-400 uppercase font-bold block mb-1">
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
              className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black font-extrabold text-xs transition-all shadow-glow-cyan disabled:opacity-50"
            >
              {savingSponsor ? 'Adding...' : '+ Add Sponsor'}
            </button>
          </form>
        </div>

        {/* Right: Existing Sponsors List */}
        <div className="lg:col-span-7 bg-slate-900/70 border border-slate-800 rounded-3xl p-6 backdrop-blur-md shadow-xl space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            Registered Edition Sponsors ({sponsors.length})
          </h3>

          {sponsors.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-8 text-center">
              No sponsors added to this edition yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sponsors.map((sp) => (
                <div
                  key={sp.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {sp.logo_url && (
                      <img
                        src={sp.logo_url}
                        alt={sp.name}
                        className="w-8 h-8 object-contain rounded bg-slate-900 p-1"
                      />
                    )}
                    <div className="min-w-0">
                      <h4 className="font-bold text-white text-xs truncate">
                        {sp.name}
                      </h4>
                      <span className="text-[10px] font-mono text-cyan-400">
                        {sp.tier}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteSponsor(sp.id, sp.name)}
                    className="p-1 rounded hover:bg-red-950 text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. EVENT GALLERY PHOTO UPLOADER */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-xl space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Image size={20} className="text-cyan-400" />
              Upload Event Photos to Gallery
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Tag photos with tournament segments for public display at /gallery.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {galleryPhotos.length} photo(s)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
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
            <label className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-glow-cyan transition-all">
              <Upload size={14} />
              {uploadingPhoto ? 'Uploading Photo...' : 'Select & Upload Photo'}
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

      {/* 4. FULL EDITION DATA EXPORT & IMPORT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Export Panel */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 backdrop-blur-md shadow-xl space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <Download size={18} className="text-emerald-400" />
            Export Edition Data (JSON)
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Download a portable, complete snapshot of "{activeEdition?.name}" including teams, scores, items, sponsors, and certificate metadata.
          </p>

          <button
            type="button"
            onClick={handleExportEdition}
            disabled={exporting || !selectedEditionId}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold text-xs shadow-glow-emerald transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {exporting ? 'Packing JSON Bundle...' : 'Download Complete Edition Snapshot (JSON)'}
          </button>
        </div>

        {/* Import Panel */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 backdrop-blur-md shadow-xl space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 pb-3 border-b border-slate-800">
            <Upload size={18} className="text-cyan-400" />
            Import Edition Data (JSON)
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Upload an exported JSON bundle. A preview will appear before any database insertion. Always creates a brand new edition.
          </p>

          <div>
            <textarea
              value={importJsonText}
              onChange={(e) => handleParseImportJson(e.target.value)}
              placeholder="Paste exported GCL edition JSON here..."
              rows={3}
              className="gcl-input w-full font-mono text-xs resize-none"
            />
          </div>

          {importPreview && (
            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-3">
              <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold block">
                ✓ Valid GCL Bundle Preview
              </span>
              <div className="text-xs text-slate-300 space-y-1">
                <div>Original Edition: <strong className="text-white">{importPreview.edition.name}</strong></div>
                <div>Teams Detected: <strong className="text-cyan-300">{importPreview.teams.length}</strong></div>
                <div>Items Recorded: <strong className="text-purple-300">{importPreview.team_items?.length || 0}</strong></div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
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
                className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs shadow-glow-cyan transition-all flex items-center justify-center gap-2"
              >
                {isImporting ? 'Executing Import...' : 'Confirm & Create New Edition'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
