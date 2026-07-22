'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, CheckCircle, XCircle, Brain, Trophy, ChevronRight, Loader2, AlertTriangle, BookOpen, Lightbulb, Star } from 'lucide-react';
import { quizApi } from '@/lib/api';
import type { QuizQuestionResponse, AnswerFeedback, PerformanceReport } from '@/lib/types';
import { getScoreColor } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import AuroraBackground from '@/components/ui/AuroraBackground';
import CursorGlow from '@/components/ui/CursorGlow';
import GlassCard from '@/components/ui/GlassCard';

/* ─── Timer ──────────────────────────────────────────────────────────────────── */
function Timer({ onTick }: { onTick: (s: number) => void }) {
  const [secs, setSecs] = useState(0);
  const ref = useRef(0);
  useEffect(() => {
    ref.current = 0;
    const iv = setInterval(() => { ref.current += 1; setSecs(ref.current); onTick(ref.current); }, 1000);
    return () => clearInterval(iv);
  }, [onTick]);
  const m = Math.floor(secs / 60), s = secs % 60;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, fontFamily: 'monospace', color: secs > 120 ? '#FB7185' : '#64748B' }}>
      <Clock size={13} /> {m}:{String(s).padStart(2,'0')}
    </div>
  );
}

/* ─── Feedback Modal ─────────────────────────────────────────────────────────── */
function FeedbackModal({ fb, onNext, nextAction }: { fb: AnswerFeedback; onNext: () => void; nextAction: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(2,6,18,0.85)', backdropFilter: 'blur(32px)',
        padding: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 32 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        style={{
          maxWidth: 580, width: '100%', borderRadius: 28,
          background: 'rgba(8,14,28,0.92)',
          border: `1px solid ${fb.is_correct ? 'rgba(52,211,153,0.3)' : 'rgba(251,113,133,0.3)'}`,
          boxShadow: `0 32px 80px rgba(0,0,0,0.6), 0 0 60px ${fb.is_correct ? 'rgba(52,211,153,0.1)' : 'rgba(251,113,133,0.1)'}`,
          overflow: 'hidden',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${fb.is_correct ? '#34D399' : '#FB7185'}50, transparent)` }} />

        {/* Header */}
        <div style={{
          padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: fb.is_correct ? 'rgba(16,185,129,0.04)' : 'rgba(244,63,94,0.04)',
          display: 'flex', alignItems: 'center', gap: 16,
          flexShrink: 0,
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: fb.is_correct ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)',
            border: `1px solid ${fb.is_correct ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}`,
          }}>
            {fb.is_correct ? <CheckCircle size={22} color="#34D399" /> : <XCircle size={22} color="#FB7185" />}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: fb.is_correct ? '#34D399' : '#FB7185', letterSpacing: '-0.02em' }}>
              {fb.is_correct ? 'Correct Answer! 🎉' : 'Incorrect Answer'}
            </div>
            <div style={{ fontSize: 12, color: '#475569', marginTop: 2, fontWeight: 500 }}>{fb.topic} · {fb.concept}</div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div style={{ padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', flex: 1 }}>
          {!fb.is_correct && (
            <div style={{ padding: '14px 18px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#818CF8', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Expected Answer</div>
              <div style={{ fontSize: 14, color: '#C7D2FE', fontWeight: 600 }}>{fb.correct_answer}</div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#818CF8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              <BookOpen size={13} /> Explanation
            </div>
            <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.7, margin: 0 }}>{fb.explanation}</p>
          </div>
          {fb.memory_trick && (
            <div style={{ padding: '14px 18px', borderRadius: 16, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#FCD34D', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                <Lightbulb size={13} /> Memory Trick
              </div>
              <p style={{ fontSize: 13, color: '#FDE68A', margin: 0, lineHeight: 1.6 }}>{fb.memory_trick}</p>
            </div>
          )}
          {fb.real_world_example && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Real-World Context</div>
              <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.65, margin: 0 }}>{fb.real_world_example}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 32px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
          <motion.button
            onClick={onNext}
            whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.97 }}
            className="btn-primary"
            style={{
              width: '100%', padding: '14px', borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {nextAction === 'quiz_complete' ? <><Trophy size={16} /> View Performance Report</> : <><ChevronRight size={16} /> Next Question</>}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Report ──────────────────────────────────────────────────────────────────── */
function ReportView({ report }: { report: PerformanceReport }) {
  const chartData = [
    ...report.strong_topics.map((t) => ({ name: t.topic, accuracy: Math.round(t.accuracy), type: 'strong' })),
    ...report.weak_topics.map((t) => ({ name: t.topic, accuracy: Math.round(t.accuracy), type: 'weak' })),
  ].slice(0, 8);

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} style={{ maxWidth: 740, margin: '0 auto', padding: '48px 24px 140px' }}>
      <div style={{ textAlign: 'center', marginBottom: 44 }}>
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{ fontSize: 64, marginBottom: 16, display: 'inline-block' }}
        >
          {report.overall_score >= 80 ? '🏆' : report.overall_score >= 60 ? '📚' : '💪'}
        </motion.div>
        
        <h1 style={{ fontSize: 44, fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 8, lineHeight: 1 }}>
          <span style={{ color: getScoreColor(report.overall_score), filter: `drop-shadow(0 0 10px ${getScoreColor(report.overall_score)}40)` }}>{Math.round(report.overall_score)}%</span>
        </h1>
        
        <p style={{ color: '#64748B', fontSize: 16, fontWeight: 500 }}>
          {report.correct_answers} correct out of {report.total_questions} questions · {report.time_taken_minutes.toFixed(1)} mins study time
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'Overall Score', value: `${Math.round(report.overall_score)}%`, color: getScoreColor(report.overall_score) },
          { label: 'Avg Confidence', value: `${Math.round(report.avg_confidence)}%`, color: '#A78BFA' },
          { label: 'Recommended Study', value: `${report.recommended_study_minutes}m`, color: '#67E8F9' },
        ].map(({ label, value, color }) => (
          <GlassCard key={label} style={{ padding: '22px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color, letterSpacing: '-0.03em' }}>{value}</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 6, fontWeight: 500 }}>{label}</div>
          </GlassCard>
        ))}
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <GlassCard style={{ padding: 28, marginBottom: 32 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', marginBottom: 24 }}>Topic Breakdown Accuracy</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} layout="vertical" margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#475569', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94A3B8', fontSize: 11 }} width={140} />
              <Tooltip
                contentStyle={{ background: 'rgba(8,14,26,0.95)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, color: 'var(--text)', fontSize: 12 }}
                formatter={(v) => [`${v}%`, 'Accuracy']}
              />
              <Bar dataKey="accuracy" radius={[0, 6, 6, 0]}>
                {chartData.map((e, i) => (
                  <Cell key={i} fill={e.type === 'strong' ? '#34D399' : '#FB7185'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      )}

      {/* Recommendations */}
      {report.next_recommendations.length > 0 && (
        <GlassCard style={{ padding: 28, background: 'rgba(99,102,241,0.06)', borderColor: 'rgba(99,102,241,0.2)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#C7D2FE', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Brain size={16} color="#818CF8" /> Adaptive Study Recommendations
          </h3>
          <ul style={{ margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {report.next_recommendations.map((rec, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14, color: '#94A3B8', lineHeight: 1.65, listStyle: 'none' }}
              >
                <Star size={14} color="#818CF8" fill="#818CF8" style={{ flexShrink: 0, marginTop: 4 }} />
                <div>{rec}</div>
              </motion.li>
            ))}
          </ul>
        </GlassCard>
      )}

      {/* Back button */}
      <div style={{ textAlign: 'center', marginTop: 36 }}>
        <Link href="/quiz" style={{ textDecoration: 'none' }}>
          <motion.div
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            className="btn-ghost"
            style={{ padding: '12px 28px', borderRadius: 14 }}
          >
            Return to Quizzes
          </motion.div>
        </Link>
      </div>
    </motion.div>
  );
}

/* ─── Main Quiz Session ───────────────────────────────────────────────────────── */
export default function QuizSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params?.sessionId as string;

  const [question, setQuestion] = useState<QuizQuestionResponse | null>(null);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<AnswerFeedback | null>(null);
  const [nextAction, setNextAction] = useState<string>('next_question');
  const [adaptiveMsg, setAdaptiveMsg] = useState<string | undefined>();
  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [loadingQ, setLoadingQ] = useState(true);
  const [timeTaken, setTimeTaken] = useState(0);

  const fetchQuestion = useCallback(async () => {
    setLoadingQ(true);
    setAnswer('');
    try {
      const res = await quizApi.nextQuestion(sessionId);
      if (res.session_complete) {
        try {
          const rep = await quizApi.complete(sessionId);
          setReport(rep.report);
        } catch {
          setReportError('Report generation failed. Please try again.');
        }
      } else {
        setQuestion(res.question ?? null);
        if (res.message) setAdaptiveMsg(res.message);
      }
    } catch { /* silent — loading indicator stays */ }
    finally { setLoadingQ(false); }
  }, [sessionId]);

  useEffect(() => { fetchQuestion(); }, [fetchQuestion]);

  async function submitAnswer() {
    if (!question || !answer.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await quizApi.submitAnswer({
        session_id: sessionId,
        question_id: question.question_id,
        user_answer: answer,
        time_taken_seconds: timeTaken,
      });
      setFeedback(res.feedback);
      setNextAction(res.next_action);
      if (res.adaptive_message) setAdaptiveMsg(res.adaptive_message);
    } catch { /* silent */ }
    finally { setSubmitting(false); }
  }

  async function handleNext() {
    setFeedback(null);
    if (nextAction === 'quiz_complete') {
      setLoadingQ(true);
      try {
        const rep = await quizApi.complete(sessionId);
        setReport(rep.report);
      } catch {
        setReportError('Failed to generate your report. Please try again.');
      } finally {
        setLoadingQ(false);
      }
    } else {
      await fetchQuestion();
    }
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <AuroraBackground />
      <CursorGlow />

      <div style={{ position: 'relative', zIndex: 1, padding: '36px 24px 140px', maxWidth: 700, margin: '0 auto' }}>

        {/* Report generation error */}
        {reportError && (
          <motion.div
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
            style={{
              padding: '16px 20px', borderRadius: 16, marginBottom: 24,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: 14, color: '#FCA5A5' }}>⚠️ {reportError}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setReportError(null); handleNext(); }}
                style={{
                  padding: '6px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.35)', color: '#FCA5A5',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Retry
              </button>
            </div>
          </motion.div>
        )}

        {/* Adaptive teaching moment */}
        <AnimatePresence>
          {adaptiveMsg && (
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }}
              style={{
                padding: '14px 18px', borderRadius: 16, marginBottom: 24,
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                display: 'flex', gap: 12, alignItems: 'flex-start',
                boxShadow: '0 8px 24px rgba(245,158,11,0.05)',
              }}
            >
              <AlertTriangle size={16} color="#FCD34D" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#FCD34D', marginBottom: 2 }}>Adaptive Review Triggered</div>
                <p style={{ fontSize: 13, color: '#FDE68A', margin: 0, lineHeight: 1.5 }}>{adaptiveMsg}</p>
              </div>
              <button onClick={() => setAdaptiveMsg(undefined)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748B', display: 'flex', padding: 4 }}>×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {report ? (
          <ReportView report={report} />
        ) : loadingQ ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: 16 }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366F1' }}
            />
            <p style={{ color: '#475569', fontSize: 14 }}>Loading next question…</p>
          </div>
        ) : question && (
          <AnimatePresence mode="wait">
            <motion.div
              key={question.question_id}
              initial={{ opacity: 0, x: 40, filter: 'blur(8px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: -40, filter: 'blur(8px)' }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#64748B', marginBottom: 4, fontWeight: 500 }}>
                    Question {question.order + 1} of {question.total_in_session}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818CF8', fontWeight: 600, textTransform: 'uppercase' }}>
                      {question.question_type.replace('_',' ')}
                    </span>
                    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#64748B', fontWeight: 500 }}>
                      {question.topic}
                    </span>
                  </div>
                </div>
                <Timer onTick={setTimeTaken} />
              </div>

              {/* Progress bar */}
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.05)', marginBottom: 28, overflow: 'hidden' }}>
                <motion.div
                  animate={{ width: `${((question.order) / question.total_in_session) * 100}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  style={{ height: '100%', borderRadius: 2, background: 'linear-gradient(90deg,#4F46E5,#7C3AED)' }}
                />
              </div>

              {/* Question card */}
              <GlassCard glow style={{ padding: '32px 36px', marginBottom: 28 }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', lineHeight: 1.65, margin: 0 }}>
                  {question.question_text}
                </p>
              </GlassCard>

              {/* Options */}
              {(question.question_type === 'mcq' || question.question_type === 'true_false') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                  {(question.options || (question.question_type === 'true_false' ? ['True', 'False'] : [])).map((opt, i) => {
                    const isSelected = answer === opt;
                    return (
                      <motion.button
                        key={i}
                        onClick={() => setAnswer(opt)}
                        whileHover={{ scale: 1.01, x: 4 }}
                        whileTap={{ scale: 0.99 }}
                        style={{
                          padding: '14px 18px', borderRadius: 16, textAlign: 'left',
                          background: isSelected ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${isSelected ? 'rgba(99,102,241,0.45)' : 'rgba(255,255,255,0.07)'}`,
                          color: isSelected ? '#C7D2FE' : '#94A3B8',
                          fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
                          display: 'flex', alignItems: 'center', gap: 14,
                          transition: 'all 0.2s',
                          boxShadow: isSelected ? '0 0 24px rgba(99,102,241,0.12)' : 'none',
                        }}
                      >
                        <span style={{
                          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                          background: isSelected ? '#6366F1' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${isSelected ? '#6366F1' : 'rgba(255,255,255,0.08)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 800, color: isSelected ? 'white' : '#64748B',
                          transition: 'all 0.2s',
                        }}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        {opt}
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* Written Answer */}
              {(question.question_type === 'fill_blank' || question.question_type === 'short_answer' || question.question_type === 'long_answer') && (
                <div style={{ marginBottom: 28 }}>
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder={question.question_type === 'fill_blank' ? 'Type the missing term…' : 'Write your detailed answer here…'}
                    rows={question.question_type === 'long_answer' ? 6 : 3}
                    aria-label="Answer textarea"
                    style={{
                      width: '100%', padding: '16px 18px', borderRadius: 16,
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                      color: 'var(--text)', fontSize: 14, outline: 'none', resize: 'vertical',
                      fontFamily: 'inherit', lineHeight: 1.6, transition: 'all 0.2s',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(99,102,241,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12), 0 0 20px rgba(99,102,241,0.06)'; }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.07)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              )}

              {/* Submit */}
              <motion.button
                onClick={submitAnswer}
                disabled={!answer.trim() || submitting}
                whileHover={{ scale: answer.trim() && !submitting ? 1.02 : 1 }}
                whileTap={{ scale: 0.97 }}
                className={answer.trim() && !submitting ? 'btn-primary' : ''}
                style={{
                  width: '100%', padding: '14px', borderRadius: 16, border: 'none',
                  background: answer.trim() && !submitting ? 'linear-gradient(135deg,#4F46E5,#7C3AED)' : 'rgba(255,255,255,0.05)',
                  color: answer.trim() ? 'white' : '#475569',
                  fontWeight: 800, fontSize: 15, cursor: answer.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: answer.trim() && !submitting ? '0 8px 24px rgba(79,70,229,0.4)' : 'none',
                  fontFamily: 'inherit', transition: 'all 0.2s',
                }}
              >
                {submitting
                  ? <><Loader2 size={16} className="animate-spin-slow" /> Evaluating response…</>
                  : <><CheckCircle size={16} /> Submit Answer</>}
              </motion.button>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Feedback modal */}
      <AnimatePresence>
        {feedback && (
          <FeedbackModal fb={feedback} onNext={handleNext} nextAction={nextAction} />
        )}
      </AnimatePresence>
    </div>
  );
}
