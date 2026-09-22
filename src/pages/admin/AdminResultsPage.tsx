import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Result, Team, Edition, Winner } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function AdminResultsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [currentEdition, setCurrentEdition] = useState<Edition | null>(null);
  const [loading, setLoading] = useState(true);

  // Form
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [position, setPosition] = useState(1);
  const [score, setScore] = useState(500);
  const [awardTitle, setAwardTitle] = useState('Championship Trophy & Grand League Distinction');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data: edData } = await supabase.from('editions').select('*').eq('is_current', true).single();
    if (edData) {
      setCurrentEdition(edData as Edition);
      const [teamRes, resData] = await Promise.all([
        supabase.from('teams').select('*').eq('edition_id', edData.id),
        supabase.from('results').select('*, teams:team_id (*)').eq('edition_id', edData.id).order('position', { ascending: true }),
      ]);

      if (teamRes.data && teamRes.data.length > 0) {
        setTeams(teamRes.data as Team[]);
        setSelectedTeamId(teamRes.data[0].id);
      }
      if (resData.data) setResults(resData.data as Result[]);
    }
    setLoading(false);
  }

  async function handlePublishResult(e: React.FormEvent) {
    e.preventDefault();
    if (!currentEdition || !selectedTeamId) return;

    setSaving(true);
    try {
      // 1. Insert/Update result
      await supabase.from('results').upsert({
        edition_id: currentEdition.id,
        team_id: selectedTeamId,
        position,
        score,
        status: 'published',
        published_at: new Date().toISOString(),
      });

      // 2. If position is 1, 2, or 3, induct into winners / Hall of Fame
      if (position <= 3) {
        await supabase.from('winners').upsert({
          edition_id: currentEdition.id,
          team_id: selectedTeamId,
          position,
          award: awardTitle,
        });
      }

      await loadData();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading results publisher..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Publish Certified Tournament Results</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Certify official standings and induct podium squads into the permanent Hall of Fame.
        </p>
      </div>

      <div className="gcl-card">
        <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem' }}>Certify Squad Standing</h3>
        <form onSubmit={handlePublishResult} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Select Squad</label>
              <select className="form-select" value={selectedTeamId} onChange={(e) => setSelectedTeamId(e.target.value)}>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Position / Rank</label>
              <select className="form-select" value={position} onChange={(e) => setPosition(parseInt(e.target.value, 10))}>
                <option value={1}>Position 1 (Champion)</option>
                <option value={2}>Position 2 (First Runner Up)</option>
                <option value={3}>Position 3 (Second Runner Up)</option>
                <option value={4}>Position 4 (Finalist)</option>
                <option value={5}>Position 5</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Final Score</label>
              <input
                type="number"
                className="form-input"
                required
                value={score}
                onChange={(e) => setScore(parseInt(e.target.value, 10))}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Award Title (for Hall of Fame inductees)</label>
            <input
              type="text"
              className="form-input"
              value={awardTitle}
              onChange={(e) => setAwardTitle(e.target.value)}
            />
          </div>

          <Button type="submit" variant="primary" isLoading={saving} style={{ alignSelf: 'flex-start' }}>
            Certify & Broadcast Result
          </Button>
        </form>
      </div>
    </div>
  );
}
