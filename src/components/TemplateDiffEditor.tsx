import React, { useState, useEffect, useMemo } from 'react';
import {
  Palette,
  Eye,
  Check,
  X,
  History,
  AlertCircle,
  Sparkles,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import CertificatePreview from './CertificatePreview';
import { logAdminAction } from '../utils/certificateUtils';
import type {
  CertificateTemplate,
  CertificateType,
  CertificateDesignConfig,
} from '../types/certificates';

interface TemplateDiffEditorProps {
  onShowToast: (msg: string, type?: 'success' | 'error') => void;
  onTemplatesUpdated?: () => void;
}

const SAMPLE_RECIPIENT = 'Jordan Lee';
const SAMPLE_TEAM = 'Team ByteForce';

export default function TemplateDiffEditor({
  onShowToast,
  onTemplatesUpdated,
}: TemplateDiffEditorProps) {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingType, setEditingType] = useState<CertificateType | null>(null);

  // Draft design config state for the N+1 version
  const [draftConfig, setDraftConfig] = useState<CertificateDesignConfig>({
    title: '',
    subtitle: '',
    primary_color: '#00f0ff',
    secondary_color: '#7000ff',
    accent_badge: '',
    signature_name_1: '',
    signature_title_1: '',
    signature_name_2: '',
    signature_title_2: '',
  });

  const [isPublishing, setIsPublishing] = useState(false);

  // Load all templates
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('certificate_templates')
        .select('*')
        .order('certificate_type', { ascending: true })
        .order('version', { ascending: false });

      if (!error && data) {
        setTemplates(data as CertificateTemplate[]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Group templates by type
  const groupedByType = useMemo(() => {
    const map = new Map<CertificateType, CertificateTemplate[]>();
    templates.forEach((t) => {
      const list = map.get(t.certificate_type) || [];
      list.push(t);
      map.set(t.certificate_type, list);
    });
    return map;
  }, [templates]);

  // Active template for the type being edited
  const currentActiveTemplate = useMemo(() => {
    if (!editingType) return null;
    const list = groupedByType.get(editingType) || [];
    return list.find((t) => t.is_active) || list[0] || null;
  }, [editingType, groupedByType]);

  // Next draft version number
  const nextVersionNumber = useMemo(() => {
    if (!editingType) return 2;
    const list = groupedByType.get(editingType) || [];
    const maxVer = list.reduce((max, t) => Math.max(max, t.version), 0);
    return maxVer + 1;
  }, [editingType, groupedByType]);

  // Open editor for a template type
  const handleOpenEditor = (type: CertificateType) => {
    setEditingType(type);
    const list = groupedByType.get(type) || [];
    const active = list.find((t) => t.is_active) || list[0];

    if (active) {
      setDraftConfig({
        title: active.design_config.title || `Certificate of ${type}`,
        subtitle:
          active.design_config.subtitle ||
          'has actively participated in GenCode League',
        primary_color: active.design_config.primary_color || '#00f0ff',
        secondary_color: active.design_config.secondary_color || '#7000ff',
        accent_badge: active.design_config.accent_badge || type.toUpperCase(),
        signature_name_1:
          active.design_config.signature_name_1 || 'Faculty Coordinator',
        signature_title_1:
          active.design_config.signature_title_1 || 'GenCode League',
        signature_name_2:
          active.design_config.signature_name_2 || 'Department of CSE',
        signature_title_2: active.design_config.signature_title_2 || 'Convenor',
      });
    }
  };

  // Publish New Version Handler
  const handlePublishNewVersion = async () => {
    if (!editingType || !currentActiveTemplate) return;
    setIsPublishing(true);

    try {
      // 1. Mark existing templates of this type as is_active = false
      const { error: deactivateError } = await supabase
        .from('certificate_templates')
        .update({ is_active: false })
        .eq('certificate_type', editingType);

      if (deactivateError) throw deactivateError;

      // 2. Insert new version with is_active = true
      const { error: insertError } = await supabase
        .from('certificate_templates')
        .insert({
          certificate_type: editingType,
          version: nextVersionNumber,
          design_config: draftConfig,
          is_active: true,
        });

      if (insertError) throw insertError;

      // 3. Log in audit_log
      await logAdminAction('TEMPLATE_VERSION_PUBLISHED', {
        certificate_type: editingType,
        new_version: nextVersionNumber,
        previous_version: currentActiveTemplate.version,
      });

      onShowToast(
        `Version ${nextVersionNumber} published! It is now the active template for future certificates.`,
        'success'
      );

      setEditingType(null);
      await fetchTemplates();
      if (onTemplatesUpdated) onTemplatesUpdated();
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to publish new version', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <Palette size={20} className="text-cyan-400" />
            Template Design Studio & Version History
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Immutable versioning: editing a template never alters historical certificates.
          </p>
        </div>
      </div>

      {/* Template Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from(groupedByType.entries()).map(([type, list]) => {
          const active = list.find((t) => t.is_active) || list[0];
          const color = active?.design_config.primary_color || '#00f0ff';

          return (
            <div
              key={type}
              className="bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-5 backdrop-blur-md shadow-lg flex flex-col justify-between space-y-4 transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="w-3.5 h-3.5 rounded-full shadow-[0_0_8px]"
                    style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
                  />
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Active: v{active?.version || 1}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white capitalize mt-2">
                  {type.replace('_', ' ')}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {active?.design_config.title || 'Standard Template'}
                </p>

                <div className="text-[10px] text-slate-500 font-mono mt-2">
                  Total Versions: {list.length}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenEditor(type)}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold text-xs border border-slate-700 hover:border-cyan-500/40 transition-colors flex items-center justify-center gap-1.5"
              >
                <Palette size={14} /> Edit & Create Draft Diff →
              </button>
            </div>
          );
        })}
      </div>

      {/* SIDE-BY-SIDE DIFF MODAL */}
      {editingType && currentActiveTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl max-w-7xl w-full my-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs font-mono uppercase text-cyan-400 font-bold tracking-wider">
                  Template Version Diff Comparison
                </span>
                <h2 className="text-2xl font-black text-white capitalize">
                  Editing: {editingType.replace('_', ' ')}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingType(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Cancel ✕
              </button>
            </div>

            {/* Design Controls Form */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div>
                <label className="text-slate-400 uppercase font-bold tracking-wider mb-1 block">
                  Title
                </label>
                <input
                  type="text"
                  value={draftConfig.title}
                  onChange={(e) =>
                    setDraftConfig({ ...draftConfig, title: e.target.value })
                  }
                  className="gcl-input w-full py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="text-slate-400 uppercase font-bold tracking-wider mb-1 block">
                  Badge Text
                </label>
                <input
                  type="text"
                  value={draftConfig.accent_badge || ''}
                  onChange={(e) =>
                    setDraftConfig({
                      ...draftConfig,
                      accent_badge: e.target.value,
                    })
                  }
                  className="gcl-input w-full py-1.5 text-xs font-mono uppercase"
                />
              </div>

              <div>
                <label className="text-slate-400 uppercase font-bold tracking-wider mb-1 block">
                  Subtitle / Citation
                </label>
                <input
                  type="text"
                  value={draftConfig.subtitle || ''}
                  onChange={(e) =>
                    setDraftConfig({
                      ...draftConfig,
                      subtitle: e.target.value,
                    })
                  }
                  className="gcl-input w-full py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="text-slate-400 uppercase font-bold tracking-wider mb-1 block">
                  Primary Neon Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draftConfig.primary_color}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        primary_color: e.target.value,
                      })
                    }
                    className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={draftConfig.primary_color}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        primary_color: e.target.value,
                      })
                    }
                    className="gcl-input flex-1 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 uppercase font-bold tracking-wider mb-1 block">
                  Secondary Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draftConfig.secondary_color}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        secondary_color: e.target.value,
                      })
                    }
                    className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={draftConfig.secondary_color}
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        secondary_color: e.target.value,
                      })
                    }
                    className="gcl-input flex-1 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-400 uppercase font-bold tracking-wider mb-1 block">
                  Signatures
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={draftConfig.signature_name_1 || ''}
                    placeholder="Signer 1"
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        signature_name_1: e.target.value,
                      })
                    }
                    className="gcl-input py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    value={draftConfig.signature_name_2 || ''}
                    placeholder="Signer 2"
                    onChange={(e) =>
                      setDraftConfig({
                        ...draftConfig,
                        signature_name_2: e.target.value,
                      })
                    }
                    className="gcl-input py-1.5 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* SIDE-BY-SIDE DIFF COMPARISON PREVIEW */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left Pane: Version N (Current / Active) */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981]" />
                    <span className="font-bold text-white text-sm">
                      Version {currentActiveTemplate.version} (Current Active)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40">
                    LIVE PRODUCTION
                  </span>
                </div>

                <div className="overflow-hidden flex justify-center py-2">
                  <div
                    style={{
                      width: 1000 * 0.48,
                      height: 707 * 0.48,
                      position: 'relative',
                    }}
                  >
                    <CertificatePreview
                      recipientName={SAMPLE_RECIPIENT}
                      certificateType={editingType}
                      certificateId="GCL26-SAMPLE-CURRENT"
                      designConfig={currentActiveTemplate.design_config}
                      templateVersion={currentActiveTemplate.version}
                      teamName={SAMPLE_TEAM}
                      scale={0.48}
                    />
                  </div>
                </div>
              </div>

              {/* Right Pane: Version N+1 (Draft) */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/40 shadow-[0_0_20px_rgba(0,240,255,0.1)]">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f0ff]" />
                    <span className="font-bold text-white text-sm">
                      Version {nextVersionNumber} (Draft Preview)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/40 animate-pulse">
                    UNPUBLISHED DRAFT
                  </span>
                </div>

                <div className="overflow-hidden flex justify-center py-2">
                  <div
                    style={{
                      width: 1000 * 0.48,
                      height: 707 * 0.48,
                      position: 'relative',
                    }}
                  >
                    <CertificatePreview
                      recipientName={SAMPLE_RECIPIENT}
                      certificateType={editingType}
                      certificateId="GCL26-SAMPLE-DRAFT"
                      designConfig={draftConfig}
                      templateVersion={nextVersionNumber}
                      teamName={SAMPLE_TEAM}
                      scale={0.48}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800">
              <p className="text-xs text-slate-400">
                Publishing will make <strong className="text-white">v{nextVersionNumber}</strong> the active template. Previously issued certificates will continue pointing to their original template version.
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingType(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                >
                  Discard Draft
                </button>

                <button
                  type="button"
                  onClick={handlePublishNewVersion}
                  disabled={isPublishing}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs shadow-[0_0_20px_rgba(0,240,255,0.4)] flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isPublishing ? (
                    'Publishing...'
                  ) : (
                    <>
                      <Sparkles size={15} /> Publish New Version (v{nextVersionNumber})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
