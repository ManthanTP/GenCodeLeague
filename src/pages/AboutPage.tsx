import { Badge } from '../components/ui/Badge';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function AboutPage() {
  return (
    <div className="container" style={{ padding: '3.5rem 1.5rem', maxWidth: '840px' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', marginBottom: '0.5rem' }}>
          <Badge variant="gold">ABOUT THE LEAGUE</Badge>
        </div>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>What is Gen Code League?</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', lineHeight: 1.6 }}>
          Gen Code League (GCL) is an elite competitive coding and technology league platform designed to benchmark engineering agility, tactical team dynamics, and systems architecture.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div className="gcl-card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            Beyond the Traditional Hackathon
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.9375rem' }}>
            Unlike standard hackathons that focus exclusively on pitches or isolated algorithmic contests, GCL is a multi-stage league format combining speed coding, tactical auctions, and engineering sprints. Teams navigate elimination rounds, manage dynamic virtual budgets during player/tech auctions, and build deployable technical systems under strict adjudicator surveillance.
          </p>
        </div>

        <div className="gcl-card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
            Permanent Season Architecture
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.9375rem' }}>
            GCL operates as a permanent platform rather than a transient event website. Every season is archived into the historical ledger, preserving player stats, team rosters, and cryptographically verified credentials that can be publicly authenticated for years to come.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <Link to="/login?mode=signup">
            <Button variant="primary">Register for Current Season</Button>
          </Link>
          <Link to="/editions">
            <Button variant="outline">Explore Past Seasons</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
