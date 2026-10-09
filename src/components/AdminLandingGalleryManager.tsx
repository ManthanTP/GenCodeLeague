import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Image as ImageIcon,
  Users,
  Trophy,
  Layout,
  Upload,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Check,
  AlertTriangle,
  Sparkles,
  Layers,
  Palette,
  Tag,
  Star,
  X,
  Plus,
} from 'lucide-react';
import {
  getAdminLandingContent,
  saveLandingSettings,
  savePeopleBatch,
  saveEditionChampionPhotos,
  saveGalleryPhoto,
  deleteGalleryPhoto,
  bulkPublishGalleryPhotos,
  bulkDeleteGalleryPhotos,
  uploadMediaFile,
} from '../services/contentService';
import type { Edition, GalleryPhoto, LandingSettings, Person } from '../types/database';

interface AdminLandingGalleryManagerProps {
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const AdminLandingGalleryManager: React.FC<AdminLandingGalleryManagerProps> = ({
  onShowToast,
}) => {
  const [subTab, setSubTab] = useState<'hero' | 'people' | 'champions' | 'gallery'>('hero');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<LandingSettings>({
    id: '',
    hero_image_url: null,
    edition_label: 'GCL 2025',
  });

  // People State
  const [people, setPeople] = useState<Person[]>([]);

  // Editions & Champions State
  const [editions, setEditions] = useState<Edition[]>([]);
  const [selectedEditionId, setSelectedEditionId] = useState<string>('');
  const [champPhotos, setChampPhotos] = useState({
    champion_photo_url: '',
    runner_up_photo_url: '',
    third_place_photo_url: '',
  });

  // Gallery Photos State
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [editingPhoto, setEditingPhoto] = useState<GalleryPhoto | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<GalleryPhoto | null>(null);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  // Inline Validation Error State
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const heroFileRef = useRef<HTMLInputElement>(null);
  const championFileRef = useRef<HTMLInputElement>(null);
  const runnerUpFileRef = useRef<HTMLInputElement>(null);
  const thirdPlaceFileRef = useRef<HTMLInputElement>(null);

  // Load All Admin Data
  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAdminLandingContent();
      setSettings(data.settings);
      setPeople(data.people);
      setEditions(data.editions);
      setGalleryPhotos(data.galleryPhotos);

      if (data.editions.length > 0) {
        const initialEd = selectedEditionId
          ? data.editions.find((e) => e.id === selectedEditionId) || data.editions[0]
          : data.editions[0];
        setSelectedEditionId(initialEd.id);
        setChampPhotos({
          champion_photo_url: initialEd.champion_photo_url || '',
          runner_up_photo_url: initialEd.runner_up_photo_url || '',
          third_place_photo_url: initialEd.third_place_photo_url || '',
        });
      }
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to load content', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Update Champ photos when selected edition changes
  useEffect(() => {
    if (!selectedEditionId) return;
    const ed = editions.find((e) => e.id === selectedEditionId);
    if (ed) {
      setChampPhotos({
        champion_photo_url: ed.champion_photo_url || '',
        runner_up_photo_url: ed.runner_up_photo_url || '',
        third_place_photo_url: ed.third_place_photo_url || '',
      });
    }
  }, [selectedEditionId, editions]);

  // Existing tags for suggestions
  const existingTags = useMemo(() => {
    const set = new Set<string>();
    galleryPhotos.forEach((p) => {
      if (p.tag) set.add(p.tag);
      if (p.segment) set.add(p.segment);
    });
    return Array.from(set).filter(Boolean);
  }, [galleryPhotos]);

  // Featured count
  const featuredCount = useMemo(() => {
    return galleryPhotos.filter((p) => p.is_featured).length;
  }, [galleryPhotos]);

  // ── Hero Section Handlers ──
  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    setValidationError(null);
    try {
      const url = await uploadMediaFile(file, 'hero');
      setSettings((prev) => ({ ...prev, hero_image_url: url }));
      onShowToast('Hero photo uploaded successfully', 'success');
    } catch (err: any) {
      setValidationError(err?.message || 'Upload failed');
      onShowToast(err?.message || 'Upload failed', 'error');
    } finally {
      setSaving(false);
      if (heroFileRef.current) heroFileRef.current.value = '';
    }
  };

  const handleSaveHero = async () => {
    setSaving(true);
    setValidationError(null);
    try {
      await saveLandingSettings(settings);
      onShowToast('Hero settings saved successfully', 'success');
    } catch (err: any) {
      setValidationError(err?.message || 'Failed to save');
      onShowToast(err?.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── People Handlers ──
  const handlePersonPhotoUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const url = await uploadMediaFile(file, 'people');
      setPeople((prev) => {
        const copy = [...prev];
        copy[index] = { ...copy[index], photo_url: url };
        return copy;
      });
      onShowToast('Person photo updated', 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Photo upload failed', 'error');
    } finally {
      setSaving(false);
      e.target.value = '';
    }
  };

  const handleMovePerson = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === people.length - 1)
    ) {
      return;
    }
    const target = direction === 'up' ? index - 1 : index + 1;
    const copy = [...people];
    const temp = copy[index];
    copy[index] = copy[target];
    copy[target] = temp;
    copy.forEach((p, idx) => {
      p.sort_order = idx + 1;
    });
    setPeople(copy);
  };

  const handleSavePeople = async () => {
    setSaving(true);
    try {
      await savePeopleBatch(people);
      onShowToast('People list saved successfully', 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to save people', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Champions Handlers ──
  const handleChampionPhotoUpload = async (
    role: 'champion' | 'runner_up' | 'third_place',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const url = await uploadMediaFile(file, 'champions');
      setChampPhotos((prev) => ({
        ...prev,
        [`${role}_photo_url`]: url,
      }));
      onShowToast(`${role.replace('_', ' ')} photo uploaded`, 'success');
    } catch (err: any) {
      onShowToast(err?.message || 'Upload failed', 'error');
    } finally {
      setSaving(false);
      e.target.value = '';
    }
  };

  const handleSaveChampions = async () => {
    if (!selectedEditionId) return;
    setSaving(true);
    try {
      await saveEditionChampionPhotos(selectedEditionId, champPhotos);
      onShowToast('Champion photos saved successfully', 'success');
      // Update local editions array
      setEditions((prev) =>
        prev.map((e) =>
          e.id === selectedEditionId
            ? {
                ...e,
                champion_photo_url: champPhotos.champion_photo_url || null,
                runner_up_photo_url: champPhotos.runner_up_photo_url || null,
                third_place_photo_url: champPhotos.third_place_photo_url || null,
              }
            : e
        )
      );
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to save champion photos', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Gallery Handlers ──
  const handleBatchGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingFiles(true);
    let successCount = 0;
    try {
      for (const file of files) {
        try {
          const url = await uploadMediaFile(file, 'gallery');
          const fileNameClean = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
          await saveGalleryPhoto({
            image_url: url,
            title: fileNameClean,
            caption: fileNameClean,
            credit: 'GCL Media Team',
            description: null,
            meta: [],
            accent: '#e8743b',
            tag: 'General',
            edition_id: selectedEditionId || null,
            is_featured: false,
            sort_order: galleryPhotos.length + successCount,
            is_published: true,
          });
          successCount++;
        } catch (uploadErr) {
          console.error('File upload error:', uploadErr);
        }
      }
      onShowToast(`Uploaded ${successCount} photo(s) to gallery`, 'success');
      await loadData();
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to process uploads', 'error');
    } finally {
      setUploadingFiles(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveEditPhoto = async () => {
    if (!editingPhoto) return;
    // Check featured count limit: maximum 9
    if (editingPhoto.is_featured) {
      const otherFeatured = galleryPhotos.filter(
        (p) => p.id !== editingPhoto.id && p.is_featured
      ).length;
      if (otherFeatured >= 9) {
        setValidationError('Maximum 9 featured gallery items allowed for the landing page.');
        onShowToast('Maximum 9 featured gallery items allowed for the landing page.', 'warning');
        return;
      }
    }

    setSaving(true);
    setValidationError(null);
    try {
      const creditClean = (editingPhoto.credit || '')
        .trim()
        .replace(/^by\s+/i, '')
        .replace(/\.+$/, '')
        .trim();
      const photoToSave = {
        ...editingPhoto,
        credit: creditClean,
        description: editingPhoto.description !== undefined ? editingPhoto.description : null,
      };
      await saveGalleryPhoto(photoToSave);
      onShowToast('Photo details updated', 'success');
      setGalleryPhotos((prev) =>
        prev.map((p) => (p.id === editingPhoto.id ? { ...p, ...photoToSave } : p))
      );
      setEditingPhoto(null);
    } catch (err: any) {
      setValidationError(err?.message || 'Failed to update photo');
      onShowToast(err?.message || 'Failed to update photo', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!photoToDelete) return;
    setSaving(true);
    try {
      await deleteGalleryPhoto(photoToDelete.id);
      onShowToast('Photo deleted', 'success');
      setGalleryPhotos((prev) => prev.filter((p) => p.id !== photoToDelete.id));
      setSelectedPhotoIds((prev) => prev.filter((id) => id !== photoToDelete.id));
      setPhotoToDelete(null);
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to delete photo', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkPublish = async (status: boolean) => {
    if (selectedPhotoIds.length === 0) return;
    setSaving(true);
    try {
      await bulkPublishGalleryPhotos(selectedPhotoIds, status);
      onShowToast(
        `${selectedPhotoIds.length} photos ${status ? 'published' : 'unpublished'}`,
        'success'
      );
      setGalleryPhotos((prev) =>
        prev.map((p) => (selectedPhotoIds.includes(p.id) ? { ...p, is_published: status } : p))
      );
      setSelectedPhotoIds([]);
    } catch (err: any) {
      onShowToast(err?.message || 'Bulk update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPhotoIds.length === 0) return;
    setSaving(true);
    try {
      await bulkDeleteGalleryPhotos(selectedPhotoIds);
      onShowToast(`Deleted ${selectedPhotoIds.length} photos`, 'success');
      setGalleryPhotos((prev) => prev.filter((p) => !selectedPhotoIds.includes(p.id)));
      setSelectedPhotoIds([]);
      setBatchDeleting(false);
    } catch (err: any) {
      onShowToast(err?.message || 'Bulk delete failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const currentEditionObj = editions.find((e) => e.id === selectedEditionId);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#8e8e9a]">
        <RefreshCw size={28} className="animate-spin text-[#ff2a3d] mb-3" />
        <span className="font-mono text-xs uppercase tracking-wider">
          Loading landing & gallery management...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#202024] pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setSubTab('hero');
            setValidationError(null);
          }}
          className={`px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
            subTab === 'hero'
              ? 'bg-[#ff2a3d] text-white font-bold shadow-[0_0_12px_rgba(255,42,61,0.3)]'
              : 'text-[#8e8e9a] hover:text-white hover:bg-[#18181c]'
          }`}
        >
          <Layout size={14} />
          <span>1. Hero Section</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubTab('people');
            setValidationError(null);
          }}
          className={`px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
            subTab === 'people'
              ? 'bg-[#ff2a3d] text-white font-bold shadow-[0_0_12px_rgba(255,42,61,0.3)]'
              : 'text-[#8e8e9a] hover:text-white hover:bg-[#18181c]'
          }`}
        >
          <Users size={14} />
          <span>2. The People (4 Rows)</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubTab('champions');
            setValidationError(null);
          }}
          className={`px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
            subTab === 'champions'
              ? 'bg-[#ff2a3d] text-white font-bold shadow-[0_0_12px_rgba(255,42,61,0.3)]'
              : 'text-[#8e8e9a] hover:text-white hover:bg-[#18181c]'
          }`}
        >
          <Trophy size={14} />
          <span>3. Champions Photos</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubTab('gallery');
            setValidationError(null);
          }}
          className={`px-4 py-2 rounded-lg font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
            subTab === 'gallery'
              ? 'bg-[#ff2a3d] text-white font-bold shadow-[0_0_12px_rgba(255,42,61,0.3)]'
              : 'text-[#8e8e9a] hover:text-white hover:bg-[#18181c]'
          }`}
        >
          <ImageIcon size={14} />
          <span>4. Gallery Manager ({galleryPhotos.length})</span>
        </button>
      </div>

      {/* Validation banner */}
      {validationError && (
        <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-red-200 text-xs font-mono flex items-center gap-2">
          <AlertTriangle size={15} className="text-red-400 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* ── TAB 1: HERO CONFIGURATION ── */}
      {subTab === 'hero' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="admin-card space-y-4">
              <div className="flex items-center justify-between border-b border-[#202024] pb-3">
                <div>
                  <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-white">
                    Landing Page Hero Setup
                  </h3>
                  <p className="text-xs text-[#8e8e9a] mt-0.5">
                    Wide hero photograph (21:9 ratio) and public edition banner text.
                  </p>
                </div>
              </div>

              {/* Edition Label Input */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#a1a1aa] mb-1.5">
                  Edition Label
                </label>
                <input
                  type="text"
                  value={settings.edition_label}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, edition_label: e.target.value }))
                  }
                  placeholder="e.g. GCL 2025"
                  className="w-full px-3.5 py-2.5 bg-[#0a0a0c] border border-[#26262b] rounded-xl text-white font-mono text-sm focus:border-[#ff2a3d] outline-none"
                />
                <span className="text-[11px] text-[#71717a] mt-1 block font-mono">
                  Displayed in hero eyebrow: "Technical auction event / {settings.edition_label}"
                </span>
              </div>

              {/* 21:9 Hero Image Preview */}
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#a1a1aa] mb-1.5">
                  Hero Photo (21:9 Aspect Ratio Preview)
                </label>
                <div className="w-full aspect-[21/9] min-h-[180px] bg-[#0c0c10] border border-[#26262b] rounded-xl overflow-hidden relative group">
                  {settings.hero_image_url ? (
                    <img
                      src={settings.hero_image_url}
                      alt="Hero Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#71717a] space-y-2">
                      <ImageIcon size={32} />
                      <span className="text-xs font-mono">No hero photo set</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-3">
                  <input
                    ref={heroFileRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={handleHeroUpload}
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => heroFileRef.current?.click()}
                    className="px-4 py-2 bg-[#ff2a3d] hover:bg-[#e02030] text-white rounded-lg font-mono text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    <Upload size={14} />
                    <span>{settings.hero_image_url ? 'Replace Photo' : 'Upload Photo'}</span>
                  </button>

                  {settings.hero_image_url && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setSettings((prev) => ({ ...prev, hero_image_url: null }))}
                      className="px-4 py-2 bg-[#18181c] hover:bg-red-950/40 text-red-400 border border-red-500/20 rounded-lg font-mono text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Trash2 size={14} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t border-[#202024] flex justify-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveHero}
                  className="px-6 py-2.5 bg-[#ff2a3d] hover:bg-[#e02030] text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer shadow-[0_0_15px_rgba(255,42,61,0.3)] transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Save Hero Settings</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="space-y-4">
            <div className="admin-card space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-white flex items-center gap-2">
                <Sparkles size={14} className="text-[#ff2a3d]" />
                <span>Specs & Constraints</span>
              </h4>
              <ul className="text-xs text-[#8e8e9a] space-y-2 font-mono list-disc pl-4">
                <li>Accepted formats: JPG, PNG, WebP</li>
                <li>Maximum file size: 5 MB</li>
                <li>Preview renders with 21:9 object-fit cover</li>
                <li>Stored in Supabase public gallery bucket</li>
                <li>Hero loads eagerly with high priority on landing page</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: THE PEOPLE ── */}
      {subTab === 'people' && (
        <div className="space-y-4">
          <div className="admin-card space-y-4">
            <div className="flex items-center justify-between border-b border-[#202024] pb-3">
              <div>
                <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-white">
                  Event Leadership & Coordinators (4 Rows)
                </h3>
                <p className="text-xs text-[#8e8e9a] mt-0.5">
                  Public pages automatically hide any person whose name AND photo are both empty.
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={handleSavePeople}
                className="px-5 py-2 bg-[#ff2a3d] hover:bg-[#e02030] text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer shadow-[0_0_12px_rgba(255,42,61,0.25)] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Save All People</span>
              </button>
            </div>

            <div className="space-y-3">
              {people.map((person, idx) => (
                <div
                  key={person.id || idx}
                  className="p-4 rounded-xl bg-[#0a0a0c] border border-[#202024] flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left: Avatar & Role */}
                  <div className="flex items-center gap-4">
                    {/* Circular Photo Preview */}
                    <div className="relative group shrink-0">
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#26262b] group-hover:border-[#ff2a3d] bg-[#131316] flex items-center justify-center transition-colors">
                        {person.photo_url ? (
                          <img
                            src={person.photo_url}
                            alt={person.name || person.role_label}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users size={22} className="text-[#71717a]" />
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#18181c] border border-[#2a2a30] text-[#ff2a3d] font-bold">
                        {person.role_label}
                      </span>
                      <div className="mt-1.5">
                        <input
                          type="text"
                          value={person.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPeople((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], name: val };
                              return copy;
                            });
                          }}
                          placeholder="Enter full name"
                          className="px-3 py-1.5 bg-[#131316] border border-[#26262b] rounded-lg text-white font-mono text-xs focus:border-[#ff2a3d] outline-none min-w-[240px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Middle: Upload / Replace / Remove Photo */}
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 bg-[#18181c] hover:bg-[#222228] border border-[#2a2a30] text-xs font-mono text-white rounded-lg cursor-pointer flex items-center gap-1.5">
                      <Upload size={12} />
                      <span>{person.photo_url ? 'Replace' : 'Upload'}</span>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp"
                        className="hidden"
                        onChange={(e) => handlePersonPhotoUpload(idx, e)}
                      />
                    </label>

                    {person.photo_url ? (
                      <button
                        type="button"
                        onClick={() => {
                          setPeople((prev) => {
                            const copy = [...prev];
                            copy[idx] = { ...copy[idx], photo_url: '' };
                            return copy;
                          });
                        }}
                        className="px-2.5 py-1.5 bg-[#18181c] hover:bg-red-950/40 text-red-400 border border-red-500/20 rounded-lg cursor-pointer flex items-center gap-1 text-xs font-mono"
                        title="Remove photo"
                      >
                        <Trash2 size={12} />
                        <span>Remove photo</span>
                      </button>
                    ) : null}
                  </div>

                  {/* Right: Visibility & Sort Controls */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPeople((prev) => {
                          const copy = [...prev];
                          copy[idx] = { ...copy[idx], is_published: !copy[idx].is_published };
                          return copy;
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg font-mono text-xs flex items-center gap-1.5 cursor-pointer border transition-colors ${
                        person.is_published
                          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                          : 'bg-[#18181c] border-[#2a2a30] text-[#71717a]'
                      }`}
                    >
                      {person.is_published ? <Eye size={12} /> : <EyeOff size={12} />}
                      <span>{person.is_published ? 'Visible' : 'Hidden'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMovePerson(idx, 'up')}
                      className="p-1.5 bg-[#18181c] hover:bg-[#222228] text-white border border-[#2a2a30] rounded-lg disabled:opacity-30 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === people.length - 1}
                      onClick={() => handleMovePerson(idx, 'down')}
                      className="p-1.5 bg-[#18181c] hover:bg-[#222228] text-white border border-[#2a2a30] rounded-lg disabled:opacity-30 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: CHAMPIONS PHOTOS ── */}
      {subTab === 'champions' && (
        <div className="space-y-4">
          <div className="admin-card space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#202024] pb-3">
              <div>
                <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-white">
                  Podium Team Photos by Edition
                </h3>
                <p className="text-xs text-[#8e8e9a] mt-0.5">
                  Attach official team photos to the podium champions. Team names & amounts stay
                  linked to Hall of Fame data.
                </p>
              </div>

              {/* Edition Selector */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-[#8e8e9a] uppercase">Select Edition:</span>
                <select
                  value={selectedEditionId}
                  onChange={(e) => setSelectedEditionId(e.target.value)}
                  className="px-3 py-1.5 bg-[#0a0a0c] border border-[#26262b] rounded-lg text-white font-mono text-xs focus:border-[#ff2a3d] outline-none"
                >
                  {editions.map((ed) => (
                    <option key={ed.id} value={ed.id}>
                      {ed.name} ({ed.year})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3 Podium Photo Upload Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* 1. Champion (1st Place) */}
              <div className="p-4 rounded-xl bg-[#0a0a0c] border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                    ★ 01 / CHAMPION
                  </span>
                  <Trophy size={16} className="text-amber-400" />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-[#71717a] block uppercase">
                    Team Name (From HoF Data)
                  </label>
                  <p className="text-sm font-bold text-white truncate">
                    {(currentEditionObj as any)?.champion?.name || 'No team assigned'}
                  </p>
                </div>

                {/* Photo Preview */}
                <div className="w-full aspect-[4/3] bg-[#131316] border border-[#26262b] rounded-lg overflow-hidden relative">
                  {champPhotos.champion_photo_url ? (
                    <img
                      src={champPhotos.champion_photo_url}
                      alt="Champion Team"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#71717a] space-y-1">
                      <ImageIcon size={24} />
                      <span className="text-[10px] font-mono">No Champion Photo</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={championFileRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={(e) => handleChampionPhotoUpload('champion', e)}
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => championFileRef.current?.click()}
                    className="flex-1 py-1.5 bg-[#18181c] hover:bg-[#222228] border border-[#2a2a30] text-white text-xs font-mono rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Upload size={12} />
                    <span>{champPhotos.champion_photo_url ? 'Replace' : 'Upload'}</span>
                  </button>
                  {champPhotos.champion_photo_url && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        setChampPhotos((prev) => ({ ...prev, champion_photo_url: '' }))
                      }
                      className="p-1.5 bg-[#18181c] hover:bg-red-950/40 text-red-400 border border-red-500/20 rounded-lg cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* 2. Runner Up (2nd Place) */}
              <div className="p-4 rounded-xl bg-[#0a0a0c] border border-slate-400/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider px-2 py-0.5 rounded bg-slate-500/10 border border-slate-500/20">
                    ◈ 02 / RUNNER-UP
                  </span>
                  <Trophy size={16} className="text-slate-400" />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-[#71717a] block uppercase">
                    Team Name (From HoF Data)
                  </label>
                  <p className="text-sm font-bold text-white truncate">
                    {(currentEditionObj as any)?.runnerUp?.name || 'No team assigned'}
                  </p>
                </div>

                {/* Photo Preview */}
                <div className="w-full aspect-[4/3] bg-[#131316] border border-[#26262b] rounded-lg overflow-hidden relative">
                  {champPhotos.runner_up_photo_url ? (
                    <img
                      src={champPhotos.runner_up_photo_url}
                      alt="Runner Up Team"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#71717a] space-y-1">
                      <ImageIcon size={24} />
                      <span className="text-[10px] font-mono">No Runner-up Photo</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={runnerUpFileRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={(e) => handleChampionPhotoUpload('runner_up', e)}
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => runnerUpFileRef.current?.click()}
                    className="flex-1 py-1.5 bg-[#18181c] hover:bg-[#222228] border border-[#2a2a30] text-white text-xs font-mono rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Upload size={12} />
                    <span>{champPhotos.runner_up_photo_url ? 'Replace' : 'Upload'}</span>
                  </button>
                  {champPhotos.runner_up_photo_url && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        setChampPhotos((prev) => ({ ...prev, runner_up_photo_url: '' }))
                      }
                      className="p-1.5 bg-[#18181c] hover:bg-red-950/40 text-red-400 border border-red-500/20 rounded-lg cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* 3. Third Place (3rd Place) */}
              <div className="p-4 rounded-xl bg-[#0a0a0c] border border-amber-700/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-amber-600 uppercase tracking-wider px-2 py-0.5 rounded bg-amber-700/10 border border-amber-700/20">
                    ◈ 03 / THIRD PLACE
                  </span>
                  <Trophy size={16} className="text-amber-600" />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-[#71717a] block uppercase">
                    Team Name (From HoF Data)
                  </label>
                  <p className="text-sm font-bold text-white truncate">
                    {(currentEditionObj as any)?.thirdPlace?.name || 'No team assigned'}
                  </p>
                </div>

                {/* Photo Preview */}
                <div className="w-full aspect-[4/3] bg-[#131316] border border-[#26262b] rounded-lg overflow-hidden relative">
                  {champPhotos.third_place_photo_url ? (
                    <img
                      src={champPhotos.third_place_photo_url}
                      alt="Third Place Team"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#71717a] space-y-1">
                      <ImageIcon size={24} />
                      <span className="text-[10px] font-mono">No Third Place Photo</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={thirdPlaceFileRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={(e) => handleChampionPhotoUpload('third_place', e)}
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => thirdPlaceFileRef.current?.click()}
                    className="flex-1 py-1.5 bg-[#18181c] hover:bg-[#222228] border border-[#2a2a30] text-white text-xs font-mono rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Upload size={12} />
                    <span>{champPhotos.third_place_photo_url ? 'Replace' : 'Upload'}</span>
                  </button>
                  {champPhotos.third_place_photo_url && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        setChampPhotos((prev) => ({ ...prev, third_place_photo_url: '' }))
                      }
                      className="p-1.5 bg-[#18181c] hover:bg-red-950/40 text-red-400 border border-red-500/20 rounded-lg cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Save Champions Button */}
            <div className="pt-4 border-t border-[#202024] flex justify-end">
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveChampions}
                className="px-6 py-2.5 bg-[#ff2a3d] hover:bg-[#e02030] text-white font-mono text-xs font-bold uppercase tracking-wider rounded-xl cursor-pointer shadow-[0_0_15px_rgba(255,42,61,0.3)] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Save Champions Photos</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: GALLERY MANAGER ── */}
      {subTab === 'gallery' && (
        <div className="space-y-4">
          <div className="admin-card space-y-4">
            {/* Header with Upload & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#202024] pb-4">
              <div>
                <h3 className="text-sm font-bold font-mono uppercase tracking-wider text-white flex items-center gap-2">
                  <span>Gallery Manager</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#18181c] border border-[#2a2a30] text-[#a1a1aa]">
                    {galleryPhotos.length} Total • {featuredCount}/9 Featured
                  </span>
                </h3>
                <p className="text-xs text-[#8e8e9a] mt-0.5">
                  Multi-file upload, title and metadata editor, accent colors, and featured carousel
                  toggles.
                </p>
              </div>

              {/* Upload Multiple Files */}
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={handleBatchGalleryUpload}
                />
                <button
                  type="button"
                  disabled={uploadingFiles}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-[#ff2a3d] hover:bg-[#e02030] text-white rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-[0_0_12px_rgba(255,42,61,0.25)] transition-all disabled:opacity-50"
                >
                  {uploadingFiles ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Upload size={14} />
                  )}
                  <span>Upload Photos (Batch)</span>
                </button>
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {selectedPhotoIds.length > 0 && (
              <div className="p-3 bg-[#131316] border border-[#ff2a3d]/40 rounded-xl flex items-center justify-between flex-wrap gap-3">
                <span className="text-xs font-mono text-white">
                  <strong>{selectedPhotoIds.length}</strong> photo(s) selected
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleBulkPublish(true)}
                    className="px-3 py-1.5 bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 font-mono text-xs rounded-lg cursor-pointer hover:bg-emerald-900/40"
                  >
                    Publish Selected
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkPublish(false)}
                    className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-xs rounded-lg cursor-pointer hover:bg-zinc-700"
                  >
                    Unpublish Selected
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchDeleting(true)}
                    className="px-3 py-1.5 bg-red-950/40 border border-red-500/40 text-red-400 font-mono text-xs rounded-lg cursor-pointer hover:bg-red-900/40 flex items-center gap-1.5"
                  >
                    <Trash2 size={12} />
                    <span>Delete Selected</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPhotoIds([])}
                    className="px-2 py-1 text-zinc-400 hover:text-white text-xs font-mono"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Gallery Thumbnails Grid */}
            {galleryPhotos.length === 0 ? (
              <div className="py-16 text-center text-[#71717a] font-mono text-xs">
                No photos in gallery. Click "Upload Photos (Batch)" to add event highlights.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {galleryPhotos.map((photo) => {
                  const isSelected = selectedPhotoIds.includes(photo.id);
                  return (
                    <div
                      key={photo.id}
                      className={`group relative rounded-xl overflow-hidden border bg-[#0a0a0c] transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#ff2a3d] shadow-[0_0_12px_rgba(255,42,61,0.3)]'
                          : 'border-[#202024] hover:border-[#ff2a3d]/60'
                      }`}
                      onClick={() => setEditingPhoto({ ...photo })}
                    >
                      {/* Checkbox */}
                      <div
                        className="absolute top-2 left-2 z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPhotoIds((prev) =>
                            isSelected ? prev.filter((id) => id !== photo.id) : [...prev, photo.id]
                          );
                        }}
                      >
                        <div
                          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-[#ff2a3d] border-[#ff2a3d] text-white'
                              : 'bg-black/60 border-white/30 text-transparent hover:border-white'
                          }`}
                        >
                          <Check size={12} className={isSelected ? 'block' : 'hidden'} />
                        </div>
                      </div>

                      {/* Featured Indicator */}
                      {photo.is_featured && (
                        <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded bg-amber-500/90 text-black text-[9px] font-bold font-mono flex items-center gap-0.5 shadow-md">
                          <Star size={9} fill="black" />
                          <span>HERO</span>
                        </div>
                      )}

                      {/* 4:5 Aspect Ratio Photo Container */}
                      <div className="w-full aspect-[4/5] bg-[#131316] overflow-hidden">
                        <img
                          src={photo.image_url}
                          alt={photo.title || 'Event photo'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>

                      {/* Info footer */}
                      <div className="p-2 bg-[#0d0d10] text-[11px] font-mono">
                        <p className="text-white truncate font-medium">
                          {photo.title || photo.caption || 'Untitled'}
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-[#71717a] mt-1">
                          <span className="truncate">{photo.tag || photo.segment || 'General'}</span>
                          <span
                            className={photo.is_published ? 'text-emerald-400' : 'text-zinc-500'}
                          >
                            {photo.is_published ? 'Live' : 'Hidden'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EDIT PHOTO MODAL / DRAWER ── */}
      {editingPhoto && (
        <div className="gcl-modal-overlay" onClick={() => setEditingPhoto(null)}>
          <div
            className="gcl-modal-box max-w-2xl border-[#ff2a3d]/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#26262b] pb-3">
              <h3 className="gcl-modal-title text-white flex items-center gap-2">
                <Palette size={18} className="text-[#ff2a3d]" />
                <span>Edit Photo Properties</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingPhoto(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
              {/* Photo Preview */}
              <div className="space-y-3">
                <label className="text-[#a1a1aa] block mb-1">Photo</label>
                <div className="aspect-[4/5] w-full rounded-xl overflow-hidden border border-[#26262b] relative bg-black">
                  <img
                    src={editingPhoto.image_url}
                    alt={editingPhoto.title || ''}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Editable Fields: Title, Photo by, Description */}
              <div className="space-y-3 font-mono text-xs">
                {/* 1. Title */}
                <div>
                  <label className="text-[#a1a1aa] block mb-1">
                    Title
                  </label>
                  <textarea
                    rows={2}
                    value={editingPhoto.title || ''}
                    onChange={(e) =>
                      setEditingPhoto((prev) => (prev ? { ...prev, title: e.target.value } : null))
                    }
                    placeholder="Podium Reveal"
                    className="w-full px-3 py-2 bg-[#0a0a0c] border border-[#26262b] rounded-lg text-white font-mono text-xs focus:border-[#ff2a3d] outline-none"
                  />
                  <p className="text-[11px] text-[#71717a] mt-1 font-mono">
                    Headline top-left. Line breaks give two lines. Empty hides headline.
                  </p>
                </div>

                {/* 2. Photo by */}
                <div>
                  <label className="text-[#a1a1aa] block mb-1">Photo by</label>
                  <input
                    type="text"
                    value={editingPhoto.credit || ''}
                    onChange={(e) =>
                      setEditingPhoto((prev) => (prev ? { ...prev, credit: e.target.value } : null))
                    }
                    placeholder="GCL Media Team"
                    className="w-full px-3 py-2 bg-[#0a0a0c] border border-[#26262b] rounded-lg text-white font-mono text-xs focus:border-[#ff2a3d] outline-none"
                  />
                  <p className="text-[11px] text-[#71717a] mt-1 font-mono">
                    Byline bottom-left. Store name only. Empty hides byline.
                  </p>
                </div>

                {/* 3. Description */}
                <div>
                  <label className="text-[#a1a1aa] block mb-1">Description</label>
                  <input
                    type="text"
                    value={editingPhoto.description ?? ''}
                    onChange={(e) =>
                      setEditingPhoto((prev) => (prev ? { ...prev, description: e.target.value } : null))
                    }
                    placeholder="GCL 2025 Final Podium"
                    className="w-full px-3 py-2 bg-[#0a0a0c] border border-[#26262b] rounded-lg text-white font-mono text-xs focus:border-[#ff2a3d] outline-none"
                  />
                  <p className="text-[11px] text-[#71717a] mt-1 font-mono">
                    Single line. Split on · for right-aligned facts. Empty hides facts.
                  </p>
                </div>

                {/* Tag & Suggestions */}
                <div>
                  <label className="text-[#a1a1aa] block mb-1">Category / Tag</label>
                  <input
                    type="text"
                    value={editingPhoto.tag || ''}
                    onChange={(e) =>
                      setEditingPhoto((prev) => (prev ? { ...prev, tag: e.target.value } : null))
                    }
                    placeholder="e.g. Ceremony, Auction, Awards"
                    className="w-full px-3 py-2 bg-[#0a0a0c] border border-[#26262b] rounded-lg text-white font-mono text-xs focus:border-[#ff2a3d] outline-none"
                  />
                  {existingTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {existingTags.slice(0, 5).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() =>
                            setEditingPhoto((prev) => (prev ? { ...prev, tag: t } : null))
                          }
                          className="px-1.5 py-0.5 rounded bg-[#18181c] text-[10px] text-zinc-400 hover:text-white"
                        >
                          +{t}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Edition link */}
                <div>
                  <label className="text-[#a1a1aa] block mb-1">Link to Edition</label>
                  <select
                    value={editingPhoto.edition_id || ''}
                    onChange={(e) =>
                      setEditingPhoto((prev) =>
                        prev ? { ...prev, edition_id: e.target.value || null } : null
                      )
                    }
                    className="w-full px-3 py-2 bg-[#0a0a0c] border border-[#26262b] rounded-lg text-white font-mono text-xs focus:border-[#ff2a3d] outline-none"
                  >
                    <option value="">No Edition (General)</option>
                    {editions.map((ed) => (
                      <option key={ed.id} value={ed.id}>
                        {ed.name} ({ed.year})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Featured and Published Toggles */}
                <div className="pt-2 flex items-center justify-between border-t border-[#202024]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingPhoto.is_featured)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        if (checked && featuredCount >= 9 && !editingPhoto.is_featured) {
                          onShowToast(
                            'Maximum 9 featured gallery items allowed for the landing page.',
                            'warning'
                          );
                          return;
                        }
                        setEditingPhoto((prev) =>
                          prev ? { ...prev, is_featured: checked } : null
                        );
                      }}
                      className="w-4 h-4 accent-[#ff2a3d] rounded"
                    />
                    <span className="text-white text-xs">Featured on Landing (Max 9)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingPhoto.is_published)}
                      onChange={(e) =>
                        setEditingPhoto((prev) =>
                          prev ? { ...prev, is_published: e.target.checked } : null
                        )
                      }
                      className="w-4 h-4 accent-[#ff2a3d] rounded"
                    />
                    <span className="text-white text-xs">Published</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="gcl-modal-actions pt-4 border-t border-[#202024]">
              <button
                type="button"
                onClick={() => {
                  setPhotoToDelete(editingPhoto);
                  setEditingPhoto(null);
                }}
                className="btn-modal-cancel text-red-400 hover:text-red-300 mr-auto"
              >
                Delete Photo
              </button>
              <button
                type="button"
                onClick={() => setEditingPhoto(null)}
                className="btn-modal-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveEditPhoto}
                className="btn-modal-confirm-red"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM SINGLE DELETE MODAL ── */}
      {photoToDelete && (
        <div className="gcl-modal-overlay" onClick={() => setPhotoToDelete(null)}>
          <div className="gcl-modal-box border-red-500/80" onClick={(e) => e.stopPropagation()}>
            <h3 className="gcl-modal-title text-red-400">
              <AlertTriangle size={24} className="text-red-500 animate-pulse" />
              Delete Gallery Photo
            </h3>
            <p className="gcl-modal-body">
              Are you sure you want to permanently delete this photo from the gallery?
              <br />
              <strong className="text-white">
                {photoToDelete.title || photoToDelete.caption || 'Untitled Photo'}
              </strong>
            </p>
            <div className="gcl-modal-actions">
              <button
                type="button"
                onClick={() => setPhotoToDelete(null)}
                className="btn-modal-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleDeletePhoto}
                className="btn-modal-confirm-red"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM BATCH DELETE MODAL ── */}
      {batchDeleting && (
        <div className="gcl-modal-overlay" onClick={() => setBatchDeleting(false)}>
          <div className="gcl-modal-box border-red-500/80" onClick={(e) => e.stopPropagation()}>
            <h3 className="gcl-modal-title text-red-400">
              <AlertTriangle size={24} className="text-red-500 animate-pulse" />
              Delete {selectedPhotoIds.length} Selected Photos
            </h3>
            <p className="gcl-modal-body">
              Are you sure you want to permanently delete these {selectedPhotoIds.length} photos?
              This action cannot be undone.
            </p>
            <div className="gcl-modal-actions">
              <button
                type="button"
                onClick={() => setBatchDeleting(false)}
                className="btn-modal-cancel"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleBulkDelete}
                className="btn-modal-confirm-red"
              >
                Delete All Selected
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminLandingGalleryManager;
