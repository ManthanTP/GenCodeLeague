import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Team, TeamStatus, Edition, Profile } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';

interface TeamWithLeader extends Team {
  leader?: Profile;
}

export function AdminTeamsPage() {
  const [teams, setTeams] = useState<TeamWithLeader[]>([]);
  const [editions, setEditions] = useState<Edition[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedEdition, setSelectedEdition] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [teamName, setTeamName] = useState('');

  // Assign Leader Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [teamToAssign, setTeamToAssign] = useState<string | null>(null);
  const [assignLeaderId, setAssignLeaderId] = useState('');
  const [college, setCollege] = useState('');
  const [department, setDepartment] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [startingBudget, setStartingBudget] = useState('1000');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const [edRes, profRes] = await Promise.all([
        supabase.from('editions').select('*').order('year', { ascending: false }),
        supabase.from('profiles').select('*').order('full_name', { ascending: true }),
      ]);

      if (edRes.data && edRes.data.length > 0) {
        setEditions(edRes.data as Edition[]);
        const cur = edRes.data.find((e) => e.is_current) || edRes.data[0];
        setSelectedEdition(cur.id);
      }
      if (profRes.data) {
        setProfiles(profRes.data as Profile[]);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (!selectedEdition) return;
    loadTeams();
  }, [selectedEdition]);

  async function loadTeams() {
    setLoading(true);
    const { data } = await supabase
      .from('teams')
      .select('*, leader:team_leader_id (*)')
      .eq('edition_id', selectedEdition)
      .order('score', { ascending: false });

    if (data) setTeams(data as unknown as TeamWithLeader[]);
    setLoading(false);
  }

  async function handleUpdateStatus(teamId: string, newStatus: TeamStatus) {
    await supabase.from('teams').update({ status: newStatus }).eq('id', teamId);
    await loadTeams();
  }

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim() || !selectedEdition) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const budgetNum = parseFloat(startingBudget) || 1000;
      const { error: insErr } = await supabase.from('teams').insert({
        edition_id: selectedEdition,
        name: teamName.trim(),
        college: college.trim() || null,
        department: department.trim() || null,
        team_leader_id: leaderId || null,
        starting_budget: budgetNum,
        remaining_budget: budgetNum,
        total_spent: 0,
        score: 0,
        status: 'approved',
        contact_email: contactEmail.trim() || null,
        contact_phone: contactPhone.trim() || null,
      });

      if (insErr) throw insErr;

      // If a leader was assigned, ensure their profile role is team_leader
      if (leaderId) {
        await supabase.from('profiles').update({ role: 'team_leader' }).eq('id', leaderId);
      }

      setIsModalOpen(false);
      setTeamName('');
      setCollege('');
      setDepartment('');
      setLeaderId('');
      setStartingBudget('1000');
      setContactEmail('');
      setContactPhone('');
      await loadTeams();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create squad.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAssignLeader(e: React.FormEvent) {
    e.preventDefault();
    if (!teamToAssign || !assignLeaderId) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      // 1. Update the team with the new leader
      const { error: updErr } = await supabase
        .from('teams')
        .update({ team_leader_id: assignLeaderId })
        .eq('id', teamToAssign);

      if (updErr) throw updErr;

      // 2. Ensure the user's role is elevated to team_leader
      await supabase
        .from('profiles')
        .update({ role: 'team_leader' })
        .eq('id', assignLeaderId);

      setIsAssignModalOpen(false);
      setTeamToAssign(null);
      setAssignLeaderId('');
      await loadTeams();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to assign leader.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Team & Squad Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Enroll competitive squads, assign team leaders, manage auction budgets, and monitor qualifications.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select
            className="form-select"
            value={selectedEdition}
            onChange={(e) => setSelectedEdition(e.target.value)}
          >
            {editions.map((ed) => (
              <option key={ed.id} value={ed.id}>
                {ed.name} ({ed.year})
              </option>
            ))}
          </select>

          <Button variant="primary" onClick={() => { setIsModalOpen(true); setErrorMsg(null); }}>
            + Enroll Squad
          </Button>
        </div>
      </div>

      {loading && teams.length === 0 ? (
        <LoadingSpinner size="lg" text="Loading squads..." />
      ) : (
        <div className="table-responsive">
          <table className="gcl-table">
            <thead>
              <tr>
                <th>Squad / Institution</th>
                <th>Team Leader</th>
                <th>Budget (Rem / Init)</th>
                <th>Score / Rank</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                    No squads enrolled for this season yet. Click "+ Enroll Squad" to register one.
                  </td>
                </tr>
              ) : (
                teams.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>{t.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {t.college || 'Institution Configured'} {t.department ? `&bull; ${t.department}` : ''}
                      </div>
                    </td>
                    <td>
                      {t.leader ? (
                        <div>
                          <div style={{ fontWeight: 600 }}>{t.leader.full_name || 'Assigned Leader'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.leader.email}</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', fontStyle: 'italic' }}>
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--gold)' }}>
                        {t.remaining_budget ?? t.starting_budget ?? 1000} cr
                      </div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        of {t.starting_budget ?? 1000} cr
                      </div>
                    </td>
                    <td>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {t.score ?? 0} pts
                      </div>
                      {t.rank && (
                        <div style={{ fontSize: '0.6875rem', color: 'var(--gold)' }}>
                          Rank #{t.rank}
                        </div>
                      )}
                    </td>
                    <td>
                      <Badge
                        variant={
                          t.status === 'qualified'
                            ? 'qualified'
                            : t.status === 'winner'
                            ? 'gold'
                            : t.status === 'eliminated'
                            ? 'eliminated'
                            : 'subtle'
                        }
                      >
                        {t.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {t.status !== 'approved' && (
                          <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(t.id, 'approved')}>
                            Approve
                          </Button>
                        )}
                        {t.status !== 'qualified' && (
                          <Button variant="primary" size="sm" onClick={() => handleUpdateStatus(t.id, 'qualified')}>
                            Qualify
                          </Button>
                        )}
                        {t.status !== 'eliminated' && (
                          <Button variant="danger" size="sm" onClick={() => handleUpdateStatus(t.id, 'eliminated')}>
                            Eliminate
                          </Button>
                        )}
                        {!t.leader && (
                          <Button variant="outline" size="sm" onClick={() => { setTeamToAssign(t.id); setAssignLeaderId(''); setIsAssignModalOpen(true); setErrorMsg(null); }}>
                            Assign Leader
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Enroll Squad Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Enroll Competitive Squad">
        <form onSubmit={handleCreateTeam} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {errorMsg && (
            <div style={{ padding: '0.75rem', background: 'var(--status-eliminated-bg)', color: 'var(--status-eliminated)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
              {errorMsg}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Squad / Team Name *</label>
            <input
              type="text"
              className="form-input"
              required
              placeholder="e.g. AlgoWarriors / CyberKnights"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">College / University</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Jain University"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Department / Branch</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Computer Science"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Assigned Team Leader (User Account)</label>
            <select
              className="form-select"
              value={leaderId}
              onChange={(e) => setLeaderId(e.target.value)}
            >
              <option value="">-- Assign Later / No Leader Selected --</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name || p.email} ({p.role.toUpperCase()})
                </option>
              ))}
            </select>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
              Assigning a user automatically links this team and elevates their role to team_leader.
            </span>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Starting Auction Budget (Credits)</label>
            <input
              type="number"
              className="form-input"
              required
              value={startingBudget}
              onChange={(e) => setStartingBudget(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Contact Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="leader@college.edu"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Contact Phone</label>
              <input
                type="tel"
                className="form-input"
                placeholder="+91 9876543210"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Enroll Squad
            </Button>
          </div>
        </form>
      </Modal>

      {/* Assign Leader Modal */}
      <Modal isOpen={isAssignModalOpen} onClose={() => setIsAssignModalOpen(false)} title="Assign Team Leader">
        <form onSubmit={handleAssignLeader} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {errorMsg && (
            <div style={{ padding: '0.75rem', background: 'var(--status-eliminated-bg)', color: 'var(--status-eliminated)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
              {errorMsg}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Select User Account</label>
            <select
              className="form-select"
              value={assignLeaderId}
              onChange={(e) => setAssignLeaderId(e.target.value)}
              required
            >
              <option value="">-- Select a User --</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name || p.email} ({p.role.toUpperCase()})
                </option>
              ))}
            </select>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
              This will link the selected user account to the team and grant them Team Leader permissions.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setIsAssignModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={submitting}>
              Assign Leader
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
