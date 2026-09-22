import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Edition } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function AdminOverviewPage() {
  const [currentEdition, setCurrentEdition] = useState<Edition | null>(null);
  const [stats, setStats] = useState({
    teams: 0,
    participants: 0,
    rounds: 0,
    certificates: 0,
    announcements: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAdminData() {
      // Fetch active edition
      const { data: edData } = await supabase
        .from('editions')
        .select('*')
        .eq('is_current', true)
        .single();

      if (edData) {
        setCurrentEdition(edData as Edition);

        const [tCount, pCount, rCount, cCount, aCount] = await Promise.all([
          supabase.from('teams').select('*', { count: 'exact', head: true }).eq('edition_id', edData.id),
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('rounds').select('*', { count: 'exact', head: true }).eq('edition_id', edData.id),
          supabase.from('certificates').select('*', { count: 'exact', head: true }).eq('edition_id', edData.id),
          supabase.from('announcements').select('*', { count: 'exact', head: true }).eq('edition_id', edData.id),
        ]);

        setStats({
          teams: tCount.count || 0,
          participants: pCount.count || 0,
          rounds: rCount.count || 0,
          certificates: cCount.count || 0,
          announcements: aCount.count || 0,
        });
      }
      setLoading(false);
    }
    loadAdminData();
  }, []);

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading league administrative telemetry..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>League Administration Overview</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Active Season: <strong>{currentEdition?.name || 'GCL 2026'}</strong> &bull; Complete control over competition lifecycle, teams, and credentials.
        </p>
      </div>

      {/* Realtime Metric Tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        <div className="gcl-card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Enrolled Teams</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 800, color: 'var(--gold)', marginTop: '0.25rem' }}>
            {stats.teams}
          </div>
          <Link to="/admin/teams" style={{ fontSize: '0.8125rem', color: 'var(--gold)', marginTop: '0.5rem', display: 'inline-block' }}>
            Manage Teams &rarr;
          </Link>
        </div>

        <div className="gcl-card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Registered Competitors</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            {stats.participants}
          </div>
          <Link to="/admin/participants" style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'inline-block' }}>
            View Roster &rarr;
          </Link>
        </div>

        <div className="gcl-card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Tournament Rounds</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 800, color: 'var(--status-live)', marginTop: '0.25rem' }}>
            {stats.rounds}
          </div>
          <Link to="/admin/rounds" style={{ fontSize: '0.8125rem', color: 'var(--status-live)', marginTop: '0.5rem', display: 'inline-block' }}>
            Rounds Engine &rarr;
          </Link>
        </div>

        <div className="gcl-card">
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Issued Certificates</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 800, color: 'var(--status-qualified)', marginTop: '0.25rem' }}>
            {stats.certificates}
          </div>
          <Link to="/admin/certificates" style={{ fontSize: '0.8125rem', color: 'var(--status-qualified)', marginTop: '0.5rem', display: 'inline-block' }}>
            Audit Credentials &rarr;
          </Link>
        </div>
      </div>

      {/* Quick Mission-Critical Actions */}
      <div className="gcl-card" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Mission-Critical Console Links</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <Link to="/admin/editions">
            <Button variant="secondary" style={{ width: '100%', justifyContent: 'flex-start' }}>
              ⚙️ Seasons / Editions Manager
            </Button>
          </Link>
          <Link to="/admin/quiz">
            <Button variant="secondary" style={{ width: '100%', justifyContent: 'flex-start' }}>
              ⏱️ Quiz Control & Locks
            </Button>
          </Link>
          <Link to="/admin/auction">
            <Button variant="secondary" style={{ width: '100%', justifyContent: 'flex-start' }}>
              🔨 Live Auction Control Room
            </Button>
          </Link>
          <Link to="/admin/leaderboard">
            <Button variant="secondary" style={{ width: '100%', justifyContent: 'flex-start' }}>
              📊 Leaderboard Visibility & Scores
            </Button>
          </Link>
          <Link to="/admin/results">
            <Button variant="secondary" style={{ width: '100%', justifyContent: 'flex-start' }}>
              🏆 Publish Certified Results
            </Button>
          </Link>
          <Link to="/admin/announcements">
            <Button variant="secondary" style={{ width: '100%', justifyContent: 'flex-start' }}>
              📢 Broadcast Directives
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
