import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { TeamMember } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function TeamMembersPage() {
  const { team } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Add/Edit Member Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [fullName, setFullName] = useState('');
  const [usn, setUsn] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [college, setCollege] = useState('');
  const [department, setDepartment] = useState('');
  const [semester, setSemester] = useState('');
  const [isLeader, setIsLeader] = useState(false);

  useEffect(() => {
    loadMembers();
  }, [team?.id]);

  async function loadMembers() {
    if (!team?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', team.id)
        .order('joined_at', { ascending: true });

      if (data) setMembers(data as TeamMember[]);
    } catch (err) {
      console.error('Failed to load team members:', err);
    } finally {
      setLoading(false);
    }
  }

  function openAddModal() {
    setEditingMember(null);
    setFullName('');
    setUsn('');
    setEmail('');
    setPhone('');
    setCollege(team?.college || '');
    setDepartment(team?.department || '');
    setSemester('');
    setIsLeader(false);
    setModalOpen(true);
  }

  function openEditModal(m: TeamMember) {
    setEditingMember(m);
    setFullName(m.full_name);
    setUsn(m.usn || '');
    setEmail(m.email || '');
    setPhone(m.phone || '');
    setCollege(m.college || '');
    setDepartment(m.department || '');
    setSemester(m.semester || '');
    setIsLeader(m.is_leader);
    setModalOpen(true);
  }

  async function handleSaveMember(e: React.FormEvent) {
    e.preventDefault();
    if (!team?.id || !fullName.trim()) return;

    setActionLoading(true);
    try {
      if (editingMember) {
        // Update existing member record
        const { error } = await supabase
          .from('team_members')
          .update({
            full_name: fullName.trim(),
            usn: usn.trim() || null,
            email: email.trim() || null,
            phone: phone.trim() || null,
            college: college.trim() || null,
            department: department.trim() || null,
            semester: semester.trim() || null,
            is_leader: isLeader,
            role: isLeader ? 'team_leader' : 'member',
          })
          .eq('id', editingMember.id);

        if (error) throw error;
      } else {
        // Insert new member record (PRD: pure record, no auth user)
        const { error } = await supabase
          .from('team_members')
          .insert({
            team_id: team.id,
            full_name: fullName.trim(),
            usn: usn.trim() || null,
            email: email.trim() || null,
            phone: phone.trim() || null,
            college: college.trim() || null,
            department: department.trim() || null,
            semester: semester.trim() || null,
            is_leader: isLeader,
            role: isLeader ? 'team_leader' : 'member',
            status: 'active',
          });

        if (error) throw error;
      }

      setModalOpen(false);
      await loadMembers();
    } catch (err: any) {
      alert(`Error saving squad member: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteMember(memberId: string) {
    if (!confirm('Are you sure you want to remove this member from your squad?')) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      await loadMembers();
    } catch (err: any) {
      alert(`Failed to delete member: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="container" style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}>
        <LoadingSpinner size="lg" text="Loading Team Roster..." />
      </div>
    );
  }

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontFamily: 'var(--font-display)', margin: 0 }}>
              Squad Member Records
            </h1>
            <Badge variant="gold">{team?.name || 'My Squad'}</Badge>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            PRD Compliance Notice: Individual members do not have login credentials. Members exist as official verified competitor records under your leadership.
          </p>
        </div>

        <Button variant="gold" size="md" onClick={openAddModal}>
          + Register Squad Member
        </Button>
      </div>

      {/* Members Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.125rem', fontFamily: 'var(--font-display)', margin: 0 }}>
            Registered Competitors ({members.length})
          </h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Official Roster for {team?.name}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Full Name</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>USN / ID</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Department & Sem</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Contact</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Role</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No members registered yet. Click "+ Register Squad Member" above to add your team members.
                  </td>
                </tr>
              ) : (
                members.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.875rem 1rem', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>{m.full_name}</span>
                        {m.is_leader && <Badge variant="gold">LEADER</Badge>}
                      </div>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontFamily: 'var(--font-mono)', fontSize: '0.875rem' }}>
                      {m.usn || '—'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {m.department || '—'} {m.semester && `(Sem ${m.semester})`}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                      {m.email || m.phone || '—'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                      <Badge variant={m.is_leader ? 'live' : 'subtle'}>
                        {m.role.toUpperCase()}
                      </Badge>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(m)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          style={{ color: '#ef4444' }}
                          onClick={() => handleDeleteMember(m.id)}
                          disabled={actionLoading}
                        >
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Member Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMember ? 'Edit Squad Member Record' : 'Register New Squad Member'}
      >
        <form onSubmit={handleSaveMember} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">USN / University ID</label>
              <input
                type="text"
                className="form-input"
                value={usn}
                onChange={(e) => setUsn(e.target.value)}
                placeholder="e.g. 1MS22CS045"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Semester</label>
              <input
                type="text"
                className="form-input"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder="e.g. 6"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="member@university.edu"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                className="form-input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Institution / College</label>
              <input
                type="text"
                className="form-input"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                placeholder="University Institute of Technology"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Department / Major</label>
              <input
                type="text"
                className="form-input"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Computer Science & Engineering"
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
            <input
              type="checkbox"
              id="isLeaderCheckbox"
              checked={isLeader}
              onChange={(e) => setIsLeader(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--gold)' }}
            />
            <label htmlFor="isLeaderCheckbox" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>
              Designate as Team Co-Leader / Lead Competitor
            </label>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button variant="ghost" type="button" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="gold" type="submit" isLoading={actionLoading}>
              Save Member Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
