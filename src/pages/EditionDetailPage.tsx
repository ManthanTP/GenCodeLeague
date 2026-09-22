import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Edition, Team, Round } from '../types/database';
import { Badge } from '../components/ui/Badge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Button } from '../components/ui/Button';

export function EditionDetailPage() {
  const { year } = useParams<{ year: string }>();
  const [edition, setEdition] = useState<Edition | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEditionDetails() {
      if (!year) return;
      const { data: edData } = await supabase
        .from('editions')
        .select('*')
        .eq('year', parseInt(year, 10))
        .single();

      if (edData) {
        setEdition(edData as Edition);

        // Fetch teams
        const { data: teamData } = await supabase
          .from('teams')
          .select('*')
          .eq('edition_id', edData.id);
        if (teamData) setTeams(teamData as Team[]);

        // Fetch rounds
        const { data: roundData } = await supabase
          .from('rounds')
          .select('*')
          .eq('edition_id', edData.id)
          .order('sort_order', { ascending: true });
        if (roundData) setRounds(roundData as Round[]);
      }
      setLoading(false);
    }
    fetchEditionDetails();
  }, [year]);

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <LoadingSpinner size="lg" text={`Loading Season ${year}...`} />
      </div>
    );
  }

  if (!edition) {
    return (
      <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h2>Season Not Found</h2>
        <p style={{ margin: '1rem 0 2rem 0', color: 'var(--text-secondary)' }}>
          No records exist for Gen Code League {year}.
        </p>
        <Link to="/editions">
          <Button variant="outline">Back to Editions</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <Link to="/editions" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            &larr; All Editions
          </Link>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <Badge variant={edition.is_current ? 'live' : 'subtle'} pulse={edition.is_current}>
            {edition.is_current ? 'CURRENT EDITION' : edition.status.toUpperCase()}
          </Badge>
        </div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{edition.name}</h1>
        <p style={{ maxWidth: '700px', color: 'var(--text-secondary)', fontSize: '1.125rem', lineHeight: 1.6 }}>
          {edition.description}
        </p>

        <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem', flexWrap: 'wrap', fontSize: '0.875rem' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Competition Date: </span>
            <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{edition.event_date || 'TBA'}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Venue: </span>
            <strong style={{ color: 'var(--text-primary)' }}>{edition.venue || 'Digital Arena'}</strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Registration: </span>
            <strong style={{ color: 'var(--gold)' }}>{edition.registration_status.toUpperCase()}</strong>
          </div>
        </div>
      </div>

      {/* Rounds in this Edition */}
      <section>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>Championship Rounds</h2>
        {rounds.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {rounds.map((round) => (
              <div key={round.id} className="gcl-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <Badge variant="subtle">TYPE: {round.type.toUpperCase()}</Badge>
                  <Badge variant={round.status === 'live' ? 'live' : 'subtle'} pulse={round.status === 'live'}>
                    {round.status.toUpperCase()}
                  </Badge>
                </div>
                <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>{round.name}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{round.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="gcl-card" style={{ padding: '2rem', color: 'var(--text-secondary)' }}>
            Official round configurations for this edition will be announced prior to event kickoff.
          </div>
        )}
      </section>

      {/* Enrolled Teams */}
      <section>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.25rem' }}>Registered Squads & Teams</h2>
        {teams.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem' }}>
            {teams.map((team) => (
              <div key={team.id} className="gcl-card">
                <h4 style={{ fontSize: '1.125rem', marginBottom: '0.25rem' }}>{team.name}</h4>
                <Badge variant={team.status === 'qualified' ? 'qualified' : team.status === 'eliminated' ? 'eliminated' : 'subtle'}>
                  {team.status.toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="gcl-card" style={{ padding: '2rem', color: 'var(--text-secondary)' }}>
            Team registrations are currently being processed by tournament adjudicators.
          </div>
        )}
      </section>
    </div>
  );
}
