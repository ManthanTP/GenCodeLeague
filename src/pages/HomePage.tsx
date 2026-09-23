import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Edition, Announcement, Team, EventState } from '../types/database';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export function HomePage() {
  const [currentEdition, setCurrentEdition] = useState<Edition | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [stats, setStats] = useState({ teamsCount: 0, participantsCount: 0, roundsCount: 0 });
  const [eventState, setEventState] = useState<EventState | null>(null);

  useEffect(() => {
    async function loadHomeData() {
      // 1. Fetch current edition
      const { data: editionData } = await supabase
        .from('editions')
        .select('*')
        .eq('is_current', true)
        .single();

      if (editionData) {
        setCurrentEdition(editionData as Edition);

        // Fetch teams for current edition
        const { data: teamsData, count: teamsCount } = await supabase
          .from('teams')
          .select('*', { count: 'exact' })
          .eq('edition_id', editionData.id)
          .limit(6);

        if (teamsData) setTeams(teamsData as Team[]);

        // Fetch announcements for current edition
        const { data: annData } = await supabase
          .from('announcements')
          .select('*')
          .eq('edition_id', editionData.id)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(3);

        if (annData) setAnnouncements(annData as Announcement[]);

        // Fetch rounds count
        const { count: roundsCount } = await supabase
          .from('rounds')
          .select('*', { count: 'exact', head: true })
          .eq('edition_id', editionData.id);

        // Fetch participants count
        const { count: participantsCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        setStats({
          teamsCount: teamsCount || 0,
          participantsCount: participantsCount || 0,
          roundsCount: roundsCount || 0,
        });

        // Fetch initial event state
        const { data: stateData } = await supabase
          .from('event_state')
          .select('*')
          .eq('edition_id', editionData.id)
          .maybeSingle();

        if (stateData) setEventState(stateData as EventState);
      }
    }

    loadHomeData();

    const channel = supabase
      .channel('home-event-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'event_state' }, (payload) => {
        setEventState(payload.new as EventState);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5rem', paddingBottom: '4rem' }}>
      {/* Hero Section */}
      <section
        style={{
          padding: '5rem 0 3rem 0',
          position: 'relative',
          overflow: 'hidden',
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(34, 211, 238, 0.15), transparent 70%)',
        }}
      >
        <div className="container" style={{ textAlign: 'center', maxWidth: '840px' }}>
          {eventState?.state === 'LIVE' || eventState?.state === 'ROUND_ACTIVE' ? (
            <div style={{ marginBottom: '3rem', padding: '2rem', background: 'var(--bg-elevated)', border: '2px solid var(--accent-red)', borderRadius: 'var(--radius-xl)' }}>
              <Badge variant="live" pulse>EVENT IS LIVE NOW</Badge>
              <h2 style={{ fontSize: '2rem', marginTop: '1rem', marginBottom: '1rem' }}>
                {eventState.banner_message || 'The competition is currently active.'}
              </h2>
              <Link to="/team/competition">
                <Button variant="primary" size="lg">Enter Live Arena &rarr;</Button>
              </Link>
            </div>
          ) : null}

          <div style={{ display: 'inline-flex', marginBottom: '1.5rem' }}>
            <Badge variant="primary" pulse>
              GEN CODE LEAGUE {currentEdition?.year || 2026} &bull; REGISTRATION ACTIVE
            </Badge>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 4rem)',
              lineHeight: 1.1,
              marginBottom: '1.5rem',
              letterSpacing: '-0.03em',
            }}
          >
            The Permanent Competitive Coding & Technology League
          </h1>

          <p
            style={{
              fontSize: '1.25rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: '2.5rem',
              maxWidth: '680px',
              marginInline: 'auto',
            }}
          >
            High-stakes technical elimination rounds, real-time team auctions, engineering challenges, and cryptographically verified league credentials.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/login?mode=signup">
              <Button variant="primary" size="lg">
                Register for GCL {currentEdition?.year || 2026}
              </Button>
            </Link>
            <Link to="/leaderboard">
              <Button variant="secondary" size="lg">
                View Live Leaderboard
              </Button>
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '1.5rem',
              marginTop: '4rem',
              padding: '1.75rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl)',
            }}
          >
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                {stats.teamsCount > 0 ? stats.teamsCount : '24'}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Competitive Teams
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {stats.participantsCount > 0 ? stats.participantsCount : '120+'}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Engineers Enrolled
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 700, color: 'var(--status-live)' }}>
                {stats.roundsCount > 0 ? stats.roundsCount : '4'}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Championship Rounds
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 700, color: 'var(--status-qualified)' }}>
                100%
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Verified Credentials
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Current Edition Spotlight */}
      <section className="container">
        <div
          style={{
            background: 'linear-gradient(180deg, var(--bg-card) 0%, var(--bg-surface) 100%)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-xl)',
            padding: '2.5rem',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2rem' }}>
            <div>
              <Badge variant="live" pulse>ACTIVE EDITION SPOTLIGHT</Badge>
              <h2 style={{ fontSize: '2rem', marginTop: '0.75rem', marginBottom: '0.5rem' }}>
                {currentEdition?.name || 'Gen Code League 2026'}
              </h2>
              <p style={{ maxWidth: '600px', color: 'var(--text-secondary)' }}>
                {currentEdition?.description || 'The premier inter-collegiate competitive technology format combining speed coding, tactical auctions, and engineering sprints.'}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Event Date & Venue</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.125rem', color: 'var(--accent-cyan)', fontWeight: 600, marginTop: '0.25rem' }}>
                {currentEdition?.event_date || 'October 15, 2026'}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {currentEdition?.venue || 'Main Auditorium & Digital Arena'}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            <div className="gcl-card">
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>STAGE 01</div>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Elimination Quiz</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Timed high-precision algorithmic, systems, and logic questions. Automated scoring and tie-breaking protocols.
              </p>
            </div>
            <div className="gcl-card">
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>STAGE 02</div>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Team Auction</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Captains manage virtual team budgets to bid for engineering specialists, technology stacks, and strategic modifiers.
              </p>
            </div>
            <div className="gcl-card">
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>STAGE 03</div>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Sprint Hack</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Live problem statements requiring rapid architecture, clean codebases, and robust production deployments.
              </p>
            </div>
            <div className="gcl-card">
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>STAGE 04</div>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Grand Finale</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Championship showdown between top ranked squads. Instant live scoring and trophy presentation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Announcements Ticker / Grid */}
      <section className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)' }}>League Announcements</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Official updates and tournament broadcast notices</p>
          </div>
          <Link to="/announcements">
            <Button variant="outline" size="sm">View All Updates</Button>
          </Link>
        </div>

        {announcements.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {announcements.map((ann) => (
              <div key={ann.id} className="gcl-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <Badge variant="live">OFFICIAL</Badge>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {new Date(ann.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h4 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>{ann.title}</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{ann.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="gcl-card" style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
              Registration is currently open for GCL 2026. Round guidelines and technical briefings will be published here.
            </p>
          </div>
        )}
      </section>

      {/* Verification Direct Feature Callout */}
      <section className="container">
          <div
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            padding: '2.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '2rem',
          }}
        >
          <div style={{ maxWidth: '600px' }}>
            <Badge variant="primary">CREDENTIAL INTEGRITY</Badge>
            <h2 style={{ fontSize: '1.75rem', marginTop: '0.75rem', marginBottom: '0.75rem' }}>
              Public Certificate Verification Engine
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
              Every certificate issued by Gen Code League carries a unique backend-generated identifier and QR code. Anyone can independently verify the recipient, team affiliation, and achievement tier.
            </p>
          </div>
          <div>
            <Link to="/verify/check">
              <Button variant="primary" size="lg">
                Verify Certificate ID &rarr;
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
