import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Question, Round } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Modal } from '../../components/ui/Modal';

export function AdminQuestionsPage() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<string>('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Question Form State
  const [questionText, setQuestionText] = useState('');
  const [opt0, setOpt0] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');
  const [opt3, setOpt3] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [points, setPoints] = useState(10);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadQuizRounds() {
      const { data } = await supabase
        .from('rounds')
        .select('*')
        .eq('type', 'quiz')
        .order('sort_order', { ascending: true });

      if (data && data.length > 0) {
        setRounds(data as Round[]);
        setSelectedRoundId(data[0].id);
      }
      setLoading(false);
    }
    loadQuizRounds();
  }, []);

  useEffect(() => {
    if (selectedRoundId) {
      loadQuestions(selectedRoundId);
    }
  }, [selectedRoundId]);

  async function loadQuestions(roundId: string) {
    const { data } = await supabase
      .from('questions')
      .select('*')
      .eq('round_id', roundId)
      .order('sort_order', { ascending: true });

    if (data) setQuestions(data as Question[]);
  }

  async function handleCreateQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRoundId || !questionText.trim()) return;

    setSaving(true);
    try {
      await supabase.from('questions').insert({
        round_id: selectedRoundId,
        question_text: questionText.trim(),
        options: [opt0, opt1, opt2, opt3],
        correct_answer: correctAnswer,
        points,
        difficulty,
        sort_order: questions.length + 1,
        status: 'active',
      });

      setIsModalOpen(false);
      setQuestionText('');
      setOpt0('');
      setOpt1('');
      setOpt2('');
      setOpt3('');
      await loadQuestions(selectedRoundId);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading quiz question bank..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Quiz Question Bank</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Curate algorithmic, systems, and architectural multiple-choice items.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <select
            className="form-select"
            value={selectedRoundId}
            onChange={(e) => setSelectedRoundId(e.target.value)}
          >
            {rounds.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>

          <Button variant="primary" onClick={() => setIsModalOpen(true)}>
            + Add Question
          </Button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="gcl-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>No.</th>
              <th>Question Prompt</th>
              <th>Difficulty</th>
              <th>Points</th>
              <th>Correct Option</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q, idx) => (
              <tr key={q.id}>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold)' }}>
                  #{idx + 1}
                </td>
                <td style={{ fontWeight: 500, maxWidth: '440px' }}>
                  <div>{q.question_text}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {q.options.map((opt) => (typeof opt === 'string' ? opt : opt.text)).join(' | ')}
                  </div>
                </td>
                <td>
                  <Badge variant={q.difficulty === 'hard' ? 'eliminated' : q.difficulty === 'medium' ? 'gold' : 'subtle'}>
                    {q.difficulty.toUpperCase()}
                  </Badge>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)' }}>{q.points}</td>
                <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--status-qualified)', fontWeight: 700 }}>
                  {(() => {
                    const opt = q.options[Number(q.correct_answer ?? 0)];
                    const optStr = typeof opt === 'string' ? opt : opt?.text || '—';
                    return `Opt ${String.fromCharCode(65 + Number(q.correct_answer ?? 0))}: ${optStr}`;
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Question Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add MCQ Evaluation Question">
        <form onSubmit={handleCreateQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Question Text</label>
            <textarea
              className="form-textarea"
              required
              rows={3}
              placeholder="Algorithmic problem statement or code snippet..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Option A</label>
              <input className="form-input" required value={opt0} onChange={(e) => setOpt0(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Option B</label>
              <input className="form-input" required value={opt1} onChange={(e) => setOpt1(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Option C</label>
              <input className="form-input" required value={opt2} onChange={(e) => setOpt2(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Option D</label>
              <input className="form-input" required value={opt3} onChange={(e) => setOpt3(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Correct Option</label>
              <select className="form-select" value={correctAnswer} onChange={(e) => setCorrectAnswer(parseInt(e.target.value, 10))}>
                <option value={0}>Option A</option>
                <option value={1}>Option B</option>
                <option value={2}>Option C</option>
                <option value={3}>Option D</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Points</label>
              <input
                type="number"
                className="form-input"
                required
                value={points}
                onChange={(e) => setPoints(parseInt(e.target.value, 10))}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Difficulty</label>
              <select className="form-select" value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={saving}>
              Add Question
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
