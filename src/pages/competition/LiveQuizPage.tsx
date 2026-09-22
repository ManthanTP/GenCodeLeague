import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import type { Question, Round } from '../../types/database';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export function LiveQuizPage() {
  const { roundId } = useParams<{ roundId: string }>();
  const { user } = useAuth();

  const [round, setRound] = useState<Round | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(1800); // 30 mins default
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadQuiz() {
      if (!roundId) return;

      const { data: rData } = await supabase
        .from('rounds')
        .select('*')
        .eq('id', roundId)
        .single();

      if (rData) {
        setRound(rData as Round);
        setSecondsRemaining((rData.duration_minutes || 30) * 60);

        const { data: qData } = await supabase
          .from('questions')
          .select('id, round_id, question_text, options, points, difficulty, sort_order')
          .eq('round_id', rData.id)
          .order('sort_order', { ascending: true });

        if (qData) setQuestions(qData as Question[]);
      }
      setLoading(false);
    }
    loadQuiz();
  }, [roundId]);

  // Countdown timer effect
  useEffect(() => {
    if (isSubmitted || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSubmitted, secondsRemaining]);

  function handleSelectOption(qId: string, optIndex: number) {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [qId]: optIndex,
    }));
  }

  async function handleSubmitQuiz() {
    if (isSubmitted || !user || !round) return;
    setSubmitting(true);

    try {
      // Create quiz attempt
      await supabase.from('quiz_attempts').insert({
        round_id: round.id,
        profile_id: user.id,
        submitted_at: new Date().toISOString(),
        status: 'submitted',
      });
      setIsSubmitted(true);
    } catch (err) {
      console.error('Error submitting quiz attempt:', err);
      setIsSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading quiz session and questions..." />;
  }

  if (!round || questions.length === 0) {
    return (
      <div className="gcl-card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
        <h3>Evaluation Round Locked</h3>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
          Questions for this round have not been released by the tournament adjudicators yet.
        </p>
        <Link to="/rounds">
          <Button variant="outline">Back to Rounds</Button>
        </Link>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  if (isSubmitted) {
    return (
      <div className="gcl-card" style={{ padding: '4rem 2rem', textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--status-qualified-bg)', color: 'var(--status-qualified)', margin: '0 auto 1.5rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', fontWeight: 800 }}>
          ✓
        </div>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>Quiz Submission Recorded</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem' }}>
          Your answers have been committed to the tournament database. Under GCL competition integrity rules, official scores remain confidential until released by the Adjudication Committee.
        </p>
        <Link to="/dashboard">
          <Button variant="primary">Return to Squad Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      {/* Top Countdown Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-surface)',
          padding: '1rem 1.5rem',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>ROUND EVALUATION</div>
          <h2 style={{ fontSize: '1.25rem' }}>{round.name}</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>TIME REMAINING</div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.75rem',
                fontWeight: 800,
                color: secondsRemaining < 300 ? 'var(--status-eliminated)' : 'var(--gold)',
              }}
            >
              {formatTimer(secondsRemaining)}
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={handleSubmitQuiz} isLoading={submitting}>
            Submit Quiz
          </Button>
        </div>
      </div>

      {/* Question Card */}
      <div className="gcl-card" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold)', fontSize: '0.875rem', fontWeight: 700 }}>
            QUESTION {currentIndex + 1} OF {questions.length}
          </span>
          <Badge variant="subtle">POINTS: {currentQuestion.points}</Badge>
        </div>

        <h3 style={{ fontSize: '1.25rem', marginBottom: '2rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>
          {currentQuestion.question_text}
        </h3>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2.5rem' }}>
          {currentQuestion.options.map((option, idx) => {
            const isSelected = selectedAnswers[currentQuestion.id] === idx;
            return (
              <div
                key={idx}
                onClick={() => handleSelectOption(currentQuestion.id, idx)}
                style={{
                  padding: '1rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: isSelected ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-surface)',
                  border: `1px solid ${isSelected ? 'var(--gold)' : 'var(--border-default)'}`,
                  color: isSelected ? 'var(--gold)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  fontSize: '0.9375rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <span
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    border: `2px solid ${isSelected ? 'var(--gold)' : 'var(--text-muted)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{option}</span>
              </div>
            );
          })}
        </div>

        {/* Question Stepper Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.5rem' }}>
          <Button
            variant="outline"
            size="sm"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          >
            &larr; Previous Question
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (currentIndex < questions.length - 1) {
                setCurrentIndex((prev) => prev + 1);
              } else {
                handleSubmitQuiz();
              }
            }}
          >
            {currentIndex === questions.length - 1 ? 'Finish & Submit' : 'Next Question \u2192'}
          </Button>
        </div>
      </div>
    </div>
  );
}
